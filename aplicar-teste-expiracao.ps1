# aplicar-teste-expiracao.ps1  (arquivo ASCII)
# Rode na pasta do projeto: powershell -ExecutionPolicy Bypass -File .\aplicar-teste-expiracao.ps1
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\package.json') -or -not (Test-Path '.\android')) {
  Write-Host 'ERRO: rode este script dentro de C:\Projetos\recepcao-visitantes' -ForegroundColor Red
  exit 1
}
$raiz = (Get-Location).Path

$b64 = @'
UEsDBBQAAAAIAOZ5R13yZQbOhQEAAD0DAABNAAAAYW5kcm9pZC1wbHVnaW4vc3JjL21haW4vamF2YS9ici9jb20vYWd1aWxkYS9l
bWJlZGRlZHNlcnZlci9tb2RlbC9FeHBpcmFjYW8ua3R9kktPwkAQx+/9FCMnUNJgTDwYIEHlYAIxserVDNtxs7qPZnZLUMN3d9va
gorOoY95/OY/O1ugeEVJsOJUOJOiLJXOMSWzojyn3BOviVPjctJJ4lYvJALMN4ViFOjgI0kgmnDWB1ijhuuHu9nV7PYpm2dZfC2z
C1g4K2ECZws4hvNRfJyORqOm7rm0IFCLUiN30L5ghbmbm6Z00BFaP5z8brPjefIeXUPL8QdsCCgdY4fM3nwgk4qSmWy4V4aWSmvl
+4PY9tI5TWhhUrMrq4thOvlH9GCnRBIj35EvjZtJJhnj/bXyKqAN5KMG5cP4sXVMhyC5LFwbuInC5hu1UpE+jWqWWIyzwKoaYmbf
pvHsW1nVwQcXUF8h4xot+jhaA4tLLW2AD1ABlId9aNpmw/YAyZkYli6CdpL3YKmoo0cT6HkyT/VfL4I6ElMo2YLB4va533kr69UN
url9L3bcb+LVOw0PVHTD1QXfXQfzv0bYS//y/Miu9lStrk78+0Z0Rc3XNtkmn1BLAQIUAxQAAAAIAOZ5R13yZQbOhQEAAD0DAABN
AAAAAAAAAAAAAACkgQAAAABhbmRyb2lkLXBsdWdpbi9zcmMvbWFpbi9qYXZhL2JyL2NvbS9hZ3VpbGRhL2VtYmVkZGVkc2VydmVy
L21vZGVsL0V4cGlyYWNhby5rdFBLBQYAAAAAAQABAHsAAADwAQAAAAA=
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
Write-Host 'PRONTO. APK DE TESTE (sessao expira em 3 min) em:' -ForegroundColor Green
Write-Host ($apk + '\app-debug.apk')
explorer $apk
