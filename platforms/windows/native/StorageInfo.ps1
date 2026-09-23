[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$ErrorActionPreference='Stop'
$roots=@([IO.DriveInfo]::GetDrives() | Where-Object {$_.IsReady -and $_.DriveType -eq 'Fixed'} | ForEach-Object { @{id=$_.Name;label=$_.Name;totalBytes=$_.TotalSize;freeBytes=$_.AvailableFreeSpace} })
$keys=@('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*','HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*')
$apps=@(Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName -and $_.SystemComponent -ne 1} | ForEach-Object { @{name=$_.DisplayName;version=$_.DisplayVersion;bytes=if($_.EstimatedSize -gt 0){[double]$_.EstimatedSize*1024}else{$null}} } | Sort-Object { $_.bytes } -Descending)
@{roots=$roots;programs=$apps} | ConvertTo-Json -Depth 5
