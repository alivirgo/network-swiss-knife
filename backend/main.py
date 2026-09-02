import os
import sys
import asyncio
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from core.scanner import scan_ports, PRESETS
from core.lan_scanner import scan_lan, get_local_ip_and_subnet
from core.ping_monitor import monitor_isp_hop, benchmark_dns_ping, ping_series
from core.dns_tools import full_dns_lookup, check_propagation, check_malicious_dns
from core.vpn_detector import audit_network_for_vpn, check_local_vpn_interfaces
from core.traceroute import run_traceroute
from core.ssl_security import analyze_ssl_certificate, analyze_http_security
from core.subnet_calc import calculate_subnet
from core.packet_crafter import send_custom_packet, start_echo_listener, stop_echo_listener
from core.advanced_tools import (
    send_wake_on_lan, check_arp_spoofing, get_network_interfaces_traffic,
    find_optimal_mtu, check_ntp_drift, discover_upnp_devices, get_active_system_sockets
)
from core.port_db import search_ports, PORT_DATABASE

app = FastAPI(
    title="Network Swiss Knife (NSK)",
    description="Cross-platform high-performance networking toolkit",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- PORT SCANNER -----------------
class PortScanRequest(BaseModel):
    target: str
    ports: Optional[List[int]] = None
    preset: Optional[str] = None
    concurrency: Optional[int] = 150
    timeout: Optional[float] = 1.0
    grab_banners: Optional[bool] = True

@app.post("/api/scan/ports")
async def api_scan_ports(req: PortScanRequest):
    ports_to_scan = req.ports or []
    if req.preset and req.preset in PRESETS:
        ports_to_scan = PRESETS[req.preset]
    elif not ports_to_scan:
        ports_to_scan = PRESETS["top20"]

    return await scan_ports(
        target=req.target,
        ports=ports_to_scan,
        concurrency=req.concurrency or 150,
        timeout=req.timeout or 1.0,
        grab_banners=req.grab_banners if req.grab_banners is not None else True
    )

# ----------------- LAN DISCOVERY -----------------
@app.get("/api/lan/info")
def api_lan_info():
    local_ip, subnet = get_local_ip_and_subnet()
    return {"local_ip": local_ip, "default_subnet": subnet}

@app.get("/api/lan/scan")
async def api_lan_scan(cidr: Optional[str] = None):
    return await scan_lan(cidr=cidr)

# ----------------- PING & ISP MONITOR -----------------
@app.get("/api/ping/isp")
async def api_ping_isp(target: Optional[str] = None):
    return await monitor_isp_hop(custom_target=target)

@app.get("/api/ping/dns")
async def api_ping_dns():
    return await benchmark_dns_ping()

@app.get("/api/ping/target")
async def api_ping_target(target: str, count: int = 4):
    return await ping_series(target=target, count=count)

# ----------------- DNS SWISS KNIFE -----------------
@app.get("/api/dns/lookup")
async def api_dns_lookup(domain: str):
    return await full_dns_lookup(domain)

@app.get("/api/dns/propagation")
async def api_dns_propagation(domain: str, type: str = "A"):
    return await check_propagation(domain, record_type=type)

@app.get("/api/dns/malicious-check")
async def api_dns_malicious_check(domain: str):
    return await check_malicious_dns(domain)

from core.vpn_detector import audit_network_for_vpn, check_local_vpn_interfaces, inspect_client_device_vpn

# ----------------- VPN DETECTOR -----------------
@app.get("/api/vpn/audit")
async def api_vpn_audit(cidr: Optional[str] = None):
    return await audit_network_for_vpn(cidr=cidr)

@app.get("/api/vpn/inspect-target")
async def api_vpn_inspect_target(ip: str):
    return await inspect_client_device_vpn(ip=ip)

@app.get("/api/vpn/local-adapters")
def api_vpn_local_adapters():
    return check_local_vpn_interfaces()

# ----------------- TRACEROUTE -----------------
@app.get("/api/traceroute")
async def api_traceroute(target: str, max_hops: int = 20):
    return await run_traceroute(target=target, max_hops=max_hops)

# ----------------- SSL & HTTP SECURITY -----------------
@app.get("/api/ssl/inspect")
def api_ssl_inspect(hostname: str, port: int = 443):
    return analyze_ssl_certificate(hostname=hostname, port=port)

@app.get("/api/http/security-headers")
def api_http_security_headers(url: str):
    return analyze_http_security(url=url)

# ----------------- SUBNET CALCULATOR -----------------
@app.get("/api/subnet/calculate")
def api_subnet_calculate(cidr: str):
    return calculate_subnet(cidr=cidr)

# ----------------- PACKET CRAFTER -----------------
class PacketSendRequest(BaseModel):
    host: str
    port: int
    protocol: Optional[str] = "TCP"
    payload_type: Optional[str] = "TEXT"
    payload: Optional[str] = ""

@app.post("/api/packet/send")
async def api_packet_send(req: PacketSendRequest):
    return await send_custom_packet(
        host=req.host,
        port=req.port,
        protocol=req.protocol or "TCP",
        payload_type=req.payload_type or "TEXT",
        payload=req.payload or ""
    )

@app.post("/api/listener/start")
async def api_listener_start(port: int, protocol: str = "TCP"):
    return await start_echo_listener(port=port, protocol=protocol)

@app.post("/api/listener/stop")
def api_listener_stop(port: int):
    return stop_echo_listener(port=port)

# ----------------- ADVANCED TOOLS -----------------
class WolRequest(BaseModel):
    mac: str
    broadcast_ip: Optional[str] = "255.255.255.255"
    port: Optional[int] = 9

@app.post("/api/tools/wol")
def api_tools_wol(req: WolRequest):
    return send_wake_on_lan(mac_address=req.mac, broadcast_ip=req.broadcast_ip or "255.255.255.255", port=req.port or 9)

@app.get("/api/tools/arp-spoof-check")
def api_tools_arp_spoof_check():
    return check_arp_spoofing()

@app.get("/api/tools/interfaces")
def api_tools_interfaces():
    return get_network_interfaces_traffic()

@app.get("/api/tools/mtu")
async def api_tools_mtu(target: str = "8.8.8.8"):
    return await find_optimal_mtu(target=target)

@app.get("/api/tools/ntp")
async def api_tools_ntp(server: str = "pool.ntp.org"):
    return await check_ntp_drift(ntp_server=server)

@app.get("/api/tools/upnp")
async def api_tools_upnp():
    return await discover_upnp_devices()

@app.get("/api/tools/sockets")
def api_tools_sockets():
    return get_active_system_sockets()

# ----------------- PORT DIRECTORY -----------------
@app.get("/api/ports/directory")
def api_ports_directory(q: Optional[str] = None):
    return search_ports(query=q or "")

# ----------------- STATIC FRONTEND SERVING -----------------
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and not os.path.isdir(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse({"status": "Frontend not yet built. Run npm run build in frontend/"})
else:
    @app.get("/")
    def index():
        return {
            "name": "Network Swiss Knife (NSK) API",
            "version": "2.0.0",
            "docs": "/docs",
            "status": "online"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
