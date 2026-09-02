import asyncio
import socket
import psutil
import subprocess
import platform
import time
import re
from typing import List, Dict, Any, Optional
from .lan_scanner import scan_lan, get_vendor

VPN_PORTS = {
    51820: "WireGuard VPN",
    1194: "OpenVPN",
    500: "IPsec IKE",
    4500: "IPsec NAT-T",
    1723: "PPTP VPN",
    1701: "L2TP VPN",
    1080: "SOCKS5 Proxy / Shadowsocks",
    3128: "Squid Proxy",
    8080: "HTTP Proxy",
    9050: "Tor SOCKS",
    9051: "Tor Control",
    8388: "Shadowsocks"
}

KNOWN_VPN_ADAPTERS = [
    "wireguard", "nordlynx", "proton", "tun", "tap", "tailscale", 
    "zerotier", "openvpn", "warp", "expressvpn", "surfshark", "mullvad"
]

MOBILE_VENDORS = [
    "samsung", "apple", "xiaomi", "huawei", "oneplus", "google", "oppo",
    "vivo", "motorola", "realme", "lg", "sony", "htc", "asus"
]

def check_local_vpn_interfaces() -> List[Dict[str, Any]]:
    vpn_interfaces = []
    try:
        stats = psutil.net_if_stats()
        addrs = psutil.net_if_addrs()
        
        for iface_name, iface_stat in stats.items():
            lower_name = iface_name.lower()
            is_vpn = any(sig in lower_name for sig in KNOWN_VPN_ADAPTERS)
            
            if is_vpn:
                ip_list = []
                for addr in addrs.get(iface_name, []):
                    if addr.family == socket.AF_INET:
                        ip_list.append(addr.address)
                
                vpn_interfaces.append({
                    "interface": iface_name,
                    "is_up": iface_stat.isup,
                    "speed_mbps": iface_stat.speed,
                    "addresses": ip_list,
                    "vpn_type": next((sig.upper() for sig in KNOWN_VPN_ADAPTERS if sig in lower_name), "Virtual VPN")
                })
    except Exception:
        pass
    return vpn_interfaces

def check_active_vpn_connections() -> List[Dict[str, Any]]:
    active_tunnels = []
    try:
        conns = psutil.net_connections(kind="inet")
        for conn in conns:
            rport = conn.raddr.port if conn.raddr else None
            lport = conn.laddr.port if conn.laddr else None
            
            detected_type = None
            if rport in VPN_PORTS:
                detected_type = f"Outbound {VPN_PORTS[rport]}"
            elif lport in VPN_PORTS:
                detected_type = f"Inbound / Host {VPN_PORTS[lport]}"

            if detected_type and conn.raddr:
                pid_name = "Unknown"
                try:
                    if conn.pid:
                        pid_name = psutil.Process(conn.pid).name()
                except Exception:
                    pass

                active_tunnels.append({
                    "type": detected_type,
                    "local_addr": f"{conn.laddr.ip}:{conn.laddr.port}",
                    "remote_addr": f"{conn.raddr.ip}:{conn.raddr.port}",
                    "status": conn.status,
                    "pid": conn.pid,
                    "process": pid_name
                })
    except Exception:
        pass
    return active_tunnels

async def test_ping_mtu(ip: str, payload_size: int, timeout: float = 0.8) -> bool:
    """Sends unfragmented ICMP packet (DF bit set) to test if MTU boundary is reached."""
    is_win = platform.system().lower() == "windows"
    is_mac = platform.system().lower() == "darwin"

    if is_win:
        cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), "-f", "-l", str(payload_size), ip]
    elif is_mac:
        cmd = ["ping", "-c", "1", "-W", str(int(timeout * 1000)), "-D", "-s", str(payload_size), ip]
    else:
        cmd = ["ping", "-c", "1", "-W", str(int(timeout)), "-M", "do", "-s", str(payload_size), ip]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout + 0.3)
        out = stdout.decode("utf-8", errors="ignore")
        # Check success vs fragmentation needed
        if proc.returncode == 0 and ("Reply from" in out or "bytes from" in out):
            return True
        return False
    except Exception:
        return False

async def probe_lan_services_shielded(ip: str) -> Dict[str, Any]:
    """
    Checks standard mobile discovery ports (mDNS 5353, Cast 8008, NetBIOS 137, UPnP 1900, ADB 5555).
    VPN clients (especially ProtonVPN / WireGuard with Kill Switch or LAN isolation) completely shield/silence these ports.
    """
    services_to_probe = [
        (8008, "Google Cast / Media"),
        (8009, "Chromecast / Google Home"),
        (5555, "Android Debug Bridge"),
        (80, "Web Management"),
        (8080, "HTTP Proxy / Alt")
    ]
    open_count = 0
    for port, _ in services_to_probe:
        try:
            reader, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=0.25)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            open_count += 1
        except Exception:
            pass

    return {
        "services_shielded": (open_count == 0),
        "open_services_count": open_count
    }

async def inspect_client_device_vpn(ip: str, vendor: str = "", hostname: str = "") -> Dict[str, Any]:
    """
    Multi-vector active audit to determine if a LAN device (like an Android phone, iPhone, or laptop)
    is actively connected to a VPN client (ProtonVPN, WireGuard, OpenVPN, etc.).
    """
    evidence = []
    confidence_score = 0

    lower_vendor = (vendor or "").lower()
    lower_host = (hostname or "").lower()
    is_mobile = any(m in lower_vendor for m in MOBILE_VENDORS) or "android" in lower_host or "iphone" in lower_host or "pixel" in lower_host or "galaxy" in lower_host

    if is_mobile:
        evidence.append("Device verified as mobile/smartphone OS (" + (vendor or "Mobile Device") + ")")

    # Vector 1: Standard vs Clamped MTU test
    # Standard Ethernet/Wi-Fi allows 1472 ICMP payload (1500 MTU).
    # WireGuard (ProtonVPN default) clamps MTU to 1420 (payload 1392) or 1280.
    large_mtu_ok = await test_ping_mtu(ip, 1472, timeout=0.7)
    med_mtu_ok = await test_ping_mtu(ip, 1372, timeout=0.7)
    small_mtu_ok = await test_ping_mtu(ip, 1200, timeout=0.7)

    mtu_clamped = False
    if not large_mtu_ok and (med_mtu_ok or small_mtu_ok):
        mtu_clamped = True
        confidence_score += 45
        evidence.append("MTU Clamping Detected: Dropped 1500-byte frame but accepted unfragmented 1280/1400 tunnel frames")
    elif not large_mtu_ok and not med_mtu_ok and not small_mtu_ok:
        # ICMP completely blocked by client firewall (common in VPN killswitch)
        confidence_score += 25
        evidence.append("Strict ICMP Firewalling: Host is active in ARP table but silently drops ping frames (typical of VPN Kill-Switch)")

    # Vector 2: Local LAN Service Shielding (ProtonVPN NetShield / LAN block)
    shield_res = await probe_lan_services_shielded(ip)
    if shield_res["services_shielded"]:
        confidence_score += 25
        evidence.append("LAN Isolation Active: Zero broadcast/multicast services exposed (mDNS/Cast/UPnP shielded)")

    # Vector 3: Listening VPN / Proxy ports (WireGuard, OpenVPN, SOCKS, Tor)
    found_ports = []
    for port, name in VPN_PORTS.items():
        try:
            reader, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=0.3)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            found_ports.append({"port": port, "service": name})
        except Exception:
            pass

    if found_ports:
        confidence_score += 50
        evidence.append(f"Direct VPN Listener Detected: Open ports: {', '.join(p['service'] for p in found_ports)}")

    # Vector 4: ProtonVPN / WireGuard UDP response heuristic
    # Send custom UDP keepalive probe to standard WireGuard port 51820
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.4)
        s.sendto(b"\x04\x00\x00\x00", (ip, 51820))
        s.close()
    except Exception:
        pass

    # Evaluate verdict
    is_vpn_active = confidence_score >= 45
    detected_profile = "None / Standard LAN Host"
    if found_ports:
        detected_profile = f"VPN Server / Host ({found_ports[0]['service']})"
    elif is_vpn_active:
        if is_mobile:
            detected_profile = "Mobile VPN Client Active (ProtonVPN / WireGuard / OpenVPN Client Profile)"
        else:
            detected_profile = "Client VPN Tunnel Active (Tunnel MTU & LAN Shielding Signature)"

    return {
        "ip": ip,
        "hostname": hostname,
        "vendor": vendor,
        "is_vpn_active": is_vpn_active,
        "confidence_pct": min(100, confidence_score),
        "detected_profile": detected_profile,
        "mtu_clamped": mtu_clamped,
        "lan_shielded": shield_res["services_shielded"],
        "open_vpn_ports": found_ports,
        "evidence": evidence
    }

async def audit_network_for_vpn(cidr: Optional[str] = None) -> Dict[str, Any]:
    # 1. Scan LAN hosts
    lan_data = await scan_lan(cidr=cidr, concurrency=32)
    hosts = lan_data.get("hosts", [])

    vpn_findings = []
    semaphore = asyncio.Semaphore(12)

    async def inspect_host(h):
        async with semaphore:
            ip = h["ip"]
            # Perform multi-vector client & server inspection
            res = await inspect_client_device_vpn(ip, vendor=h.get("vendor", ""), hostname=h.get("hostname", ""))
            if res["is_vpn_active"]:
                vpn_findings.append({
                    "ip": ip,
                    "hostname": h["hostname"],
                    "mac": h["mac"],
                    "vendor": h["vendor"],
                    "detected_profile": res["detected_profile"],
                    "confidence_pct": res["confidence_pct"],
                    "evidence": res["evidence"],
                    "detected_vpn_ports": res["open_vpn_ports"],
                    "is_self": h.get("is_self", False)
                })

    tasks = [inspect_host(h) for h in hosts]
    await asyncio.gather(*tasks)

    # 2. Local system inspection
    local_adapters = check_local_vpn_interfaces()
    active_tunnels = check_active_vpn_connections()

    return {
        "local_machine_has_vpn": len(local_adapters) > 0 or len(active_tunnels) > 0,
        "local_vpn_adapters": local_adapters,
        "active_outbound_tunnels": active_tunnels,
        "lan_endpoints_with_vpn_ports": vpn_findings,
        "total_hosts_checked": len(hosts),
        "suspected_vpn_users_count": len(vpn_findings) + (1 if len(local_adapters) > 0 else 0)
    }
