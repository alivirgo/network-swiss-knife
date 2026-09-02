# 🛠️ Network Swiss Knife (NSK) 2.5.0 &mdash; Official Release

**Network Swiss Knife (NSK)** transforms a legacy single-threaded script into an enterprise-grade, cross-platform networking powerhouse and diagnostic suite for **Windows, macOS, Linux, and Android**.

---

### 📦 Release Assets & Double-Click Launchers

- **Windows**: Download `NSK-2.5.0-Windows.zip` &rarr; Extract &rarr; Double-click **`start.bat`**.
- **macOS**: Download `NSK-2.5.0-macOS-Linux.tar.gz` &rarr; Extract &rarr; Double-click **`start.command`** or open **`NSK.app`**.
- **Linux**: Download `NSK-2.5.0-macOS-Linux.tar.gz` &rarr; Extract &rarr; Double-click **`NSK.desktop`** (or `./start.sh`).
- **Android**: Connect to your PC/Server LAN IP in Chrome/Firefox &rarr; Tap **Add to Home screen** (PWA).

---

### 🌟 Key Highlights & Feature Matrix

1. **⚡ High-Speed Port Scanner & Service Detective**:
   - Asynchronous socket scanner with concurrency scaling (10–500 workers).
   - **Live Port Probing Matrix**: Visual grid lighting up ports in real time.
   - Banner grabbing & fingerprinting (SSH, HTTP, MySQL, Redis, Telnet).
   - Service search, risk filtering (Critical, High, Medium, Low), and one-click copy.

2. **🌐 LAN Host Discovery & Interactive Topology Visualizer**:
   - Subnet ARP & ICMP sweep with IEEE MAC OUI hardware vendor resolution.
   - **Interactive SVG Topology Map**: Visual node tree (Gateway &rarr; Switch &rarr; Endpoints) with clickable host inspection drawers.
   - Quick filter chips: All, Gateways, Mobiles, PCs, IoT.

3. **🛡️ Client VPN & ProtonVPN Deep Detection**:
   - Multi-vector detection analyzing unfragmented MTU boundary clamping (1420/1280B DF bit).
   - LAN service isolation heuristics (mDNS 5353, Google Cast 8008, SSDP 1900, ADB 5555).
   - Dedicated **Single-Device Deep Client Audit** tool for phones and laptops.

4. **📈 ISP & Multi-Hop Latency / Jitter Telemetry**:
   - Continuous dual-hop latency tracking separating gateway delay from ISP uplink hop.
   - RFC 3550 jitter calculation, packet drop alerts, and stability scoring (Grade A+ to F).

5. **🚀 Bandwidth & Bufferbloat Speedtest**:
   - High-throughput transfer rate benchmark (Mbps), idle vs. loaded latency, and RFC bufferbloat grading.

6. **📶 Wi-Fi Signal & RF Channel Inspector**:
   - Direct Windows Native Wi-Fi API (`wlanapi.dll`) integration bypassing Windows 11 location restrictions.
   - Extracts SSID, BSSID, RSSI attenuation (-dBm), radio channel, 2.4/5GHz band, and physical link rate.
   - Live hardware network adapter RX/TX byte traffic counters.

7. **🌍 DNS Swiss Knife & Security Auditor**:
   - Multi-record lookups (A, AAAA, MX, TXT, NS, SOA, CAA, SRV, PTR).
   - **Email Security Auditor**: SPF validation, DMARC policy enforcement, and DKIM selector auditing.
   - **DNSSEC Validator**: Verifies cryptographic RRSIG, DNSKEY, and DS records.
   - Worldwide propagation benchmark across 9 global resolvers.

8. **🛑 Malicious DNS & Threat Sinkhole Check**:
   - Threat intelligence resolvers (Quad9, Cloudflare Security, CleanBrowsing, AdGuard) vs controls.
   - Threat Risk Score (0-100), brand typosquatting warnings, and subdomain discovery.

9. **🗺️ Interactive Visual Hop Traceroute**:
   - Visual SVG route timeline connecting hops with latency badges and regional indicators.
   - Enriched with Autonomous System (AS) numbers, ISP names, and GeoIP country/city.

10. **🧮 Subnet & CIDR Swiss Knife (with VLSM Allocator)**:
    - **Interactive 32-bit Bitmask Selector**: Clickable bits that dynamically adjust the prefix.
    - **VLSM Subnet Allocation Planner**: Computes optimal collision-free subnets based on custom host count requirements per department.

11. **📦 Layer-4 Packet Crafter & Socket Dispatcher**:
    - TCP/UDP frame transmission with ASCII or Hex payloads.
    - **Protocol Preset Templates**: 1-click presets for HTTP GET, DNS raw hex, NTP request, SSDP M-SEARCH, and Redis PING.
    - On-Demand Ephemeral TCP Echo Listener for port-forwarding verification.

12. **⚙️ Network Power Tools**:
    - Wake-on-LAN (WoL) with **Saved Devices Inventory** (1-click remote power-on).
    - Kernel ARP cache poisoning & MITM detector.
    - Path Maximum Transmission Unit (MTU) discovery (DF-bit ping sweeps).
    - Stratum-1 NTP atomic clock drift & offset measurement.

13. **📚 65,535 Port Knowledge Base & Audit Reports**:
    - Instant searchable database of IANA port assignments, default credentials, and exploit vectors.
    - Unified network audit report generator (Markdown & JSON export).

14. **💎 Global UI/UX Upgrades**:
    - **Quick Command Palette (`Ctrl+K` or `/`)** for 1-keystroke tool navigation.
    - Floating toast notification system and one-click copy on all IPs, MACs, ports, and records.

---

### 🧪 Automated Verification
- Full test suite passed with 16 unit & integration tests (`python -m pytest`).
- Pre-compiled static React frontend bundle ready to serve without external dependencies.
