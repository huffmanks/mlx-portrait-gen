# mlx-portrait-gen

Build and operate a local, automated AI headshot generation pipeline using structured person data.

## Tech stack

- **Hardware:** Mac mini M4 (16 GB Unified Memory)
- **Orchestrator:** Node.js / TypeScript
- **Inference Daemon:** Python + FastAPI holding MFLUX in memory
- **Inference Framework:** MFLUX / Apple MLX (4-bit quantization to fit inside 16 GB RAM)
- **Supported Models:** z-image-turbo, flux2-klein-4b, flux2-klein-9b, flux1-schnell, dev
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
└── server
    ├── server.py
└── src
    ├── generation
    │   ├── mflux.ts
    │   ├── queue.ts
    │   ├── save.ts
    │   └── seed.ts
    ├── main.ts
    ├── prompt
    │   ├── background.ts
    │   ├── composition.ts
    │   ├── lighting.ts
    │   ├── person.ts
    │   └── photography.ts
    └── quality
        └── evaluate.ts
```
