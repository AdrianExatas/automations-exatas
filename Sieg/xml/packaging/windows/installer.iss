#define MyAppName "SIEG XML"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Exatas"
#define MyAppExeName "SIEG XML.exe"
#define MyBuildDir "..\..\dist\SIEG XML"
#define MyConfigFile "config\.env"

[Setup]
AppId={{0F2B2A88-3CBA-4D82-B7C2-2AE5A6B5A10F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile=assets\app_icon.ico
OutputDir=..\..\installer
OutputBaseFilename=sieg-xml-setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Files]
Source: "{#MyBuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#MyConfigFile}"; DestDir: "{commonappdata}\SIEG XML\config"; DestName: ".env"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na area de trabalho"; Flags: unchecked

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir {#MyAppName}"; Flags: nowait postinstall skipifsilent
