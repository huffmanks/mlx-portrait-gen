import fs from "fs/promises";
import path from "path";

import { generateWithMflux, unloadMfluxModel } from "#/generation/mflux";
import { seedForPerson } from "#/generation/seed";
import { backgroundPrompts } from "#/prompt/background";
import { compositionPrompts } from "#/prompt/composition";
import { lightingPrompts } from "#/prompt/lighting";
import { personPrompt } from "#/prompt/person";
import { photographyPrompts } from "#/prompt/photography";
import type { CandidateBatchMap, MfluxModel, PersonRecord } from "#/types";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function generateAllCandidates(
  database: PersonRecord[],
  candidatesPerPerson = 3,
  selectedModel: MfluxModel = "flux2-klein-4b",
) {
  const outputDir = path.resolve("./output");
  const candidatesMap: CandidateBatchMap = {};

  let interrupted = false;
  const cleanupAndExit = async () => {
    if (interrupted) return;
    interrupted = true;

    console.warn("\nInterrupted — letting any in-flight generation finish, then unloading model...");
    await unloadMfluxModel();
    process.exit(130);
  };

  process.on("SIGINT", cleanupAndExit);
  process.on("SIGTERM", cleanupAndExit);

  try {
    for (const person of database) {
      const baseSeed = seedForPerson(person.id);
      const bgIndex = Math.abs(baseSeed) % backgroundPrompts.length;
      const background = backgroundPrompts[bgIndex];

      const fullPrompt = [
        personPrompt(person),
        photographyPrompts.join(" "),
        compositionPrompts.join(" "),
        lightingPrompts.join(" "),
        `Background: ${background}`,
      ].join("\n\n");

      const personFolder = path.join(outputDir, person.id);
      await fs.mkdir(personFolder, { recursive: true });
      candidatesMap[person.id] = [];

      for (let attempt = 0; attempt < candidatesPerPerson; attempt++) {
        const candidateSeed = baseSeed + attempt;
        const candidatePath = path.join(personFolder, `candidate_${candidateSeed}.png`);

        if (await fileExists(candidatePath)) {
          console.log(
            `Skipping [${person.id}] candidate ${attempt + 1}/${candidatesPerPerson} (Seed: ${candidateSeed}) — already exists.`,
          );
        } else {
          console.log(
            `Generating [${person.id}] candidate ${attempt + 1}/${candidatesPerPerson} (Seed: ${candidateSeed})...`,
          );

          await generateWithMflux({
            model: selectedModel,
            prompt: fullPrompt,
            seed: candidateSeed,
            outputPath: candidatePath,
            steps: 4,
          });
        }

        candidatesMap[person.id].push({
          personId: person.id,
          seed: candidateSeed,
          candidatePath,
          prompt: fullPrompt,
        });
      }
    }

    await unloadMfluxModel();

    return candidatesMap;
  } finally {
    process.off("SIGINT", cleanupAndExit);
    process.off("SIGTERM", cleanupAndExit);
  }
}
