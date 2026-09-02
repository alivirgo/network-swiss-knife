#!/usr/bin/env bash
# Network Swiss Knife (NSK) - Double-click launcher for Linux
cd "$(dirname "$0")" || exit 1

echo "================================================="
echo "       Network Swiss Knife (NSK) (Linux)         "
echo "================================================="

if command -v python3 &>/dev/null; then
    python3 start.py
elif command -v python &>/dev/null; then
    python start.py
else
    echo ""
    echo "[!] Error: Python 3 is not installed or not in PATH."
    echo "Please install Python 3 (e.g. sudo apt install python3 python3-pip)"
    echo ""
    read -p "Press [Enter] to close..."
fi
