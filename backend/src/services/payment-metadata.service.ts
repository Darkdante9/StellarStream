import { prisma } from "../lib/db.js";
import { NotFoundError, ValidationError } from "../lib/app-error.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type MetadataEntityType = "stream" | "disbursement" | "category";

export interface MetadataPair {
  key: string;
  value: string;
}

export interface ResolvedMetadataPair extends MetadataPair {
  /** true when the pair was inherited from the entity's category rather than set directly. */
  inherited: boolean;
}

export interface MetadataSearchFilter {
  key?: string;
  value?: string;
  entityType?: MetadataEntityType;
}

export interface MetadataSearchResult {
  entityType: string;
  entityId: string;
  key: string;
  value: string;
}

// ── Validation constants ─────────────────────────────────────────────────────

export const ENTITY_TYPES = ["stream", "disbursement", "category"] as const;
export const KEY_PATTERN = /^[a-zA-Z0-9_.-]{1,64}$/;
export const MAX_VALUE_LENGTH = 512;
export const MAX_PAIRS_PER_ENTITY = 50;

/**
 * Validate a set of metadata pairs. Pure (no DB) so it can be unit-tested and
 * reused as defense-in-depth alongside the Zod route schemas.
 *
 * Rules:
 *  - key must match KEY_PATTERN (alphanumeric, `_`, `.`, `-`, 1–64 chars)
 *  - value length must be ≤ MAX_VALUE_LENGTH
 *  - at most MAX_PAIRS_PER_ENTITY pairs
 *  - no duplicate keys within the set
 */
export function validateMetadataPairs(pairs: MetadataPair[]): void {
  if (pairs.length > MAX_PAIRS_PER_ENTITY) {
    throw new ValidationError(
      `Too many metadata pairs: ${pairs.length} (max ${MAX_PAIRS_PER_ENTITY})`,
    );
  }

  const seen = new Set<string>();
  for (const { key, value } of pairs) {
    if (!KEY_PATTERN.test(key)) {
      throw new ValidationError(
        `Invalid metadata key "${key}": must match ${KEY_PATTERN.source}`,
      );
    }
    if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
      throw new ValidationError(
        `Invalid value for key "${key}": must be a string of at most ${MAX_VALUE_LENGTH} characters`,
      );
    }
    if (seen.has(key)) {
      throw new ValidationError(`Duplicate metadata key "${key}"`);
    }
    seen.add(key);
  }
}

/**
 * Overlay an entity's own metadata on top of inherited (category) metadata.
 * Entity-level pairs win on key collision. Pure (no DB) for unit testing.
 */
export function mergeInherited(
  inherited: MetadataPair[],
  own: MetadataPair[],
): ResolvedMetadataPair[] {
  const merged = new Map<string, ResolvedMetadataPair>();
  for (const { key, value } of inherited) {
    merged.set(key, { key, value, inherited: true });
  }
  for (const { key, value } of own) {
    merged.set(key, { key, value, inherited: false });
  }
  return Array.from(merged.values());
}

export class PaymentMetadataService {
  // ── Read ───────────────────────────────────────────────────────────────────

  /** Raw metadata for a single entity (no inheritance). */
  async getMetadata(
    entityType: MetadataEntityType,
    entityId: string,
  ): Promise<MetadataPair[]> {
    const rows = await prisma.paymentMetadata.findMany({
      where: { entityType, entityId },
      orderBy: { key: "asc" },
      select: { key: true, value: true },
    });
    return rows;
  }

  /**
   * Resolved metadata: for a stream/disbursement, overlay the entity's own
   * metadata on top of any metadata attached to its assigned category.
   * For a category, this is identical to raw metadata.
   */
  async getResolvedMetadata(
    entityType: MetadataEntityType,
    entityId: string,
  ): Promise<ResolvedMetadataPair[]> {
    const own = await this.getMetadata(entityType, entityId);

    if (entityType === "category") {
      return own.map((p) => ({ ...p, inherited: false }));
    }

    const categoryId = await this._resolveCategoryId(entityType, entityId);
    if (!categoryId) {
      return own.map((p) => ({ ...p, inherited: false }));
    }

    const inherited = await this.getMetadata("category", categoryId);
    return mergeInherited(inherited, own);
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  /** Upsert a single key-value pair on an entity. */
  async setMetadata(
    entityType: MetadataEntityType,
    entityId: string,
    key: string,
    value: string,
    ownerAddress: string,
  ): Promise<MetadataPair> {
    validateMetadataPairs([{ key, value }]);

    const row = await prisma.paymentMetadata.upsert({
      where: { entityType_entityId_key: { entityType, entityId, key } },
      create: { entityType, entityId, key, value, ownerAddress },
      update: { value, ownerAddress },
      select: { key: true, value: true },
    });
    return row;
  }

  /**
   * Set multiple pairs on a single entity in one transaction. Existing keys not
   * present in `pairs` are left untouched (merge semantics); keys present are
   * upserted.
   */
  async setMetadataBulk(
    entityType: MetadataEntityType,
    entityId: string,
    pairs: MetadataPair[],
    ownerAddress: string,
  ): Promise<MetadataPair[]> {
    validateMetadataPairs(pairs);

    await prisma.$transaction(
      pairs.map((p) =>
        prisma.paymentMetadata.upsert({
          where: {
            entityType_entityId_key: { entityType, entityId, key: p.key },
          },
          create: {
            entityType,
            entityId,
            key: p.key,
            value: p.value,
            ownerAddress,
          },
          update: { value: p.value, ownerAddress },
        }),
      ),
    );

    return this.getMetadata(entityType, entityId);
  }

  /** Delete a single metadata key from an entity. */
  async deleteMetadata(
    entityType: MetadataEntityType,
    entityId: string,
    key: string,
  ): Promise<void> {
    const existing = await prisma.paymentMetadata.findUnique({
      where: { entityType_entityId_key: { entityType, entityId, key } },
    });
    if (!existing) throw new NotFoundError("Metadata key");
    await prisma.paymentMetadata.delete({
      where: { entityType_entityId_key: { entityType, entityId, key } },
    });
  }

  // ── Search ───────────────────────────────────────────────────────────────

  /** Search an owner's metadata by optional key/value/entityType. */
  async searchByMetadata(
    ownerAddress: string,
    filter: MetadataSearchFilter = {},
  ): Promise<MetadataSearchResult[]> {
    const rows = await prisma.paymentMetadata.findMany({
      where: {
        ownerAddress,
        ...(filter.entityType ? { entityType: filter.entityType } : {}),
        ...(filter.key ? { key: filter.key } : {}),
        ...(filter.value ? { value: { contains: filter.value } } : {}),
      },
      orderBy: [{ entityType: "asc" }, { entityId: "asc" }, { key: "asc" }],
      select: { entityType: true, entityId: true, key: true, value: true },
    });
    return rows;
  }

  // ── Bulk updates across entities ─────────────────────────────────────────

  /**
   * Apply the same set of key-value pairs to many entities of one type in a
   * single transaction. Returns the number of pairs written.
   */
  async bulkUpsert(
    entityType: MetadataEntityType,
    entityIds: string[],
    pairs: MetadataPair[],
    ownerAddress: string,
  ): Promise<{ updated: number }> {
    validateMetadataPairs(pairs);

    const ops = entityIds.flatMap((entityId) =>
      pairs.map((p) =>
        prisma.paymentMetadata.upsert({
          where: {
            entityType_entityId_key: { entityType, entityId, key: p.key },
          },
          create: {
            entityType,
            entityId,
            key: p.key,
            value: p.value,
            ownerAddress,
          },
          update: { value: p.value, ownerAddress },
        }),
      ),
    );

    await prisma.$transaction(ops);
    return { updated: ops.length };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Look up the categoryId assigned to a stream or disbursement, if any. */
  private async _resolveCategoryId(
    entityType: "stream" | "disbursement",
    entityId: string,
  ): Promise<string | null> {
    if (entityType === "stream") {
      const stream = await prisma.stream.findUnique({
        where: { id: entityId },
        select: { categoryId: true },
      });
      return stream?.categoryId ?? null;
    }
    const disbursement = await prisma.disbursement.findUnique({
      where: { id: entityId },
      select: { categoryId: true },
    });
    return disbursement?.categoryId ?? null;
  }
}
