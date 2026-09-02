import asyncio
import subprocess
import platform
import re
import socket
import json
import urllib.request
from typing import List, Dict, Any

GEO_CACHE = {}

def get_ip_geo(ip: str) -> Dict[str, Any]:
    if ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("172.") or ip == "127.0.0.1":
        return {"country": "Local LAN", "city": "Private Network", "isp": "Internal", "as": "Private"}

    if ip in GEO_CACHE:
        return GEO_CACHE[ip]

    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,country,city,isp,as,lat,lon"
        req = urllib.request.Request(url, headers={"User-Agent": "NSK/2.0"})
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            data = json.loads(resp.read().decode())
            if data.get("status") == "success":
                info = {
                    "country": data.get("country", "Unknown"),
                    "city": data.get("city", "Unknown"),
                    "isp": data.get("isp", "Unknown"),
                    "as": data.get("as", "Unknown"),
                    "lat": data.get("lat", 0),
                    "lon": data.get("lon", 0)
                }
                GEO_CACHE[ip] = info
                return info
    except Exception:
        pass
    
    return {"country": "Internet", "city": "-", "isp": "Transit Provider", "as": "-", "lat": 0, "lon": 0}

async def run_traceroute(target: str, max_hops: int = 20) -> Dict[str, Any]:
    try:
        dest_ip = socket.gethostbyname(target)
    except Exception as e:
        return {"error": f"Cannot resolve {target}: {str(e)}", "hops": []}

    is_win = platform.system().lower() == "windows"
    cmd = ["tracert", "-d", "-h", str(max_hops), "-w", "700", target] if is_win else ["traceroute", "-n", "-m", str(max_hops), "-w", "1", target]

    hops: List[Dict[str, Any]] = []

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        lines = stdout.decode("utf-8", errors="ignore").splitlines()

        for line in lines:
            # Match hop number, latency and IP
            ip_match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line)
            hop_match = re.match(r"^\s*(\d{1,2})\s+", line)
            
            if ip_match and hop_match:
                hop_num = int(hop_match.group(1))
                ip = ip_match.group(1)
                
                # Extract latencies (e.g. 12 ms or <1 ms)
                latencies = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)\s*ms", line)]
                avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else 0.0

                geo = get_ip_geo(ip)
                hops.append({
                    "hop": hop_num,
                    "ip": ip,
                    "latency_ms": avg_latency,
                    "country": geo.get("country", "Unknown"),
                    "city": geo.get("city", "Unknown"),
                    "isp": geo.get("isp", "Unknown"),
                    "as": geo.get("as", "Unknown"),
                    "lat": geo.get("lat", 0),
                    "lon": geo.get("lon", 0)
                })
            elif hop_match and ("*" in line or "Request timed out" in line):
                hop_num = int(hop_match.group(1))
                hops.append({
                    "hop": hop_num,
                    "ip": "* * *",
                    "latency_ms": 0,
                    "country": "-",
                    "city": "-",
                    "isp": "Firewalled / No ICMP Reply",
                    "as": "-",
                    "lat": 0,
                    "lon": 0
                })
    except Exception as e:
        return {"error": f"Traceroute error: {str(e)}", "hops": hops}

    return {
        "target": target,
        "destination_ip": dest_ip,
        "total_hops": len(hops),
        "hops": hops
    }
