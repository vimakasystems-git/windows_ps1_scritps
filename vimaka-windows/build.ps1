param([string]$NodePath,[ValidatePattern('^build(?:-[a-z0-9]+)?$')][string]$BuildDirectory='build')
$ErrorActionPreference='Stop'
$project=$PSScriptRoot
$version=(Get-Content -LiteralPath (Join-Path $project 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
if($version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$'){throw 'Versao invalida em package.json.'}
$build=Join-Path $project $BuildDirectory
$payload=Join-Path $build 'payload'
if(Test-Path $build){throw 'A pasta build ja existe. Preserve ou mova a compilacao anterior antes de gerar outra.'}
New-Item $payload -ItemType Directory -Force | Out-Null
$node=if($NodePath){$NodePath}else{(Get-Command node.exe -ErrorAction Stop).Source}
$signature=Get-AuthenticodeSignature $node
if($signature.Status -ne 'Valid'){throw 'O runtime Node local precisa ter assinatura Authenticode valida.'}
foreach($name in @('server.mjs','core.mjs','workflow.mjs','benchmark.mjs','storage.mjs','platform.mjs','report-state.mjs','package.json','public','native','README.md','THIRD-PARTY-NOTICES.txt')){Copy-Item -LiteralPath (Join-Path $project $name) -Destination $payload -Recurse}
Copy-Item -LiteralPath $node -Destination (Join-Path $payload 'node.exe')
$csc=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$refs=@('/reference:System.Windows.Forms.dll','/reference:System.IO.Compression.dll','/reference:System.IO.Compression.FileSystem.dll','/reference:System.Web.Extensions.dll')
$launcher=Join-Path $payload 'VimakaWindowsCare.exe'
& $csc /nologo /target:winexe @refs "/win32icon:$(Join-Path $project 'public\app.ico')" "/out:$launcher" (Join-Path $project 'Launcher.cs') (Join-Path $project 'InstallSupport.cs')
if($LASTEXITCODE -ne 0){throw 'Compilacao do launcher falhou.'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=Join-Path $build 'payload.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($payload,$zip,[IO.Compression.CompressionLevel]::Optimal,$false)
$setup=Join-Path $build ('VimakaWindowsCare-Setup-'+$version+'.exe')
& $csc /nologo /target:winexe @refs "/win32icon:$(Join-Path $project 'public\app.ico')" "/resource:$zip,payload.zip" "/out:$setup" (Join-Path $project 'Launcher.cs') (Join-Path $project 'InstallSupport.cs')
if($LASTEXITCODE -ne 0){throw 'Compilacao do instalador falhou.'}
Get-FileHash $setup -Algorithm SHA256 | Format-List
Write-Host 'Instalador gerado:' $setup
