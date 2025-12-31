# Reclapp – Plan refaktoryzacji i stabilizacji

## Cel
Ustabilizować workflow uruchamiania (Makefile + Docker) oraz dokończyć naprawy przykładów tak, żeby:
- `make stop`, `make up`, `make down` działały deterministycznie
- przykłady w `examples/*` nie miały konfliktów portów / nazw kontenerów
- zmienne środowiskowe były zarządzane centralnie (globalnie + per-example override)

## Stan na teraz (01.01)
- **Root stack**: `make auto-up` uruchamia stack; frontend jest serwowany jako nginx (production stage).
- **Centralne ENV**: istnieje `examples/.env.examples` + per-example `.env`/`.env.examples`.
- **Makefile**:
  - `stop-dev` nie zabija procesu `make`/powłoki; ma tryb verbose: `make stop-dev DEBUG=1`.
  - `auto-up` / `auto-*` mają realne recipe.
- **Root nginx -> api**: `frontend` czeka na `api` (healthcheck) przed startem.
- **Root docker**: poprawiony błąd TS (`TS18046`) blokujący start `api` w kontenerze.
- **Examples**: dodany alias `logs` -> `docker-logs` w Makefile’ach przykładów.

---

## Milestone 1: Makefile – niezawodne start/stop i auto-* (PRIORYTET: wysoki)
- [x] **Naprawić `stop-dev`** tak, aby nigdy nie zabijał procesu `make` ani powłoki.
  - [x] Dodać tryb "debug" (`make stop-dev DEBUG=1`) logujący jakie PIDy są ubijane i dlaczego.
  - [x] Uściślić warunki kill (whitelist: `node`, `ts-node`, `ts-node-dev`, `vite` + filtrowanie PIDów `make`).
  - [x] Zmienić `stop` tak, by `stop-dev` był best-effort (nie wywalał całego `make stop`).
- [x] **Zaimplementować `auto-up` / `auto-*`** jako kompozycję komend (`stop` -> `up`).
  - [x] `auto-up` odpala root stack; `auto-b2b`/`auto-iot`/`auto-agent` odpalają wybrane przykłady.
- [ ] (Opcjonalnie) Rozważyć przełączenie root `api` w Dockerze na stage `production` dla maksymalnej deterministyczności (bez `ts-node-dev`).

## Milestone 2: Root docker-compose – stabilny proxy do API (PRIORYTET: średni)
- [x] **Zlikwidować chwilowe `502` w nginx** na `/api/*` podczas startu.
  - [x] W `docker-compose.yml` ustawione `depends_on` z warunkiem `service_healthy` dla `frontend -> api`.
  - [ ] (Opcjonalnie) Dodać w nginx `proxy_next_upstream` i sensowne retry/timeouts jako dodatkowy bufor.

## Milestone 2.1: Root docker-compose – stabilny start `api` (PRIORYTET: wysoki)
- [x] **Naprawić start `api` w dockerze** blokowany przez błąd TypeScript (`TS18046` w `modules/data-provider`).

## Milestone 3: examples/iot-monitoring – doprowadzić do działającego `make up` (PRIORYTET: wysoki)
- [ ] Naprawić brakujące/niezgodne ścieżki (np. `./simulator`) i build context.
- [ ] Upewnić się, że `npm ci` działa w kontenerze (package-lock w kontekście / spójny Dockerfile).
- [ ] Ujednolicić healthchecki i `--remove-orphans`.

## Milestone 4: examples/multi-agent – doprowadzić do działającego `make up` (PRIORYTET: wysoki)
- [x] Dodano `logs` alias w Makefile.
- [ ] Naprawić `Dockerfile` (kopiuje ścieżki, które nie istnieją w aktualnej strukturze).
- [ ] Zweryfikować healthchecki (nie zakładać `wget`/narzędzi których nie ma w obrazie).
- [ ] Zweryfikować `make up` / `make down` w przykładzie bez konfliktów z innymi stackami.

## Milestone 5: Weryfikacja end-to-end i dokumentacja (PRIORYTET: średni)
- [ ] Zweryfikować w każdym stacku:
  - [ ] `make stop`
  - [ ] `make up`
  - [ ] `make down`
  - [ ] `curl` do health endpointów
- [ ] Dopisać w `README.md` krótką sekcję: "ENV dla przykładów" (global `examples/.env.examples` + local override).

---

## Notatki diagnostyczne
- Jeśli `make stop` kończy się `Terminated`, zebrać:
  - `docker compose ps`
  - `ps -ef | grep -E "(make|node|vite|ts-node)"`
  - `make stop-dev DEBUG=1`
- Jeśli `api` nie startuje w Dockerze:
  - `docker compose logs --tail=200 api`

### Makefile
- `stop-dev`: DEBUG mode, ochrona przed ubijaniem make/shell
- `auto-up`, `auto-b2b`, `auto-iot`, `auto-agent`: workflow targets

### Nginx (`docker/nginx/nginx.conf`)
- `proxy_next_upstream error timeout http_502 http_503 http_504`
- `proxy_next_upstream_tries 3`, timeouts

### Data Provider (`modules/data-provider/index.ts`)
- Nowy moduł do ładowania danych z JSON zamiast random mock
- Fallback do mock gdy JSON niedostępny

### Examples Makefiles
- Dodano `logs` alias we wszystkich przykładach
