import ipaddress
from typing import Dict, Any, List

def calculate_subnet(cidr: str) -> Dict[str, Any]:
    cidr = cidr.strip()
    try:
        # Support both single IP or network CIDR
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

            # Determine IPv4 class
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

            # Subnet splitting preview (e.g. next smaller prefix)
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
