param([ValidateSet('network','health','repair','dns','storage','startup','updates','audio','printers','reliability','energy','restoreEnergy','sandboxEnable')][string]$Action,[Parameter(Mandatory)][string]$ResultFile,[switch]$Elevated)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$needsAdmin=$Action -in @('health','repair','dns','sandboxEnable')
$isAdmin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$result=@{ok=$false;output='';error=$null}
if($needsAdmin -and !$isAdmin){
 try {
  if($Elevated){throw 'Elevacao nao concedida.'}
  $arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -Action '+$Action+' -ResultFile "'+$ResultFile+'" -Elevated'
  $p=Start-Process "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $arguments -Verb RunAs -WindowStyle Hidden -Wait -PassThru
  if(!(Test-Path -LiteralPath $ResultFile)){throw 'Nenhum resultado da acao elevada.'}
  exit $p.ExitCode
 }catch{$result.error=$_.Exception.Message;$result | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding UTF8;exit 1}
}
function Native($exe,[string[]]$arguments){$text=(& $exe @arguments 2>&1 | Out-String);if($LASTEXITCODE -ne 0){throw ($text+' Codigo: '+$LASTEXITCODE)};$text}
try{
 $result.output=switch($Action){
  network {Get-NetAdapter | Format-Table Name,Status,LinkSpeed | Out-String; Get-DnsClientServerAddress | Format-Table | Out-String; Native "$env:WINDIR\System32\netsh.exe" @('int','tcp','show','global')}
  health {Native "$env:WINDIR\System32\Dism.exe" @('/Online','/Cleanup-Image','/CheckHealth')}
  repair {Native "$env:WINDIR\System32\Dism.exe" @('/Online','/Cleanup-Image','/RestoreHealth'); Native "$env:WINDIR\System32\sfc.exe" @('/scannow')}
  dns {Clear-DnsClientCache; 'Cache DNS limpo.'}
  storage {Start-Process 'ms-settings:storagesense'; 'Configuracoes de armazenamento abertas.'}
  startup {Start-Process 'ms-settings:startupapps'; 'Configuracoes de inicializacao abertas.'}
  updates {Start-Process 'ms-settings:windowsupdate'; 'Windows Update aberto.'}
  audio {Start-Process 'ms-settings:sound'; 'Configuracoes de som abertas.'}
  printers {Start-Process 'ms-settings:printers'; 'Configuracoes de impressoras abertas.'}
  reliability {Start-Process "$env:WINDIR\System32\perfmon.exe" '/rel'; 'Monitor de Confiabilidade aberto.'}
  energy {
   $save=Join-Path (Split-Path $ResultFile) 'energy-backup.txt'
   $current=(& "$env:WINDIR\System32\powercfg.exe" /getactivescheme) -join ''
   if($current -notmatch '[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}'){throw 'Plano atual nao identificado.'}
   if(!(Test-Path $save)){$Matches[0] | Set-Content $save}
   Native "$env:WINDIR\System32\powercfg.exe" @('/setactive','8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c');'Alto desempenho ativado.'
  }
  restoreEnergy {
   $save=Join-Path (Split-Path $ResultFile) 'energy-backup.txt'
   $old=(Get-Content $save -Raw).Trim();if($old -notmatch '^[0-9a-fA-F-]{36}$'){throw 'Backup invalido.'}
   Native "$env:WINDIR\System32\powercfg.exe" @('/setactive',$old);'Plano anterior restaurado.'
  }
  sandboxEnable {
   $state=Get-WindowsOptionalFeature -Online -FeatureName 'Containers-DisposableClientVM'
   if($state.State -eq 'Enabled'){'Windows Sandbox ja habilitado.'}
   else{$enabled=Enable-WindowsOptionalFeature -Online -FeatureName 'Containers-DisposableClientVM' -All -NoRestart; 'Recurso habilitado. Reinicio necessario: '+$enabled.RestartNeeded}
  }
 }
 $result.output=$result.output | Out-String;$result.ok=$true
}catch{$result.error=$_.Exception.Message}
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ResultFile -Encoding UTF8
if(!$result.ok){exit 1}
