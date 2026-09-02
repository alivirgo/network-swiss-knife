import asyncio
import socket
import psutil
from typing import List, Dict, Any, Optional
from .lan_scanner import scan_lan

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

def check_local_vpn_interfaces() -> List[Dict[str, Any]]:
    vpn_interfaces = []
    try:
        stats = psutil.net_if_stats()
        addrs = psutil.net_if_addrs()
        
        for iface_name, iface_stat in stats.items():
            lower_name = iface_name.lower()
            is_vpn = any(sig in lower_name for sig in KNOWN_VPN_ADAPTERS)
            
            # Also check if interface is a virtual point-to-point interface
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
        # Requires basic permissions to read network connections
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

async def probe_lan_host_for_vpn(ip: str, timeout: float = 0.5) -> List[Dict[str, Any]]:
    found_ports = []
    for port, name in VPN_PORTS.items():
        try:
            reader, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=timeout)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            found_ports.append({"port": port, "service": name})
        except Exception:
            pass
    return found_ports

async def audit_network_for_vpn(cidr: Optional[str] = None) -> Dict[str, Any]:
    # 1. Scan LAN hosts
    lan_data = await scan_lan(cidr=cidr, concurrency=32)
    hosts = lan_data.get("hosts", [])

    vpn_findings = []
    semaphore = asyncio.Semaphore(16)

    async def inspect_host(h):
        async with semaphore:
            ip = h["ip"]
            ports = await probe_lan_host_for_vpn(ip)
            if ports:
                vpn_findings.append({
                    "ip": ip,
                    "hostname": h["hostname"],
                    "mac": h["mac"],
                    "vendor": h["vendor"],
                    "detected_vpn_ports": ports,
                    "is_self": h.get("is_self", False),
                    "confidence": "HIGH" if len(ports) > 1 else "MEDIUM"
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
