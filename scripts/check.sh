#!/usr/bin/env bash
# Pre-launch check: lists every placeholder still in the site and worker config.
# Exit code 0 = ready to launch.
cd "$(dirname "$0")/.."
fail=0
echo "== Text placeholders =="
if grep -rnE 'YOURDOMAIN|YOUR-SUBDOMAIN|GITHUB-USER|OWNER@EMAIL|\[Owner name\]|QBCC 0000000' site worker/wrangler.toml; then
  fail=1
else
  echo "none"
fi
echo
echo "== Placeholder reviews =="
if grep -n 'class="placeholder"' site/index.html; then fail=1; else echo "none"; fi
echo
echo "== Placeholder images (still the generated grey cards) =="
hash() { if command -v md5sum >/dev/null 2>&1; then md5sum "$1" | cut -d' ' -f1; else md5 -q "$1"; fi; }
n=0
for f in site/images/*.jpg; do
  h=$(hash "$f")
  if grep -q "^$h $(basename "$f")\$" scripts/placeholder-images.txt; then
    echo "$f"; n=$((n+1))
  fi
done
[ $n -eq 0 ] && echo "none" || fail=1
echo
echo "== Image sizes over 400 KB =="
big=$(find site/images -type f -size +400k)
if [ -n "$big" ]; then echo "$big"; fail=1; else echo "none"; fi
echo
[ $fail -eq 0 ] && echo "READY TO LAUNCH" || echo "NOT READY: fix the items above"
exit $fail
