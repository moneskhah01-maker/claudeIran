#!/usr/bin/env bash
# Deploy the built landing (dist/ + server.mjs + saas/) to the Iran VPS as a new release of claudeiran.com.
# Run from Git Bash in the project folder after `npm run build`:  bash tools/deploy-vps.sh
# - releases live in /opt/claudeiran/releases/<timestamp>, /opt/claudeiran/current points at the live one
# - early-access sign-ups live in /var/lib/claudeiran (outside the releases), linked as <release>/data
# - the last 3 releases are kept; roll back by pointing `current` at an older one and restarting
set -euo pipefail
cd "$(dirname "$0")/.."
SSH_CFG=/e/VeeJay/Vps-Iran/config
[ -f dist/index.html ] || { echo "dist/ missing: run npm run build first"; exit 1; }

TMP=$(mktemp -d)
mkdir -p "$TMP/claudeiran"
cp -r dist server.mjs saas package.json package-lock.json "$TMP/claudeiran/"
rm -rf "$TMP/claudeiran/saas/test"
tar -C "$TMP" -czf "$TMP/claudeiran.tgz" claudeiran
scp -F "$SSH_CFG" "$TMP/claudeiran.tgz" vps-iran:/root/claudeiran.tgz
rm -rf "$TMP"

ssh -F "$SSH_CFG" vps-iran 'bash -s' <<'REMOTE'
set -euo pipefail
R=/opt/claudeiran/releases/$(date +%Y%m%d-%H%M%S)
mkdir -p "$R" /var/lib/claudeiran
# one-time move of sign-ups out of the release folder
PREV=$(readlink -f /opt/claudeiran/current || true)
if [ -n "$PREV" ] && [ -d "$PREV/data" ] && [ ! -L "$PREV/data" ] && [ -f "$PREV/data/waitlist.json" ] && [ ! -f /var/lib/claudeiran/waitlist.json ]; then
  cp -a "$PREV/data/waitlist.json" /var/lib/claudeiran/waitlist.json
fi
tar -xzf /root/claudeiran.tgz -C "$R" --strip-components=1
rm -f /root/claudeiran.tgz
# production dependencies only (pg); installed before the switch, so a failed install never goes live
(cd "$R" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
ln -sfn /var/lib/claudeiran "$R/data"
chown -R claudeiran:claudeiran "$R" /var/lib/claudeiran
chmod 750 /var/lib/claudeiran
grep -q '/var/lib/claudeiran' /etc/systemd/system/claudeiran.service || {
  sed -i 's#^ReadWritePaths=.*#ReadWritePaths=/opt/claudeiran /var/lib/claudeiran#' /etc/systemd/system/claudeiran.service
  systemctl daemon-reload
}
ln -sfn "$R" /opt/claudeiran/current
systemctl restart claudeiran
sleep 2
if ! curl -fsS -o /dev/null -H 'Host: claudeiran.com' http://127.0.0.1:3600/; then
  echo "new release does not answer, rolling back"
  [ -n "$PREV" ] && ln -sfn "$PREV" /opt/claudeiran/current && systemctl restart claudeiran
  exit 1
fi
ls -1dt /opt/claudeiran/releases/* | tail -n +4 | xargs -r rm -rf
echo "live: $R"
REMOTE

for u in https://claudeiran.com/ https://claudeiran.com/robots.txt https://claudeiran.com/sitemap.xml https://claudeiran.com/og-image.png; do
  curl -s -o /dev/null -w "$u -> %{http_code}\n" "$u"
done
