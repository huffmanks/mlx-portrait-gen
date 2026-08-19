import fs from "fs/promises";
import path from "path";

import type { CandidateMetadata } from "#/types";

export async function saveCandidateMetadata(outputDir: string, meta: CandidateMetadata) {
  await fs.mkdir(outputDir, { recursive: true });
  const metaPath = path.join(outputDir, `meta_${meta.seed}.json`);
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
}

export async function loadPersonMetadata(personDir: string): Promise<CandidateMetadata[]> {
  const files = await fs.readdir(personDir).catch(() => []);
  const metaFiles = files.filter((f) => f.startsWith("meta_") && f.endsWith(".json"));

  const metaList = await Promise.all(
    metaFiles.map(async (f) => {
      try {
        const raw = await fs.readFile(path.join(personDir, f), "utf-8");
        return JSON.parse(raw) as CandidateMetadata;
      } catch {
        return null;
      }
    }),
  );

  return metaList.filter((m): m is CandidateMetadata => m !== null);
}
