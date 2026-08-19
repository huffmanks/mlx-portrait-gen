import path from "path";

import { generateWithMflux } from "#/generation/mflux";
import { saveCandidateMetadata } from "#/generation/save";
import { seedForPerson } from "#/generation/seed";
import { backgroundPrompts } from "#/prompt/background";
import { compositionPrompts } from "#/prompt/composition";
import { lightingPrompts } from "#/prompt/lighting";
import { personPrompt } from "#/prompt/person";
import { photographyPrompts } from "#/prompt/photography";
import { evaluatePortrait } from "#/quality/evaluate";
import type { MfluxModel, PersonRecord } from "#/types";

const database: PersonRecord[] = [
  {
    id: "p_001",
    birthdate: "05/14/1992",
    gender: "woman",
    race: "East Asian",
    hairColor: "black",
    hairStyle: "shoulder-length straight",
    eyeColor: "brown",
    height: 65,
    weight: 128,
  },
  {
    id: "p_002",
    birthdate: "11/20/1981",
    gender: "man",
    race: "Caucasian",
    hairColor: "salt-and-pepper",
    hairStyle: "short neatly parted",
    eyeColor: "blue",
    height: 72,
    weight: 185,
  },
];

async function runPipeline() {
  const outputDir = path.resolve("./output");

  for (const person of database) {
    const seed = seedForPerson(person.id);

    const bgIndex = Math.abs(seed) % backgroundPrompts.length;
    const background = backgroundPrompts[bgIndex];

    const fullPrompt = [
      personPrompt(person),
      photographyPrompts.join(" "),
      compositionPrompts.join(" "),
      lightingPrompts.join(" "),
      `Background: ${background}`,
    ].join("\n\n");

    const selectedModel: MfluxModel = "flux2-klein-4b";
    const personFolder = path.join(outputDir, person.id);
    const outputPath = path.join(personFolder, `portrait_${seed}.png`);

    try {
      await generateWithMflux({
        model: selectedModel,
        prompt: fullPrompt,
        seed: seed,
        outputPath,
        steps: 9,
      });

      const qualityReport = await evaluatePortrait(outputPath);

      await saveCandidateMetadata(personFolder, {
        personId: person.id,
        seed,
        model: selectedModel,
        prompt: fullPrompt,
        score: qualityReport.overallScore,
      });

      console.log(
        `✅ Generated ${person.id} | Score: ${qualityReport.overallScore}/100 (Sharpness: ${qualityReport.sharpnessScore})`,
      );
    } catch (error) {
      console.error(`❌ Pipeline failed for ${person.id}:`, error);
    }
  }
}

runPipeline();
