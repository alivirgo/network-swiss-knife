import pytest
import asyncio
from core.scanner import scan_single_port, get_risk_level, PRESETS
from core.subnet_calc import calculate_subnet
from core.dns_tools import check_malicious_dns
from core.port_db import search_ports
from core.advanced_tools import send_wake_on_lan, check_arp_spoofing

def test_risk_levels():
    assert get_risk_level(23, "Telnet") == "HIGH"
    assert get_risk_level(445, "SMB") == "HIGH"
    assert get_risk_level(22, "SSH") == "MEDIUM"
    assert get_risk_level(80, "HTTP") == "LOW"

def test_subnet_calculator():
    res = calculate_subnet("192.168.1.0/24")
    assert res["valid"] is True
    assert res["network_address"] == "192.168.1.0"
    assert res["broadcast_address"] == "192.168.1.255"
    assert res["usable_hosts"] == 254
    assert res["ip_class"] == "C"

def test_port_search():
    results = search_ports("WireGuard")
    assert len(results) > 0
    assert results[0]["port"] == 51820

def test_wol_validation():
    bad = send_wake_on_lan("invalid-mac")
    assert bad["success"] is False
    good = send_wake_on_lan("00:11:22:33:44:55")
    assert good["success"] is True

def test_arp_spoof_structure():
    res = check_arp_spoofing()
    assert "verdict" in res
    assert "gateway_ip" in res

@pytest.mark.asyncio
async def test_dns_malicious_eval():
    res = await check_malicious_dns("google.com")
    assert "verdict" in res
    assert res["is_malicious"] is False
