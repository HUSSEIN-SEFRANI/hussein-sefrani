#!/bin/bash
# يجهّز مجلد لعبة: ينسخ kit.js و kit.css ويكتب index.html
#   ./make.sh "<مجلد اللعبة>" "<العنوان>" [ملف-بيانات.js ...]
set -e
K="$(cd "$(dirname "$0")" && pwd)"; G="$1"; T="$2"; shift 2
mkdir -p "$G"; cp "$K/kit.js" "$K/kit.css" "$G/"
S=""; for f in "$@"; do S="$S<script src=\"$f\"></script>\n"; done
sed -e "s|__TITLE__|$T|" -e "s|__SCRIPTS__|$S|" "$K/index.html" > "$G/index.html"
