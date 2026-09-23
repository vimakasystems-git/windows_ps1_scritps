$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$os=Get-CimInstance Win32_OperatingSystem
$pc=Get-CimInstance Win32_ComputerSystem
$cpu=@(Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed)
$gpu=@(Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,VideoProcessor)
$memory=@(Get-CimInstance Win32_PhysicalMemory | Select-Object @{n='capacityGB';e={[math]::Round($_.Capacity/1GB,2)}},Speed,ConfiguredClockSpeed,Manufacturer)
$board=Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,Version
$bios=Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion,ReleaseDate
$disks=@(Get-CimInstance Win32_DiskDrive | Select-Object Model,MediaType,InterfaceType,@{n='sizeGB';e={[math]::Round($_.Size/1GB,1)}})
$power=(& "$env:WINDIR\System32\powercfg.exe" /getactivescheme) -join ''
$drives=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { @{name=$_.DeviceID;freeGB=[math]::Round($_.FreeSpace/1GB,1);totalGB=[math]::Round($_.Size/1GB,1)} })
$services=@(Get-CimInstance Win32_Service | Where-Object {$_.Name -eq 'RemojoBlockerService' -or $_.PathName -match '(?i)C:\\Program Files\\Remojo\\'})
[ordered]@{
 at=(Get-Date).ToString('o');os=$os.Caption;version=$os.Version;model=$pc.Model
 manufacturer=$pc.Manufacturer;architecture=$os.OSArchitecture;lastBoot=$os.LastBootUpTime.ToString('o');cpu=$cpu;gpu=$gpu;memory=$memory;motherboard=$board;bios=$bios;disks=$disks
 restartPending=((Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'))
 freeGB=[math]::Round($os.FreePhysicalMemory/1MB,2);totalGB=[math]::Round($os.TotalVisibleMemorySize/1MB,2)
 startup=@(Get-CimInstance Win32_StartupCommand | ForEach-Object Name)
 remojo=$services.Count;power=$power;drives=$drives
 network=@(Get-NetAdapter | Select-Object Name,Status,LinkSpeed)
 processes=@(Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 Name,@{n='memoryMB';e={[math]::Round($_.WorkingSet64/1MB)}})
} | ConvertTo-Json -Depth 5
