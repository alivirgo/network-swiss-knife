import asyncio
import socket
import time
import platform
import statistics
from typing import List, Dict, Any, Optional

POPULAR_DNS_SERVERS = [
    {"name": "Cloudflare Primary", "ip": "1.1.1.1", "provider": "Cloudflare"},
    {"name": "Cloudflare Security", "ip": "1.1.1.2", "provider": "Cloudflare"},
    {"name": "Google Primary", "ip": "8.8.8.8", "provider": "Google"},
    {"name": "Google Secondary", "ip": "8.8.4.4", "provider": "Google"},
    {"name": "Quad9 (Malware Block)", "ip": "9.9.9.9", "provider": "Quad9"},
    {"name": "OpenDNS Home", "ip": "208.67.222.222", "provider": "Cisco OpenDNS"},
    {"name": "AdGuard Public", "ip": "94.140.14.14", "provider": "AdGuard"},
    {"name": "Level3 Core", "ip": "4.2.2.2", "provider": "CenturyLink/Level3"}
]

def get_default_gateway() -> str:
    try:
        if platform.system().lower() == "windows":
            import subprocess
            out = subprocess.check_output("ipconfig", shell=True).decode("utf-8", errors="ignore")
            for line in out.splitlines():
                if "Default Gateway" in line or "Passerelle par d" in line:
                    parts = line.split(":")
                    if len(parts) > 1:
                        gw = parts[1].strip()
                        if gw and not gw.startswith("fe80") and "." in gw:
                            return gw
        else:
            with open("/proc/net/route") as f:
                for line in f.readlines()[1:]:
                    fields = line.strip().split()
                    if fields[1] == "00000000":
                        gw_hex = fields[2]
                        import struct
                        return socket.inet_ntoa(struct.pack("<L", int(gw_hex, 16)))
    except Exception:
        pass
    return "1.1.1.1"

async def measure_single_ping(target: str, port: int = 53, timeout: float = 1.0) -> Optional[float]:
    start = time.perf_counter()
    try:
        conn = asyncio.open_connection(target, port)
        reader, writer = await asyncio.wait_for(conn, timeout=timeout)
        duration_ms = (time.perf_counter() - start) * 1000
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return round(duration_ms, 2)
    except Exception:
        # Fallback to ICMP ping
        param = "-n" if platform.system().lower() == "windows" else "-c"
        timeout_param = "-w" if platform.system().lower() == "windows" else "-W"
        timeout_val = "600" if platform.system().lower() == "windows" else "1"
        try:
            start_icmp = time.perf_counter()
            proc = await asyncio.create_subprocess_exec(
                "ping", param, "1", timeout_param, timeout_val, target,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await asyncio.wait_for(proc.wait(), timeout=timeout)
            if proc.returncode == 0:
                return round((time.perf_counter() - start_icmp) * 1000, 2)
        except Exception:
            pass
        return None

async def ping_series(target: str, count: int = 5, delay: float = 0.2) -> Dict[str, Any]:
    samples: List[float] = []
    lost = 0

    for _ in range(count):
        lat = await measure_single_ping(target)
        if lat is not None:
            samples.append(lat)
        else:
            lost += 1
        if delay > 0:
            await asyncio.sleep(delay)

    packet_loss = round((lost / count) * 100, 1)
    if samples:
        min_ms = round(min(samples), 2)
        max_ms = round(max(samples), 2)
        avg_ms = round(statistics.mean(samples), 2)
        jitter_ms = round(statistics.stdev(samples), 2) if len(samples) > 1 else 0.0
    else:
        min_ms = max_ms = avg_ms = jitter_ms = 0.0

    return {
        "target": target,
        "packets_sent": count,
        "packets_received": len(samples),
        "packet_loss_pct": packet_loss,
        "min_ms": min_ms,
        "max_ms": max_ms,
        "avg_ms": avg_ms,
        "jitter_ms": jitter_ms,
        "history": samples
    }

async def benchmark_dns_ping() -> List[Dict[str, Any]]:
    results = []

    async def probe_dns(item):
        stats = await ping_series(item["ip"], count=3, delay=0.1)
        results.append({
            "name": item["name"],
            "ip": item["ip"],
            "provider": item["provider"],
            "avg_ms": stats["avg_ms"],
            "min_ms": stats["min_ms"],
            "max_ms": stats["max_ms"],
            "packet_loss_pct": stats["packet_loss_pct"],
            "status": "online" if stats["packets_received"] > 0 else "offline"
        })

    tasks = [probe_dns(dns) for dns in POPULAR_DNS_SERVERS]
    await asyncio.gather(*tasks)

    results.sort(key=lambda x: (x["status"] != "online", x["avg_ms"] if x["avg_ms"] > 0 else 9999))
    return results

async def monitor_isp_hop(custom_target: Optional[str] = None) -> Dict[str, Any]:
    gw = get_default_gateway()
    isp_target = custom_target if custom_target else "1.1.1.1"

    gw_task = ping_series(gw, count=4, delay=0.15)
    wan_task = ping_series(isp_target, count=4, delay=0.15)

    gw_res, wan_res = await asyncio.gather(gw_task, wan_task)

    # Health analysis
    quality = "EXCELLENT"
    if wan_res["packet_loss_pct"] > 15 or wan_res["avg_ms"] > 150:
        quality = "POOR"
    elif wan_res["packet_loss_pct"] > 0 or wan_res["avg_ms"] > 70 or wan_res["jitter_ms"] > 25:
        quality = "MODERATE"

    return {
        "gateway": gw,
        "gateway_ping": gw_res,
        "isp_target": isp_target,
        "isp_ping": wan_res,
        "quality": quality,
        "timestamp": time.time()
    }
