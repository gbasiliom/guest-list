# preparar-git.ps1  (arquivo ASCII)
# Rode na raiz do projeto: powershell -ExecutionPolicy Bypass -File .\preparar-git.ps1
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\package.json')) {
  Write-Host 'ERRO: rode este script dentro de C:\Projetos\recepcao-visitantes' -ForegroundColor Red
  exit 1
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host 'ERRO: o Git nao esta instalado (https://git-scm.com/download/win).' -ForegroundColor Red
  exit 1
}

if (-not (Test-Path '.\.git')) {
  git init
  git branch -M main
  Write-Host 'OK  repositorio criado' -ForegroundColor Green
}

$nome = (git config user.name)
$email = (git config user.email)
if ([string]::IsNullOrWhiteSpace($nome)) {
  $nome = Read-Host 'Seu nome para os commits'
  git config user.name $nome
}
if ([string]::IsNullOrWhiteSpace($email)) {
  $email = Read-Host 'Seu e-mail do GitHub'
  git config user.email $email
}

git add -A
$mudancas = git status --porcelain
if ($mudancas) {
  git commit -m 'Guest List: recepcao e apresentacao de visitantes (Capacitor + Kotlin + React)'
  Write-Host 'OK  commit criado' -ForegroundColor Green
} else {
  Write-Host 'Nada novo para commitar.'
}

$origem = git remote
if (-not $origem) {
  Write-Host ''
  Write-Host 'Crie um repositorio VAZIO no GitHub (sem README) e cole a URL aqui.'
  Write-Host 'Exemplo: https://github.com/SEU-USUARIO/guest-list.git'
  $url = Read-Host 'URL do repositorio (Enter para pular)'
  if (-not [string]::IsNullOrWhiteSpace($url)) {
    git remote add origin $url.Trim()
  }
}

if (git remote) {
  git push -u origin main
  if ($LASTEXITCODE -eq 0) {
    Write-Host ''
    Write-Host 'PRONTO. Codigo no GitHub.' -ForegroundColor Green
    Write-Host 'Vercel: vercel.com/new -> importe o repositorio -> Deploy (preset Vite, sem variaveis).'
  } else {
    Write-Host 'O push falhou. Confira a URL e o login do GitHub e rode o script de novo.' -ForegroundColor Yellow
  }
} else {
  Write-Host 'Commit feito localmente. Rode o script de novo quando tiver a URL do GitHub.'
}
