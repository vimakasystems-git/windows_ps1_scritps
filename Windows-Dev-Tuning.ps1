#requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('Audit','Install','Complete','Maintain','Restore')][string]$Mode = 'Audit')
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:ProgramData 'WindowsDevTuning'
$stateFile = Join-Path $root 'backup.clixml'
$taskName = 'WindowsDevTuning-Logon'
$power = Join-Path $env:WINDIR 'System32\powercfg.exe'
$sc = Join-Path $env:WINDIR 'System32\sc.exe'
$reg = Join-Path $env:WINDIR 'System32\reg.exe'
$high = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
function Native($exe, [string[]]$arguments) {
    $output = & $exe @arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "$exe failed ($LASTEXITCODE): $output" }
    $output | Out-Host
}
function RemojoServices {
    @(Get-CimInstance Win32_Service | Where-Object {
        $_.PathName -match '(?i)^"?C:\\Program Files\\Remojo\\[^\r\n]+\.exe(?:"|\s|$)'
    })
}
function Audit {
    [pscustomobject]@{
        Date = Get-Date
        OS = Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,TotalVisibleMemorySize,FreePhysicalMemory
        Startup = @(Get-CimInstance Win32_StartupCommand | Select-Object Name,Command,Location)
        Remojo = @(RemojoServices | Select-Object Name,State,StartMode,PathName)
        Network = @(Get-NetAdapter | Select-Object Name,Status,LinkSpeed)
        TCP = @(Get-NetTCPSetting -SettingName Internet | Select-Object SettingName,AutoTuningLevelLocal)
        Processes = @(Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 20 Name,Id,WorkingSet64)
    }
}
if ($Mode -eq 'Audit') { Audit | ConvertTo-Json -Depth 6; exit 0 }
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (!$admin) { throw 'Execute como administrador, usando a mesma conta Windows.' }
if ($Mode -eq 'Install') {
    if (Test-Path $root) { throw "Instalacao existente: consulte $root; use Restore antes de reinstalar." }
    New-Item $root -ItemType Directory | Out-Null
    # The elevated scheduled action must never live in a user-writable directory.
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true,$false)
    $acl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
    foreach ($id in @('S-1-5-18','S-1-5-32-544')) {
        $identity = New-Object Security.Principal.SecurityIdentifier($id)
        $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
        $acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $root -AclObject $acl
}
if (!(Test-Path $root)) { throw 'Nenhuma instalacao encontrada.' }
Start-Transcript -Path (Join-Path $root ("{0}-{1}.log" -f $Mode,(Get-Date -Format 'yyyyMMdd-HHmmss'))) | Out-Null
try {
    if ($Mode -eq 'Install') {
        if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Ja existe uma tarefa com esse nome.' }
        $active = (& $power /getactivescheme) -join ''
        if ($active -notmatch '[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}') { throw 'Plano de energia nao identificado.' }
        $oldPower = $Matches[0]
        $changes = @(
            @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize','EnableTransparency',0,'DWord'),
            @('HKCU:\Control Panel\Desktop\WindowMetrics','MinAnimate','0','String'),
            @('HKCU:\Control Panel\Desktop','MenuShowDelay','100','String'),
            @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced','TaskbarAnimations',0,'DWord')
        )
        $entries = @()
        foreach ($c in $changes) {
            $key = Get-Item $c[0] -ErrorAction SilentlyContinue
            $exists = $key -and ($key.GetValueNames() -contains $c[1])
            $entries += [pscustomobject]@{Path=$c[0];Name=$c[1];Exists=[bool]$exists;Value=$(if($exists){$key.GetValue($c[1])});Kind=$(if($exists){$key.GetValueKind($c[1]).ToString()});NewValue=$c[2];NewKind=$c[3]}
        }
        $run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
        $runKey = Get-Item $run -ErrorAction SilentlyContinue
        if ($runKey) {
            foreach ($name in $runKey.GetValueNames()) {
                if ($name -match '^(Teams|Grammarly|MicrosoftEdgeAutoLaunch_.+)$' -or $runKey.GetValue($name) -match '(?i)C:\\Program Files\\Remojo\\') {
                    $entries += [pscustomobject]@{Path=$run;Name=$name;Exists=$true;Value=$runKey.GetValue($name);Kind=$runKey.GetValueKind($name).ToString();NewValue=$null;NewKind=$null}
                }
            }
        }
        $services = @(RemojoServices)
        $remoTasks = @(Get-ScheduledTask | Where-Object { @($_.Actions | Where-Object { $_.Execute -match '(?i)^"?C:\\Program Files\\Remojo\\' }).Count -gt 0 })
        $taskBackups = @($remoTasks | ForEach-Object { [pscustomobject]@{Name=$_.TaskName;Path=$_.TaskPath;Enabled=$_.Settings.Enabled;Xml=(Export-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath)} })
        $backup = [pscustomobject]@{Sid=$sid;Power=$oldPower;Entries=$entries;Services=$services;Tasks=$taskBackups}
        $backup | Export-Clixml $stateFile
        Audit | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $root 'before.json') -Encoding UTF8
        foreach ($service in $services) {
            Native $reg @('export',"HKLM\SYSTEM\CurrentControlSet\Services\$($service.Name)",(Join-Path $root ($service.Name+'.reg')),'/y')
        }
        Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $root 'Windows-Dev-Tuning.ps1')
        Native $power @('/setactive',$high)
        foreach ($entry in $entries) {
            if ($null -eq $entry.NewKind) { Remove-ItemProperty -Path $entry.Path -Name $entry.Name }
            else {
                if (!(Test-Path $entry.Path)) { New-Item -Path $entry.Path -Force | Out-Null }
                New-ItemProperty -Path $entry.Path -Name $entry.Name -Value $entry.NewValue -PropertyType $entry.NewKind -Force | Out-Null
            }
        }
        foreach ($task in $remoTasks) { Disable-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath | Out-Null }
    }
    if ($Mode -in @('Install','Complete')) {
        $backup = Import-Clixml $stateFile
        if ($backup.Sid -ne $sid) { throw 'Use a conta original.' }
        if ($PSCommandPath -ne (Join-Path $root 'Windows-Dev-Tuning.ps1')) { Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $root 'Windows-Dev-Tuning.ps1') -Force }
        $services = @(RemojoServices)
        foreach ($service in $services) {
            Set-Service -Name $service.Name -StartupType Disabled
            try { Stop-Service -Name $service.Name -ErrorAction Stop } catch {
                Write-Warning ('Parada normal falhou: ' + $_.Exception.Message)
                $current = Get-CimInstance Win32_Service | Where-Object Name -eq $service.Name
                if ($current.ProcessId -gt 0) {
                    $process = Get-Process -Id $current.ProcessId -ErrorAction Stop
                    if ($process.Path -notlike 'C:\Program Files\Remojo\*') { throw 'Executavel fora da pasta esperada.' }
                    Stop-Process -Id $process.Id -Force -ErrorAction Stop
                }
            }
            (Get-Service -Name $service.Name).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(30))
            Native $sc @('delete',$service.Name)
        }
        Get-Process | Where-Object { $_.Path -like 'C:\Program Files\Remojo\*' } | Stop-Process -Force
        $ps = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $action = New-ScheduledTaskAction -Execute $ps -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -Mode Maintain' -f (Join-Path $root 'Windows-Dev-Tuning.ps1'))
        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $sid
        $principal = New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 3) -MultipleInstances IgnoreNew
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Reaplica alto desempenho no login; sem limpadores de RAM ou encerramento de aplicativos.' | Out-Null
        Audit | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $root 'after.json') -Encoding UTF8
        Write-Host 'INSTALADO. Reinicie quando conveniente. Backup e logs:' $root
    } elseif ($Mode -eq 'Maintain') {
        $backup = Import-Clixml $stateFile
        if ($backup.Sid -ne $sid) { throw 'Conta diferente da instalacao.' }
        Native $power @('/setactive',$high)
        Write-Host 'Plano de alto desempenho reaplicado.'
    } elseif ($Mode -eq 'Restore') {
        $backup = Import-Clixml $stateFile
        if ($backup.Sid -ne $sid) { throw 'Use a conta original.' }
        if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
        Native $power @('/setactive',$backup.Power)
        foreach ($entry in $backup.Entries) {
            if ($entry.Exists) {
                if (!(Test-Path $entry.Path)) { New-Item -Path $entry.Path -Force | Out-Null }
                New-ItemProperty -Path $entry.Path -Name $entry.Name -Value $entry.Value -PropertyType $entry.Kind -Force | Out-Null
            } else { Remove-ItemProperty -Path $entry.Path -Name $entry.Name -ErrorAction SilentlyContinue }
        }
        foreach ($task in $backup.Tasks) { if ($task.Enabled) { Enable-ScheduledTask -TaskName $task.Name -TaskPath $task.Path | Out-Null } }
        Write-Host 'Energia, interface e inicializacao restauradas. Para restaurar servicos Remojo excluidos, reinstale o Remojo. Backups .reg preservados para diagnostico; nao importados automaticamente.'
    }
} finally { Stop-Transcript | Out-Null }
