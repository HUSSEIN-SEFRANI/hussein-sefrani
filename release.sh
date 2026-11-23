#!/usr/bin/env bash
# إصدار HOME ANAB بأمر واحد. لا يُشغَّل إلا بعد أن يقول صاحب المشروع «أصدر» (CLAUDE.md، القاعدة 1).
#   ./release.sh 1.9.9
# يفعل: الاختبارات ← رقم الإصدار وسجل التغييرات (قيد التحضير ← vX) ← فرع fix/vX و PR ودمجه ← النشر ← التحقق.
set -euo pipefail
V="${1:?اكتب رقم الإصدار، مثل: ./release.sh 1.9.9}"
REPO=HUSSEIN-SEFRANI/hussein-sefrani
WORK=claude/eager-wright-ytkzo1
cd "$(dirname "$0")"
git checkout -q "$WORK" && git pull -q --ff-only
home-nas/tests/run_all.sh | tail -1
git checkout -q -B "fix/v$V"
sed -i -E "s/__version__ = \"[0-9.]+\"/__version__ = \"$V\"/" home-nas/homenas/__init__.py
sed -i -E "s/^## قيد التحضير \(الإصدار القادم [0-9.]+\)$/## v$V/" home-nas/CHANGELOG.md
grep -q "^## v$V$" home-nas/CHANGELOG.md || { echo "❌ لا يوجد قسم «قيد التحضير» في CHANGELOG.md"; exit 1; }
git commit -qam "HOME ANAB v$V"
git -c push.negotiate=true push -q -u origin "fix/v$V"
printf '{"title":"HOME ANAB v%s","head":"fix/v%s","base":"%s","body":"إصدار %s بعد «أصدر» من صاحب المشروع."}' "$V" "$V" "$WORK" "$V" > /tmp/pr.json
N=$(gh api -X POST "repos/$REPO/pulls" --input /tmp/pr.json --jq .number)
sleep 3; gh api -X PUT "repos/$REPO/pulls/$N/merge" -f merge_method=merge --jq '"PR #'"$N"' merged=\(.merged)"'
git checkout -q "$WORK" && git pull -q --ff-only
# KEEP=1 DROP_TAGS=true ./release.sh 2.0 ← يبقى هذا الإصدار وحده (طلب صاحب المشروع لـ 2.0)
gh workflow run homenas-iso.yml -R "$REPO" --ref "$WORK" -f publish=true -f replace=false -f cleanup_old=false -f keep="${KEEP:-5}" -f drop_tags="${DROP_TAGS:-false}"
sleep 10
RID=$(gh api "repos/$REPO/actions/runs?event=workflow_dispatch&per_page=1" --jq '.workflow_runs[0].id')
for _ in $(seq 1 60); do
  S=$(gh api "repos/$REPO/actions/runs/$RID" --jq '"\(.status) \(.conclusion)"'); [[ $S == completed* ]] && break; sleep 20
done
echo "البناء: $S"
gh api "repos/$REPO/contents/latest.json?ref=updates" --jq .content | base64 -d | head -c 120; echo
