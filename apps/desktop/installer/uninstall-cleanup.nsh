; Extra cleanup on uninstall (not on auto-update). Roaming app data
; (%APPDATA%\VYAPARA and %APPDATA%\vyapara-desktop-app: database, device identity,
; license, session token, sync credentials, branding) is removed by
; electron-builder's deleteAppDataOnUninstall. This removes the rest.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    SetShellVarContext current
    RMDir /r "$LOCALAPPDATA\vyapara-desktop-app-updater"
    RMDir /r "$LOCALAPPDATA\VYAPARA"
    RMDir /r "$LOCALAPPDATA\vyapara-desktop-app"
    RMDir /r "$APPDATA\VYAPARA"
    RMDir /r "$APPDATA\vyapara-desktop-app"
    SetShellVarContext all
  ${endIf}
!macroend
