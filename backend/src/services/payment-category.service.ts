import { prisma } from "../lib/db.js";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../lib/app-error.js";

export interface CreateCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  ownerAddress: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface CategoryRuleInput {
  field: "sender" | "receiver" | "tokenAddress" | "amountMin" | "amountMax";
  operator: "equals" | "contains" | "startsWith" | "gte" | "lte";
  value: string;
  priority?: number;
}

export interface CategoryReportRow {
  categoryId: string | null;
  categoryName: string | null;
  streamCount: number;
  disbursementCount: number;
  totalAmountStr: string;
}

const VALID_FIELDS = ["sender", "receiver", "tokenAddress", "amountMin", "amountMax"] as const;
const VALID_OPERATORS = ["equals", "contains", "startsWith", "gte", "lte"] as const;

export class PaymentCategoryService {
  // ── Category CRUD ────────────────────────────────────────────────────────────

  async createCategory(input: CreateCategoryInput) {
    const existing = await prisma.paymentCategory.findFirst({
      where: { ownerAddress: input.ownerAddress, name: input.name },
    });
    if (existing) {
      throw new ConflictError(`Category "${input.name}" already exists for this address`);
    }

    return prisma.paymentCategory.create({
      data: {
        name: input.name,
        description: input.description,
        color: input.color ?? "#6366f1",
        icon: input.icon,
        ownerAddress: input.ownerAddress,
      },
      include: { rules: true },
    });
  }

  async getCategories(ownerAddress: string) {
    return prisma.paymentCategory.findMany({
      where: { ownerAddress },
      include: { rules: { orderBy: { priority: "desc" } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async getCategory(id: string, ownerAddress: string) {
    const category = await prisma.paymentCategory.findFirst({
      where: { id, ownerAddress },
      include: { rules: { orderBy: { priority: "desc" } } },
    });
    if (!category) throw new NotFoundError(`Category not found`);
    return category;
  }

  async updateCategory(id: string, ownerAddress: string, input: UpdateCategoryInput) {
    await this.getCategory(id, ownerAddress); // throws if not found

    if (input.name) {
      const conflict = await prisma.paymentCategory.findFirst({
        where: { ownerAddress, name: input.name, NOT: { id } },
      });
      if (conflict) throw new ConflictError(`Category "${input.name}" already exists`);
    }

    return prisma.paymentCategory.update({
      where: { id },
      data: { ...input },
      include: { rules: true },
    });
  }

  async deleteCategory(id: string, ownerAddress: string) {
    await this.getCategory(id, ownerAddress); // throws if not found
    await prisma.paymentCategory.delete({ where: { id } });
  }

  // ── Auto-categorization rules ────────────────────────────────────────────────

  async addRule(categoryId: string, ownerAddress: string, input: CategoryRuleInput) {
    await this.getCategory(categoryId, ownerAddress); // ownership check

    if (!VALID_FIELDS.includes(input.field as typeof VALID_FIELDS[number])) {
      throw new ValidationError(`Invalid field: ${input.field}`);
    }
    if (!VALID_OPERATORS.includes(input.operator as typeof VALID_OPERATORS[number])) {
      throw new ValidationError(`Invalid operator: ${input.operator}`);
    }

    return prisma.paymentCategoryRule.create({
      data: {
        categoryId,
        field: input.field,
        operator: input.operator,
        value: input.value,
        priority: input.priority ?? 0,
      },
    });
  }

  async deleteRule(ruleId: string, ownerAddress: string) {
    const rule = await prisma.paymentCategoryRule.findFirst({
      where: { id: ruleId },
      include: { category: true },
    });
    if (!rule || rule.category.ownerAddress !== ownerAddress) {
      throw new NotFoundError("Rule not found");
    }
    await prisma.paymentCategoryRule.delete({ where: { id: ruleId } });
  }

  // ── Assign category ──────────────────────────────────────────────────────────

  async assignStreamCategory(streamId: string, categoryId: string | null, ownerAddress: string) {
    if (categoryId) {
      await this.getCategory(categoryId, ownerAddress); // ownership check
    }
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundError("Stream not found");

    return prisma.stream.update({
      where: { id: streamId },
      data: { categoryId },
    });
  }

  async assignDisbursementCategory(
    disbursementId: string,
    categoryId: string | null,
    ownerAddress: string,
  ) {
    if (categoryId) {
      await this.getCategory(categoryId, ownerAddress);
    }
    const disbursement = await prisma.disbursement.findUnique({ where: { id: disbursementId } });
    if (!disbursement) throw new NotFoundError("Disbursement not found");

    return prisma.disbursement.update({
      where: { id: disbursementId },
      data: { categoryId },
    });
  }

  // ── Bulk categorization ──────────────────────────────────────────────────────

  async bulkAssignStreams(
    streamIds: string[],
    categoryId: string | null,
    ownerAddress: string,
  ): Promise<{ updated: number }> {
    if (categoryId) {
      await this.getCategory(categoryId, ownerAddress);
    }
    const { count } = await prisma.stream.updateMany({
      where: { id: { in: streamIds } },
      data: { categoryId },
    });
    return { updated: count };
  }

  async bulkAssignDisbursements(
    disbursementIds: string[],
    categoryId: string | null,
    ownerAddress: string,
  ): Promise<{ updated: number }> {
    if (categoryId) {
      await this.getCategory(categoryId, ownerAddress);
    }
    const { count } = await prisma.disbursement.updateMany({
      where: { id: { in: disbursementIds } },
      data: { categoryId },
    });
    return { updated: count };
  }

  // ── Auto-categorize a stream using saved rules ────────────────────────────────

  async autoApplyRules(streamId: string): Promise<string | null> {
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundError("Stream not found");

    // Fetch all rules ordered by priority desc then category creation date
    const rules = await prisma.paymentCategoryRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { category: true },
    });

    for (const rule of rules) {
      if (this._ruleMatches(rule, stream)) {
        await prisma.stream.update({
          where: { id: streamId },
          data: { categoryId: rule.categoryId },
        });
        return rule.categoryId;
      }
    }
    return null;
  }

  private _ruleMatches(
    rule: { field: string; operator: string; value: string },
    stream: { sender: string; receiver: string; tokenAddress: string | null; amount: string },
  ): boolean {
    let fieldValue: string;
    if (rule.field === "sender") fieldValue = stream.sender;
    else if (rule.field === "receiver") fieldValue = stream.receiver;
    else if (rule.field === "tokenAddress") fieldValue = stream.tokenAddress ?? "";
    else if (rule.field === "amountMin" || rule.field === "amountMax") {
      const amount = BigInt(stream.amount);
      const threshold = BigInt(rule.value);
      if (rule.field === "amountMin") return amount >= threshold;
      return amount <= threshold;
    } else return false;

    switch (rule.operator) {
      case "equals":     return fieldValue === rule.value;
      case "contains":   return fieldValue.includes(rule.value);
      case "startsWith": return fieldValue.startsWith(rule.value);
      default:           return false;
    }
  }

  // ── Category report ──────────────────────────────────────────────────────────

  async getCategoryReport(ownerAddress: string): Promise<CategoryReportRow[]> {
    const categories = await prisma.paymentCategory.findMany({
      where: { ownerAddress },
      select: { id: true, name: true },
    });

    const categoryIds = categories.map((c) => c.id);
    const nameMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    const [streamGroups, disbursementGroups] = await Promise.all([
      prisma.stream.groupBy({
        by: ["categoryId"],
        where: { categoryId: { in: [...categoryIds, null as unknown as string] } },
        _count: { id: true },
        _sum: { amount: false } as never, // amount is a string, we'll aggregate via $queryRaw
      }),
      prisma.disbursement.groupBy({
        by: ["categoryId"],
        where: { categoryId: { in: [...categoryIds, null as unknown as string] } },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Build report combining both dimensions
    const allIds = new Set<string | null>([
      ...streamGroups.map((r: { categoryId: string | null }) => r.categoryId),
      ...disbursementGroups.map((r: { categoryId: string | null }) => r.categoryId),
    ]);

    const streamMap = Object.fromEntries(
      streamGroups.map((r: { categoryId: string | null; _count: { id: number } }) => [
        String(r.categoryId),
        r._count.id,
      ]),
    );
    const disbMap = Object.fromEntries(
      disbursementGroups.map(
        (r: { categoryId: string | null; _count: { id: number }; _sum: { amount: bigint | null } }) => [
          String(r.categoryId),
          { count: r._count.id, amount: r._sum.amount?.toString() ?? "0" },
        ],
      ),
    );

    return Array.from(allIds).map((catId) => ({
      categoryId: catId,
      categoryName: catId ? (nameMap[catId] ?? null) : null,
      streamCount: streamMap[String(catId)] ?? 0,
      disbursementCount: disbMap[String(catId)]?.count ?? 0,
      totalAmountStr: disbMap[String(catId)]?.amount ?? "0",
    }));
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  async exportCategories(ownerAddress: string): Promise<object[]> {
    const categories = await prisma.paymentCategory.findMany({
      where: { ownerAddress },
      include: { rules: { orderBy: { priority: "desc" } } },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color,
      icon: cat.icon,
      isDefault: cat.isDefault,
      createdAt: cat.createdAt.toISOString(),
      rules: cat.rules.map((r) => ({
        id: r.id,
        field: r.field,
        operator: r.operator,
        value: r.value,
        priority: r.priority,
      })),
    }));
  }
}
