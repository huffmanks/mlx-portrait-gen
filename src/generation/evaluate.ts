import fs from "fs/promises";
import path from "path";

import { upsertCandidate } from "#/generation/metadata";
import { evaluationPrompt } from "#/prompts/evaluation";
import type { CandidateBatchMap, CandidateRecord, MfluxModel, QualityReport } from "#/types";

async function evaluateQuality(imagePath: string, expectedPrompt: string): Promise<QualityReport> {
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const prompt = evaluationPrompt(expectedPrompt);

  try {
    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3-vl:8b",
        messages: [{ role: "user", content: prompt, images: [base64Image] }],
        stream: false,
        format: "json",
        think: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string; thinking?: string };
      error?: string;
    };

    if (data.error) {
      throw new Error(`Ollama API error: ${data.error}`);
    }

    const rawContent = data.message?.content?.trim() || data.message?.thinking?.trim();

    if (!rawContent) {
      console.error("Ollama Raw Payload:", JSON.stringify(data, null, 2));
      throw new Error("Ollama returned an empty message content.");
    }

    const cleanedResponse = rawContent
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in Ollama response.");
    }

    return JSON.parse(jsonMatch[0]) as QualityReport;
  } catch (error) {
    console.warn("AI Evaluation fallback to 70 due to connection error:", error);
    return {
      overallScore: 70,
      photorealismScore: 70,
      anatomicalCorrectness: 70,
      promptAdherenceScore: 70,
      issuesFound: ["Evaluator offline or error occurred"],
    };
  }
}

export async function evaluateAllCandidates(
  candidatesMap: CandidateBatchMap,
  selectedModel: MfluxModel = "flux2-klein-4b",
) {
  const evaluationResults: CandidateBatchMap = {};
  const outputDir = path.resolve("./output");

  for (const personId of Object.keys(candidatesMap)) {
    const candidates = candidatesMap[personId];
    evaluationResults[personId] = [];

    for (const candidate of candidates) {
      console.log(`Evaluating [${personId}] image: ${path.basename(candidate.candidatePath)}...`);

      const evalReport = await evaluateQuality(candidate.candidatePath, candidate.prompt);

      console.log(`Score: ${evalReport.overallScore}/100`);
      if (evalReport.issuesFound.length > 0) {
        console.log(`\tIssues: ${evalReport.issuesFound.join(", ")}`);
      }

      const updated: CandidateRecord = {
        ...candidate,
        model: selectedModel,
        scores: {
          overallScore: evalReport.overallScore,
          photorealismScore: evalReport.photorealismScore,
          anatomicalCorrectness: evalReport.anatomicalCorrectness,
          promptAdherenceScore: evalReport.promptAdherenceScore,
        },
        issues: evalReport.issuesFound,
      };

      await upsertCandidate(outputDir, personId, updated);
      evaluationResults[personId].push(updated);
    }
  }

  return evaluationResults;
}
