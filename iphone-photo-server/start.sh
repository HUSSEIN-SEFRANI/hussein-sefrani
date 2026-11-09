#!/usr/bin/env bash
# تشغيل السيرفر على macOS / Linux
set -e
cd "$(dirname "$0")"
PY=${PYTHON:-python3}
if [ ! -x ".venv/bin/python" ]; then
  echo "جارِ تجهيز البيئة لأول مرة..."
  "$PY" -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt
fi
exec .venv/bin/python server.py "$@"
