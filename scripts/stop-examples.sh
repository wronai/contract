#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
examples_dir="$root_dir/examples"

if [ ! -d "$examples_dir" ]; then
  exit 0
fi

compose_cmd=()
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
else
  exit 0
fi

declare -A compose_dirs=()
while IFS= read -r -d '' compose_file; do
  compose_dirs["$(dirname "$compose_file")"]=1
done < <(find "$examples_dir" -maxdepth 6 -type f \( \
  -name 'docker-compose.yml' -o -name 'docker-compose.yaml' -o -name 'compose.yml' -o -name 'compose.yaml' \
\) -print0 2>/dev/null || true)

if [ ${#compose_dirs[@]} -eq 0 ]; then
  exit 0
fi

dirs=("${!compose_dirs[@]}")
IFS=$'\n' dirs=($(printf '%s\n' "${dirs[@]}" | sort))
unset IFS

for d in "${dirs[@]}"; do
  if [ -f "$d/Makefile" ]; then
    if make -C "$d" -qp 2>/dev/null | awk -F: '/^[a-zA-Z0-9][^$#\/\t=]*:/{print $1}' | grep -qx stop; then
      make -C "$d" stop >/dev/null 2>&1 || true
      continue
    fi
  fi

  (cd "$d" && "${compose_cmd[@]}" down --remove-orphans >/dev/null 2>&1) || true
done
