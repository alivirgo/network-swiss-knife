# 🛠️ Shiny Doodle &mdash; Network Swiss Knife 2.0

> **Turned from a 2020 single-threaded script into an enterprise-grade, cross-platform networking powerhouse.**
> Built for **Windows, macOS, Linux, and Android** with a modest, ultra-clean engineering GUI and asynchronous network engine.

---

## ⚡ Highlights & Key Capabilities

- **Zero Clutter, Engineering Aesthetics**: Built with clean, modest, readable telemetry data tables, crisp typography, and live SVG sparklines &mdash; *no tacky AI cards or neon gimmicks*.
- **Cross-Platform by Design**:
  - **Desktop (Windows, macOS, Linux)**: 1-click execution (`start.bat`, `start.sh`, or `python start.py`).
  - **Mobile (Android / iOS)**: Responsive touch-first layout + PWA support (installable directly to your home screen).
- **Asynchronous High-Speed Engine**: Python 3.12 `asyncio` backend capable of scanning thousands of ports per second without UI freezing.
- **Dual Mode**: Runs both as a high-powered GUI application and a backwards-compatible CLI scanner.

---

## 🧰 The Complete Networking Toolkit

### 1. 🔍 Core Discovery & Scanning
- **High-Speed Async Port Scanner**: TCP connect & SYN scan with configurable concurrency (10–500 workers), service banner grabbing, and risk vulnerability levels.
- **LAN Host Discovery**: High-speed ARP & ICMP subnet sweep with MAC hardware vendor OUI identification (Apple, Intel, Cisco, Raspberry Pi, etc.) and device role tags.
- **LAN VPN User Finder**: Scans local networks to detect active VPN servers and proxy tunnels (WireGuard `51820`, OpenVPN `1194`, IPsec `500/4500`, PPTP `1723`, SOCKS5 `1080`, Shadowsocks `8388`) and audits local virtual adapters.

### 2. 📈 Telemetry & Monitoring
- **ISP & Gateway Network Ping Monitor**: Separates local Wi-Fi / router gateway latency from external ISP hop latency with continuous jitter and packet loss telemetry.
- **DNS Resolver Latency Benchmark**: Real-time ping comparison across Cloudflare, Google, Quad9, OpenDNS, and AdGuard.
- **Malicious DNS Threat Sinkhole Check**: Probes domains against threat-intelligence blocking resolvers (Quad9 malware filter, Cloudflare security, CleanBrowsing) to flag phishing, malware, and sinkholed C2 servers.
- **Visual Hop Traceroute**: Hop-by-hop latency tracing enriched with Autonomous System (AS) numbers, ISP, and Country/City geolocation.

### 3. 🛡️ Security & Protocol Analyzers
- **SSL / TLS Certificate Inspector**: Analyzes certificate validity, days until expiration, cipher suites, protocol versions, and Subject Alternative Names (SANs).
- **HTTP Security Header Audit**: Evaluates HSTS, CSP, X-Frame-Options, CORS, and detects web servers and CDN edge providers.
- **IP & Subnet / CIDR Calculator**: IPv4 & IPv6 VLSM calculator, usable host range, wildcard mask, binary network representation, and subnet splitting.

### 4. ⚙️ Sockets & Power Tools
- **Packet Crafter & Socket Dispatcher**: Transmit custom raw ASCII or Hex payloads over TCP or UDP and view returned stream replies.
- **On-Demand Socket Listener**: Spin up temporary local TCP listening ports on `0.0.0.0` to verify port forwarding and inbound firewall rules.
- **Wake-on-LAN (WoL)**: Dispatch raw UDP magic packets to wake remote networked machines.
- **ARP Poisoning & MITM Detector**: Audits the OS ARP cache for duplicate MAC entries or gateway spoofing.
- **Optimal Path MTU Finder**: Discovers maximum unfragmented transmission units using DF ping sweeps.
- **NTP Time Sync & Drift Analyzer**: Calculates millisecond clock offset and stratum against atomic time servers.
- **Hardware Interface Monitor**: Live per-interface RX/TX byte counters, link speed, and packet drop tracking.
- **65,535 Port Reference Directory**: Searchable IANA port assignment database with common security risks and default credentials.
- **Unified Audit Report Generator**: 1-click export of complete network diagnostic data to Markdown (`.md`) or raw JSON (`.json`).

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- (Optional) Node.js 18+ (only needed if customizing frontend sources; production builds are already pre-compiled into the repository!)

### 1. Clone the Repository
```bash
git clone https://github.com/alivirgo/shiny-doodle-network-port-scanner.git
cd shiny-doodle-network-port-scanner
```

### 2. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Launch the Application (Double-Click Ready!)

Shiny Doodle is configured for 1-step **double-click** execution on all major platforms:

- 🪟 **Windows**: Double-click **`start.bat`** (or run `python start.py`).
- 🍎 **macOS**: Double-click **`start.command`** or open **`ShinyDoodle.app`**.
- 🐧 **Linux**: Double-click **`ShinyDoodle.desktop`** (or `./start.sh`).
- 📱 **Android**: Run the app on your PC or server, open the displayed LAN IP in Chrome/Firefox, and tap **Add to Home screen**!

> **Note**: On first launch, the application automatically verifies and installs any missing Python dependencies.


---

## 💻 CLI Usage

The CLI remains 100% backwards-compatible with the 2020 version, but now runs at blazing async speeds:

```bash
# Interactive mode (prompts for start and end ports)
python scanner.py 192.168.1.1

# Direct port range
python scanner.py 192.168.1.1 -p 20-1000 -c 200

# Launch GUI directly
python scanner.py --gui
```

---

## 🧪 Testing

Run the automated test suite covering all core networking modules and API endpoints:
```bash
python -m pytest
```

---

## 📜 License
GPLv3 &mdash; see [LICENSE](LICENSE) for details.
