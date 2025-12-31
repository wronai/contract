# Reclapp – Plan refaktoryzacji i stabilizacji

## Cel
Ustabilizować workflow uruchamiania (Makefile + Docker) oraz dokończyć naprawy przykładów tak, żeby:
- `make stop`, `make up`, `make down` działały deterministycznie
- przykłady w `examples/*` nie miały konfliktów portów / nazw kontenerów
- zmienne środowiskowe były zarządzane centralnie (globalnie + per-example override)

## Stan na teraz (31.12)
- **Root stack**: `make up` działa, frontend jest serwowany jako nginx (production stage) i nie ma już Vite w HTML.
- **Centralne ENV**: istnieje `examples/.env.examples` + per-example `.env.examples`.
- **Do poprawy**:
  - `make stop` kończy się błędem (`stop-dev` dostaje `Terminated`).
  - `make auto-up` nic nie robi (brakuje realnych targetów/recipe).
  - Frontend czasami zwraca chwilowe `502` na `/api/*` tuż po starcie (API jeszcze nie przyjmuje połączeń).
  - `examples/iot-monitoring` i `examples/multi-agent` nadal mają zaległe problemy build/run.

---

## Milestone 1: Makefile – niezawodne start/stop i auto-* (PRIORYTET: wysoki)
- [ ] **Naprawić `stop-dev`** tak, aby nigdy nie zabijał procesu `make` ani powłoki.
  - [ ] Dodać tryb "debug" (`make stop-dev DEBUG=1`) logujący jakie PIDy są ubijane i dlaczego.
  - [ ] Uściślić warunki kill (np. whitelist tylko: `node`, `ts-node`, `ts-node-dev`, `vite` uruchomione z katalogu projektu).
  - [ ] Zmienić `stop` tak, by `stop-dev` był best-effort (nie wywalał całego `make stop`), a błędy były raportowane.
- [ ] **Zaimplementować `auto-up` / `auto-*`** jako kompozycję komend (np. `stop` -> `up` -> `health`).
  - [ ] Ustalić, czy `auto-up` ma odpalać root stack czy wybrany przykład.

## Milestone 2: Root docker-compose – stabilny proxy do API (PRIORYTET: średni)
- [ ] **Zlikwidować chwilowe `502` w nginx** na `/api/*` podczas startu.
  - [ ] W `docker-compose.yml` ustawić `depends_on` z warunkiem `service_healthy` dla `frontend -> api` (jeśli wspierane przez aktualny Compose).
  - [ ] Alternatywnie (lub dodatkowo) dodać w nginx `proxy_next_upstream` i sensowne retry/timeouts.

## Milestone 3: examples/iot-monitoring – doprowadzić do działającego `make up` (PRIORYTET: wysoki)
- [ ] Naprawić brakujące/niezgodne ścieżki (np. `./simulator`) i build context.
- [ ] Upewnić się, że `npm ci` działa w kontenerze (package-lock w kontekście / spójny Dockerfile).
- [ ] Ujednolicić healthchecki i `--remove-orphans`.

## Milestone 4: examples/multi-agent – doprowadzić do działającego `make up` (PRIORYTET: wysoki)
- [ ] Naprawić `Dockerfile` (kopiuje ścieżki, które nie istnieją w aktualnej strukturze).
- [ ] Zaktualizować `docker-compose.yml`/healthchecki jeśli wymagają narzędzi których nie ma w obrazie.

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
  - `make stop-dev DEBUG=1` (po dodaniu)
