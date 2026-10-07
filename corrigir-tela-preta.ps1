# corrigir-tela-preta.ps1  (arquivo ASCII, sem acentos de proposito)
# Rode na pasta do projeto: powershell -ExecutionPolicy Bypass -File .\corrigir-tela-preta.ps1
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\package.json') -or -not (Test-Path '.\android')) {
  Write-Host 'ERRO: rode este script dentro de C:\Projetos\recepcao-visitantes' -ForegroundColor Red
  exit 1
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$raiz = (Get-Location).Path

function Gravar($rel, $texto) {
  $caminho = Join-Path $raiz $rel
  [System.IO.File]::WriteAllText($caminho, $texto.Replace("`r`n","`n"), $utf8)
  Write-Host ("OK  gravado: " + $rel)
}

$indexHtml = @'
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Recep&ccedil;&atilde;o de Visitantes</title>
    <!-- Diagnostico: se a pagina nao carregar (WebView antigo, erro de JS), escreve o motivo na tela em vez de ficar preta. Codigo ES5 de proposito. -->
    <script>
      (function () {
        function mostrar(msg) {
          var d = document.createElement('div');
          d.style.cssText = 'padding:16px;font:14px/1.4 monospace;color:#ff8b8b;background:#111318;white-space:pre-wrap;word-break:break-word';
          d.textContent = msg;
          (document.body || document.documentElement).appendChild(d);
        }
        window.onerror = function (m, src, l, c) {
          mostrar('ERRO: ' + m + '\n(' + (src || '') + ':' + l + ':' + c + ')');
        };
        window.addEventListener('unhandledrejection', function (e) {
          mostrar('ERRO (promise): ' + ((e.reason && e.reason.message) || e.reason));
        });
        window.addEventListener('load', function () {
          setTimeout(function () {
            var r = document.getElementById('root');
            if (r && !r.firstChild) {
              mostrar('A tela nao carregou.\nWebView: ' + navigator.userAgent);
            }
          }, 2500);
        });
      })();
    </script>
    <script nomodule>
      document.addEventListener('DOMContentLoaded', function () {
        document.body.innerHTML = '<p style="color:#fff;padding:16px;font:16px sans-serif">WebView muito antigo. Atualize o "Android System WebView" na Play Store.</p>';
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'@

$viteConfig = @'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config - serve o front-end tanto localmente (dev) quanto
// empacotado dentro do Capacitor (build estatico em /dist).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite acesso via IP local (necessario para testar via hotspot na rede)
    port: 5173
  },
  build: {
    outDir: 'dist',
    // Compatibilidade: celulares com Android System WebView antigo nao entendem
    // sintaxe recente (?? , ?. etc). es2015 faz o esbuild reescrever isso.
    target: ['es2015']
  }
});
'@

$capConfig = @'
{
  "appId": "br.com.aguilda.recepcaovisitantes",
  "appName": "Recep\u00e7\u00e3o de Visitantes",
  "webDir": "dist",
  "server": {
    "androidScheme": "http",
    "cleartext": true
  }
}
'@

Gravar 'index.html' $indexHtml
Gravar 'vite.config.js' $viteConfig
Gravar 'capacitor.config.json' $capConfig

# Permite o app falar com http://192.168.x.x (hotspot). Sem isso o Android bloqueia.
$manifest = Join-Path $raiz 'android\app\src\main\AndroidManifest.xml'
$m = [System.IO.File]::ReadAllText($manifest)
if ($m -notmatch 'usesCleartextTraffic') {
  $m = $m.Replace('<application', '<application android:usesCleartextTraffic="true"')
  [System.IO.File]::WriteAllText($manifest, $m, $utf8)
  Write-Host 'OK  AndroidManifest.xml: usesCleartextTraffic adicionado'
} else {
  Write-Host 'OK  AndroidManifest.xml ja tinha usesCleartextTraffic'
}

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
Write-Host 'PRONTO. APK novo em:' -ForegroundColor Green
Write-Host ($apk + '\app-debug.apk')
explorer $apk
