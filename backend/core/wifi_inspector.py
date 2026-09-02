import subprocess
import platform
import re
from typing import Dict, Any, Optional

def get_wifi_details() -> Dict[str, Any]:
    os_type = platform.system().lower()
    info = {
        "connected": False,
        "ssid": "Not Connected",
        "bssid": "-",
        "signal_percent": 0,
        "signal_dbm": -100,
        "channel": "-",
        "band": "-",
        "link_speed_mbps": 0,
        "security": "Unknown",
        "raw_status": "No active Wi-Fi adapter detected"
    }

    try:
        if os_type == "windows":
            out = subprocess.check_output("netsh wlan show interfaces", shell=True).decode("utf-8", errors="ignore")
            if "State" in out and ("connected" in out.lower() or "associé" in out.lower()):
                info["connected"] = True
                
                ssid_m = re.search(r"^\s*SSID\s*:\s*(.*)$", out, re.MULTILINE)
                if ssid_m: info["ssid"] = ssid_m.group(1).strip()
                
                bssid_m = re.search(r"^\s*BSSID\s*:\s*(.*)$", out, re.MULTILINE)
                if bssid_m: info["bssid"] = bssid_m.group(1).strip()

                sig_m = re.search(r"^\s*Signal\s*:\s*(\d+)%", out, re.MULTILINE)
                if sig_m:
                    sig_pct = int(sig_m.group(1))
                    info["signal_percent"] = sig_pct
                    # Approximate dBm from percentage
                    info["signal_dbm"] = int(-100 + (sig_pct / 2))

                chan_m = re.search(r"^\s*Channel\s*:\s*(\d+)", out, re.MULTILINE)
                if chan_m:
                    ch = int(chan_m.group(1))
                    info["channel"] = ch
                    info["band"] = "5 GHz" if ch > 14 else "2.4 GHz"

                speed_m = re.search(r"^\s*Receive rate\s*\(Mbps\)\s*:\s*(\d+(?:\.\d+)?)", out, re.MULTILINE)
                if speed_m: info["link_speed_mbps"] = float(speed_m.group(1))

                sec_m = re.search(r"^\s*Authentication\s*:\s*(.*)$", out, re.MULTILINE)
                if sec_m: info["security"] = sec_m.group(1).strip()

                info["raw_status"] = "Connected via Windows WLAN"

        elif os_type == "darwin": # macOS
            cmd = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I"
            out = subprocess.check_output(cmd, shell=True).decode("utf-8", errors="ignore")
            if "SSID" in out:
                info["connected"] = True
                ssid_m = re.search(r"\s+SSID:\s+(.*)", out)
                if ssid_m: info["ssid"] = ssid_m.group(1).strip()
                bssid_m = re.search(r"\s+BSSID:\s+(.*)", out)
                if bssid_m: info["bssid"] = bssid_m.group(1).strip()
                rssi_m = re.search(r"\s+agrCtlRSSI:\s+(-?\d+)", out)
                if rssi_m:
                    dbm = int(rssi_m.group(1))
                    info["signal_dbm"] = dbm
                    info["signal_percent"] = max(0, min(100, int(2 * (dbm + 100))))
                chan_m = re.search(r"\s+channel:\s+(\d+)", out)
                if chan_m:
                    ch = int(chan_m.group(1))
                    info["channel"] = ch
                    info["band"] = "5 GHz" if ch > 14 else "2.4 GHz"
                info["raw_status"] = "Connected via macOS Airport"

        else: # Linux
            out = subprocess.check_output("iwconfig 2>/dev/null || nmcli dev wifi show 2>/dev/null", shell=True).decode("utf-8", errors="ignore")
            if "ESSID" in out or "SSID" in out:
                info["connected"] = True
                ssid_m = re.search(r'ESSID:"(.*)"', out) or re.search(r'SSID:\s*(.*)', out)
                if ssid_m: info["ssid"] = ssid_m.group(1).strip()
                sig_m = re.search(r'Signal level=(-\d+)', out) or re.search(r'SIGNAL:\s*(\d+)%', out)
                if sig_m:
                    val = int(sig_m.group(1))
                    if val < 0:
                        info["signal_dbm"] = val
                        info["signal_percent"] = max(0, min(100, int(2 * (val + 100))))
                    else:
                        info["signal_percent"] = val
                        info["signal_dbm"] = int(-100 + (val / 2))
                info["raw_status"] = "Connected via Linux WiFi"
    except Exception as e:
        info["raw_status"] = f"Adapter query: {str(e)}"

    return info
