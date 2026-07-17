#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Get the script's directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Define paths
PROTO_DIR="$REPO_ROOT/proto"
CPP_OUT_DIR="$REPO_ROOT/src/zmq/protocols/cpp"
PYTHON_OUT_DIR="$REPO_ROOT/src/zmq/protocols/python"

# Ensure output directories exist
mkdir -p "$CPP_OUT_DIR"
mkdir -p "$PYTHON_OUT_DIR"

# Check if protoc compiler is installed
if ! command -v protoc &> /dev/null; then
    echo "Error: 'protoc' (Protocol Buffer Compiler) is not installed."
    echo "Please run 'sudo apt install protobuf-compiler' (Debian/Ubuntu) or equivalent."
    exit 1
fi

echo "Compiling Protobuf schemas..."

# Compile C++ and Python bindings
protoc \
    --proto_path="$PROTO_DIR" \
    --cpp_out="$CPP_OUT_DIR" \
    --python_out="$PYTHON_OUT_DIR" \
    "$PROTO_DIR"/*.proto

# Create __init__.py in the python output dir to expose as Python package
touch "$PYTHON_OUT_DIR/__init__.py"

echo "Protobuf compiled successfully!"
echo "  C++ output:    $CPP_OUT_DIR"
echo "  Python output: $PYTHON_OUT_DIR"
