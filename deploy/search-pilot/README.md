# Salmonel read-only search pilot

This additive package contains the deployed read-only search backend and responsive frontend. The legacy application at the repository root is unchanged. It is not a full migration of legacy accounts, administration or attachments.

## Interface
- Mobile: readable cards with original O/H1/H2 values, optional table and a separate accessible filter dialog.
- Desktop: spacious table and sidebar with a scrollable antigen picker and pinned apply action.
- Explicit include/exclude modes, draft selection with Apply, name search, removable selection chips, reset, pagination and clear loading/error/retry states.
- Scientific antigen matching remains on the server. Displayed notation and original seed records are unchanged.
- Dependency-free HTML/CSS/JavaScript; no external fonts, analytics or third-party browser requests.

## Security boundary
Only the reverse proxy is public on TCP/80 and TCP/443. The app remains on loopback and PostgreSQL has no network interface or TCP listener. App SQL access is SELECT-only. Administration, authentication, uploads and file endpoints are disabled. SQL/request limits, proxy route allowlisting, rate limiting, container resource limits and non-root/read-only app runtime are included.

No credentials, certificates, private keys, database dumps, operational browser captures or private home-server history are included. The seed JSON is the existing scientific reference dataset, not a production database dump.

## Layout
- `frontend-v2/`: reviewed UI source.
- `prepare.py`: materializes `app/public/` from the UI source.
- `app/`: Express/pg read-only service, hardened search route and seed reference JSON.
- `compose.yaml`, `compose.public.yaml`: app/database isolation and public proxy.
- `nginx.*.conf`: ACME bootstrap and HTTPS allowlist configuration.
- `provision-reader.sql`, `pg_hba.public.conf`: database reader-role provisioning and local socket authentication boundary.
- `renew-tls.sh` and systemd units: short-lived public-IP certificate renewal.
- `verify-public.py`, `verify-db-access.js`, `test-antigen-variants.mjs`: read-only acceptance/privilege/notation checks.

## Build and operational prerequisites
Run from this directory:

```sh
python3 prepare.py
docker build -t ninkear/salmonel-search:frontend-v2 .
```

This package describes an existing seeded pilot. App startup intentionally does not create schema, seed a fresh database or grant itself database-owner rights. An operator must separately provision the existing schema/data and apply `provision-reader.sql` as the PostgreSQL administrative OS user before switching to the hardened socket-auth configuration. Never enable the legacy default administrator account.

Review the IPv4 binds and IP-certificate paths in Compose/nginx before use on another host. Certificate and ACME account directories are runtime-only and ignored by Git. Configure TLS renewal before exposing HTTPS. `nginx.active.conf` is the operator-selected bootstrap/public configuration, not a committed certificate or secret.

Redeploy only the app with `docker compose -f compose.yaml -f compose.public.yaml up -d --no-deps --wait app`. Gracefully reload the existing nginx proxy after app recreation so its upstream DNS is refreshed. Do not recreate unrelated services or remove persistent volumes.

The rollback helper assumes an operator-created `backups/compose.frontend-v1.yaml` and a retained prior app image; those runtime backups are intentionally excluded from the repository.

## Verification already performed
Responsive browser tests at 360/390/768/1440px passed, including no document-wide horizontal overflow, mobile drawer navigation, local name search, pagination, apply-only draft requests and real API-backed filtering. Dataset: 2578 records; O2 include: 4; O2 exclude: 2574. A deliberately injected HTTP429 verified stale-results messaging and retry with a subsequent real response. Extraction of all12887 seed antigen values matched the legacy picker semantics.

Published source is derived from the isolated Salmonel change `7e1e864`; no unrelated infrastructure history is imported. Full user-facing browser automation and host-specific deployment evidence remain with the private operations workspace.
