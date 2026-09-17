' ==============================================================================
' RODIČOVSKÝ ZÁMEK PC - TICHÝ SPOUŠTĚČ AGENTA NA POZADÍ (BEZ ČERNÉHO OKNA)
' ==============================================================================
' Tento skript spustí Agent-Zamek-PC.ps1 v tichém režimu (WindowStyle Hidden)
' Dítě nevidí žádné příkazové okno ani ikonu v hlavním panelu.
' ==============================================================================

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPsScript = Chr(34) & strScriptDir & "\Agent-Zamek-PC.ps1" & Chr(34)

' Parametry PowerShellu: Skryté okno, obejít ExecutionPolicy, bez profilu
strCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File " & strPsScript

' 0 = skryté okno (vbHide), False = nečekat na dokončení
objShell.Run strCommand, 0, False
