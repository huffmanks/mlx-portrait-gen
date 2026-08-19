# List available commands
default:
    @just --list

# Start the Python MLX server
server:
    uv run uvicorn server.server:app --host 127.0.0.1 --port 8000

# Run the pipeline directly with Node.js
generate:
    node src/main.ts

# Run server and generation together in a single command
dev:
    #!/usr/bin/env bash
    set -euo pipefail

    echo "🚀 Starting Python MFLUX server..."
    uv run uvicorn server.server:app --host 127.0.0.1 --port 8000 &
    SERVER_PID=$!

    # Ensure server process is killed on Ctrl+C or script exit
    trap 'echo "🛑 Stopping MFLUX server..."; kill $SERVER_PID 2>/dev/null || true' EXIT

    # Wait until the server responds on port 8000
    until curl -s http://127.0.0.1:8000/docs > /dev/null; do
        sleep 0.5
    done
    echo "✅ Server ready! Executing Node pipeline..."

    node src/main.ts