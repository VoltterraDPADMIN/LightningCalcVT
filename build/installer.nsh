!include "nsDialogs.nsh"

Var PasswordField
Var PasswordValue

!macro customHeader
  Page custom PasswordPage_Show PasswordPage_Validate
!macroend

Function PasswordPage_Show
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateLabel} 0 20u 100% 16u "Aceast\u0103 aplica\u0163ie este protejat\u0103 cu parol\u0103."
  Pop $0

  ${NSD_CreateLabel} 0 48u 100% 12u "Parol\u0103 instalare:"
  Pop $0

  ${NSD_CreatePassword} 0 63u 100% 14u ""
  Pop $PasswordField

  nsDialogs::Show
FunctionEnd

Function PasswordPage_Validate
  ${NSD_GetText} $PasswordField $PasswordValue
  StrCmp $PasswordValue "V0lTT3RRA@dmin01020366" correct
  MessageBox MB_OK|MB_ICONSTOP "Parol\u0103 incorect\u0103! Instalarea va fi oprit\u0103."
  Abort
  correct:
FunctionEnd
