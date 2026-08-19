import fs from "fs/promises";
import path from "path";

import type { CandidateRecord, PersonMetadata } from "#/types";

function metadataPath(outputDir: string, personId: string) {
  return path.join(outputDir, personId, "metadata.json");
}

export async function loadPersonMetadata(outputDir: string, personId: string): Promise<PersonMetadata> {
  try {
    const raw = await fs.readFile(metadataPath(outputDir, personId), "utf-8");
    return JSON.parse(raw) as PersonMetadata;
  } catch {
    return { personId, candidates: [] };
  }
}

export async function savePersonMetadata(outputDir: string, metadata: PersonMetadata): Promise<void> {
  const personDir = path.join(outputDir, metadata.personId);
  await fs.mkdir(personDir, { recursive: true });
  await fs.writeFile(metadataPath(outputDir, metadata.personId), JSON.stringify(metadata, null, 2));
}

export async function upsertCandidate(outputDir: string, personId: string, candidate: CandidateRecord): Promise<void> {
  const metadata = await loadPersonMetadata(outputDir, personId);
  const idx = metadata.candidates.findIndex((c) => c.seed === candidate.seed);

  if (idx >= 0) {
    metadata.candidates[idx] = { ...metadata.candidates[idx], ...candidate };
  } else {
    metadata.candidates.push(candidate);
  }

  await savePersonMetadata(outputDir, metadata);
}
