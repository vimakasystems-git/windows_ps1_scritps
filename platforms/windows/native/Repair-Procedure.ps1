param([Parameter(Mandatory)][string]$RequestFile,[Parameter(Mandatory)][string]$ResultFile,[Parameter(Mandatory)][string]$DataDirectory,[switch]$Elevated)
$ErrorActionPreference='Stop'
$result=@{ok=$false;phase='preparing';changed=$false;validated=$false;restartRequired=$false}
$mutex=$null;$held=$false
function Save-Result {$result|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $ResultFile -Encoding UTF8}
function Pending-Restart {((Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'))}
try {
 $request=Get-Content -LiteralPath $RequestFile -Raw -Encoding UTF8|ConvertFrom-Json
 if($request.id -notmatch '^[a-f0-9-]{36}$'){throw 'Identificador invalido.'}
 $action=$request.action
 if($action -notin @('startupDisable','startupRestore','integrityScan','integrityRepair','updateRetry','openApps','openUpdate','lockCheck')){throw 'Procedimento nao aprovado.'}
 if($action -in @('integrityScan','integrityRepair','updateRetry','startupDisable')){
  $edition=(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').EditionID
  if($edition -notin @('Core','CoreSingleLanguage','Professional','ProfessionalEducation','ProfessionalWorkstation','Enterprise','Education')){throw 'Edicao do Windows fora da matriz desta previa.'}
  $os=Get-CimInstance Win32_OperatingSystem
  if([int]$os.BuildNumber -lt 26100 -or $os.ProductType -ne 1 -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64'){throw 'Procedimento restrito a Windows 11 cliente x64, build 26100 ou superior. Diagnostico continua disponivel.'}
 }
 $needsAdmin=$action -in @('integrityScan','integrityRepair','updateRetry')
 $admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
 if($needsAdmin -and !$admin){
  if($Elevated){throw 'Autorizacao administrativa insuficiente.'}
  $arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -RequestFile "'+$RequestFile+'" -ResultFile "'+$ResultFile+'" -DataDirectory "'+$DataDirectory+'" -Elevated'
  $process=Start-Process "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $arguments -Verb RunAs -WindowStyle Hidden -Wait -PassThru
  if(!(Test-Path -LiteralPath $ResultFile)){throw 'Nenhum resultado recebido do componente administrativo.'};exit $process.ExitCode
 }
 $mutex=New-Object Threading.Mutex($false,'Global\VimakaCareRepairProcedure')
 try{$held=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException] {$held=$true;if($action -ne 'lockCheck'){throw 'Procedimento anterior interrompido. Revise o diario antes de continuar.'}}
 if(!$held){throw 'Outro procedimento nativo esta em execucao.'}
 if($action -eq 'lockCheck'){$result.ok=$true;$result.lockFree=$true;$result.restartRequired=Pending-Restart;$result.bootAt=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o');Save-Result;exit 0}
 if($needsAdmin -and (Pending-Restart)){throw 'Reinicio pendente. Conclua a manutencao e repita o diagnostico.'}
 $backupRoot=Join-Path $DataDirectory 'repair-backups'
 if(!(Test-Path -LiteralPath $backupRoot)){New-Item -ItemType Directory -Path $backupRoot|Out-Null}
 if((Get-Item -LiteralPath $backupRoot).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Pasta de backup redirecionada recusada.'}
 function Write-VerifiedBackup($file,$value){
  if(Test-Path -LiteralPath $file){throw 'Backup existente preservado.'}
  $text=$value|ConvertTo-Json -Depth 8 -Compress
  [IO.File]::WriteAllText($file,$text,(New-Object Text.UTF8Encoding($false)))
  if([IO.File]::ReadAllText($file) -ne $text){throw 'Falha na verificacao do backup.'}
 }
 if($action -in @('startupDisable','startupRestore')){
  Add-Type -AssemblyName System.Security
  $registry=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Software\Microsoft\Windows\CurrentVersion\Run')
  try {
   if($action -eq 'startupDisable'){
    $name=[string]$request.params.name;if(!$name -or $name.Length -gt 256 -or $name.Contains([char]0)){throw 'Nome de entrada invalido.'}
    if($name -notin $registry.GetValueNames()){throw 'Entrada mudou desde o diagnostico.'}
    $kind=$registry.GetValueKind($name);if($kind -notin @('String','ExpandString')){throw 'Tipo de registro nao suportado.'}
    $value=$registry.GetValue($name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    if(($name+' '+$value) -match '(?i)defender|securityhealth|avast|kaspersky|bitdefender|eset|sophos|crowdstrike|sentinel|antivirus|windows\\system32'){throw 'Entrada de protecao ou sistema preservada.'}
    $plain=[Text.Encoding]::UTF8.GetBytes((@{name=$name;value=$value;kind=[string]$kind}|ConvertTo-Json -Compress))
    $cipher=[Security.Cryptography.ProtectedData]::Protect($plain,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $backup=Join-Path $backupRoot ($request.id+'.startup.json');Write-VerifiedBackup $backup @{cipher=[Convert]::ToBase64String($cipher);user=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value}
    $saved=Get-Content -LiteralPath $backup -Raw -Encoding UTF8|ConvertFrom-Json
    $check=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($saved.cipher),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    if([Convert]::ToBase64String($check) -ne [Convert]::ToBase64String($plain)){throw 'Backup DPAPI nao confere.'}
    $result.backupVerified=$true;$result.phase='executing';$registry.DeleteValue($name,$true);$result.changed=$true;$result.phase='validating';$result.validated=($name -notin $registry.GetValueNames());$result.detail='Entrada desativada. Isso nao comprova ganho de boot; compare novas inicializacoes equivalentes.'
   }else{
    if($request.params.sourceId -notmatch '^[a-f0-9-]{36}$'){throw 'Backup de origem invalido.'}
    $backup=Join-Path $backupRoot ($request.params.sourceId+'.startup.json');$saved=Get-Content -LiteralPath $backup -Raw -Encoding UTF8|ConvertFrom-Json
    if($saved.user -ne [Security.Principal.WindowsIdentity]::GetCurrent().User.Value){throw 'Reversao deve usar a conta original.'}
    $plain=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($saved.cipher),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $entry=[Text.Encoding]::UTF8.GetString($plain)|ConvertFrom-Json
    if($entry.kind -notin @('String','ExpandString')){throw 'Tipo de backup invalido.'}
    if($entry.name -in $registry.GetValueNames()){
     if($registry.GetValue($entry.name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) -ne $entry.value -or [string]$registry.GetValueKind($entry.name) -ne $entry.kind){throw 'Existe valor diferente. Reversao nao sobrescreveu a alteracao.'}
    }else{$result.phase='executing';$registry.SetValue($entry.name,$entry.value,[Enum]::Parse([Microsoft.Win32.RegistryValueKind],[string]$entry.kind));$result.changed=$true}
    $result.phase='validating';$result.validated=($registry.GetValue($entry.name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) -eq $entry.value -and [string]$registry.GetValueKind($entry.name) -eq $entry.kind);$result.detail='Valor e tipo originais conferidos. Backup preservado.'
   }
  }finally{$registry.Dispose()}
 }
 if($action -in @('integrityScan','integrityRepair')){
  Import-Module Dism -ErrorAction Stop
  $before=Repair-WindowsImage -Online -ScanHealth -NoRestart -ErrorAction Stop
  $result.beforeIntegrity=[string]$before.ImageHealthState
  if($action -eq 'integrityRepair'){
   if($before.ImageHealthState -eq 'NonRepairable'){throw 'Imagem nao reparavel. Nenhuma tentativa de reparo executada.'}
   if($before.ImageHealthState -ne 'Repairable'){throw 'Corrupcao reparavel nao confirmada na verificacao atual. Atualize o diagnostico.'}
   $result.phase='executing';$result.changed=$true
   $repair=Repair-WindowsImage -Online -RestoreHealth -NoRestart -ErrorAction Stop
   $result.restartRequired=[bool]$repair.RestartNeeded
   & "$env:WINDIR\System32\sfc.exe" /scannow | Out-Null;$result.sfcRepairExit=$LASTEXITCODE
  }
  $result.phase='validating';$after=Repair-WindowsImage -Online -ScanHealth -NoRestart -ErrorAction Stop
  $sfc=(& "$env:WINDIR\System32\sfc.exe" /verifyonly) -join "`n";$result.sfcExit=$LASTEXITCODE
  $normalized=($sfc -replace '\x00','').Normalize([Text.NormalizationForm]::FormD) -replace '\p{M}',''
  $sfcState=if($normalized -match '(?i)did not find any integrity violations|nao encontrou nenhuma violacao de integridade'){'healthy'}elseif($normalized -match '(?i)found integrity violations|encontrou violacoes de integridade'){'violations'}else{'unavailable'}
  $result.integrity=@{state=[string]$after.ImageHealthState;sfc=$sfcState;at=[DateTime]::UtcNow.ToString('o')};$result.restartRequired=$result.restartRequired -or [bool]$after.RestartNeeded -or (Pending-Restart)
  $result.validated=($after.ImageHealthState -eq 'Healthy' -and $sfcState -eq 'healthy' -and $result.sfcExit -eq 0)
  $result.detail='Verificacao posterior registrada. Saida SFC nao reconhecida permanece indisponivel; teste o sintoma original.'
 }
 if($action -eq 'updateRetry'){
  $pc=Get-CimInstance Win32_ComputerSystem
  if($pc.PartOfDomain -or (Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate')){throw 'Ambiente gerenciado. Consulte o administrador; nenhuma politica alterada.'}
  $service=Get-CimInstance Win32_Service -Filter "Name='wuauserv'"
  if($service.StartMode -eq 'Disabled'){throw 'Servico desabilitado. Nenhuma politica ou tipo de inicializacao alterado.'}
  $backup=Join-Path $backupRoot ($request.id+'.service.json');Write-VerifiedBackup $backup @{name='wuauserv';state=$service.State;startMode=$service.StartMode;at=[DateTime]::UtcNow.ToString('o')};$result.backupVerified=$true
  $result.phase='executing';if($service.State -eq 'Stopped'){Start-Service -Name wuauserv;$result.changed=$true}
  $result.phase='validating';$session=New-Object -ComObject Microsoft.Update.Session;$session.ClientApplicationID='Vimaka Workstation Care';$search=$session.CreateUpdateSearcher();$search.Online=$true;$found=$search.Search("IsInstalled=0 and IsHidden=0")
  $result.updateQuery=@{resultCode=[int]$found.ResultCode;count=$found.Updates.Count};$result.validated=$false;$result.detail='Consulta registrada. Abra Windows Update e repita a atualizacao que falhou; consulta bem-sucedida nao comprova instalacao.'
 }
 if($action -eq 'openApps'){Start-Process 'ms-settings:appsfeatures';$result.detail='Tela oficial aberta. Selecione o aplicativo, revise o impacto e teste-o novamente.'}
 if($action -eq 'openUpdate'){Start-Process 'ms-settings:windowsupdate';$result.detail='Windows Update aberto. Confirme o resultado da atualizacao no diario.'}
 $result.ok=$true;Save-Result
}catch{$result.error=$_.Exception.Message;Save-Result;exit 1}finally{if($held -and $mutex){$mutex.ReleaseMutex()};if($mutex){$mutex.Dispose()}}
