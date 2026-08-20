import fs from "fs/promises";
import path from "path";

import { upsertCandidate } from "#/generation/metadata";
import { evaluationPrompt } from "#/prompts/evaluation";
import type { CandidateBatchMap, CandidateRecord, QualityReport } from "#/types";

type RawEvaluationResponse = {
  looksAiGenerated: boolean;
  overallScore: number;
  photorealismScore: number;
  anatomicalCorrectness: number;
  promptAdherenceScore: number;
  issuesFound: string[];
};

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

    const raw = JSON.parse(jsonMatch[0]) as RawEvaluationResponse;

    // Lower = stricter | Max = 79 any higher and will play no effect because of the 80 or higher threshold
    const CEILING = 70;
    const originalScore = raw.overallScore;
    let overallScore = raw.overallScore;
    let photorealismScore = raw.photorealismScore;

    if (raw.looksAiGenerated) {
      if (overallScore > CEILING) {
        overallScore = Math.round((overallScore / 100) * CEILING);
      }
      if (photorealismScore > CEILING) {
        photorealismScore = Math.round((photorealismScore / 100) * CEILING);
      }
    }

    return {
      looksAiGenerated: raw.looksAiGenerated,
      scores: {
        overallScore,
        originalScore,
        photorealismScore,
        anatomicalCorrectness: raw.anatomicalCorrectness,
        promptAdherenceScore: raw.promptAdherenceScore,
      },
      issues: raw.issuesFound,
    };
  } catch (error) {
    console.warn("AI Evaluation fallback to 0 due to connection error:", error);
    return {
      looksAiGenerated: false,
      scores: {
        originalScore: 0,
        overallScore: 0,
        photorealismScore: 0,
        anatomicalCorrectness: 0,
        promptAdherenceScore: 0,
      },
      issues: ["Evaluator offline or error occurred"],
    };
  }
}

export async function evaluateAllCandidates(candidatesMap: CandidateBatchMap) {
  const evaluationResults: CandidateBatchMap = {};
  const outputDir = path.resolve("./output");

  for (const personId of Object.keys(candidatesMap)) {
    const { prompt, candidates } = candidatesMap[personId];
    evaluationResults[personId] = { prompt, candidates: [] };

    for (const candidate of candidates) {
      console.log(`Evaluating [${personId}] image: ${path.basename(candidate.candidatePath)}...`);

      const evalReport = await evaluateQuality(candidate.candidatePath, prompt);

      console.log(`Score: ${evalReport.scores.overallScore}/100`);
      if (evalReport.issues.length > 0) {
        console.log(`\tIssues: ${evalReport.issues.join(", ")}`);
      }
      const updated: CandidateRecord = {
        ...candidate,
        looksAiGenerated: evalReport.looksAiGenerated,
        scores: evalReport.scores,
        issues: evalReport.issues,
      };

      await upsertCandidate(outputDir, personId, prompt, updated);
      evaluationResults[personId].candidates.push(updated);
    }
  }

  return evaluationResults;
}
