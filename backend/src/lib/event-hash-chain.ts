import { createHash } from "crypto";

export interface EventHashInput {
  eventId: string;
  streamId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  previousHash: string | null;
}

function canonicalizeEvent(input: EventHashInput): string {
  return JSON.stringify({
    eventId: input.eventId,
    eventType: input.eventType,
    payload: input.payload,
    previousHash: input.previousHash,
    streamId: input.streamId,
    timestamp: input.timestamp,
  });
}

export function computeEventHash(input: EventHashInput): string {
  const canonical = canonicalizeEvent(input);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
