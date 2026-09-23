param([ValidateSet('network','health','repair','dns','storage','startup','updates','audio','printers','reliability','energy','restoreEnergy')][string]$Action,[Parameter(Mandatory)][string]$ResultFile,[switch]$Elevated)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$needsAdmin=$Action -in @('health','repair','dns')
$isAdmin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$result=@{ok=$false;output='';error=$null}
if($needsAdmin -and !$isAdmin){
 try {
  if($Elevated){throw 'Elevacao nao concedida.'}
  $arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -Action '+$Action+' -ResultFile "'+$ResultFile+'" -Elevated'
  $p=Start-Process "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $arguments -Verb RunAs -WindowStyle Hidden -Wait -PassThru
  if(!(Test-Path -LiteralPath $ResultFile)){throw 'Nenhum resultado da acao elevada.'}
  exit $p.ExitCode
 }catch{$result.error='Esta acao exige autorizacao de administrador. Se nao possui login e senha de uma conta administradora, procure o administrador da maquina. / Administrator approval is required. If you do not have administrator credentials, contact your administrator. / Se requiere autorizacion de administrador. Si no tiene credenciales, contacte al administrador. Detalhes: '+$_.Exception.Message;$result | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding UTF8;exit 1}
}
Add-Type -Path (Join-Path $PSScriptRoot 'NativeRunner.cs')
$script:nativeLog=New-Object Text.StringBuilder
function Native($exe,[string[]]$arguments){
 $native=[VimakaNativeRunner]::Run($exe,($arguments -join ' '),($ResultFile+'.progress.log'))
 [void]$script:nativeLog.AppendLine($native.Output)
 if($native.ExitCode -notin @(0,3010)){throw ('Codigo: '+$native.ExitCode+' '+$native.Output)}
 $native.Output
}
function Open-Panel($target,$processName,$extra){
 $existing=@(Get-Process -Name $processName -ErrorAction SilentlyContinue | Where-Object MainWindowHandle -ne 0 | ForEach-Object MainWindowHandle)
 if($extra){Start-Process $target -ArgumentList $extra}else{Start-Process $target}
 $owned=@()
 for($attempt=0;$attempt -lt 10 -and !$owned.Count;$attempt++){
  Start-Sleep -Milliseconds 500
  $owned=@(Get-Process -Name $processName -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -notin $existing -and $_.SessionId -eq (Get-Process -Id $PID).SessionId -and $_.MainWindowHandle -ne 0})
 }
 if($owned.Count){
  $handles=@{};foreach($window in $owned){$handles[$window.Id]=$window.MainWindowHandle}
  Start-Sleep -Seconds 10
  foreach($window in $owned){try{$window.Refresh();if(!$window.HasExited -and $window.MainWindowHandle -eq $handles[$window.Id]){[void]$window.CloseMainWindow()}}catch{}}
  'Janela aberta pelo app: fechamento solicitado apos 10 segundos.'
 }
 else{'Janela existente ou compartilhada: preservada. Feche manualmente quando terminar.'}
}
try{
 $result.output=switch($Action){
  network {Get-NetAdapter | Format-Table Name,Status,LinkSpeed | Out-String; Get-DnsClientServerAddress | Format-Table | Out-String; Native "$env:WINDIR\System32\netsh.exe" @('int','tcp','show','global')}
  health {Native "$env:WINDIR\System32\Dism.exe" @('/Online','/Cleanup-Image','/CheckHealth')}
  repair {Native "$env:WINDIR\System32\Dism.exe" @('/Online','/Cleanup-Image','/RestoreHealth'); Native "$env:WINDIR\System32\sfc.exe" @('/scannow')}
  dns {Clear-DnsClientCache; 'Cache DNS limpo.'}
  storage {Open-Panel 'ms-settings:storagesense' 'SystemSettings'; 'Configuracoes de armazenamento abertas.'}
  startup {Open-Panel 'ms-settings:startupapps' 'SystemSettings'; 'Configuracoes de inicializacao abertas.'}
  updates {Open-Panel 'ms-settings:windowsupdate' 'SystemSettings'; 'Windows Update aberto.'}
  audio {Open-Panel 'ms-settings:sound' 'SystemSettings'; 'Configuracoes de som abertas.'}
  printers {Open-Panel 'ms-settings:printers' 'SystemSettings'; 'Configuracoes de impressoras abertas.'}
  reliability {Open-Panel "$env:WINDIR\System32\perfmon.exe" 'perfmon' '/rel'; 'Monitor de Confiabilidade aberto.'}
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
 }
 $result.output=$result.output | Out-String;$result.ok=$true
}catch{$result.output=$script:nativeLog.ToString();$result.error=$_.Exception.Message}
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ResultFile -Encoding UTF8
if(!$result.ok){exit 1}
