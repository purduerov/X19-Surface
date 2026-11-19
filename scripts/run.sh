#!/bin/bash
set -e

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMPILE_PROTOS=false

# Parse command line flags
while getopts "p" opt; do
  case $opt in
    p)
      COMPILE_PROTOS=true
      ;;
    *)
      echo "Usage: $0 [-p]"
      echo "  -p : Compile protobuf schemas before running"
      exit 1
      ;;
  esac
done

# If -p flag was passed, run the schema compiler first
if [ "$COMPILE_PROTOS" = true ]; then
  echo "=== Compiling Protobuf Schemas ==="
  "$REPO_ROOT/scripts/compile_protos.sh"
  echo ""
fi

# Run the hello_pub test script using the venv python and repository root in PYTHONPATH
echo "=== Running hello_pub.py ==="
export PYTHONPATH="$REPO_ROOT"
PYTHONPATH="$REPO_ROOT" "$REPO_ROOT/.venv/bin/python" "$REPO_ROOT/testing/hello_pub.py"
