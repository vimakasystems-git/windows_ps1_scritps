param([Parameter(Mandatory)][string]$ResultFile,[ValidateSet(72,168)][int]$WindowHours=72,[switch]$ProbeNetwork)
$ErrorActionPreference='Stop'
$timer=[Diagnostics.Stopwatch]::StartNew()
$script:completed=0
function Mark-Progress([string]$id){@{id=$id;completed=$script:completed}|ConvertTo-Json -Compress|Set-Content -LiteralPath ($ResultFile+'.progress.json') -Encoding UTF8;$script:completed++}
function Read-Section([scriptblock]$Read){try{@{status='available';data=(& $Read)}}catch{@{status='unavailable';reason='Fonte indisponivel ou acesso insuficiente.'}}}
function Safe-AppName($value){try{[IO.Path]::GetFileName([string]$value)}catch{'Nome indisponivel'}}
function Events($log,$ids,$provider){
 $filter=@{LogName=$log;Id=$ids;StartTime=(Get-Date).AddHours(-$WindowHours)};if($provider){$filter.ProviderName=$provider}
 $found=@();try{$found=@(Get-WinEvent -FilterHashtable $filter -MaxEvents 120 -ErrorAction Stop)}catch{if($_.FullyQualifiedErrorId -notmatch 'NoMatchingEventsFound'){throw}}
 foreach($e in $found){$app=$null;if($e.ProviderName -eq 'Application Error' -and $e.Properties.Count){$app=Safe-AppName $e.Properties[0].Value};@{at=$e.TimeCreated.ToUniversalTime().ToString('o');id=$e.Id;provider=$e.ProviderName;level=$e.Level;application=$app}}
}
Mark-Progress 'os'
$os=Get-CimInstance Win32_OperatingSystem -OperationTimeoutSec 10
$settings=Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$result=@{schema=1;at=[DateTime]::UtcNow.ToString('o');windowHours=$WindowHours;os=@{caption=$os.Caption;build=[int]$os.BuildNumber;architecture=$os.OSArchitecture;nativeArchitecture=$env:PROCESSOR_ARCHITECTURE;edition=$settings.EditionID;displayVersion=$settings.DisplayVersion;productType=$os.ProductType};restartPending=((Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'))}
Mark-Progress 'startup'
$result.startup=Read-Section {
 $key=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Run');$items=@()
 if($key){try{foreach($name in $key.GetValueNames()){$command=[string]$key.GetValue($name,'',[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames);$items+=@{name=$name;scope='HKCU Run';protected=(($name+' '+$command) -match '(?i)defender|securityhealth|avast|kaspersky|bitdefender|eset|sophos|crowdstrike|sentinel|antivirus|windows\\system32')}}}finally{$key.Dispose()}}
 ,$items
}
Mark-Progress 'boot'
$result.boot=Read-Section {
 $records=@();try{$records=@(Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational';Id=100} -MaxEvents 5 -ErrorAction Stop)}catch{if($_.FullyQualifiedErrorId -notmatch 'NoMatchingEventsFound'){throw}}
 ,@(foreach($e in $records){$xml=[xml]$e.ToXml();$value=$xml.Event.EventData.Data|Where-Object Name -eq 'BootTime'|Select-Object -First 1;if($value){@{at=$e.TimeCreated.ToUniversalTime().ToString('o');durationMs=[long]$value.'#text'}}})
}
Mark-Progress 'events'
$result.events=Read-Section {
 $items=@(Events 'System' @(20,25,31) 'Microsoft-Windows-WindowsUpdateClient')+@(Events 'Application' @(1000,1001,1002) $null)
 $limit=if($WindowHours -eq 168){240}else{60};,@($items|Sort-Object at -Descending|Select-Object -First $limit)
}
Mark-Progress 'services'
$result.services=Read-Section {,@(Get-CimInstance Win32_Service -Filter "Name='wuauserv' OR Name='BITS' OR Name='CryptSvc'" -OperationTimeoutSec 10|ForEach-Object {@{name=$_.Name;state=$_.State;startMode=$_.StartMode}})}
Mark-Progress 'performance'
$result.performance=Read-Section {
 $samples=@();for($i=0;$i -lt 3;$i++){$cpu=Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -OperationTimeoutSec 5;$mem=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -OperationTimeoutSec 5;$disk=Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'" -OperationTimeoutSec 5;$samples+=@{at=[DateTime]::UtcNow.ToString('o');cpuPercent=[int]$cpu.PercentProcessorTime;availableMB=[long]$mem.AvailableMBytes;diskQueue=[double]$disk.CurrentDiskQueueLength};if($i -lt 2){Start-Sleep -Milliseconds 1000}}
 @{samples=$samples;processes=@(Get-Process|Sort-Object WorkingSet64 -Descending|Select-Object -First 8 ProcessName,@{n='memoryMB';e={[math]::Round($_.WorkingSet64/1MB,1)}})}
}
function Ping-Sample($destination){$values=@();$received=0;for($i=0;$i -lt 4;$i++){$ping=New-Object Net.NetworkInformation.Ping;try{$reply=$ping.Send($destination,750);if($reply.Status -eq 'Success'){$received++;$values+=$reply.RoundtripTime}}catch{}finally{$ping.Dispose()}};@{sent=4;received=$received;lossPercent=(4-$received)*25;averageMs=if($values.Count){($values|Measure-Object -Average).Average}else{$null}}}
Mark-Progress 'network'
$result.network=Read-Section {
 $adapters=@(Get-NetAdapter -ErrorAction Stop|ForEach-Object {@{name=$_.Name;status=[string]$_.Status;description=$_.InterfaceDescription}})
 $configs=@(Get-NetIPConfiguration -ErrorAction Stop)
 $proxy=Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
 $network=@{adapters=$adapters;vpnDetected=(@($adapters|Where-Object {($_.name+' '+$_.description) -match '(?i)VPN|WireGuard|TAP|TUN|AnyConnect|Fortinet|GlobalProtect'}).Count -gt 0);proxyEnabled=($proxy.ProxyEnable -eq 1);pacPresent=!!$proxy.AutoConfigURL;interfaces=@($configs|ForEach-Object {@{name=$_.InterfaceAlias;dhcp=[string]$_.NetIPv4Interface.Dhcp;dnsServerCount=@($_.DNSServer.ServerAddresses).Count;hasGateway=!!$_.IPv4DefaultGateway.NextHop}})}
 if($ProbeNetwork){$probe=@{dnsStatus='failed';targetName='www.microsoft.com';gateway=$null;target=$null};try{$dns=@(Resolve-DnsName -Name 'www.microsoft.com' -Type A -DnsOnly -QuickTimeout -ErrorAction Stop);if($dns.Count){$probe.dnsStatus='resolved'}}catch{};$gateway=$configs|Where-Object {$_.NetAdapter.Status -eq 'Up' -and $_.IPv4DefaultGateway.NextHop}|Select-Object -First 1;if($gateway){$probe.gateway=Ping-Sample $gateway.IPv4DefaultGateway.NextHop};if($probe.dnsStatus -eq 'resolved'){$probe.target=Ping-Sample 'www.microsoft.com'};$network.probe=$probe}
 $network
}
$timer.Stop();$self=Get-Process -Id $PID;$result.collector=@{elapsedMs=$timer.ElapsedMilliseconds;workingSetMB=[math]::Round($self.WorkingSet64/1MB,1);cpuSeconds=$self.CPU;windowHours=$WindowHours;networkProbe=[bool]$ProbeNetwork}
$result|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $ResultFile -Encoding UTF8
