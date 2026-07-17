#!/bin/bash
set -e

# Get the script's directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Purdue ROV ZMQ System Setup ==="

# Check package manager and install dependencies
if command -v apt-get &> /dev/null; then
    echo "Detected Debian/Ubuntu system. Installing protobuf-compiler, libzmq, and build tools..."
    sudo apt-get update
    sudo apt-get install -y protobuf-compiler libzmq3-dev build-essential cmake
else
    echo "Warning: apt-get not found. Please make sure the following are installed manually:"
    echo "  - protoc (Protobuf Compiler)"
    echo "  - ZeroMQ development libraries (libzmq / cppzmq)"
    echo "  - CMake & Build Tools (gcc, make)"
fi

# Install Python requirements
echo "Installing Python dependencies..."
pip install -r "$REPO_ROOT/requirements.txt"

# Make compile script executable
chmod +x "$SCRIPT_DIR/compile_protos.sh"

echo "Setup complete! Run scripts/compile_protos.sh to compile your schemas."
