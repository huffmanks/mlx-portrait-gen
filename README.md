# mlx-portrait-gen

Build and operate a local, automated AI headshot generation pipeline using structured person data.

## Tech stack

- **Hardware:** Mac mini M4 (16 GB Unified Memory)
- **Orchestrator:** Node.js / TypeScript
- **Inference Daemon:** Python + FastAPI holding MFLUX in memory
- **Inference Framework:** MFLUX / Apple MLX (4-bit quantization to fit inside 16 GB RAM)
- **Supported Models:**
  - Generation/fix:
    - `z-image-turbo`
    - `flux2-klein-4b`
    - `flux2-klein-9b`
    - `flux1-schnell`
    - `dev`
  - Review:
    - `qwen3-vl:8b`
  - Upscale:
    - `seedvr2-3b`
- **Quality Evaluation:** sharp.js (sharpness variance, highlight/shadow clipping)

## Pipeline flow

```text
Person Data (DOB, height, weight, traits)
    ↓
TypeScript Prompt Engine (Layered composition)
    ↓
HTTP POST (http://127.0.0.1:8000/generate)
    ↓
Python MFLUX Daemon (Apple MLX / Metal GPU)
    ↓
Sharp Quality Evaluation & Metadata JSON Output
```

## Core mechanics

- **Server Daemon Pattern:** Python stays resident on port 8000 to keep model weights loaded in RAM, eliminating per-image loading penalties.
- **Memory Management:** When switching models, Python invokes gc.collect() and mx.clear_cache() to prevent 16 GB RAM overflow.
- **Deterministic Output:** Seeds are derived from person.id using FNV-1a hashing.
- **Layered Prompt Engine:** Prompts combine person + photography + composition + lighting + background.
- **Sequential Queue:** Concurrency is locked to 1 job at a time to protect unified memory.

## File structure

```text
├── output
├── server
│   └── server.py
├── src
│   ├── cmd
│   │   ├── fix.ts
│   │   ├── gen.ts
│   │   ├── review.ts
│   │   └── upscale.ts
│   ├── data
│   │   └── people.ts
│   ├── generation
│   │   ├── batch.ts
│   │   ├── evaluate.ts
│   │   ├── metadata.ts
│   │   └── mflux.ts
│   ├── lib
│   │   └── utils.ts
│   ├── prompts
│   │   ├── background.ts
│   │   ├── composition.ts
│   │   ├── evaluation.ts
│   │   ├── lighting.ts
│   │   ├── person.ts
│   │   └── photography.ts
```

## Get started

### Install Ollama

- [Quickstart](https://docs.ollama.com/quickstart)

### Install mflux and huggingface cli

```sh
uv tool install --upgrade mflux
uv tool install huggingface_hub
```

### Pre-download models

- #### For generation/fix

  ```sh
  hf download mlx-community/Z-Image-Turbo-bf16
  hf download mlx-community/FLUX.2-klein-4B-bf16
  ```

- #### For review

  ```sh
  ollama pull qwen3-vl:8b
  ```

- #### For upscale

  ```sh
  hf download mlx-community/SeedVR2-3B-mlx-int8
  ```

### Run

```sh
just gen
just review
just fix
just upscale
```
