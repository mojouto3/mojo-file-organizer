!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\shell\MojoOrganize"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\MojoOrganize"
!macroend
