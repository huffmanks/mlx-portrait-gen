export type MfluxModel =
  | "z-image-turbo" // Fast, lightweight, (9 steps, 0.0 guidance)
  | "flux2-klein" // FLUX.2 Klein (4-8 steps, low RAM)
  | "flux2-klein-9b"
  | "flux2-klein-base-9b"
  | "flux2-klein" // FLUX.2 Klein (4-8 steps, low RAM)
  | "flux1-schnell" // FLUX.1 Schnell (4 steps)
  | "flux1-dev"; // FLUX.1 Dev (20–28 steps, highest quality, slower)

export type PersonRecord = {
  id: string;
  birthdate: string;
  gender: string;
  race: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  height: number;
  weight: number;
};

export type GenerationParams = {
  model: MfluxModel;
  prompt: string;
  seed: number;
  outputPath: string;
  quantize?: number;
};

export type UpscaleParams = {
  imagePath: string;
  outputPath: string;
  resolution?: number;
  softness?: number;
  seed?: number;
};

export type QualityScores = {
  overallScore: number;
  originalScore: number;
  photorealismScore: number;
  anatomicalCorrectness: number;
  promptAdherenceScore: number;
};

export type QualityReport = {
  looksAiGenerated: boolean;
  scores: QualityScores;
  issues: Array<string>;
};

export type CandidateRecord = {
  seed: number;
  model: MfluxModel;
  candidatePath: string;
  looksAiGenerated?: boolean;
  scores?: QualityScores;
  issues?: string[];
};

export type PersonMetadata = {
  personId: string;
  prompt: string;
  candidates: Array<CandidateRecord>;
  finalCandidateSeed?: number;
  finalUpscaledPath?: string;
};

export type PersonCandidateBatch = {
  prompt: string;
  candidates: Array<CandidateRecord>;
};

export type CandidateBatchMap = Record<string, PersonCandidateBatch>;
