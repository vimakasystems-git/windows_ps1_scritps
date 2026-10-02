$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$limitations=New-Object 'System.Collections.Generic.List[string]'
function Read-Safe($Name,[scriptblock]$Read){try{& $Read}catch{$limitations.Add($Name+': '+$_.Exception.Message);@()}}
$result=@{
 at=[DateTime]::UtcNow.ToString('o')
 physicalDisks=@(Read-Safe 'Discos' {Get-PhysicalDisk | Select-Object FriendlyName,MediaType,HealthStatus,OperationalStatus,Size})
 diskReliability=@(Read-Safe 'Contadores dos discos' {Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object DeviceId,Temperature,Wear,PowerOnHours,ReadErrorsTotal,WriteErrorsTotal})
 drivers=@(Read-Safe 'Drivers' {Get-CimInstance Win32_PnPSignedDriver | Select-Object DeviceName,Manufacturer,DriverVersion,DriverDate,IsSigned})
 updates=@(Read-Safe 'Atualizacoes' {Get-HotFix | Select-Object HotFixID,Description,InstalledOn})
 recentErrors=@(Read-Safe 'Eventos de sistema' {Get-WinEvent -FilterHashtable @{LogName='System';Level=@(1,2);StartTime=(Get-Date).AddDays(-7)} -MaxEvents 100 | Select-Object TimeCreated,Id,ProviderName,LevelDisplayName})
 battery=@(Read-Safe 'Bateria' {Get-CimInstance Win32_Battery | Select-Object Name,BatteryStatus,EstimatedChargeRemaining})
}
$result.limitations=@($limitations)+@('Contadores indisponiveis nao indicam disco saudavel. Eventos podem ter causas distintas. Atualizacoes listadas por Get-HotFix nao sao inventario completo. Nenhum teste destrutivo de hardware foi executado.')
$result|ConvertTo-Json -Depth 8 -Compress
