export type MfluxModel =
  | "z-image-turbo" // Fast, lightweight, 9 inference steps (0.0 guidance)
  | "flux2" // Alias for FLUX.2 Klein 4B (4-8 steps, low RAM)
  | "flux2-klein-4b" // FLUX.2 Klein 4B parameter model
  | "flux2-klein-9b" // FLUX.2 Klein 9B parameter model (higher fidelity)
  | "flux1-schnell" // FLUX.1 Schnell (4 steps)
  | "dev"; // FLUX.1 Dev (20–28 steps, highest quality, slower)

export type PersonRecord = {
  id: string;
  birthdate: string; // Format: "MM/DD/YYYY"
  gender: string;
  race: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  height: number; // inches
  weight: number; // pounds
};

export type GenerationParams = {
  model: MfluxModel;
  prompt: string;
  seed: number;
  outputPath: string;
  quantize?: number;
};

export type QualityScores = {
  overallScore: number;
  photorealismScore: number;
  anatomicalCorrectness: number;
  promptAdherenceScore: number;
};

export type QualityReport = QualityScores & {
  issuesFound: Array<string>;
};

export type CandidateRecord = {
  seed: number;
  model: MfluxModel;
  prompt: string;
  candidatePath: string;
  scores?: QualityScores;
  issues?: Array<string>;
};

export type UpscaleParams = {
  imagePath: string;
  outputPath: string;
  resolution?: number;
  softness?: number;
  seed?: number;
};

export type PersonMetadata = {
  personId: string;
  candidates: Array<CandidateRecord>;
  finalCandidateSeed?: number;
  finalUpscaledPath?: string;
};

export type CandidateBatchMap = Record<string, Array<CandidateRecord>>;
