import asyncio
import dns.resolver
import dns.asyncresolver
import time
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
    types = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA"]
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

async def check_malicious_dns(domain: str) -> Dict[str, Any]:
    """
    Checks if a domain is blocked by security DNS resolvers (malware/phishing sinkholes)
    and evaluates domain risk indicators.
    """
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
            # Sinks often resolve to 0.0.0.0, 127.0.0.1, or block pages
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
            # If security resolver returns NXDOMAIN while control resolves, it was blocked!
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

    # Heuristic threat rating
    is_malicious = False
    verdict = "CLEAN"
    risk_score = 5 # base score

    suspicious_tlds = [".xyz", ".top", ".buzz", ".click", ".country", ".gq", ".cf", ".tk", ".ml"]
    if any(domain.endswith(tld) for tld in suspicious_tlds):
        risk_score += 25

    if len(domain.split(".")[0]) > 25: # suspicious entropy / DGA indicator
        risk_score += 20

    if blocked_by_security >= 2:
        is_malicious = True
        verdict = "MALICIOUS / BLOCKED BY THREAT INTELLIGENCE"
        risk_score = max(risk_score, 90)
    elif blocked_by_security == 1:
        verdict = "SUSPICIOUS (Blocked by 1 Security Resolver)"
        risk_score = max(risk_score, 60)
    elif not control_resolved and blocked_by_security == 0:
        verdict = "UNRESOLVED / INACTIVE DOMAIN"
        risk_score = 15

    return {
        "domain": domain,
        "verdict": verdict,
        "is_malicious": is_malicious,
        "risk_score_pct": min(risk_score, 100),
        "blocked_resolvers_count": blocked_by_security,
        "total_security_resolvers": len([r for r in SECURITY_RESOLVERS if r["blocks_threats"]]),
        "resolver_details": security_checks
    }
