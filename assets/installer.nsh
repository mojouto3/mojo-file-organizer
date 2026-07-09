; Mojo Gaming Mode - NSIS Custom Install Script

!macro customInstall
  ; Kill any running instances before install using PowerShell as admin
  nsExec::ExecToLog 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Stop-Process -Name ''Mojo Gaming Mode'' -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 2000"'

  ; Register shutdown script in Windows
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0\0" "Script" "$INSTDIR\resources\assets\scripts\revert-on-shutdown.ps1"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0\0" "Parameters" ""
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0\0" "IsPowershell" "1"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "GPOId" "0"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "SOM-Id" "Local"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "FileSysPath" "$INSTDIR\resources\assets\scripts"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "DisplayName" "Local Group Policy"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "GPOName" "Local Group Policy"
!macroend

!macro customUninstall
  ; Kill running instances before uninstall
  nsExec::ExecToLog 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Stop-Process -Name ''Mojo Gaming Mode'' -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 2000"'

  ; Run revert script before uninstall
  nsExec::ExecToLog 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\resources\assets\scripts\revert-on-shutdown.ps1"'

  ; Remove shutdown registry entries
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0"

  ; Remove app data
  RMDir /r "$APPDATA\mojo-gaming-mode"
!macroend
