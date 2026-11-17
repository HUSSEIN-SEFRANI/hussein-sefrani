#!/bin/bash
# يجهّز مجلد لعبة أو تطبيق تعليمي: ينسخ kit.js و kit.css ويكتب index.html و app.json
#   ./make.sh "<المجلد>" "<العنوان>" [ملف-بيانات.js ...]
# النوع: لعبة (game، بلا نجوم) أو تعليم (education، نجمة عند إنهاء الدرس). يُسأل عنه إن لم يُحدَّد:
#   TYPE=education ./make.sh "جدول الضرب" "جدول الضرب" data.js
#   TYPE=game      ./make.sh "الأفعى" "الأفعى"
set -e
K="$(cd "$(dirname "$0")" && pwd)"; G="$1"; T="$2"; shift 2
case "${TYPE:-}" in
  game|education) ;;
  "")
    if [ -t 0 ]; then
      read -r -p "هل هذا 1) لعبة 🎮 (بلا نجوم) أم 2) تعليم 📚 (نجمة عند إنهاء الدرس)؟ [1/2]: " a
      case "$a" in 2|تعليم|education) TYPE=education ;; 1|لعبة|game) TYPE=game ;; *) echo "اختر 1 أو 2"; exit 1 ;; esac
    else
      echo "حدّد النوع: TYPE=game أو TYPE=education"; exit 1
    fi ;;
  *) echo "TYPE يجب أن يكون game أو education"; exit 1 ;;
esac
mkdir -p "$G"; cp "$K/kit.js" "$K/kit.css" "$G/"
S=""; for f in "$@"; do S="$S<script src=\"$f\"></script>\n"; done
sed -e "s|__TITLE__|$T|" -e "s|__SCRIPTS__|$S|" "$K/index.html" > "$G/index.html"
if [ ! -f "$G/app.json" ]; then
  python3 -c 'import json,sys; print(json.dumps({"name": sys.argv[1], "type": sys.argv[2], "version": 1}, ensure_ascii=False, indent=1))' \
    "$(basename "$G")" "$TYPE" > "$G/app.json"
fi
echo "✓ $G ($TYPE)"
