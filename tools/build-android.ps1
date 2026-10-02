param([string]$SdkPath = '', [string]$JavaPath = '')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $SdkPath) {
  foreach ($candidate in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, 'C:\Android\Sdk', "$env:LOCALAPPDATA\Android\Sdk")) {
    if ($candidate -and (Test-Path -LiteralPath (Join-Path $candidate 'platforms\android-35\android.jar'))) { $SdkPath = $candidate; break }
  }
}
if (-not $SdkPath) { throw 'Android SDK platform 35 is required. Pass -SdkPath.' }
if (-not $JavaPath) { $JavaPath = Split-Path -Parent (Split-Path -Parent (Get-Command javac.exe).Source) }
$taskBuild = Join-Path $taskRoot '.build\android'
$taskResolved = [IO.Path]::GetFullPath($taskBuild)
if (-not $taskResolved.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Build path must stay inside the workspace.' }
if (Test-Path -LiteralPath $taskResolved) { Remove-Item -LiteralPath $taskResolved -Force -Recurse }
foreach ($sub in @('classes','dex','generated')) { New-Item -ItemType Directory -Path (Join-Path $taskResolved $sub) -Force | Out-Null }
New-Item -ItemType Directory -Path (Join-Path $taskRoot 'dist') -Force | Out-Null
$taskTools = Join-Path $SdkPath 'build-tools\35.0.0'
$taskAndroidJar = Join-Path $SdkPath 'platforms\android-35\android.jar'
function Run-BuildTool([string]$Executable, [string[]]$Arguments) {
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Build tool failed ($LASTEXITCODE): $Executable" }
}
Write-Output 'Compiling Android resources and bundling offline game...'
Run-BuildTool (Join-Path $taskTools 'aapt2.exe') @('compile','--dir',(Join-Path $taskRoot 'android\res'),'-o',(Join-Path $taskResolved 'resources.zip'))
Run-BuildTool (Join-Path $taskTools 'aapt2.exe') @('link','-I',$taskAndroidJar,'--manifest',(Join-Path $taskRoot 'android\AndroidManifest.xml'),'--java',(Join-Path $taskResolved 'generated'),'-o',(Join-Path $taskResolved 'unsigned.apk'),(Join-Path $taskResolved 'resources.zip'))
$taskSources = @(Get-ChildItem -LiteralPath (Join-Path $taskRoot 'android\src') -Filter '*.java' -Recurse | ForEach-Object { $_.FullName })
Run-BuildTool (Join-Path $JavaPath 'bin\javac.exe') (@('-encoding','UTF-8','-source','8','-target','8','-Xlint:-options','-classpath',$taskAndroidJar,'-d',(Join-Path $taskResolved 'classes')) + $taskSources)
Run-BuildTool (Join-Path $JavaPath 'bin\jar.exe') @('--create','--file',(Join-Path $taskResolved 'classes.jar'),'-C',(Join-Path $taskResolved 'classes'),'.')
Run-BuildTool (Join-Path $taskTools 'd8.bat') @('--release','--min-api','26','--lib',$taskAndroidJar,'--output',(Join-Path $taskResolved 'dex'),(Join-Path $taskResolved 'classes.jar'))
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$taskZip = [IO.Compression.ZipFile]::Open((Join-Path $taskResolved 'unsigned.apk'), [IO.Compression.ZipArchiveMode]::Update)
try {
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip,(Join-Path $taskResolved 'dex\classes.dex'),'classes.dex',[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  $taskWeb = Join-Path $taskRoot 'web'
  foreach ($taskAsset in (Get-ChildItem -LiteralPath $taskWeb -File -Recurse)) {
    $taskEntry = 'assets/' + $taskAsset.FullName.Substring($taskWeb.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip,$taskAsset.FullName,$taskEntry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
}
finally { $taskZip.Dispose() }
Run-BuildTool (Join-Path $taskTools 'zipalign.exe') @('-f','4',(Join-Path $taskResolved 'unsigned.apk'),(Join-Path $taskResolved 'aligned.apk'))
$taskKeystore = Join-Path $taskRoot 'android\keystore\wildfall-development.jks'
if (-not (Test-Path -LiteralPath $taskKeystore)) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $taskKeystore) -Force | Out-Null
  Run-BuildTool (Join-Path $JavaPath 'bin\keytool.exe') @('-genkeypair','-keystore',$taskKeystore,'-storepass','android','-keypass','android','-alias','wildfall','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Wildfall Development, OU=Indie Games, O=Ashen Valley, C=ID')
}
$taskOutput = Join-Path $taskRoot 'dist\WILDFALL-Last-Ember-1.1.0.apk'
Run-BuildTool (Join-Path $taskTools 'apksigner.bat') @('sign','--ks',$taskKeystore,'--ks-key-alias','wildfall','--ks-pass','pass:android','--key-pass','pass:android','--out',$taskOutput,(Join-Path $taskResolved 'aligned.apk'))
Run-BuildTool (Join-Path $taskTools 'apksigner.bat') @('verify','--verbose',$taskOutput)
Run-BuildTool (Join-Path $taskTools 'zipalign.exe') @('-c','4',$taskOutput)
$taskHashProvider = [Security.Cryptography.SHA256]::Create()
$taskStream = [IO.File]::OpenRead($taskOutput)
try { $taskHashText = [BitConverter]::ToString($taskHashProvider.ComputeHash($taskStream)).Replace('-', '').ToLower() }
finally { $taskStream.Dispose(); $taskHashProvider.Dispose() }
[IO.File]::WriteAllText((Join-Path $taskRoot 'dist\SHA256.txt'), ($taskHashText + '  WILDFALL-Last-Ember-1.1.0.apk' + [Environment]::NewLine))
Write-Output "APK ready: $taskOutput"
Write-Output "Size: $([math]::Round((Get-Item -LiteralPath $taskOutput).Length / 1MB, 2)) MB"
