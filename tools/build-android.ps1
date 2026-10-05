param([string]$SdkPath = '', [string]$JavaPath = '')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $SdkPath) {
  foreach ($candidate in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, 'C:\Android\Sdk', "$env:LOCALAPPDATA\Android\Sdk")) {
    if ($candidate -and (Test-Path -LiteralPath (Join-Path $candidate 'platforms\android-36\android.jar'))) { $SdkPath = $candidate; break }
  }
}
if (-not $SdkPath) { throw 'Android SDK platform 36 is required. Pass -SdkPath.' }
if (-not $JavaPath) { $JavaPath = Split-Path -Parent (Split-Path -Parent (Get-Command javac.exe).Source) }
function Run-BuildTool([string]$Executable, [string[]]$Arguments) {
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Build tool failed ($LASTEXITCODE): $Executable" }
}
$taskKeystore = Join-Path $taskRoot 'android\keystore\wildfall-development.jks'
if (-not (Test-Path -LiteralPath $taskKeystore)) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $taskKeystore) -Force | Out-Null
  Run-BuildTool (Join-Path $JavaPath 'bin\keytool.exe') @('-genkeypair','-keystore',$taskKeystore,'-storepass','android','-keypass','android','-alias','wildfall','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Wildfall Development, OU=Indie Games, O=Ashen Valley, C=ID')
}
[IO.File]::WriteAllText((Join-Path $taskRoot 'android\local.properties'), ('sdk.dir=' + $SdkPath.Replace('\','/') + [Environment]::NewLine))
Write-Output 'Compiling native ads, Play Billing, and the offline survival game...'
Run-BuildTool (Join-Path $taskRoot 'android\gradlew.bat') @('-p',(Join-Path $taskRoot 'android'),('-Dorg.gradle.java.home=' + $JavaPath),'assembleRelease','--console','plain')
$taskInputs = @(Get-ChildItem -LiteralPath (Join-Path $taskRoot '.build\gradle-android\outputs\apk\release') -Filter '*-release.apk')
if ($taskInputs.Count -ne 1) { throw 'Expected exactly one Gradle release APK.' }
$taskVersion = (Get-Content -LiteralPath (Join-Path $taskRoot 'package.json') -Raw | ConvertFrom-Json).version
if ($taskVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid application version.' }
New-Item -ItemType Directory -Path (Join-Path $taskRoot 'dist') -Force | Out-Null
$taskOutput = Join-Path $taskRoot ('dist\WILDFALL-Last-Ember-' + $taskVersion + '.apk')
$taskTools = Join-Path $SdkPath 'build-tools\35.0.0'
Run-BuildTool (Join-Path $taskTools 'apksigner.bat') @('sign','--ks',$taskKeystore,'--ks-key-alias','wildfall','--ks-pass','pass:android','--key-pass','pass:android','--out',$taskOutput,$taskInputs[0].FullName)
Run-BuildTool (Join-Path $taskTools 'apksigner.bat') @('verify','--verbose',$taskOutput)
Run-BuildTool (Join-Path $taskTools 'zipalign.exe') @('-c','4',$taskOutput)
$taskHasher = [Security.Cryptography.SHA256]::Create()
$taskStream = [IO.File]::OpenRead($taskOutput)
try { $taskHash = [BitConverter]::ToString($taskHasher.ComputeHash($taskStream)).Replace('-','').ToLowerInvariant() }
finally { $taskStream.Dispose(); $taskHasher.Dispose() }
[IO.File]::WriteAllText((Join-Path $taskRoot 'dist\SHA256.txt'),($taskHash + '  ' + (Split-Path -Leaf $taskOutput) + [Environment]::NewLine))
Write-Output "APK ready: $taskOutput"
Write-Output "Size: $([math]::Round((Get-Item -LiteralPath $taskOutput).Length / 1MB, 2)) MB"
