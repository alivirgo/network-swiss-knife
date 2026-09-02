import pytest
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)

def test_static_index():
    response = client.get("/")
    assert response.status_code == 200
    assert "Network Swiss Knife" in response.text or "NSK" in response.text

def test_api_lan_info():
    response = client.get("/api/lan/info")
    assert response.status_code == 200
    data = response.json()
    assert "local_ip" in data

def test_api_subnet():
    response = client.get("/api/subnet/calculate?cidr=10.0.0.0/24")
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["usable_hosts"] == 254

def test_api_port_directory():
    response = client.get("/api/ports/directory?q=WireGuard")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_api_arp_spoof():
    response = client.get("/api/tools/arp-spoof-check")
    assert response.status_code == 200
    assert "verdict" in response.json()

def test_api_interfaces():
    response = client.get("/api/tools/interfaces")
    assert response.status_code == 200
    assert "interfaces" in response.json()

def test_api_vpn_inspect_target():
    response = client.get("/api/vpn/inspect-target?ip=127.0.0.1")
    assert response.status_code == 200
    data = response.json()
    assert "is_vpn_active" in data
    assert "confidence_pct" in data
    assert "detected_profile" in data

