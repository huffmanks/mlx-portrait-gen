# List commands
default:
    @just --list

# Start MLX server
server:
    uv run uvicorn server.server:app --host 127.0.0.1 --port 8000

# Start MLX server offline
server-offline:
    HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 uv run uvicorn server.server:app --host 127.0.0.1 --port 8000

# Generate candidates
gen model="flux2-klein":
    node src/cmd/gen.ts --model {{model}}

# Review candidates
review:
    node src/cmd/review.ts

# Regenerate low-scoring candidates
fix model="flux2-klein":
    node src/cmd/fix.ts --model {{model}}

# Upscale candidates
upscale:
    node src/cmd/upscale.ts