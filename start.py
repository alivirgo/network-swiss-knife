#!/usr/bin/env python3
"""
Network Swiss Knife (NSK) 2.5 - Unified Cross-Platform Launcher
Auto-installs dependencies on first run and opens default browser.
"""

import os
import sys
import subprocess
import webbrowser
import time
import socket

# Ensure working directory is always the script directory (crucial for double-click)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

REQUIRED_PACKAGES = {
    "fastapi": "fastapi>=0.115.0",
    "uvicorn": "uvicorn>=0.30.0",
    "pydantic": "pydantic>=2.8.0",
    "dns": "dnspython>=2.6.0",
    "psutil": "psutil>=6.0.0"
}

def ensure_dependencies():
    missing = []
    for mod_name, pkg_spec in REQUIRED_PACKAGES.items():
        try:
            __import__(mod_name)
        except ImportError:
            missing.append(pkg_spec)

    if missing:
        print(f"[*] First-time setup: Installing required networking components ({', '.join(missing)})...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
            print("[+] Dependencies installed successfully!\n")
        except Exception as e:
            print(f"[!] Warning: Could not auto-install dependencies: {e}")
            print("[!] Please run: pip install -r backend/requirements.txt\n")

def check_port_open(port: int, host: str = "127.0.0.1") -> bool:
    s = socket.socket(socket.AF_INET, socket.STREAM if hasattr(socket, "STREAM") else socket.SOCK_STREAM)
    try:
        s.settimeout(0.5)
        s.connect((host, port))
        s.close()
        return True
    except Exception:
        return False

def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def print_banner():
    banner = r"""
===================================================================
    _   _______ __ __
   / | / / ___// //_/  NETWORK SWISS KNIFE (NSK) 2.0
  /  |/ /\__ \/ ,<     Cross-Platform Networking Toolkit
 / /|  /___/ / /| |
/_/ |_//____/_/ |_|
===================================================================
"""
    print(banner)

def main():
    print_banner()
    ensure_dependencies()

    backend_dir = os.path.join(BASE_DIR, "backend")
    port = 8000
    lan_ip = get_lan_ip()

    print(f"[*] Starting Network Swiss Knife (NSK) Engine on port {port}...")
    print(f"[*] Local access:         http://localhost:{port}")
    print(f"[*] Android / LAN access: http://{lan_ip}:{port}")
    print(f"[*] Press Ctrl+C to stop the application\n")

    def open_browser():
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{port}")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    import uvicorn
    sys.path.insert(0, backend_dir)
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info", app_dir=backend_dir)

if __name__ == "__main__":
    main()
