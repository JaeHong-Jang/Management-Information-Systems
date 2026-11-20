#!/usr/bin/env bash
# main 브랜치 그대로를 Azure App Service(Linux, Node 22)에 올린다. 서버 하나가 화면(frontend/dist)과 /api를 함께 낸다.
# 커밋된 파일만 쓴다(git archive). 그래서 실명 원자료(data/source)·키 파일·로컬 저장소(backend/var)는 올라가지 않는다.
# Claude API 키는 이 스크립트가 다루지 않는다. 앱 설정(ANTHROPIC_API_KEY)에 한 번 넣어 두면 재배포해도 남는다.
#
# 쓰는 법: AZ_RG=yunseul-hq-rg AZ_APP=<앱 이름> scripts/deploy-azure.sh   (REF=develop 처럼 다른 브랜치도 가능)
set -euo pipefail

: "${AZ_RG:?AZ_RG(리소스 그룹)를 정해 주세요}"
: "${AZ_APP:?AZ_APP(웹앱 이름)을 정해 주세요}"
REF="${REF:-main}"

REPO="$(git rev-parse --show-toplevel)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "[1/4] $REF 의 yunseul-hq를 꺼내요"
git -C "$REPO" archive "$REF" yunseul-hq | tar -x -C "$WORK"
APP_DIR="$WORK/yunseul-hq"

echo "[2/4] 화면을 빌드해요"
(cd "$APP_DIR/frontend" && npm ci --no-audit --no-fund && npm run build)

echo "[3/4] 백엔드 실행용 패키지만 설치해요"
(cd "$APP_DIR/backend" && npm ci --omit=dev --no-audit --no-fund)

echo "[4/4] 묶어서 올려요"
ZIP="$WORK/app.zip"
python3 - "$APP_DIR" "$ZIP" <<'PY'
import os, sys, zipfile
root, out = sys.argv[1], sys.argv[2]
keep = ['backend/package.json', 'backend/tsconfig.json', 'backend/src', 'backend/node_modules',
        'shared', 'harness', 'data/seed', 'frontend/dist']
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for k in keep:
        p = os.path.join(root, k)
        if os.path.isfile(p):
            z.write(p, k)
            continue
        for d, _, files in os.walk(p):
            for f in files:
                full = os.path.join(d, f)
                if not os.path.islink(full):
                    z.write(full, os.path.relpath(full, root))
print(f'zip {os.path.getsize(out) / 1e6:.1f} MB')
PY
az webapp deploy -g "$AZ_RG" -n "$AZ_APP" --src-path "$ZIP" --type zip --restart true
echo "올렸어요: https://$(az webapp show -g "$AZ_RG" -n "$AZ_APP" --query defaultHostName -o tsv)"
