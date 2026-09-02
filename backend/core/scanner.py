import asyncio
import socket
import time
from typing import List, Dict, Any, Optional

COMMON_PORTS = {
    20: "FTP Data", 21: "FTP Control", 22: "SSH", 23: "Telnet", 25: "SMTP",
    53: "DNS", 67: "DHCP Server", 68: "DHCP Client", 69: "TFTP", 80: "HTTP",
    110: "POP3", 119: "NNTP", 123: "NTP", 135: "RPC", 137: "NetBIOS Name",
    138: "NetBIOS Datagram", 139: "NetBIOS Session", 143: "IMAP", 161: "SNMP",
    162: "SNMP Trap", 389: "LDAP", 443: "HTTPS", 445: "SMB / Active Directory",
    465: "SMTPS", 500: "ISAKMP / IPsec", 514: "Syslog", 587: "SMTP Submission",
    636: "LDAPS", 873: "Rsync", 993: "IMAPS", 995: "POP3S", 1080: "SOCKS5 Proxy",
    1194: "OpenVPN", 1433: "MSSQL", 1521: "Oracle DB", 1723: "PPTP VPN",
    2049: "NFS", 2082: "cPanel", 2083: "cPanel SSL", 2181: "ZooKeeper",
    3000: "Node / React Dev", 3306: "MySQL / MariaDB", 3389: "RDP (Remote Desktop)",
    4500: "IPsec NAT-T", 5000: "Flask / Dev Server", 51820: "WireGuard VPN",
    5432: "PostgreSQL", 5672: "RabbitMQ", 5900: "VNC", 6379: "Redis",
    8000: "Django / Dev HTTP", 8080: "HTTP Alt / Proxy / Tomcat",
    8443: "HTTPS Alt", 8888: "Jupyter / Web Alt", 9000: "Portainer / SonarQube",
    9090: "Prometheus", 9200: "Elasticsearch", 11211: "Memcached", 27017: "MongoDB"
}

PRESETS = {
    "top20": [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080],
    "top100": [
        20, 21, 22, 23, 25, 53, 67, 68, 69, 80, 110, 119, 123, 135, 137, 138, 139, 143, 161, 162,
        389, 443, 445, 465, 500, 514, 587, 636, 873, 993, 995, 1080, 1194, 1433, 1521, 1723, 2049,
        2082, 2083, 2181, 3000, 3128, 3306, 3389, 4000, 4200, 4443, 4500, 5000, 5432, 5672, 5900,
        5901, 6000, 6379, 6667, 7000, 7001, 8000, 8080, 8081, 8443, 8888, 9000, 9042, 9090, 9092,
        9100, 9200, 9300, 10000, 11211, 14000, 27017, 27018, 50000, 51820
    ],
    "web": [80, 81, 443, 2082, 2083, 3000, 5000, 8000, 8008, 8080, 8081, 8443, 8888, 9000],
    "database": [1433, 1521, 3306, 5432, 6379, 7000, 9042, 9200, 11211, 27017, 28017],
    "vpn": [500, 1194, 1701, 1723, 4500, 51820]
}

def get_risk_level(port: int, service: str) -> str:
    high_risk_ports = {21, 23, 135, 137, 138, 139, 445, 3389, 5900, 6379, 11211, 27017}
    medium_risk_ports = {22, 25, 110, 143, 1433, 1521, 3306, 5432}
    if port in high_risk_ports:
        return "HIGH"
    if port in medium_risk_ports:
        return "MEDIUM"
    return "LOW"

async def grab_banner(host: str, port: int, timeout: float = 1.2) -> str:
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=timeout
        )
        banner = ""
        # For HTTP/HTTPS ports send a probe
        if port in [80, 8080, 8000, 3000, 5000]:
            writer.write(b"HEAD / HTTP/1.1\r\nHost: " + host.encode() + b"\r\nUser-Agent: ShinyDoodle/2.0\r\n\r\n")
            await writer.drain()
        try:
            data = await asyncio.wait_for(reader.read(512), timeout=0.8)
            banner = data.decode("utf-8", errors="ignore").strip().splitlines()[0] if data else ""
        except Exception:
            pass
        writer.close()
        await writer.wait_closed()
        return banner[:120]
    except Exception:
        return ""

async def scan_single_port(host: str, port: int, timeout: float = 1.0, grab_banners: bool = True) -> Optional[Dict[str, Any]]:
    start_time = time.perf_counter()
    try:
        conn = asyncio.open_connection(host, port)
        reader, writer = await asyncio.wait_for(conn, timeout=timeout)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass

        service_name = COMMON_PORTS.get(port, "Unknown")
        banner = ""
        if grab_banners:
            banner = await grab_banner(host, port, timeout=0.8)

        risk = get_risk_level(port, service_name)

        return {
            "port": port,
            "status": "open",
            "protocol": "TCP",
            "service": service_name,
            "banner": banner,
            "latency_ms": latency_ms,
            "risk": risk
        }
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return None

async def scan_ports(
    target: str,
    ports: List[int],
    concurrency: int = 150,
    timeout: float = 1.0,
    grab_banners: bool = True
) -> Dict[str, Any]:
    start_all = time.perf_counter()
    try:
        ip = socket.gethostbyname(target)
    except socket.gaierror as e:
        return {"error": f"Failed to resolve host '{target}': {str(e)}", "results": []}

    semaphore = asyncio.Semaphore(concurrency)
    results = []

    async def sem_scan(p):
        async with semaphore:
            res = await scan_single_port(ip, p, timeout=timeout, grab_banners=grab_banners)
            if res:
                results.append(res)

    tasks = [sem_scan(p) for p in sorted(set(ports))]
    await asyncio.gather(*tasks)

    results.sort(key=lambda x: x["port"])
    total_time = round(time.perf_counter() - start_all, 2)

    return {
        "target": target,
        "ip": ip,
        "scanned_ports_count": len(ports),
        "open_ports_count": len(results),
        "scan_time_seconds": total_time,
        "results": results
    }
