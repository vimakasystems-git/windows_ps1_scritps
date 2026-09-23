param([ValidateSet('Git.Git','Microsoft.VisualStudioCode','7zip.7zip','Microsoft.PowerToys')][string]$Package,[Parameter(Mandatory)][string]$Destination)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$winget=Get-Command winget.exe -ErrorAction Stop
& $winget.Source download --id $Package --exact --source winget --download-directory $Destination --disable-interactivity
if($LASTEXITCODE -ne 0){throw "WinGet falhou ($LASTEXITCODE). Consulte a saida; acordos de origem/pacote devem ser revisados manualmente no WinGet."}
Get-ChildItem -LiteralPath $Destination -File | ForEach-Object {
 [pscustomobject]@{File=$_.Name;SHA256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash;Signature=(Get-AuthenticodeSignature $_.FullName).Status.ToString()}
} | Format-Table -AutoSize
