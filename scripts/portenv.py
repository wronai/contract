#!/usr/bin/env python3
import os
import sys
import socket
import argparse
from typing import Dict, List, Tuple

def load_env(env_path: str = '.env') -> Dict[str, str]:
    """Load environment variables from a file."""
    env_vars = {}
    if not os.path.exists(env_path):
        return env_vars
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            try:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
            except ValueError:
                pass
    return env_vars

def check_port(host: str, port: int) -> bool:
    """Check if a port is in use (listening). Returns True if in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex((host, port)) == 0

def find_free_port(host: str, start_port: int, max_port: int) -> int:
    for port in range(start_port, max_port + 1):
        if not check_port(host, port):
            return port
    raise RuntimeError(f"No free port found in range {start_port}..{max_port}")

def update_env_file(env_path: str, updates: Dict[str, str]) -> None:
    if not os.path.exists(env_path):
        lines = []
    else:
        with open(env_path, 'r') as f:
            lines = f.read().splitlines()

    keys = set(updates.keys())
    new_lines = []
    seen = set()

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in line:
            new_lines.append(line)
            continue

        k, _ = line.split('=', 1)
        key = k.strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            new_lines.append(line)

    for key in keys:
        if key not in seen:
            new_lines.append(f"{key}={updates[key]}")

    with open(env_path, 'w') as f:
        f.write("\n".join(new_lines) + "\n")

def scan_ports(env_vars: Dict[str, str], mode: str, prefixes: List[str] = None) -> bool:
    """Scan ports defined in env vars.
    mode: 'free' (expect ports to be free) or 'used' (expect ports to be in use)
    prefixes: list of prefixes to filter variables (e.g. ['B2B_', 'PORT'])
    Returns True if all checks pass.
    """
    
    # Filter for port variables
    port_vars = {}
    for k, v in env_vars.items():
        if not v.isdigit():
            continue
        if not (k.endswith('_PORT') or k == 'PORT'):
            continue
            
        # Apply prefix filter if provided
        if prefixes:
            matched = False
            for p in prefixes:
                if k.startswith(p) or k == p:
                    matched = True
                    break
            if not matched:
                continue
        
        port_vars[k] = int(v)
    
    if not port_vars:
        print("No matching port definitions found in .env")
        return True

    print(f"Checking {len(port_vars)} ports in '{mode}' mode...")
    
    all_passed = True
    host = 'localhost' # Default host to check
    
    # Special case for HOST env var
    if 'HOST' in env_vars:
        host = env_vars['HOST'].replace('0.0.0.0', '127.0.0.1')

    print(f"{'VARIABLE':<30} {'PORT':<10} {'STATUS':<10} {'RESULT'}")
    print("-" * 65)

    for name, port in port_vars.items():
        is_used = check_port(host, port)
        
        status = "FREE" if not is_used else "LISTENING"
        
        if mode == 'free':
            passed = not is_used
            expect = "FREE"
        else: # mode == 'used'
            passed = is_used
            expect = "LISTENING"
            
        res_str = "✓ OK" if passed else f"✗ FAIL (Expected {expect})"
        color = "\033[92m" if passed else "\033[91m"
        reset = "\033[0m"
        
        print(f"{name:<30} {port:<10} {status:<10} {color}{res_str}{reset}")
        
        if not passed:
            all_passed = False

    return all_passed

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Check port availability based on .env')
    parser.add_argument('--mode', choices=['free', 'used'], default='free',
                        help='Check if ports are free (pre-start) or used (post-start)')
    parser.add_argument('--env', default='.env', help='Path to .env file')
    parser.add_argument('--prefix', action='append', help='Filter variables by prefix (can be used multiple times)')

    parser.add_argument('--pick-var', help='Env var name (ending with _PORT) to ensure is set to a free port')
    parser.add_argument('--start-port', type=int, default=7860, help='Start port for --pick-var search')
    parser.add_argument('--max-port', type=int, default=7960, help='Max port for --pick-var search')
    
    args = parser.parse_args()
    
    # Print header
    print("=================================================================")
    print(" RECLAPP PORT DIAGNOSTIC")
    print("=================================================================")

    env = load_env(args.env)

    if args.pick_var:
        host = env.get('HOST', 'localhost').replace('0.0.0.0', '127.0.0.1')
        picked = find_free_port(host, args.start_port, args.max_port)
        update_env_file(args.env, {args.pick_var: str(picked)})
        env = load_env(args.env)
        print(f"Picked {args.pick_var}={picked} in {args.env}")

    success = scan_ports(env, args.mode, args.prefix)
    
    print("=================================================================")
    sys.exit(0 if success else 1)
