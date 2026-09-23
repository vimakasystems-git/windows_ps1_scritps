$ErrorActionPreference='Stop'
$edge=Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
if(Test-Path $edge){Start-Process $edge '--app=https://cerebrobrasil.com.br/'}else{Start-Process 'https://cerebrobrasil.com.br/'}
