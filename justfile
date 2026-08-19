# List available commands
default:
    @just --list

# Start the Python MLX server
server:
    uv run uvicorn server.server:app --host 127.0.0.1 --port 8000

# Phase 1: Generate candidate images for all people
gen:
    node src/cmd/gen.ts

# Phase 2: Review candidates with Ollama / Qwen Vision
review:
    node src/cmd/review.ts

# Phase 3: Find low-scoring people (< 80) and regenerate new candidates
fix:
    node src/cmd/fix.ts