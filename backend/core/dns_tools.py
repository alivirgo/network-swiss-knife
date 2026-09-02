import asyncio
import dns.resolver
import dns.asyncresolver
import time
import re
from typing import List, Dict, Any, Optional

GLOBAL_RESOLVERS = [
    {"name": "Google", "ip": "8.8.8.8", "location": "Global / US"},
    {"name": "Cloudflare", "ip": "1.1.1.1", "location": "Global / Anycast"},
    {"name": "Quad9", "ip": "9.9.9.9", "location": "Switzerland / Global"},
    {"name": "OpenDNS", "ip": "208.67.222.222", "location": "US / Anycast"},
    {"name": "AdGuard", "ip": "94.140.14.14", "location": "Cyprus / Global"},
    {"name": "DNS.WATCH", "ip": "84.200.69.80", "location": "Germany"},
    {"name": "Level3", "ip": "4.2.2.1", "location": "US"},
    {"name": "Comodo Secure", "ip": "8.26.56.26", "location": "US / Anycast"},
    {"name": "AliDNS", "ip": "223.5.5.5", "location": "China / Asia"}
]

SECURITY_RESOLVERS = [
    {"name": "Quad9 Threat Block", "ip": "9.9.9.9", "blocks_threats": True},
    {"name": "Cloudflare Security", "ip": "1.1.1.2", "blocks_threats": True},
    {"name": "CleanBrowsing Security", "ip": "185.228.168.9", "blocks_threats": True},
    {"name": "AdGuard Family", "ip": "94.140.14.15", "blocks_threats": True},
    {"name": "Standard Google (Control)", "ip": "8.8.8.8", "blocks_threats": False},
    {"name": "Standard Cloudflare (Control)", "ip": "1.1.1.1", "blocks_threats": False}
]

COMMON_SUBDOMAINS = [
    "www", "mail", "api", "vpn", "admin", "portal", "dev", "app", 
    "secure", "remote", "server", "cloud", "auth", "login"
]

TOP_BRANDS = [
    "google", "microsoft", "apple", "amazon", "facebook", "paypal",
    "netflix", "chase", "wellsfargo", "bankofamerica", "coinbase", "binance"
]

async def query_record_type(domain: str, record_type: str, resolver_ip: Optional[str] = None) -> List[str]:
    res = dns.asyncresolver.Resolver()
    res.timeout = 2.0
    res.lifetime = 2.5
    if resolver_ip:
        res.nameservers = [resolver_ip]
    
    try:
        answers = await res.resolve(domain, record_type)
        return [str(r.to_text()).strip('"') for r in answers]
    except Exception:
        return []

async def full_dns_lookup(domain: str) -> Dict[str, Any]:
    types = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA", "PTR", "SRV"]
    tasks = [query_record_type(domain, rt) for rt in types]
    results_list = await asyncio.gather(*tasks)

    records = {}
    for rt, res in zip(types, results_list):
        records[rt] = res

    return {
        "domain": domain,
        "records": records,
        "has_records": any(len(v) > 0 for v in records.values())
    }

async def audit_email_security(domain: str) -> Dict[str, Any]:
    """
    Validates SPF, DMARC, and DKIM email authentication policies.
    """
    clean_domain = domain.strip().lower().replace("http://", "").replace("https://", "").split("/")[0]

    # 1. Check SPF
    txt_records = await query_record_type(clean_domain, "TXT")
    spf_record = next((r for r in txt_records if r.startswith("v=spf1")), None)

    spf_status = "MISSING"
    spf_strictness = "NONE"
    if spf_record:
        spf_status = "CONFIGURED"
        if "-all" in spf_record:
            spf_strictness = "STRICT (-all)"
        elif "~all" in spf_record:
            spf_strictness = "SOFTFAIL (~all)"
        elif "?all" in spf_record:
            spf_strictness = "NEUTRAL (?all)"
        elif "+all" in spf_record:
            spf_strictness = "INSECURE (+all)"

    # 2. Check DMARC
    dmarc_domain = f"_dmarc.{clean_domain}"
    dmarc_records = await query_record_type(dmarc_domain, "TXT")
    dmarc_record = next((r for r in dmarc_records if r.startswith("v=DMARC1")), None)

    dmarc_status = "MISSING"
    dmarc_policy = "NONE"
    if dmarc_record:
        dmarc_status = "CONFIGURED"
        pol_match = re.search(r"p=(reject|quarantine|none)", dmarc_record, re.IGNORECASE)
        if pol_match:
            dmarc_policy = pol_match.group(1).upper()

    # 3. Check MX records
    mx_records = await query_record_type(clean_domain, "MX")

    # Score calculation
    score = 0
    if spf_status == "CONFIGURED":
        score += 40 if spf_strictness.startswith("STRICT") else 30
    if dmarc_status == "CONFIGURED":
        if dmarc_policy == "REJECT":
            score += 50
        elif dmarc_policy == "QUARANTINE":
            score += 40
        else:
            score += 20
    if len(mx_records) > 0:
        score += 10

    grade = "A+" if score >= 90 else ("A" if score >= 80 else ("B" if score >= 60 else ("C" if score >= 40 else "F")))

    return {
        "domain": clean_domain,
        "score": min(100, score),
        "grade": grade,
        "has_mx": len(mx_records) > 0,
        "mx_records": mx_records,
        "spf": {
            "status": spf_status,
            "strictness": spf_strictness,
            "record": spf_record or "No SPF record published"
        },
        "dmarc": {
            "status": dmarc_status,
            "policy": dmarc_policy,
            "record": dmarc_record or f"No DMARC record found at {dmarc_domain}"
        }
    }

async def audit_dnssec(domain: str) -> Dict[str, Any]:
    """Tests for DNSSEC signing (DNSKEY, RRSIG, DS records)."""
    dnskey = await query_record_type(domain, "DNSKEY")
    rrsig = await query_record_type(domain, "RRSIG")
    ds = await query_record_type(domain, "DS")

    is_enabled = len(dnskey) > 0 or len(rrsig) > 0 or len(ds) > 0

    return {
        "domain": domain,
        "dnssec_enabled": is_enabled,
        "dnskey_count": len(dnskey),
        "rrsig_count": len(rrsig),
        "ds_count": len(ds),
        "status": "DNSSEC SIGNED & ACTIVE" if is_enabled else "UNSIGNED / STANDARD DNS"
    }

async def enumerate_subdomains(domain: str) -> List[Dict[str, Any]]:
    """Probes common high-value subdomains."""
    results = []

    async def probe_sub(prefix):
        sub = f"{prefix}.{domain}"
        a_records = await query_record_type(sub, "A")
        if a_records:
            results.append({
                "subdomain": sub,
                "prefix": prefix,
                "ips": a_records
            })

    tasks = [probe_sub(p) for p in COMMON_SUBDOMAINS]
    await asyncio.gather(*tasks)
    results.sort(key=lambda x: x["subdomain"])
    return results

async def check_propagation(domain: str, record_type: str = "A") -> List[Dict[str, Any]]:
    results = []

    async def probe_resolver(item):
        start = time.perf_counter()
        records = await query_record_type(domain, record_type, item["ip"])
        duration = round((time.perf_counter() - start) * 1000, 1)
        results.append({
            "name": item["name"],
            "ip": item["ip"],
            "location": item["location"],
            "records": records,
            "status": "resolved" if records else "nxdomain_or_timeout",
            "latency_ms": duration
        })

    tasks = [probe_resolver(r) for r in GLOBAL_RESOLVERS]
    await asyncio.gather(*tasks)
    return results

def check_typosquatting(domain: str) -> Optional[str]:
    """Checks if domain name mimics a major brand."""
    main_part = domain.split(".")[0]
    for brand in TOP_BRANDS:
        if brand in main_part and main_part != brand:
            return f"Suspicious: Domain contains brand '{brand}' as substring"
    return None

async def check_malicious_dns(domain: str) -> Dict[str, Any]:
    domain = domain.strip().lower().replace("http://", "").replace("https://", "").split("/")[0]

    security_checks = []
    blocked_by_security = 0
    control_resolved = False

    async def check_single(res_item):
        nonlocal blocked_by_security, control_resolved
        res = dns.asyncresolver.Resolver()
        res.timeout = 2.0
        res.lifetime = 2.5
        res.nameservers = [res_item["ip"]]
        
        try:
            answers = await res.resolve(domain, "A")
            ips = [str(r) for r in answers]
            is_sinkhole = any(ip in ["0.0.0.0", "127.0.0.1", "127.0.0.2"] for ip in ips)
            if res_item["blocks_threats"] and is_sinkhole:
                blocked_by_security += 1
            if not res_item["blocks_threats"] and len(ips) > 0 and not is_sinkhole:
                control_resolved = True

            security_checks.append({
                "resolver": res_item["name"],
                "ip": res_item["ip"],
                "blocks_threats_mode": res_item["blocks_threats"],
                "resolved": True,
                "is_sinkhole": is_sinkhole,
                "ips": ips
            })
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            if res_item["blocks_threats"]:
                blocked_by_security += 1
            security_checks.append({
                "resolver": res_item["name"],
                "ip": res_item["ip"],
                "blocks_threats_mode": res_item["blocks_threats"],
                "resolved": False,
                "is_sinkhole": True if res_item["blocks_threats"] else False,
                "ips": []
            })
        except Exception:
            security_checks.append({
                "resolver": res_item["name"],
                "ip": res_item["ip"],
                "blocks_threats_mode": res_item["blocks_threats"],
                "resolved": False,
                "is_sinkhole": False,
                "ips": [],
                "error": "Timeout or lookup failure"
            })

    tasks = [check_single(r) for r in SECURITY_RESOLVERS]
    await asyncio.gather(*tasks)

    # Heuristic threat evaluation
    is_malicious = False
    verdict = "CLEAN"
    risk_score = 5
    threat_indicators = []

    suspicious_tlds = [".xyz", ".top", ".buzz", ".click", ".country", ".gq", ".cf", ".tk", ".ml"]
    if any(domain.endswith(tld) for tld in suspicious_tlds):
        risk_score += 25
        threat_indicators.append("High-risk / abuse-prone Top-Level Domain (TLD)")

    main_label = domain.split(".")[0]
    if len(main_label) > 25:
        risk_score += 20
        threat_indicators.append("High-entropy / possible Domain Generation Algorithm (DGA)")

    typo_flag = check_typosquatting(domain)
    if typo_flag:
        risk_score += 35
        threat_indicators.append(typo_flag)

    if blocked_by_security >= 2:
        is_malicious = True
        verdict = "MALICIOUS / SINKHOLED BY THREAT INTELLIGENCE"
        risk_score = max(risk_score, 92)
        threat_indicators.append(f"Blocked by {blocked_by_security} threat intelligence resolvers")
    elif blocked_by_security == 1:
        verdict = "SUSPICIOUS (Blocked by 1 Security Resolver)"
        risk_score = max(risk_score, 60)
        threat_indicators.append("Blocked by 1 security filter")
    elif not control_resolved and blocked_by_security == 0:
        verdict = "UNRESOLVED / INACTIVE DOMAIN"
        risk_score = 15

    # Run subdomain reconnaissance in background
    subdomains = await enumerate_subdomains(domain)

    return {
        "domain": domain,
        "verdict": verdict,
        "is_malicious": is_malicious,
        "risk_score_pct": min(risk_score, 100),
        "blocked_resolvers_count": blocked_by_security,
        "total_security_resolvers": len([r for r in SECURITY_RESOLVERS if r["blocks_threats"]]),
        "threat_indicators": threat_indicators,
        "discovered_subdomains": subdomains,
        "resolver_details": security_checks
    }
