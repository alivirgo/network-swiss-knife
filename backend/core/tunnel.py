import asyncio
import subprocess
import re
import shutil
import os
from typing import Dict, Any, Optional

TUNNEL_PROCESS: Optional[asyncio.subprocess.Process] = None
TUNNEL_URL: Optional[str] = None
TUNNEL_ERROR: Optional[str] = None

def get_cloudflared_path() -> Optional[str]:
    # Check PATH or common Windows install locations
    found = shutil.which("cloudflared")
    if found:
        return found
    common_paths = [
        r"C:\Program Files (x86)\cloudflared\cloudflared.exe",
        r"C:\Program Files\cloudflared\cloudflared.exe",
        os.path.expanduser(r"~\cloudflared.exe"),
        "/usr/local/bin/cloudflared",
        "/usr/bin/cloudflared",
        "/opt/homebrew/bin/cloudflared"
    ]
    for p in common_paths:
        if os.path.exists(p):
            return p
    return None

async def start_cloudflare_tunnel(local_port: int = 8000) -> Dict[str, Any]:
    global TUNNEL_PROCESS, TUNNEL_URL, TUNNEL_ERROR
    if TUNNEL_PROCESS and TUNNEL_URL:
        return {"success": True, "url": TUNNEL_URL, "status": "ALREADY_RUNNING"}

    bin_path = get_cloudflared_path()
    if not bin_path:
        return {
            "success": False,
            "error": "cloudflared binary not found on host. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        }

    TUNNEL_URL = None
    TUNNEL_ERROR = None

    try:
        cmd = [bin_path, "tunnel", "--url", f"http://localhost:{local_port}"]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        TUNNEL_PROCESS = proc

        # Read stderr/stdout asynchronously for trycloudflare.com URL
        loop = asyncio.get_running_loop()
        url_found_event = asyncio.Event()

        async def read_stream(stream):
            global TUNNEL_URL, TUNNEL_ERROR
            while True:
                line_b = await stream.readline()
                if not line_b:
                    break
                line = line_b.decode("utf-8", errors="ignore")
                match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
                if match and not TUNNEL_URL:
                    TUNNEL_URL = match.group(0)
                    url_found_event.set()

        asyncio.create_task(read_stream(proc.stdout))
        asyncio.create_task(read_stream(proc.stderr))

        # Wait up to 10 seconds for URL
        try:
            await asyncio.wait_for(url_found_event.wait(), timeout=10.0)
            return {
                "success": True,
                "url": TUNNEL_URL,
                "status": "RUNNING",
                "message": f"Cloudflare Tunnel active. Share this URL across your network: {TUNNEL_URL}"
            }
        except asyncio.TimeoutError:
            return {
                "success": False,
                "error": "Timeout waiting for Cloudflare Tunnel URL generation"
            }

    except Exception as e:
        TUNNEL_ERROR = str(e)
        return {"success": False, "error": str(e)}

def stop_cloudflare_tunnel() -> Dict[str, Any]:
    global TUNNEL_PROCESS, TUNNEL_URL, TUNNEL_ERROR
    if TUNNEL_PROCESS:
        try:
            TUNNEL_PROCESS.terminate()
        except Exception:
            pass
        TUNNEL_PROCESS = None
        TUNNEL_URL = None
        return {"success": True, "message": "Cloudflare Tunnel terminated"}
    return {"success": True, "message": "No active tunnel was running"}

def get_tunnel_status() -> Dict[str, Any]:
    bin_path = get_cloudflared_path()
    is_installed = bin_path is not None
    is_active = (TUNNEL_PROCESS is not None) and (TUNNEL_URL is not None)

    return {
        "installed": is_installed,
        "active": is_active,
        "url": TUNNEL_URL,
        "binary_path": bin_path,
        "error": TUNNEL_ERROR
    }
