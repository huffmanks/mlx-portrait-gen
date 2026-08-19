import { createHash } from "crypto";
import fs from "fs/promises";

export function seedForPerson(id: string): number {
  const hashHex = createHash("sha256").update(id).digest("hex");
  return parseInt(hashHex.substring(0, 8), 16);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
