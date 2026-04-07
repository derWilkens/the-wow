@echo off
setlocal

cd /d "%~dp0frontend"

if not defined E2E_EMAIL set "E2E_EMAIL=1@derwilkens.de"
if not defined E2E_PASSWORD set "E2E_PASSWORD=Wilkens:)"
if not defined E2E_BASE_URL set "E2E_BASE_URL=http://127.0.0.1:4175"
if not defined E2E_API_BASE_URL set "E2E_API_BASE_URL=http://127.0.0.1:3000"

echo Running BIM headed E2E against %E2E_BASE_URL%
call npx.cmd playwright test "e2e/bim-cyclic-coordination.spec.ts" --headed --project=chromium

endlocal
