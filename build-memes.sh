#!/usr/bin/env bash
# Render memes. Each spec is a meme.json; the JPEG lands beside it, named after
# its folder minus any YYYY-MM-DD- prefix (posts/2026-10-01-caching/meme.json
# -> posts/2026-10-01-caching/caching.jpg), or after the spec's "out" key.
#   ./build-memes.sh path/to/meme.json        one spec
#   ./build-memes.sh posts/                   every meme.json under a folder
#   ./build-memes.sh posts/ caching           ...only paths containing "caching"
#   ./build-memes.sh --examples [template…]   the specs in examples/
#   QUALITY=90 ./build-memes.sh …             JPEG quality (default 86)
# With no path, looks in $MEMES_DIR, else ./memes.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

specs=()
if [ "${1:-}" = "--examples" ]; then
  shift
  if [ $# -eq 0 ]; then for s in "$here"/examples/*/meme.json; do specs+=("$s"); done
  else for t in "$@"; do specs+=("$here/examples/$t/meme.json"); done; fi
else
  roots=(); filters=()
  for a in "$@"; do
    if [ -e "$a" ]; then roots+=("$(cd "$(dirname "$a")" && pwd)/$(basename "$a")"); else filters+=("$a"); fi
  done
  [ ${#roots[@]} -gt 0 ] || roots=("$(pwd)/${MEMES_DIR:-memes}")
  for r in "${roots[@]}"; do
    if [ -f "$r" ]; then specs+=("$r")
    elif [ -d "$r" ]; then while IFS= read -r s; do specs+=("$s"); done < <(find "$r" -name meme.json -not -path "*/node_modules/*" | sort)
    else echo "no such path: $r" >&2; exit 1; fi
  done
  if [ ${#filters[@]} -gt 0 ]; then
    keep=()
    for s in "${specs[@]}"; do for q in "${filters[@]}"; do [[ "$s" == *"$q"* ]] && keep+=("$s") && break; done; done
    specs=("${keep[@]+"${keep[@]}"}")
  fi
fi
[ ${#specs[@]} -gt 0 ] || { echo "no meme.json matched" >&2; exit 1; }

for spec in "${specs[@]}"; do
  [ -f "$spec" ] || { echo "no such spec: $spec" >&2; exit 1; }
  dir="$(dirname "$spec")"
  name="$(node -e 'const s=require(process.argv[1]);process.stdout.write(s.out||"")' "$spec")"
  [ -n "$name" ] || name="$(basename "$dir" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//').jpg"
  out="$dir/$name"
  node "$here/render-meme.js" "$spec" "$out" >/dev/null
  printf '%8s  %s\n' "$(du -h "$out" | cut -f1)" "$out"
done
printf '\nrendered %s meme(s)\n' "${#specs[@]}"
