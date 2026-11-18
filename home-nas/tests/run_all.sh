#!/usr/bin/env bash
# يشغّل كل اختبارات البنود:  home-nas/tests/run_all.sh   (من أي مكان)
HN="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HN/.." || exit 1          # بعض الاختبارات تقرأ ملفات من جذر المستودع (.github)
fail=0
for t in "$HN"/tests/test_item*.py; do
  r=$(timeout 300 python3 "$t" "$HN" 2>&1 | tail -1)
  printf '%-22s %s\n' "$(basename "$t")" "$r"
  echo "$r" | grep -qE '^([0-9]+)/\1 نجح' || fail=1
done
[ $fail = 0 ] && echo "✅ كل الاختبارات نجحت" || echo "❌ يوجد اختبار فشل"
exit $fail
