import { randomUUID } from "crypto";

export function createCall(): string {
  return randomUUID();
}
