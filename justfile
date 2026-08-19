# List commands
default:
    @just --list

# Start MLX server
server:
    uv run uvicorn server.server:app --host 127.0.0.1 --port 8000

# Generate candidates
gen:
    node src/cmd/gen.ts

# Review candidates
review:
    node src/cmd/review.ts

# Regenerate low-scoring candidates
fix:
    node src/cmd/fix.ts

# Upscale candidates
upscale:
    node src/cmd/upscale.ts