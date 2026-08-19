Option Explicit
Dim shell, fso, root, watchdog, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
watchdog = root & "\DATA-HUB-WATCHDOG.ps1"
command = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & watchdog & """"
shell.Run command, 0, False
