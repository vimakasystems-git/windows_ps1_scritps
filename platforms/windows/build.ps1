param([string]$NodePath,[ValidatePattern('^build(?:-[a-z0-9]+)?$')][string]$BuildDirectory='build')
$ErrorActionPreference='Stop'
$project=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\app'))
$version=(Get-Content -LiteralPath (Join-Path $project 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
if($version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$'){throw 'Versao invalida em package.json.'}
$build=Join-Path $project $BuildDirectory
$payload=Join-Path $build 'payload'
if(Test-Path $build){throw 'A pasta build ja existe. Preserve ou mova a compilacao anterior antes de gerar outra.'}
New-Item $payload -ItemType Directory -Force | Out-Null
$node=if($NodePath){$NodePath}else{(Get-Command node.exe -ErrorAction Stop).Source}
$signature=Get-AuthenticodeSignature $node
if($signature.Status -ne 'Valid'){throw 'O runtime Node local precisa ter assinatura Authenticode valida.'}
foreach($name in @('server.mjs','core.mjs','workflow.mjs','benchmark.mjs','storage.mjs','platform.mjs','updates.mjs','report-state.mjs','package.json','public','README.md','THIRD-PARTY-NOTICES.txt')){Copy-Item -LiteralPath (Join-Path $project $name) -Destination $payload -Recurse}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'native') -Destination $payload -Recurse
Copy-Item -LiteralPath $node -Destination (Join-Path $payload 'node.exe')
$csc=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$refs=@('/reference:System.Windows.Forms.dll','/reference:System.IO.Compression.dll','/reference:System.IO.Compression.FileSystem.dll','/reference:System.Web.Extensions.dll')
$launcherSource=Join-Path $build 'Launcher.cs'
$launcherText=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'Launcher.cs')).Replace('@@VERSION@@',$version)
[IO.File]::WriteAllText($launcherSource,$launcherText,(New-Object Text.UTF8Encoding($false)))
$launcher=Join-Path $payload 'VimakaWorkstationCare.exe'
& $csc /nologo /target:winexe @refs "/win32icon:$(Join-Path $project 'public\app.ico')" "/out:$launcher" $launcherSource (Join-Path $PSScriptRoot 'InstallSupport.cs')
if($LASTEXITCODE -ne 0){throw 'Compilacao do launcher falhou.'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=Join-Path $build 'payload.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($payload,$zip,[IO.Compression.CompressionLevel]::Optimal,$false)
$setup=Join-Path $build ('VimakaWorkstationCare-'+$version+'-windows-x64.exe')
& $csc /nologo /target:winexe @refs "/win32icon:$(Join-Path $project 'public\app.ico')" "/resource:$zip,payload.zip" "/out:$setup" $launcherSource (Join-Path $PSScriptRoot 'InstallSupport.cs')
if($LASTEXITCODE -ne 0){throw 'Compilacao do instalador falhou.'}
Get-FileHash $setup -Algorithm SHA256 | Format-List
Write-Host 'Instalador gerado:' $setup
