import { createHash } from "crypto";

export function seedForPerson(id: string): number {
  const hashHex = createHash("sha256").update(id).digest("hex");
  return parseInt(hashHex.substring(0, 8), 16);
}
