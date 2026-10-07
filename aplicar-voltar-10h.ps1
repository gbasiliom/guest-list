# aplicar-voltar-10h.ps1  (arquivo ASCII)
# Rode na pasta do projeto: powershell -ExecutionPolicy Bypass -File .\aplicar-voltar-10h.ps1
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\package.json') -or -not (Test-Path '.\android')) {
  Write-Host 'ERRO: rode este script dentro de C:\Projetos\recepcao-visitantes' -ForegroundColor Red
  exit 1
}
$raiz = (Get-Location).Path

$b64 = @'
UEsDBBQAAAAIAOh5R10OK5fKhgEAAEMDAABNAAAAYW5kcm9pZC1wbHVnaW4vc3JjL21haW4vamF2YS9ici9jb20vYWd1aWxkYS9l
bWJlZGRlZHNlcnZlci9tb2RlbC9FeHBpcmFjYW8ua3R9kktPwzAMx+/9FGanDaaqXDggNmmMHZCYkChwRV5qokAelZNOPLTvTtrS
boyBD2njx89/1y1RvKIkWHEqnElRVkoXmJJZUVFQ4YnXxKlxBekkcasXEgEWb6ViFOjgM0kgmnDWB1ijhquHu9l8dvuUL/I8Ppb5
Odw4K2ECp9kNHMNZ1h2nWZa11c+VBYFaVBq5Rw8FKyzcwrSAUc/p/HDyu9mW58l7dC2twD3YGFA6xh6Zv/tAJhUVM9lwrwwtldbK
D0ex7aVzmtDCpGHX1hTDdPKP6NFWiSRGviNfGTeTTDLGh2vlVUAbyEcNyoeLx84xHYPkqnRd4DoKW7yplYr0aVSzxPIiD6zqIWb2
fRo30MmqP39wAfUcGddo0cfRWlhcbWUDfIIKoDzsQtMuGzYHSM7EsHQRtJW8A0tFEz2awMCTeWpugwjqSUyhYgsGy9vnYe+tbdA0
6Of2g9hxt4lXHzQ+UNEP1xT8dB3M/x5hJ/3bs5dd76leXZP49x/RF7Vvm2STfAFQSwECFAMUAAAACADoeUddDiuXyoYBAABDAwAA
TQAAAAAAAAAAAAAAgAEAAAAAYW5kcm9pZC1wbHVnaW4vc3JjL21haW4vamF2YS9ici9jb20vYWd1aWxkYS9lbWJlZGRlZHNlcnZl
ci9tb2RlbC9FeHBpcmFjYW8ua3RQSwUGAAAAAAEAAQB7AAAA8QEAAAAA
'@

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$bytes = [Convert]::FromBase64String(($b64 -replace '\s',''))
$ms = New-Object System.IO.MemoryStream(,$bytes)
$zip = New-Object System.IO.Compression.ZipArchive($ms)
foreach ($e in $zip.Entries) {
  if ([string]::IsNullOrEmpty($e.Name)) { continue }
  $destino = Join-Path $raiz ($e.FullName -replace '/', '\')
  New-Item -ItemType Directory -Force -Path (Split-Path $destino) | Out-Null
  $entrada = $e.Open()
  $saida = [System.IO.File]::Create($destino)
  $entrada.CopyTo($saida)
  $saida.Close()
  $entrada.Close()
  Write-Host ('OK  atualizado: ' + $e.FullName)
}
$zip.Dispose()

Write-Host '--- npm run build ---'
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO no npm run build' -ForegroundColor Red; exit 1 }

Write-Host '--- cap sync ---'
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host 'ERRO no cap sync' -ForegroundColor Red; exit 1 }

Write-Host '--- gradle assembleDebug ---'
Push-Location (Join-Path $raiz 'android')
.\gradlew assembleDebug
$codigo = $LASTEXITCODE
Pop-Location
if ($codigo -ne 0) { Write-Host 'ERRO no gradle' -ForegroundColor Red; exit 1 }

$apk = Join-Path $raiz 'android\app\build\outputs\apk\debug'
Write-Host ''
Write-Host 'PRONTO. APK FINAL (sessao expira em 10 h) em:' -ForegroundColor Green
Write-Host ($apk + '\app-debug.apk')
explorer $apk
