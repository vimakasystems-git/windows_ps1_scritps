$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$os=Get-CimInstance Win32_OperatingSystem
$pc=Get-CimInstance Win32_ComputerSystem
$power=(& "$env:WINDIR\System32\powercfg.exe" /getactivescheme) -join ''
$drives=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { @{name=$_.DeviceID;freeGB=[math]::Round($_.FreeSpace/1GB,1);totalGB=[math]::Round($_.Size/1GB,1)} })
$services=@(Get-CimInstance Win32_Service | Where-Object {$_.Name -eq 'RemojoBlockerService' -or $_.PathName -match '(?i)C:\\Program Files\\Remojo\\'})
[ordered]@{
 at=(Get-Date).ToString('o');os=$os.Caption;version=$os.Version;model=$pc.Model
 freeGB=[math]::Round($os.FreePhysicalMemory/1MB,2);totalGB=[math]::Round($os.TotalVisibleMemorySize/1MB,2)
 startup=@(Get-CimInstance Win32_StartupCommand | ForEach-Object Name)
 remojo=$services.Count;power=$power;drives=$drives
 network=@(Get-NetAdapter | Select-Object Name,Status,LinkSpeed)
 processes=@(Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 Name,@{n='memoryMB';e={[math]::Round($_.WorkingSet64/1MB)}})
 hypervisor=$pc.HypervisorPresent;sandboxPresent=(Test-Path "$env:WINDIR\System32\WindowsSandbox.exe")
} | ConvertTo-Json -Depth 5
