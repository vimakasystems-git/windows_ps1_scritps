$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'VimakaWindowsCare'))
$app=[IO.Path]::GetFullPath((Join-Path $root 'app'))
if($PSScriptRoot -ne (Join-Path $app 'native')){throw 'Execute o desinstalador a partir da pasta instalada.'}
if(!$app.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Caminho fora do diretorio esperado.'}
$node=Join-Path $app 'node.exe'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.ExecutablePath -eq $node} | ForEach-Object {Stop-Process -Id $_.ProcessId -ErrorAction Stop}
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'VimakaWindowsCare' -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\VimakaWindowsCare' -ErrorAction SilentlyContinue
foreach($folder in @([Environment]::GetFolderPath('DesktopDirectory'),[Environment]::GetFolderPath('Programs'))){$link=Join-Path $folder 'Vimaka Windows Care.lnk';if(Test-Path -LiteralPath $link){Remove-Item -LiteralPath $link}}
Remove-Item -LiteralPath $app -Recurse -Force
Write-Host 'Aplicativo removido. Diagnosticos e historico preservados em:' (Join-Path $root 'data')
Write-Host 'Ajustes do Windows nao foram revertidos. A PWA instalada pelo navegador pode ser removida pelo navegador.'
