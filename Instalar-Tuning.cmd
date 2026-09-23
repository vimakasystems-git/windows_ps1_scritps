@echo off
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0Windows-Dev-Tuning.ps1" -Mode Install
echo.
echo Se aparecer erro de permissao, execute este arquivo como administrador.
pause
