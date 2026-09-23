param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
function BrowserPath {
 foreach($base in @($env:ProgramFiles,${env:ProgramFiles(x86)},$env:LOCALAPPDATA)){
  foreach($relative in @('Microsoft\Edge\Application\msedge.exe','Google\Chrome\Application\chrome.exe','Mozilla Firefox\firefox.exe')){
   if($base -and (Test-Path -LiteralPath (Join-Path $base $relative))){return (Join-Path $base $relative)}
  }
 }
}
try {
 if(![Environment]::Is64BitOperatingSystem){throw 'Requer Windows x64. / Requires Windows x64.'}
 if($PSVersionTable.PSVersion -lt [Version]'5.1'){throw 'Repare o Windows PowerShell 5.1 com o administrador. / Ask your administrator to repair Windows PowerShell 5.1.'}
 $build=[int](Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').CurrentBuildNumber
 if($build -lt 17763){throw 'Requer Windows 10 1809 ou mais recente. / Requires Windows 10 1809 or newer.'}
 $browser=BrowserPath
 if($CheckOnly){@{browser=$browser;edgeRequired=(!$browser);node='Incluido no pacote / Bundled';powershell=$PSVersionTable.PSVersion.ToString()}|ConvertTo-Json -Compress;exit 0}
 if(!$browser){
  # Invoked only after the installer explains and obtains approval for this dependency.
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  $catalog=Invoke-RestMethod 'https://edgeupdates.microsoft.com/api/products?view=enterprise'
  $release=($catalog|Where-Object Product -eq 'Stable').Releases|Where-Object {$_.Platform -eq 'Windows' -and $_.Architecture -eq 'x64'}|Sort-Object {[Version]$_.ProductVersion} -Descending|Select-Object -First 1
  $artifact=$release.Artifacts|Where-Object {$_.ArtifactName -eq 'msi' -and $_.HashAlgorithm -eq 'SHA256'}|Select-Object -First 1
  $uri=[Uri]$artifact.Location
  if($uri.Scheme -ne 'https' -or $uri.Host -ne 'msedge.sf.dl.delivery.mp.microsoft.com'){throw 'Fonte Microsoft invalida. / Invalid Microsoft download source.'}
  $folder=Join-Path $env:TEMP ('Vimaka-Edge-'+[Guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $folder|Out-Null
  $msi=Join-Path $folder 'MicrosoftEdge.msi'
  Invoke-WebRequest $uri.AbsoluteUri -OutFile $msi -UseBasicParsing
  if((Get-FileHash -LiteralPath $msi -Algorithm SHA256).Hash -ne $artifact.Hash){throw 'Hash Microsoft diferente. / Microsoft hash mismatch.'}
  $signature=Get-AuthenticodeSignature -LiteralPath $msi
  if($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation'){throw 'Assinatura Microsoft invalida. / Invalid Microsoft signature.'}
  try{$process=Start-Process "$env:WINDIR\System32\msiexec.exe" -ArgumentList ('/i "'+$msi+'" /passive /norestart') -Verb RunAs -Wait -PassThru}
  catch{throw 'Instalar o Edge exige autorizacao de administrador. Sem credenciais, solicite ajuda ao administrador. / Installing Edge requires administrator approval. Without credentials, contact your administrator.'}
  if($process.ExitCode -notin @(0,3010)){throw ('Edge: codigo / exit code '+$process.ExitCode)}
  if(!(BrowserPath)){throw 'Edge ainda indisponivel. Consulte o administrador. / Edge unavailable. Contact your administrator.'}
 }
 Write-Output 'Requisitos disponiveis. / Prerequisites ready.'
}catch{[Console]::Error.WriteLine($_.Exception.Message);exit 1}
