import ssl
import socket
import datetime
import urllib.request
import urllib.parse
from typing import Dict, Any, List

def analyze_ssl_certificate(hostname: str, port: int = 443) -> Dict[str, Any]:
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    hostname = hostname.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]

    try:
        with socket.create_connection((hostname, port), timeout=3.0) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert(binary_form=False)
                cipher = ssock.cipher()
                version = ssock.version()

                # Get binary cert for exact parsing
                der_cert = ssock.getpeercert(binary_form=True)
                from ssl import _ssl
                # In Python standard library, peer cert dict contains parsed fields
                cert_dict = ssock.getpeercert()

                not_after_str = cert_dict.get("notAfter", "")
                not_before_str = cert_dict.get("notBefore", "")

                days_remaining = None
                if not_after_str:
                    try:
                        exp_date = datetime.datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
                        days_remaining = (exp_date - datetime.datetime.utcnow()).days
                    except Exception:
                        pass

                # Extract issuer and subject
                issuer_dict = dict(x[0] for x in cert_dict.get("issuer", []))
                subject_dict = dict(x[0] for x in cert_dict.get("subject", []))
                sans = [item[1] for item in cert_dict.get("subjectAltName", []) if item[0] == "DNS"]

                is_expired = days_remaining is not None and days_remaining < 0
                is_expiring_soon = days_remaining is not None and 0 <= days_remaining <= 30

                return {
                    "hostname": hostname,
                    "port": port,
                    "valid": True,
                    "tls_version": version,
                    "cipher_suite": cipher[0] if cipher else "Unknown",
                    "cipher_bits": cipher[2] if cipher and len(cipher) > 2 else 0,
                    "issuer": issuer_dict.get("organizationName", issuer_dict.get("commonName", "Unknown Issuer")),
                    "subject": subject_dict.get("commonName", hostname),
                    "valid_from": not_before_str,
                    "valid_until": not_after_str,
                    "days_remaining": days_remaining,
                    "is_expired": is_expired,
                    "is_expiring_soon": is_expiring_soon,
                    "sans_count": len(sans),
                    "sans_sample": sans[:10]
                }
    except Exception as e:
        return {
            "hostname": hostname,
            "port": port,
            "valid": False,
            "error": str(e)
        }

def analyze_http_security(url: str) -> Dict[str, Any]:
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    parsed = urllib.parse.urlparse(url)
    target_url = parsed.geturl()

    headers_score = 0
    max_score = 100

    security_checks = []
    headers = {}
    server_info = "Unknown"
    cdn_detected = "None Detected"

    try:
        req = urllib.request.Request(
            target_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NSK/2.0"},
            method="HEAD"
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            headers = dict(resp.headers)
            status_code = resp.status
    except urllib.error.HTTPError as e:
        headers = dict(e.headers)
        status_code = e.code
    except Exception as e:
        return {"url": target_url, "error": f"Failed to connect: {str(e)}", "score": 0}

    # Analyze key security headers
    header_lower = {k.lower(): v for k, v in headers.items()}

    def check_header(name, weight, description):
        nonlocal headers_score
        present = name.lower() in header_lower
        val = header_lower.get(name.lower(), "")
        if present:
            headers_score += weight
        security_checks.append({
            "header": name,
            "present": present,
            "value": val,
            "importance_weight": weight,
            "recommendation": description if not present else "Configured properly"
        })

    check_header("Strict-Transport-Security", 25, "Enforces HTTPS connections and prevents SSL stripping.")
    check_header("Content-Security-Policy", 25, "Mitigates XSS attacks and unauthorized script execution.")
    check_header("X-Frame-Options", 15, "Prevents clickjacking attacks by controlling framing.")
    check_header("X-Content-Type-Options", 15, "Blocks MIME type sniffing.")
    check_header("Referrer-Policy", 10, "Restricts sensitive data leakage in HTTP Referer headers.")
    check_header("Permissions-Policy", 10, "Restricts browser feature access like camera and microphone.")

    server_info = header_lower.get("server", "Hidden")
    powered_by = header_lower.get("x-powered-by", None)

    # CDN fingerprinting
    if "cf-ray" in header_lower or "cloudflare" in server_info.lower():
        cdn_detected = "Cloudflare"
    elif "x-amz-cf-id" in header_lower:
        cdn_detected = "Amazon CloudFront"
    elif "x-fastly-request-id" in header_lower:
        cdn_detected = "Fastly CDN"
    elif "akamai" in server_info.lower():
        cdn_detected = "Akamai CDN"

    grade = "A+" if headers_score >= 90 else ("A" if headers_score >= 80 else ("B" if headers_score >= 60 else ("C" if headers_score >= 40 else "F")))

    return {
        "url": target_url,
        "status_code": status_code,
        "security_score": headers_score,
        "grade": grade,
        "server": server_info,
        "powered_by": powered_by,
        "cdn": cdn_detected,
        "checks": security_checks
    }
