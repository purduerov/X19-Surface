#!/bin/bash
set -e

# Get script directory and repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GO2RTC_DIR="$REPO_ROOT/src/zmq/python/videos"
GO2RTC_BIN="$GO2RTC_DIR/go2rtc"

mkdir -p "$GO2RTC_DIR"

# Check if go2rtc executable exists
if [ ! -f "$GO2RTC_BIN" ]; then
    echo "Downloading go2rtc..."
    arch=$(uname -m)
    if [ "$arch" == "x86_64" ]; then
        echo "Architecture: amd64"
        wget -O "$GO2RTC_BIN" https://github.com/AlexxIT/go2rtc/releases/download/v1.9.14/go2rtc_linux_amd64
    elif [ "$arch" == "aarch64" ]; then
        echo "Architecture: arm64"
        wget -O "$GO2RTC_BIN" https://github.com/AlexxIT/go2rtc/releases/download/v1.9.14/go2rtc_linux_arm64
    else
        echo "Unsupported architecture: $arch"
        exit 1
    fi
    chmod +x "$GO2RTC_BIN"
    echo "go2rtc downloaded successfully to $GO2RTC_BIN"
else
    echo "go2rtc executable found in $GO2RTC_BIN"
    chmod +x "$GO2RTC_BIN"
fi

