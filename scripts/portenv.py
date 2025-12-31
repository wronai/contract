import re
import socket
from pathlib import Path
from copy import deepcopy

ENV_PATH = Path(".env")

PORT_RANGE_MIN = 1024
PORT_RANGE_MAX = 65535

PORT_NAME_RE = re.compile(r"PORT", re.IGNORECASE)
URL_PORT_RE = re.compile(r":(\d{2,5})(?!\d)")


def is_port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


def find_free_port(start_port: int) -> int:
    port = start_port + 1
    while port <= PORT_RANGE_MAX:
        if is_port_free(port):
            return port
        port += 1
    raise RuntimeError("Brak wolnych portów")


def extract_ports(key: str, value: str):
    ports = []

    if PORT_NAME_RE.search(key) and value.isdigit():
        p = int(value)
        if 1 <= p <= 65535:
            ports.append(("plain", p))

    for match in URL_PORT_RE.finditer(value):
        p = int(match.group(1))
        if 1 <= p <= 65535:
            ports.append(("url", p))

    return ports


def replace_port(value: str, old: int, new: int):
    return re.sub(rf":{old}(?!\d)", f":{new}", value)


def process_env(lines):
    updated_lines = []
    port_map = {}        # stary_port -> nowy_port
    change_log = []     # szczegóły zmian

    for line in lines:
        stripped = line.strip()

        if not stripped or stripped.startswith("#") or "=" not in stripped:
            updated_lines.append(line)
            continue

        key, value = stripped.split("=", 1)
        ports = extract_ports(key, value)
        new_value = value

        for kind, port in ports:
            if not is_port_free(port):
                if port not in port_map:
                    port_map[port] = find_free_port(port)

                new_port = port_map[port]

                if kind == "plain":
                    new_value = str(new_port)
                else:
                    new_value = replace_port(new_value, port, new_port)

                change_log.append({
                    "variable": key,
                    "type": kind,
                    "old": port,
                    "new": new_port
                })

                print(f"[ZMIANA] {key} ({kind}): {port} → {new_port}")

        updated_lines.append(f"{key}={new_value}\n")

    return updated_lines, change_log


def print_summary(changes):
    if not changes:
        print("\n✔ Brak kolizji portów")
        return

    print("\n=== PODSUMOWANIE ZMIAN ===")
    for c in changes:
        print(
            f"{c['variable']:<30} "
            f"{c['old']:<6} → {c['new']}"
        )


def main():
    original = ENV_PATH.read_text().splitlines(keepends=True)
    updated, changes = process_env(deepcopy(original))

    backup = ENV_PATH.with_suffix(".env.bak")
    backup.write_text("".join(original))
    ENV_PATH.write_text("".join(updated))

    print(f"\n✔ Zaktualizowano .env")
    print(f"✔ Backup zapisany jako: {backup.name}")

    print_summary(changes)


if __name__ == "__main__":
    main()
