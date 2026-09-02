#!/usr/bin/env bash
# Shiny Doodle Network Swiss Knife - Double-click launcher for macOS
cd "$(dirname "$0")" || exit 1

echo "================================================="
echo "  Shiny Doodle Network Swiss Knife 2.0 (macOS)   "
echo "================================================="

if command -v python3 &>/dev/null; then
    python3 start.py
elif command -v python &>/dev/null; then
    python start.py
else
    echo ""
    echo "[!] Error: Python 3 is not installed or not in PATH."
    echo "Please install Python 3 via brew (brew install python3) or from python.org"
    echo ""
    read -p "Press [Enter] to close..."
fi
