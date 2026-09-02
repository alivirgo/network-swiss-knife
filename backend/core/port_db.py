from typing import List, Dict, Any

PORT_DATABASE = [
    {"port": 20, "service": "FTP-Data", "protocol": "TCP", "category": "File Transfer", "risk": "Low", "desc": "File Transfer Protocol data stream"},
    {"port": 21, "service": "FTP-Control", "protocol": "TCP", "category": "File Transfer", "risk": "High", "desc": "Cleartext credentials. Check for anonymous login (anonymous:anonymous)"},
    {"port": 22, "service": "SSH", "protocol": "TCP", "category": "Remote Admin", "risk": "Medium", "desc": "Secure Shell remote access. Check password brute force & key auth"},
    {"port": 23, "service": "Telnet", "protocol": "TCP", "category": "Remote Admin", "risk": "Critical", "desc": "Unencrypted legacy remote shell. Sniffable credentials"},
    {"port": 25, "service": "SMTP", "protocol": "TCP", "category": "Mail", "risk": "Medium", "desc": "Simple Mail Transfer Protocol. Check open relay & VRFY/EXPN enum"},
    {"port": 53, "service": "DNS", "protocol": "TCP/UDP", "category": "Core Infrastructure", "risk": "Medium", "desc": "Domain Name System. Check zone transfers (AXFR) and amplification"},
    {"port": 67, "service": "DHCP Server", "protocol": "UDP", "category": "Network Config", "risk": "Medium", "desc": "Dynamic Host Configuration. Check rogue DHCP offer / starvation"},
    {"port": 68, "service": "DHCP Client", "protocol": "UDP", "category": "Network Config", "risk": "Low", "desc": "Client DHCP request port"},
    {"port": 69, "service": "TFTP", "protocol": "UDP", "category": "File Transfer", "risk": "High", "desc": "Trivial FTP. No authentication, cleartext firmware transfer"},
    {"port": 80, "service": "HTTP", "protocol": "TCP", "category": "Web", "risk": "Medium", "desc": "Unencrypted web server traffic. Inspect headers & web vulnerabilities"},
    {"port": 88, "service": "Kerberos", "protocol": "TCP/UDP", "category": "Authentication", "risk": "Medium", "desc": "Active Directory Kerberos domain controller authentication"},
    {"port": 110, "service": "POP3", "protocol": "TCP", "category": "Mail", "risk": "High", "desc": "Unencrypted Post Office Protocol. Passwords sent in cleartext"},
    {"port": 123, "service": "NTP", "protocol": "UDP", "category": "Time Sync", "risk": "Low", "desc": "Network Time Protocol. Check monlist amplification (CVE-2013-5211)"},
    {"port": 135, "service": "MSRPC", "protocol": "TCP", "category": "Windows RPC", "risk": "High", "desc": "Microsoft RPC Endpoint Mapper. High exploit vector for SMB/RPC exploits"},
    {"port": 137, "service": "NetBIOS-NS", "protocol": "UDP", "category": "Windows Name", "risk": "Medium", "desc": "NetBIOS Name Service. Can reveal Windows domain, computer name, and MAC"},
    {"port": 138, "service": "NetBIOS-DGM", "protocol": "UDP", "category": "Windows NetBIOS", "risk": "Low", "desc": "NetBIOS Datagram Service"},
    {"port": 139, "service": "NetBIOS-SSN", "protocol": "TCP", "category": "Windows NetBIOS", "risk": "High", "desc": "NetBIOS Session Service. Null session enumeration"},
    {"port": 143, "service": "IMAP", "protocol": "TCP", "category": "Mail", "risk": "High", "desc": "Unencrypted Internet Message Access Protocol. Sniffable auth"},
    {"port": 161, "service": "SNMP", "protocol": "UDP", "category": "Monitoring", "risk": "High", "desc": "Simple Network Management. Test default community strings: public, private"},
    {"port": 389, "service": "LDAP", "protocol": "TCP/UDP", "category": "Directory Service", "risk": "High", "desc": "Lightweight Directory Access Protocol. Anonymous bind enumeration"},
    {"port": 443, "service": "HTTPS", "protocol": "TCP", "category": "Web Secure", "risk": "Low", "desc": "Encrypted web server. Inspect SSL certs, TLS cipher suites, SNI"},
    {"port": 445, "service": "SMB", "protocol": "TCP", "category": "File Sharing", "risk": "Critical", "desc": "Server Message Block. Target of EternalBlue (MS17-010), SambaCry"},
    {"port": 500, "service": "ISAKMP", "protocol": "UDP", "category": "VPN / IPsec", "risk": "Medium", "desc": "IPsec Key Exchange. Aggressive mode authentication handshake capture"},
    {"port": 514, "service": "Syslog", "protocol": "UDP", "category": "Logging", "risk": "Low", "desc": "System Logging daemon. Unauthenticated log flooding possible"},
    {"port": 636, "service": "LDAPS", "protocol": "TCP", "category": "Directory Service", "risk": "Low", "desc": "LDAP over TLS/SSL"},
    {"port": 873, "service": "Rsync", "protocol": "TCP", "category": "File Sync", "risk": "High", "desc": "Remote file sync. Check for unauthenticated module access"},
    {"port": 993, "service": "IMAPS", "protocol": "TCP", "category": "Mail Secure", "risk": "Low", "desc": "IMAP over TLS/SSL"},
    {"port": 995, "service": "POP3S", "protocol": "TCP", "category": "Mail Secure", "risk": "Low", "desc": "POP3 over TLS/SSL"},
    {"port": 1080, "service": "SOCKS5", "protocol": "TCP", "category": "Proxy", "risk": "High", "desc": "SOCKS Proxy server. Often used as pivot / proxy chaining"},
    {"port": 1194, "service": "OpenVPN", "protocol": "UDP/TCP", "category": "VPN", "risk": "Low", "desc": "OpenVPN secure tunnel endpoint"},
    {"port": 1433, "service": "MSSQL", "protocol": "TCP", "category": "Database", "risk": "High", "desc": "Microsoft SQL Server. Check default 'sa' account with blank password"},
    {"port": 1521, "service": "Oracle DB", "protocol": "TCP", "category": "Database", "risk": "High", "desc": "Oracle Database TNS Listener. Enumerate SIDs (ORCL, XE)"},
    {"port": 1723, "service": "PPTP", "protocol": "TCP", "category": "VPN", "risk": "High", "desc": "Point-to-Point Tunneling. MS-CHAPv2 encryption is broken"},
    {"port": 2049, "service": "NFS", "protocol": "TCP/UDP", "category": "File Sharing", "risk": "High", "desc": "Network File System. Check showmount -e for unrestricted exports"},
    {"port": 3000, "service": "React/Node/Grafana", "protocol": "TCP", "category": "Dev / Metrics", "risk": "Medium", "desc": "Web development servers or Grafana dashboard (admin:admin)"},
    {"port": 3128, "service": "Squid Proxy", "protocol": "TCP", "category": "Proxy", "risk": "Medium", "desc": "Squid HTTP caching proxy. Check open proxy / internal pivot"},
    {"port": 3306, "service": "MySQL", "protocol": "TCP", "category": "Database", "risk": "High", "desc": "MySQL / MariaDB database. Check root:root or root:[blank]"},
    {"port": 3389, "service": "RDP", "protocol": "TCP", "category": "Remote Desktop", "risk": "High", "desc": "Windows Remote Desktop. Target of BlueKeep (CVE-2019-0708) and brute force"},
    {"port": 4500, "service": "IPsec NAT-T", "protocol": "UDP", "category": "VPN", "risk": "Low", "desc": "IPsec NAT Traversal negotiation"},
    {"port": 5000, "service": "Flask / Docker Registry", "protocol": "TCP", "category": "Dev / Registry", "risk": "Medium", "desc": "Flask dev server or unauthenticated Docker registry"},
    {"port": 5432, "service": "PostgreSQL", "protocol": "TCP", "category": "Database", "risk": "High", "desc": "PostgreSQL Database. Check postgres:postgres credentials"},
    {"port": 5672, "service": "RabbitMQ", "protocol": "TCP", "category": "Message Queue", "risk": "Medium", "desc": "AMQP protocol. Check guest:guest default account"},
    {"port": 5900, "service": "VNC", "protocol": "TCP", "category": "Remote Desktop", "risk": "High", "desc": "Virtual Network Computing. Often configured without password or with 8-char DES"},
    {"port": 6379, "service": "Redis", "protocol": "TCP", "category": "Cache / In-Memory DB", "risk": "Critical", "desc": "Redis In-Memory Data Store. Often unauthenticated, allows RCE via cron/ssh keys"},
    {"port": 8080, "service": "HTTP-Proxy / Tomcat", "protocol": "TCP", "category": "Web Alternate", "risk": "Medium", "desc": "Apache Tomcat / Jenkins / Spring Boot web apps. Check manager/html"},
    {"port": 8443, "service": "HTTPS-Alt", "protocol": "TCP", "category": "Web Secure Alt", "risk": "Low", "desc": "Secondary SSL web server or router admin interface"},
    {"port": 9000, "service": "Portainer / SonarQube", "protocol": "TCP", "category": "DevOps", "risk": "Medium", "desc": "Portainer Docker management or SonarQube quality portal"},
    {"port": 9200, "service": "Elasticsearch", "protocol": "TCP", "category": "Search / DB", "risk": "Critical", "desc": "Elasticsearch REST API. Frequently exposed unauthenticated exposing sensitive indexes"},
    {"port": 11211, "service": "Memcached", "protocol": "TCP/UDP", "category": "Cache", "risk": "High", "desc": "Memcached memory cache. Unauthenticated dumping and UDP reflection attack"},
    {"port": 27017, "service": "MongoDB", "protocol": "TCP", "category": "NoSQL DB", "risk": "Critical", "desc": "MongoDB database. Widely exploited when exposed without auth enabled"},
    {"port": 51820, "service": "WireGuard", "protocol": "UDP", "category": "VPN Modern", "risk": "Low", "desc": "WireGuard high-performance encrypted VPN tunnel"}
]

def search_ports(query: str) -> List[Dict[str, Any]]:
    if not query:
        return PORT_DATABASE
    q = query.lower().strip()
    return [
        p for p in PORT_DATABASE
        if q in str(p["port"])
        or q in p["service"].lower()
        or q in p["category"].lower()
        or q in p["desc"].lower()
        or q in p["risk"].lower()
    ]
