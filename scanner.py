#!/usr/bin/env python3
"""
Shiny Doodle Network Swiss Knife 2.0 - CLI & Engine Entrypoint
Maintains 100% backwards compatibility with original 2020 syntax while providing
asynchronous multi-threaded port scanning and launching the full cross-platform GUI.
"""

import sys
import os
import argparse
import asyncio

# Ensure backend modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

def run_cli_scanner(target: str, start_port: int, end_port: int, concurrency: int = 150):
    from core.scanner import scan_ports
    print("=" * 60)
    print(f"[*] Network Swiss Knife (NSK) 2.0")
    print(f"[*] Scanning Target: {target}")
    print(f"[*] Port Range:      {start_port} -> {end_port}")
    print(f"[*] Concurrency:     {concurrency} workers")
    print("=" * 60)

    port_list = list(range(start_port, end_port + 1))
    results = asyncio.run(scan_ports(target=target, ports=port_list, concurrency=concurrency, grab_banners=True))

    if results.get("error"):
        print(f"[!] Error: {results['error']}")
        return

    print(f"\n[+] Scan Complete in {results['scan_time_seconds']}s")
    print(f"[+] Discovered {results['open_ports_count']} Open Ports on {results['ip']}:\n")

    if not results["results"]:
        print("    No open ports found in specified range.")
    else:
        print(f"    {'PORT':<8} {'SERVICE':<20} {'RISK':<10} {'LATENCY':<10} {'BANNER'}")
        print("    " + "-" * 65)
        for r in results["results"]:
            banner = (r["banner"] or "-")[:35]
            print(f"    {r['port']:<8} {r['service']:<20} {r['risk']:<10} {str(r['latency_ms'])+'ms':<10} {banner}")
    print("\n" + "=" * 60)
    print("[*] Tip: Launch the full cross-platform GUI by running: python start.py")

def main():
    parser = argparse.ArgumentParser(description="Network Swiss Knife (NSK) 2.0")
    parser.add_argument("target", nargs="?", help="Target IP or hostname to scan")
    parser.add_argument("--gui", action="store_true", help="Launch the GUI in your default browser")
    parser.add_argument("-p", "--ports", help="Port range (e.g. 1-1024)", default=None)
    parser.add_argument("-c", "--concurrency", type=int, default=150, help="Worker concurrency (default: 150)")

    args = parser.parse_args()

    if args.gui or len(sys.argv) == 1:
        if args.gui:
            import start
            start.main()
            return

    # Original interactive mode or argument mode
    if args.target:
        target = args.target
        if args.ports:
            parts = args.ports.split("-")
            start_p = int(parts[0])
            end_p = int(parts[1]) if len(parts) > 1 else start_p
        else:
            try:
                start_p = int(input("Starting Port: "))
                end_p = int(input("Ending Port: "))
            except (ValueError, KeyboardInterrupt):
                print("\n[!] Exiting.")
                sys.exit(0)
        run_cli_scanner(target, start_p, end_p, concurrency=args.concurrency)
    else:
        print("Usage: python scanner.py <target_ip> [-p 1-1024] [--gui]")
        print("       python start.py  (launches full GUI)")

if __name__ == "__main__":
    main()
