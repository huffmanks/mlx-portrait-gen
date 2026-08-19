import fs from "fs/promises";
import path from "path";

import type { CandidateMetadata } from "#/types";

export async function saveCandidateMetadata(outputDir: string, meta: CandidateMetadata) {
  await fs.mkdir(outputDir, { recursive: true });
  const metaPath = path.join(outputDir, `meta_${meta.seed}.json`);
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
}
