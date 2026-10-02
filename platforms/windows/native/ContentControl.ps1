param([ValidateSet('apply','restore')][string]$Mode,[ValidatePattern('^[a-z,]*$')][string]$Categories='none', [string]$ResultFile,[switch]$Elevated)
$ErrorActionPreference='Stop'
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(!$admin){
 try {if($Elevated){throw 'Autorizacao negada.'};$args='-NoProfile -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -Mode '+$Mode+' -Categories "'+$Categories+'" -ResultFile "'+$ResultFile+'" -Elevated';$p=Start-Process "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -Verb RunAs -WindowStyle Hidden -Wait -PassThru;exit $p.ExitCode}
 catch {@{ok=$false;error=$_.Exception.Message}|ConvertTo-Json|Set-Content -LiteralPath $ResultFile -Encoding UTF8;exit 1}
}
try {
 $file=Join-Path $env:WINDIR 'System32\drivers\etc\hosts'
 if((Get-Item -LiteralPath $file).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Arquivo hosts redirecionado; operacao recusada.'}
 $begin='# BEGIN VIMAKA CARE CONTENT';$end='# END VIMAKA CARE CONTENT'
 $original=[IO.File]::ReadAllText($file)
 $pattern='(?ms)^'+[regex]::Escape($begin)+'\r?\n.*?^'+[regex]::Escape($end)+'\r?\n?'
 if($original.Contains($begin) -and ![regex]::IsMatch($original,$pattern)){throw 'Bloco Vimaka inconsistente. Revise manualmente.'}
 $clean=[regex]::Replace($original,$pattern,'')
 $lists=@{dangerous=@('malware.testing.google.test','phishing.testing.google.test');adult=@('pornhub.com','xvideos.com','xnxx.com');bets=@('bet365.com','betano.com','betano.bet.br','sportingbet.bet.br','betfair.bet.br')}
 $domains=New-Object 'System.Collections.Generic.HashSet[string]'
 if($Mode -eq 'apply'){
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  foreach($c in $Categories.Split(',')){
   if(!$lists.ContainsKey($c)){throw 'Categoria invalida.'}
   foreach($domain in $lists[$c]){[void]$domains.Add($domain)}
   $sources=switch($c){dangerous {@('malware','phishing')};adult {@('porn')};bets {@('gambling')}}
   foreach($source in $sources){
    $request=[Net.HttpWebRequest]::Create('https://raw.githubusercontent.com/blocklistproject/Lists/main/'+$source+'.txt');$request.Timeout=30000;$request.ReadWriteTimeout=30000;$request.AllowAutoRedirect=$false
    $response=$request.GetResponse()
    try {
     $reader=New-Object IO.StreamReader($response.GetResponseStream());$size=0;$valid=0
     try{while(!$reader.EndOfStream -and $valid -lt 5000){$line=$reader.ReadLine();$size+=$line.Length;if($size -gt 5000000 -or $domains.Count -gt 25000){throw 'Lista excedeu o limite de seguranca.'}
       if($line -match '^0\.0\.0\.0\s+([a-z0-9][a-z0-9.-]*\.[a-z]{2,63})\s*$'){$domain=$Matches[1];if($domain.Length -le 253 -and $domain -notmatch '\.\.' -and $domain -notmatch '(^|\.)(localhost|microsoft\.com|windowsupdate\.com|github\.com|vimakasistemas\.com\.br)$'){[void]$domains.Add($domain);$valid++}}
     }}finally{$reader.Dispose()}
     if($valid -lt 10){throw 'Lista vazia ou formato inesperado. Nenhuma alteracao aplicada.'}
    }finally{$response.Close()}
   }
  }
 }
 $backup=$file+'.vimaka-'+[Guid]::NewGuid().ToString('N')+'.bak';[IO.File]::WriteAllText($backup,$original)
 $next=$clean
 if($domains.Count){$lines=New-Object Text.StringBuilder;[void]$lines.AppendLine($begin);foreach($domain in $domains){[void]$lines.AppendLine('0.0.0.0 '+$domain);[void]$lines.AppendLine(':: '+$domain)};[void]$lines.AppendLine($end);$next=$clean.TrimEnd()+"`r`n"+$lines.ToString()}
 if([IO.File]::ReadAllText($file) -ne $original){throw 'Arquivo hosts mudou durante a operacao. Tente novamente.'}
 [IO.File]::WriteAllText($file,$next,(New-Object Text.UTF8Encoding($false)))
 & "$env:WINDIR\System32\ipconfig.exe" /flushdns | Out-Null
 @{ok=$true;coverage='Lista parcial: ate 5000 dominios por fonte, sem garantia de cobertura completa.';domainCount=$domains.Count;categories=if($Mode -eq 'apply'){@($Categories.Split(','))}else{@()};backup=$backup}|ConvertTo-Json|Set-Content -LiteralPath $ResultFile -Encoding UTF8
}catch {@{ok=$false;error=$_.Exception.Message}|ConvertTo-Json|Set-Content -LiteralPath $ResultFile -Encoding UTF8;exit 1}
