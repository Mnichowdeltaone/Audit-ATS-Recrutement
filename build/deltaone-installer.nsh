!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Bienvenue dans CV Improvement"
  !define MUI_WELCOMEPAGE_TEXT "Votre potentiel mérite un meilleur CV.$\r$\n$\r$\nby DeltaOne Developpement$\r$\nDirection de projet : François Delrieu$\r$\n$\r$\nCet assistant vous accompagne dans l'installation de CV Improvement.$\r$\n$\r$\nUne réinstallation de la même version remet les données à zéro. Une mise à jour vers une autre version conserve les données et la clé API.$\r$\n$\r$\nCliquez sur Suivant pour continuer."
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Read the installed version before the installation registry is rewritten.
!macro customInit
  Var /GLOBAL cvPreviousVersion
  ReadRegStr $cvPreviousVersion SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
!macroend

; A manual reinstall of the same version resets data. Updates preserve it.
!macro customInstall
  ${if} ${isUpdated}
    Delete "$INSTDIR\resources\installation-reset.id"
    Goto reset_id_done
  ${endIf}
  ${if} $cvPreviousVersion != ""
    ${if} $cvPreviousVersion != "${VERSION}"
      Delete "$INSTDIR\resources\installation-reset.id"
      Goto reset_id_done
    ${endIf}
  ${endIf}
  Push $0
  Push $1
  System::Call 'ole32::CoCreateGuid(g .r0) i .r1'
  StrCmp $1 0 reset_id_ok
  MessageBox MB_ICONSTOP "Impossible de préparer la remise à zéro."
  Abort
reset_id_ok:
  ClearErrors
  FileOpen $1 "$INSTDIR\resources\installation-reset.id" w
  IfErrors reset_id_error
  FileWrite $1 "$0"
  FileClose $1
  IfErrors reset_id_error
  Pop $1
  Pop $0
  Goto reset_id_done
reset_id_error:
  MessageBox MB_ICONSTOP "Impossible d'enregistrer la demande de remise à zéro."
  Abort
reset_id_done:
!macroend
