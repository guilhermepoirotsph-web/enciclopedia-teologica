# Sobe a previa e abre um link publico temporario para o Eleno ver.
#
#   Clique com o botao direito -> "Executar com PowerShell"
#   ou:  powershell -ExecutionPolicy Bypass -File previa.ps1
#
# Enquanto ESTE terminal estiver aberto, o link funciona. Ctrl+C derruba tudo.
# Fechar o terminal, desligar o PC ou o PC dormir = link morto.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$PORTA   = 8803
$USUARIO = 'eleno'
$SENHA   = 'portico2026'

if (-not (Test-Path 'dist-previa\index.html')) {
  Write-Host "`n  Falta montar a previa. Rodando agora..." -f DarkGray
  node scripts\previa-montar.mjs
  if ($LASTEXITCODE -ne 0) { Write-Host "  Nao consegui montar a previa." -f Red; exit 1 }
}

$cf = @(
  "$env:ProgramFiles\cloudflared\cloudflared.exe",
  "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $cf) {
  Write-Host "  cloudflared nao encontrado. Instale com: winget install Cloudflare.cloudflared" -f Red
  exit 1
}

Write-Host "`n  Subindo o site..." -f DarkGray
$site = Start-Process node -ArgumentList "scripts\previa-servidor.mjs", $PORTA, $USUARIO, $SENHA `
  -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

$log = Join-Path $env:TEMP 'eta-previa-tunel.log'
if (Test-Path $log) { Remove-Item $log -Force }

Write-Host "  Abrindo o link publico..." -f DarkGray
$tunel = Start-Process $cf -ArgumentList 'tunnel', '--url', "http://127.0.0.1:$PORTA", '--no-autoupdate' `
  -PassThru -WindowStyle Hidden -RedirectStandardError $log

$url = $null
foreach ($i in 1..40) {
  Start-Sleep -Seconds 1
  if (Test-Path $log) {
    $m = [regex]::Match((Get-Content $log -Raw), 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($m.Success) { $url = $m.Value; break }
  }
}

if (-not $url) {
  Write-Host "`n  O link nao abriu. A previa continua em http://127.0.0.1:$PORTA`n" -f Yellow
} else {
  Write-Host ""
  Write-Host "  ==================================================" -f DarkGray
  Write-Host "   PREVIA - ENCICLOPEDIA TEOLOGICA" -f Yellow
  Write-Host "  ==================================================" -f DarkGray
  Write-Host "   Site    $url" -f White
  Write-Host "   Painel  $url/painel" -f White
  Write-Host ""
  Write-Host "   Usuario $USUARIO" -f Gray
  Write-Host "   Senha   $SENHA" -f Gray
  Write-Host "  ==================================================" -f DarkGray
  Write-Host "   Esta previa roda SEM banco de dados:" -f DarkGray
  Write-Host "   o painel abre inteiro para ele olhar," -f DarkGray
  Write-Host "   mas nada que ele mexer e salvo." -f DarkGray
  Write-Host ""
  Write-Host "   So funciona com este terminal aberto." -f DarkGray
  Write-Host "   Ctrl+C encerra.`n" -f DarkGray
  Set-Clipboard -Value $url
  Write-Host "   (link copiado para a area de transferencia)`n" -f DarkGreen
}

try { while ($true) { Start-Sleep -Seconds 3 } }
finally {
  Write-Host "`n  Encerrando..." -f DarkGray
  foreach ($p in @($tunel, $site)) {
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
  }
}
