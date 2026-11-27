#!/bin/sh
# يبني نماذج اللعبة (glb) من سكربتات Blender. يحتاج: pip install bpy (Python 3.13)
# الاستعمال: PY=/مسار/python ./_blender/build.sh
cd "$(dirname "$0")/.." || exit 1
PY=${PY:-python3}
for m in car truck trailer moto heli plane boat ship; do "$PY" _blender/$m.py -- models/$m.glb || exit 1; done
"$PY" _blender/karmo.py -- walk models/karmo_walk.glb || exit 1
"$PY" _blender/karmo.py -- sit models/karmo_sit.glb || exit 1
