import socket
import asyncio
import binascii
import time
from typing import Dict, Any, Optional

ACTIVE_LISTENERS: Dict[int, Any] = {}

async def send_custom_packet(
    host: str,
    port: int,
    protocol: str = "TCP",
    payload_type: str = "TEXT",
    payload: str = "",
    timeout: float = 2.0
) -> Dict[str, Any]:
    protocol = protocol.upper()
    start = time.perf_counter()

    # Prepare raw bytes
    try:
        if payload_type.upper() == "HEX":
            clean_hex = payload.replace(" ", "").replace("0x", "").replace(":", "")
            data_bytes = binascii.unhexlify(clean_hex)
        else:
            data_bytes = payload.encode("utf-8")
    except Exception as e:
        return {"success": False, "error": f"Invalid payload encoding: {str(e)}"}

    if protocol == "TCP":
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port), timeout=timeout
            )
            if data_bytes:
                writer.write(data_bytes)
                await writer.drain()

            received = b""
            try:
                received = await asyncio.wait_for(reader.read(1024), timeout=1.5)
            except Exception:
                pass

            duration = round((time.perf_counter() - start) * 1000, 2)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

            hex_resp = binascii.hexlify(received).decode("ascii") if received else ""
            text_resp = received.decode("utf-8", errors="replace") if received else ""

            return {
                "success": True,
                "protocol": "TCP",
                "bytes_sent": len(data_bytes),
                "bytes_received": len(received),
                "latency_ms": duration,
                "response_text": text_resp[:500],
                "response_hex": hex_resp[:200]
            }
        except Exception as e:
            return {"success": False, "protocol": "TCP", "error": f"TCP Error: {str(e)}"}

    elif protocol == "UDP":
        try:
            loop = asyncio.get_running_loop()
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(timeout)
            s.sendto(data_bytes, (host, port))

            received = b""
            try:
                received, _ = s.recvfrom(1024)
            except socket.timeout:
                pass
            s.close()

            duration = round((time.perf_counter() - start) * 1000, 2)
            hex_resp = binascii.hexlify(received).decode("ascii") if received else ""
            text_resp = received.decode("utf-8", errors="replace") if received else ""

            return {
                "success": True,
                "protocol": "UDP",
                "bytes_sent": len(data_bytes),
                "bytes_received": len(received),
                "latency_ms": duration,
                "response_text": text_resp[:500],
                "response_hex": hex_resp[:200]
            }
        except Exception as e:
            return {"success": False, "protocol": "UDP", "error": f"UDP Error: {str(e)}"}

    return {"success": False, "error": "Unknown protocol"}

async def start_echo_listener(port: int, protocol: str = "TCP") -> Dict[str, Any]:
    global ACTIVE_LISTENERS
    if port in ACTIVE_LISTENERS:
        return {"status": "already_running", "port": port}

    if protocol.upper() == "TCP":
        try:
            async def handle_client(reader, writer):
                data = await reader.read(512)
                if data:
                    writer.write(b"NSK_ECHO: " + data)
                    await writer.drain()
                writer.close()

            server = await asyncio.start_server(handle_client, "0.0.0.0", port)
            ACTIVE_LISTENERS[port] = server
            return {"status": "started", "port": port, "protocol": "TCP"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    else:
        return {"status": "error", "error": "UDP listener not implemented"}

def stop_echo_listener(port: int) -> Dict[str, Any]:
    global ACTIVE_LISTENERS
    if port in ACTIVE_LISTENERS:
        server = ACTIVE_LISTENERS.pop(port)
        server.close()
        return {"status": "stopped", "port": port}
    return {"status": "not_running", "port": port}
