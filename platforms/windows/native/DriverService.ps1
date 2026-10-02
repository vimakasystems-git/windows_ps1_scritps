param([ValidateSet('scan','validate','install','configure')][string]$Mode,[Parameter(Mandatory)][string]$ResultFile,[string]$Package,[ValidatePattern('^[a-f0-9]{64}$')][string]$Sha256,[ValidateSet('intel','nvidia','amd','dell','hp','lenovo')][string]$Vendor)
$ErrorActionPreference='Stop'
try {
 if($Mode -eq 'scan'){
  $limitations=New-Object 'System.Collections.Generic.List[string]'
  $devices=@(Get-CimInstance Win32_PnPSignedDriver|Select-Object DeviceID,DeviceName,Manufacturer,DriverProviderName,DriverVersion,DriverDate,IsSigned,HardwareID)
  $problems=@(Get-CimInstance Win32_PnPEntity|Where-Object ConfigManagerErrorCode -ne 0|Select-Object DeviceID,Name,Manufacturer,HardwareID,ConfigManagerErrorCode,Status)
  foreach($problem in $problems){if(!($devices|Where-Object DeviceID -eq $problem.DeviceID)){$devices+=[pscustomobject]@{DeviceID=$problem.DeviceID;DeviceName=$problem.Name;Manufacturer=$problem.Manufacturer;HardwareID=$problem.HardwareID;DriverProviderName=$null;DriverVersion=$null;DriverDate=$null;IsSigned=$null}}}
  $computer=Get-CimInstance Win32_ComputerSystem|Select-Object Manufacturer,Model
  $updates=@();$updateSearch='unavailable'
  try {
   $session=New-Object -ComObject Microsoft.Update.Session;$session.ClientApplicationID='Vimaka Workstation Care'
   $search=$session.CreateUpdateSearcher();$search.Online=$true
   $found=$search.Search("IsInstalled=0 and IsHidden=0 and Type='Driver'")
   foreach($update in $found.Updates){$updates+=@{id=$update.Identity.UpdateID;title=$update.Title;manufacturer=$update.DriverManufacturer;model=$update.DriverModel;hardwareId=$update.DriverHardwareID;date=$update.DriverVerDate}}
   $updateSearch=if($found.ResultCode -eq 2){'complete'}else{'partial'}
  }catch{$limitations.Add('Consulta de atualizacoes indisponivel: '+$_.Exception.Message)}
  @{ok=$true;at=[DateTime]::UtcNow.ToString('o');devices=$devices;problems=$problems;computer=$computer;offeredUpdates=$updates;updateSearch=$updateSearch;limitations=@($limitations)+@('Atualizacoes detectadas sao as oferecidas pelo servico Windows Update configurado, nao um catalogo completo dos fabricantes. Ausencia de oferta nao confirma que todos os drivers estao atualizados. Verifique o portal OEM para compatibilidade e versao. BIOS e firmware nao sao instalados por este fluxo.')}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $ResultFile -Encoding UTF8
  exit 0
 }
 if($Mode -eq 'configure'){
  Start-Process -FilePath 'mmc.exe' -ArgumentList 'devmgmt.msc'
  @{ok=$true;status='configuration-opened';detail='Gerenciador de Dispositivos aberto. As configuracoes sao escolhidas e confirmadas pelo usuario.'}|ConvertTo-Json|Set-Content -LiteralPath $ResultFile -Encoding UTF8;exit 0
 }
 if(!(Test-Path -LiteralPath $Package -PathType Leaf)){throw 'Pacote nao encontrado.'}
 if((Get-Item -LiteralPath $Package).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Pacote redirecionado recusado.'}
 if([IO.Path]::GetExtension($Package) -ne '.exe'){throw 'Formato nao suportado.'}
 if((Get-FileHash -LiteralPath $Package -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256){throw 'O pacote foi alterado depois do download.'}
 $signature=Get-AuthenticodeSignature -LiteralPath $Package
 $signers=@{intel='Intel';nvidia='NVIDIA';amd='Advanced Micro Devices';dell='Dell';hp='(HP Inc|HP Development|Hewlett.Packard)';lenovo='Lenovo'}
 if($signature.Status -ne 'Valid' -or !$signature.SignerCertificate -or $signature.SignerCertificate.Subject -notmatch $signers[$Vendor]){throw 'Assinatura Authenticode valida do fabricante nao confirmada. Pacote recusado.'}
 if($Mode -eq 'validate'){@{ok=$true;signer=$signature.SignerCertificate.Subject;sha256=$Sha256}|ConvertTo-Json|Set-Content -LiteralPath $ResultFile -Encoding UTF8;exit 0}
 $before=@(Get-CimInstance Win32_PnPSignedDriver|Select-Object DeviceID,DriverVersion)
 # Official wizard chooses compatible packages and requests UAC when required. No silent flags.
 $process=Start-Process -FilePath $Package -WorkingDirectory (Split-Path -Parent $Package) -PassThru -Wait
 $after=@(Get-CimInstance Win32_PnPSignedDriver|Select-Object DeviceID,DriverVersion)
 $changes=@(foreach($driver in $after){$old=$before|Where-Object DeviceID -eq $driver.DeviceID|Select-Object -First 1;if(!$old -or $old.DriverVersion -ne $driver.DriverVersion){@{device=$driver.DeviceID;before=$old.DriverVersion;after=$driver.DriverVersion}}})
 if($process.ExitCode -notin @(0,3010)){throw ('Instalador encerrou com codigo '+$process.ExitCode+'. Confira o diagnostico; nao repita automaticamente.')}
 @{ok=$true;status=if($changes.Count){'changes-detected'}else{'verification-required'};exitCode=$process.ExitCode;restartRequired=($process.ExitCode -eq 3010);changes=$changes;detail='Assistente oficial encerrado. Instaladores podem criar processos separados. Repita o diagnostico para confirmar a instalacao; nenhum reinicio automatico.'}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $ResultFile -Encoding UTF8
}catch{@{ok=$false;error=$_.Exception.Message}|ConvertTo-Json|Set-Content -LiteralPath $ResultFile -Encoding UTF8;exit 1}
