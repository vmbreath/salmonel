#!/bin/sh
set -eu
cd /opt/salmonel-pilot
/usr/bin/docker run --rm --memory=192m --cpus=0.3 --pids-limit=80 \
 -v /opt/salmonel-pilot/letsencrypt:/etc/letsencrypt \
 -v /opt/salmonel-pilot/acme-webroot:/var/www/acme \
 certbot/certbot:5.9.0 renew --non-interactive --no-random-sleep-on-renew "$@"
/usr/bin/docker compose -f compose.yaml -f compose.public.yaml exec -T proxy nginx -t
/usr/bin/docker compose -f compose.yaml -f compose.public.yaml exec -T proxy nginx -s reload
