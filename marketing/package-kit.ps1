$ErrorActionPreference = 'Stop'
$kitRoot = $PSScriptRoot
python (Join-Path $kitRoot 'package-kit.py')
if ($LASTEXITCODE -ne 0) { throw 'Marketing packaging failed' }
