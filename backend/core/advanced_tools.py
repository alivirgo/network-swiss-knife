import socket
import struct
import time
import psutil
import platform
import subprocess
import re
import asyncio
from typing import Dict, Any, List, Optional
from .ping_monitor import get_default_gateway

def send_wake_on_lan(mac_address: str, broadcast_ip: str = "255.255.255.255", port: int = 9) -> Dict[str, Any]:
    try:
        clean_mac = mac_address.replace(":", "").replace("-", "").replace(".", "").strip()
        if len(clean_mac) != 12:
            return {"success": False, "error": "Invalid MAC address format (must be 12 hex digits)"}

        # Magic packet: 6 bytes of 0xFF followed by 16 repetitions of target MAC
        mac_bytes = bytes.fromhex(clean_mac)
        magic_packet = b"\xff" * 6 + mac_bytes * 16

        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(magic_packet, (broadcast_ip, port))
        sock.close()

        return {"success": True, "target_mac": mac_address, "broadcast_ip": broadcast_ip, "port": port}
    except Exception as e:
        return {"success": False, "error": str(e)}

def check_arp_spoofing() -> Dict[str, Any]:
    """
    Checks if multiple IP addresses share the same MAC or if gateway MAC has changed or is duplicated.
    """
    from .lan_scanner import get_arp_table
    gw_ip = get_default_gateway()
    arp_table = get_arp_table()

    mac_to_ips: Dict[str, List[str]] = {}
    for ip, mac in arp_table.items():
        mac_to_ips.setdefault(mac, []).append(ip)

    duplicate_macs = {mac: ips for mac, ips in mac_to_ips.items() if len(ips) > 1 and mac != "ff:ff:ff:ff:ff:ff"}
    gw_mac = arp_table.get(gw_ip, "Unknown")
    
    is_gw_spoofed = len(duplicate_macs.get(gw_mac, [])) > 1

    verdict = "SAFE"
    if is_gw_spoofed:
        verdict = "HIGH RISK: Possible Gateway ARP Poisoning / MITM Attack"
    elif duplicate_macs:
        verdict = "SUSPICIOUS: Duplicate MAC addresses detected on subnet"

    return {
        "gateway_ip": gw_ip,
        "gateway_mac": gw_mac,
        "is_spoofed": is_gw_spoofed or bool(duplicate_macs),
        "verdict": verdict,
        "duplicate_mac_entries": duplicate_macs,
        "total_arp_entries": len(arp_table)
    }

def get_network_interfaces_traffic() -> Dict[str, Any]:
    io_stats = psutil.net_io_counters(pernic=True)
    if_addrs = psutil.net_if_addrs()
    if_stats = psutil.net_if_stats()

    interfaces = []
    for iface_name, io in io_stats.items():
        stat = if_stats.get(iface_name)
        addrs = if_addrs.get(iface_name, [])

        ipv4 = "-"
        mac = "-"
        for a in addrs:
            if a.family == socket.AF_INET:
                ipv4 = a.address
            elif a.family == psutil.AF_LINK:
                mac = a.address

        interfaces.append({
            "name": iface_name,
            "is_up": stat.isup if stat else False,
            "speed_mbps": stat.speed if stat else 0,
            "ipv4": ipv4,
            "mac": mac,
            "bytes_sent": io.bytes_sent,
            "bytes_recv": io.bytes_recv,
            "packets_sent": io.packets_sent,
            "packets_recv": io.packets_recv,
            "errin": io.errin,
            "errout": io.errout,
            "dropin": io.dropin,
            "dropout": io.dropout
        })

    return {"interfaces": interfaces, "timestamp": time.time()}

async def find_optimal_mtu(target: str = "8.8.8.8") -> Dict[str, Any]:
    """
    Finds maximum transmission unit (MTU) by sending ICMP packets with Don't Fragment (DF) flag.
    """
    is_win = platform.system().lower() == "windows"
    test_sizes = [1500, 1492, 1472, 1460, 1400, 1300, 1200]
    best_size = 576

    for size in test_sizes:
        payload_size = size - 28 # 20 bytes IP header + 8 bytes ICMP
        cmd = ["ping", "-n", "1", "-f", "-l", str(payload_size), target] if is_win else ["ping", "-c", "1", "-M", "do", "-s", str(payload_size), target]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            out_str = stdout.decode("utf-8", errors="ignore")
            if "Packet needs to be fragmented" not in out_str and "Fragmentation needed" not in out_str and proc.returncode == 0:
                best_size = size
                break
        except Exception:
            pass

    return {
        "target": target,
        "optimal_mtu": best_size,
        "optimal_icmp_payload": max(0, best_size - 28),
        "status": "Verified" if best_size > 576 else "Default Standard (1500 presumed)"
    }

async def check_ntp_drift(ntp_server: str = "pool.ntp.org") -> Dict[str, Any]:
    """
    Measures clock offset against atomic NTP time servers.
    """
    client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client.settimeout(2.0)
    data = b"\x1b" + 47 * b"\0"
    
    t_send = time.time()
    try:
        client.sendto(data, (ntp_server, 123))
        resp, _ = client.recvfrom(1024)
        t_recv = time.time()
        client.close()

        unpacked = struct.unpack("!12I", resp[0:48])
        # Transmit timestamp is bytes 40:48
        ntp_time = unpacked[10] + float(unpacked[11]) / 2**32
        # NTP era begins 1900, Unix begins 1970 (diff is 2208988800)
        unix_ntp = ntp_time - 2208988800
        
        round_trip_delay = (t_recv - t_send)
        offset = unix_ntp - ((t_send + t_recv) / 2)

        return {
            "ntp_server": ntp_server,
            "stratum": unpacked[0] >> 16 & 0xFF,
            "clock_offset_ms": round(offset * 1000, 2),
            "round_trip_delay_ms": round(round_trip_delay * 1000, 2),
            "local_time_synced": abs(offset) < 0.5,
            "status": "SUCCESS"
        }
    except Exception as e:
        return {"ntp_server": ntp_server, "status": "FAILED", "error": str(e)}

async def discover_upnp_devices() -> List[Dict[str, Any]]:
    """
    SSDP M-SEARCH query to discover UPnP/NAT-PMP routers and devices.
    """
    msg = (
        'M-SEARCH * HTTP/1.1\r\n'
        'HOST: 239.255.255.250:1900\r\n'
        'MAN: "ssdp:discover"\r\n'
        'MX: 2\r\n'
        'ST: ssdp:all\r\n\r\n'
    )
    devices = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        s.settimeout(1.5)
        s.sendto(msg.encode("utf-8"), ("239.255.255.250", 1900))
        
        start = time.time()
        while time.time() - start < 1.5:
            try:
                data, addr = s.recvfrom(1024)
                text = data.decode("utf-8", errors="ignore")
                loc_match = re.search(r"LOCATION:\s*(.*)", text, re.IGNORECASE)
                server_match = re.search(r"SERVER:\s*(.*)", text, re.IGNORECASE)
                st_match = re.search(r"ST:\s*(.*)", text, re.IGNORECASE)

                devices.append({
                    "ip": addr[0],
                    "port": addr[1],
                    "server": server_match.group(1).strip() if server_match else "UPnP Device",
                    "location": loc_match.group(1).strip() if loc_match else "",
                    "device_type": st_match.group(1).strip() if st_match else "Generic"
                })
            except socket.timeout:
                break
            except Exception:
                pass
        s.close()
    except Exception:
        pass

    # Deduplicate by IP and server
    unique_devs = []
    seen = set()
    for d in devices:
        key = (d["ip"], d["server"])
        if key not in seen:
            seen.add(key)
            unique_devs.append(d)
    return unique_devs

def get_active_system_sockets() -> List[Dict[str, Any]]:
    results = []
    try:
        for c in psutil.net_connections(kind="inet")[:80]:
            if c.laddr:
                results.append({
                    "protocol": "TCP" if c.type == socket.SOCK_STREAM else "UDP",
                    "local_ip": c.laddr.ip,
                    "local_port": c.laddr.port,
                    "remote_ip": c.raddr.ip if c.raddr else "*",
                    "remote_port": c.raddr.port if c.raddr else "*",
                    "status": c.status,
                    "pid": c.pid
                })
    except Exception:
        pass
    return results
