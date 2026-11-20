!include "MUI2.nsh"

Name "Weekly Study Planner"
OutFile "WeeklyStudyPlanner-1.0.0-x64-setup.exe"
Unicode True
InstallDir "$LOCALAPPDATA\WeeklyStudyPlanner"
RequestExecutionLevel user

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  File "..\..\desktop\target\release\weekly-study-planner.exe"
  File "..\..\desktop\assets\icon.png"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS\Weekly Study Planner"
  CreateShortcut "$SMPROGRAMS\Weekly Study Planner\Weekly Study Planner.lnk" "$INSTDIR\weekly-study-planner.exe"
  CreateShortcut "$SMPROGRAMS\Weekly Study Planner\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Weekly Study Planner.lnk" "$INSTDIR\weekly-study-planner.exe"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\WeeklyStudyPlanner" "DisplayName" "Weekly Study Planner (Rust)"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\WeeklyStudyPlanner" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\WeeklyStudyPlanner" "Publisher" "Weekly Study Planner"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\WeeklyStudyPlanner" "UninstallString" '"$INSTDIR\Uninstall.exe"'
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Weekly Study Planner.lnk"
  Delete "$SMPROGRAMS\Weekly Study Planner\Weekly Study Planner.lnk"
  Delete "$SMPROGRAMS\Weekly Study Planner\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Weekly Study Planner"

  Delete "$INSTDIR\weekly-study-planner.exe"
  Delete "$INSTDIR\icon.png"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\WeeklyStudyPlanner"
SectionEnd
