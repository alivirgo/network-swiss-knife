import ipaddress
import math
from typing import Dict, Any, List

def calculate_subnet(cidr: str) -> Dict[str, Any]:
    cidr = cidr.strip()
    try:
        if "/" not in cidr:
            cidr += "/24"
        
        net = ipaddress.ip_network(cidr, strict=False)
        is_ipv4 = isinstance(net, ipaddress.IPv4Network)

        if is_ipv4:
            net_address = str(net.network_address)
            broadcast_address = str(net.broadcast_address)
            netmask = str(net.netmask)
            hostmask = str(net.hostmask)
            total_hosts = net.num_addresses
            usable_hosts = max(0, total_hosts - 2) if net.prefixlen < 31 else total_hosts
            
            first_host = str(net.network_address + 1) if usable_hosts > 0 else net_address
            last_host = str(net.broadcast_address - 1) if usable_hosts > 0 else broadcast_address

            # Binary representation
            octets = [f"{int(o):08b}" for o in net_address.split(".")]
            binary_net = ".".join(octets)

            # Class
            first_octet = int(net_address.split(".")[0])
            if first_octet < 128:
                ip_class = "A"
            elif first_octet < 192:
                ip_class = "B"
            elif first_octet < 224:
                ip_class = "C"
            elif first_octet < 240:
                ip_class = "D (Multicast)"
            else:
                ip_class = "E (Experimental)"

            # Subnet splitting preview
            subnets_split = []
            if net.prefixlen < 30:
                subnets_split = [str(s) for s in list(net.subnets(prefixlen_diff=1))[:4]]

            return {
                "valid": True,
                "version": "IPv4",
                "cidr": str(net),
                "prefix_length": net.prefixlen,
                "network_address": net_address,
                "broadcast_address": broadcast_address,
                "netmask": netmask,
                "wildcard_mask": hostmask,
                "first_usable_ip": first_host,
                "last_usable_ip": last_host,
                "total_addresses": total_hosts,
                "usable_hosts": usable_hosts,
                "ip_class": ip_class,
                "is_private": net.is_private,
                "is_global": net.is_global,
                "binary_network": binary_net,
                "split_examples": subnets_split
            }
        else:
            return {
                "valid": True,
                "version": "IPv6",
                "cidr": str(net),
                "prefix_length": net.prefixlen,
                "network_address": str(net.network_address),
                "total_addresses": str(net.num_addresses),
                "netmask": str(net.netmask),
                "is_private": net.is_private,
                "is_global": net.is_global
            }
    except Exception as e:
        return {
            "valid": False,
            "error": f"Invalid IP/CIDR representation: {str(e)}"
        }

def calculate_vlsm(root_cidr: str, requirements: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes Variable Length Subnet Masking (VLSM) optimal allocation.
    requirements: [{"name": "Department", "hosts": int}]
    """
    try:
        base_net = ipaddress.ip_network(root_cidr, strict=False)
        if not isinstance(base_net, ipaddress.IPv4Network):
            return {"valid": False, "error": "VLSM planner currently supports IPv4 networks"}

        # Sort requirements descending by required host count
        sorted_reqs = sorted(requirements, key=lambda x: x.get("hosts", 0), reverse=True)
        allocated = []
        current_ip = int(base_net.network_address)
        max_ip = int(base_net.broadcast_address)
        total_used_addresses = 0

        for req in sorted_reqs:
            name = req.get("name", "Subnet")
            needed_hosts = req.get("hosts", 1)
            
            # Find required prefix: 2^(32 - prefix) - 2 >= needed_hosts
            # needed total = needed_hosts + 2 (network + broadcast)
            needed_total = needed_hosts + 2
            host_bits = math.ceil(math.log2(needed_total))
            host_bits = max(2, min(30, host_bits)) # minimum /30 (2 usable hosts)
            prefix = 32 - host_bits
            block_size = 2 ** host_bits

            # Align current_ip to block boundary
            if current_ip % block_size != 0:
                current_ip += (block_size - (current_ip % block_size))

            subnet_end = current_ip + block_size - 1
            if subnet_end > max_ip:
                allocated.append({
                    "name": name,
                    "needed_hosts": needed_hosts,
                    "status": "OVERFLOW",
                    "error": "Root network has insufficient address space"
                })
                continue

            sub_net = ipaddress.IPv4Network((current_ip, prefix))
            usable_count = max(0, sub_net.num_addresses - 2)
            first_host = str(sub_net.network_address + 1)
            last_host = str(sub_net.broadcast_address - 1)

            allocated.append({
                "name": name,
                "needed_hosts": needed_hosts,
                "allocated_hosts": usable_count,
                "cidr": str(sub_net),
                "prefix": prefix,
                "netmask": str(sub_net.netmask),
                "network_address": str(sub_net.network_address),
                "broadcast_address": str(sub_net.broadcast_address),
                "usable_range": f"{first_host} - {last_host}",
                "status": "ALLOCATED"
            })

            total_used_addresses += block_size
            current_ip += block_size

        utilization_pct = round((total_used_addresses / base_net.num_addresses) * 100, 1)

        return {
            "valid": True,
            "root_cidr": str(base_net),
            "root_total_addresses": base_net.num_addresses,
            "allocated_addresses": total_used_addresses,
            "utilization_pct": min(100.0, utilization_pct),
            "allocated_subnets": allocated
        }
    except Exception as e:
        return {"valid": False, "error": f"VLSM error: {str(e)}"}
