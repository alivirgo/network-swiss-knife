import asyncio
import socket
import subprocess
import platform
import re
import ipaddress
import time
from typing import List, Dict, Any, Optional

OUI_SAMPLE = {
    "00:50:56": "VMware", "00:0c:29": "VMware", "00:05:69": "VMware",
    "b8:27:eb": "Raspberry Pi", "dc:a6:32": "Raspberry Pi", "e4:5f:01": "Raspberry Pi",
    "f0:18:98": "Apple", "3c:22:fb": "Apple", "a4:83:e7": "Apple", "bc:d0:74": "Apple", "f8:ff:c2": "Apple",
    "00:1a:2b": "Cisco", "00:00:0c": "Cisco", "f4:0f:1b": "Cisco",
    "00:e0:4c": "Realtek", "50:3e:aa": "Intel", "00:15:00": "Intel", "a0:36:bc": "Intel",
    "24:4b:fe": "Espressif (IoT)", "30:ae:a4": "Espressif (IoT)", "84:cc:a8": "Espressif (IoT)",
    "00:11:32": "Synology", "00:1e:06": "WNC", "fc:ec:da": "Ubiquiti", "78:8a:20": "Ubiquiti",
    "d8:07:b6": "TP-Link", "50:c7:bf": "TP-Link", "e8:48:b8": "TP-Link",
    "00:26:86": "Netgear", "20:e5:2a": "Netgear", "c4:04:15": "Netgear",
    "08:00:27": "Oracle VirtualBox", "52:54:00": "QEMU / KVM"
}

def get_vendor(mac: str) -> str:
    if not mac:
        return "Unknown"
    clean_mac = mac.lower().replace("-", ":")
    prefix = ":".join(clean_mac.split(":")[:3])
    return OUI_SAMPLE.get(prefix, "Network Device")

def get_local_ip_and_subnet() -> tuple[str, str]:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        # Default to /24 for local subnet
        parts = local_ip.split(".")
        subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
        return local_ip, subnet
    except Exception:
        return "127.0.0.1", "127.0.0.0/24"

def get_arp_table() -> Dict[str, str]:
    arp_dict = {}
    try:
        os_type = platform.system().lower()
        cmd = ["arp", "-a"]
        output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=2).decode("utf-8", errors="ignore")
        for line in output.splitlines():
            # Pattern matches IP and MAC
            match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F:-]{11,17})", line)
            if match:
                ip, mac = match.groups()
                mac = mac.replace("-", ":").lower()
                if mac != "ff:ff:ff:ff:ff:ff":
                    arp_dict[ip] = mac
    except Exception:
        pass
    return arp_dict

async def ping_ip(ip: str, timeout: float = 0.6) -> Optional[Dict[str, Any]]:
    start = time.perf_counter()
    # Try common management ports first (fast TCP ping sweep)
    for port in [80, 443, 22, 445, 139, 53, 8080]:
        try:
            reader, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=0.25)
            latency = round((time.perf_counter() - start) * 1000, 1)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            return {"ip": ip, "status": "online", "latency_ms": latency, "open_port": port}
        except Exception:
            pass

    # ICMP ping via OS subprocess if ports didn't reply
    param = "-n" if platform.system().lower() == "windows" else "-c"
    timeout_param = "-w" if platform.system().lower() == "windows" else "-W"
    timeout_val = "400" if platform.system().lower() == "windows" else "1"
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", param, "1", timeout_param, timeout_val, ip,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await asyncio.wait_for(proc.wait(), timeout=timeout)
        if proc.returncode == 0:
            latency = round((time.perf_counter() - start) * 1000, 1)
            return {"ip": ip, "status": "online", "latency_ms": latency, "open_port": None}
    except Exception:
        pass
    return None

async def resolve_hostname(ip: str) -> str:
    try:
        loop = asyncio.get_running_loop()
        host = await loop.run_in_executor(None, socket.gethostbyaddr, ip)
        return host[0]
    except Exception:
        return ""

async def scan_lan(cidr: Optional[str] = None, concurrency: int = 64) -> Dict[str, Any]:
    local_ip, auto_subnet = get_local_ip_and_subnet()
    target_cidr = cidr if cidr else auto_subnet

    try:
        net = ipaddress.ip_network(target_cidr, strict=False)
        # Limit subnet scan to /24 max hosts for safety (254 hosts)
        hosts = [str(h) for h in net.hosts()][:254]
    except Exception as e:
        return {"error": f"Invalid CIDR subnet: {str(e)}", "hosts": []}

    arp_map = get_arp_table()
    online_hosts = []
    semaphore = asyncio.Semaphore(concurrency)

    async def check_host(ip: str):
        async with semaphore:
            res = await ping_ip(ip)
            if res or ip in arp_map or ip == local_ip:
                mac = arp_map.get(ip, "Local Adapter" if ip == local_ip else "Unknown")
                vendor = get_vendor(mac)
                hostname = await resolve_hostname(ip)
                latency = res["latency_ms"] if res else 0.5
                
                is_gateway = ip.endswith(".1")
                device_type = "Router / Gateway" if is_gateway else ("Workstation / Server" if res and res.get("open_port") in [22, 3389, 445] else "Endpoint")
                
                online_hosts.append({
                    "ip": ip,
                    "mac": mac,
                    "vendor": vendor,
                    "hostname": hostname or ("Default Gateway" if is_gateway else (socket.gethostname() if ip == local_ip else "Generic Host")),
                    "latency_ms": latency,
                    "is_self": (ip == local_ip),
                    "is_gateway": is_gateway,
                    "device_type": device_type
                })

    tasks = [check_host(ip) for ip in hosts]
    await asyncio.gather(*tasks)

    # Sort so Gateway is first, then self, then IP
    online_hosts.sort(key=lambda x: (not x["is_gateway"], not x["is_self"], socket.inet_aton(x["ip"])))

    return {
        "local_ip": local_ip,
        "scanned_subnet": target_cidr,
        "total_probed": len(hosts),
        "online_count": len(online_hosts),
        "hosts": online_hosts
    }
