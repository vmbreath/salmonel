#!/bin/sh
# Restore only the pre-redesign app image/config; never remove data volumes.
set -eu
cd /opt/salmonel-pilot
cp backups/compose.frontend-v1.yaml compose.yaml
docker compose -f compose.yaml -f compose.public.yaml up -d --no-deps --wait app
docker compose -f compose.yaml -f compose.public.yaml exec -T proxy nginx -t
docker compose -f compose.yaml -f compose.public.yaml exec -T proxy nginx -s reload
curl --fail --silent --show-error http://127.0.0.1:18088/healthz
