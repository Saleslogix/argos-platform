<#
.SYNOPSIS
  Builds the argos-dashboard VFS bundle (argos-dashboard.zip).

.DESCRIPTION
  The dashboard UI is not part of this repo. It is built out of the Infor CRM
  (slx) checkout and copied into the bundle staging area, alongside the argos
  glue that does live here (src, configuration, content, module-info.json).

  This is invoked manually and is deliberately not wired into CI.

  NOTE: check out the slx branch you intend to ship from before running this.
        The dashboard is built from whatever is in your slx working copy, e.g.

            git -C C:\code\slx checkout develop
            git -C C:\code\slx pull

.PARAMETER SlxDir
  Root of the slx checkout. Defaults to $env:SLX_DIR, then C:\code\slx.

.PARAMETER SkipSlxBuild
  Reuse whatever is already in <SlxDir>\dist\jscript\dashboard instead of
  rebuilding. The slx build runs npm install plus a production vite build, so
  this saves several minutes when iterating on the bundle itself.

.EXAMPLE
  npm run bundle:dashboard

.EXAMPLE
  .\build\bundle.ps1 -SlxDir D:\src\slx -SkipSlxBuild
#>
[CmdletBinding()]
param(
  [string] $SlxDir,
  [switch] $SkipSlxBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $SlxDir) { $SlxDir = $env:SLX_DIR }
if (-not $SlxDir) { $SlxDir = 'C:\code\slx' }

if (-not (Test-Path -LiteralPath $SlxDir -PathType Container)) {
  throw "slx checkout not found at '$SlxDir'. Pass -SlxDir or set `$env:SLX_DIR."
}

$SlxDir          = (Resolve-Path -LiteralPath $SlxDir).Path
$SlxWebUI        = Join-Path $SlxDir 'WebUI'
$DashboardScript = Join-Path $SlxWebUI 'build\Dashboard.ps1'
$DashboardDist   = Join-Path $SlxDir 'dist\jscript\dashboard'

$ProductRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$RepoRoot    = (Resolve-Path -LiteralPath (Join-Path $ProductRoot '..\..')).Path
$Bundler     = Join-Path $RepoRoot 'argos-sdk\tools\bundler\Bundler.exe'

$DeployDir   = Join-Path $ProductRoot 'deploy'
$ModelDir    = Join-Path $DeployDir 'bundle\model'
$BaselineDir = Join-Path $DeployDir 'bundle\baseline'
$ProductsDir = Join-Path $ModelDir 'Portal\SlxMobile\SourceFiles\products'
$ModuleDir   = Join-Path $ProductsDir 'argos-dashboard'
$BundleFile  = Join-Path $DeployDir 'argos-dashboard.zip'

if (-not (Test-Path -LiteralPath $Bundler -PathType Leaf)) {
  throw "Bundler.exe not found at '$Bundler'."
}

# -- 1. Build the dashboard out of slx -----------------------------------------

if ($SkipSlxBuild) {
  Write-Host "Skipping slx build, reusing $DashboardDist"
} else {
  if (-not (Test-Path -LiteralPath $DashboardScript -PathType Leaf)) {
    throw "Dashboard build script not found at '$DashboardScript'."
  }

  Write-Host "Building dashboard in $SlxWebUI (npm install + production build, this takes a few minutes)..."
  Push-Location -LiteralPath $SlxWebUI
  try {
    # Child process so the script's own `Exit 1` cannot take this shell with it.
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $DashboardScript
    if ($LASTEXITCODE -ne 0) {
      throw "Dashboard.ps1 failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath $DashboardDist -PathType Container)) {
  throw "Dashboard build output not found at '$DashboardDist'."
}
if (-not (Get-ChildItem -LiteralPath $DashboardDist -File -Recurse | Select-Object -First 1)) {
  throw "Dashboard build output at '$DashboardDist' is empty."
}

# -- 2. Stage the bundle model -------------------------------------------------

Write-Host "Staging bundle model in $ModelDir"

Remove-Item -LiteralPath $DeployDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $ModuleDir | Out-Null

# Two copies of the model skeleton. The baseline keeps its SourceFiles empty and
# is what the bundler diffs against in step 4 -- see the comment there.
foreach ($dir in @($ModelDir, $BaselineDir)) {
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'Portal\SlxMobile\SourceFiles') | Out-Null
  Copy-Item -Path (Join-Path $ProductRoot 'bundle\model\*') -Destination $dir -Recurse -Force
}

# Listed explicitly rather than copied wholesale so that repo-only files
# (.gitignore, bundle\, deploy\) can never leak into the bundle.
foreach ($item in @(
  'src',
  'configuration',
  'content',
  'build\release.jsb2',
  'module-info.json',
  'module-fragment.html'
)) {
  $source = Join-Path $ProductRoot $item
  if (-not (Test-Path -LiteralPath $source)) {
    throw "Expected '$source' to exist."
  }
  $target = Join-Path $ModuleDir (Split-Path $item -Parent)
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
}

# The closed-source half.
Write-Host "Copying dashboard from $DashboardDist"
Copy-Item -LiteralPath $DashboardDist -Destination $ModuleDir -Recurse -Force

# The bundler records where the module directory came from, so it has to point
# at this staging path rather than whichever machine last built it by hand.
$moduleXmlPath = Join-Path $ModuleDir 'argos-dashboard.mobapp.module.xml'
$moduleXml = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'moduleConfig.tmpl') -Raw).Replace(
  '<%=moduleRootDir %>',
  [System.Security.SecurityElement]::Escape($ProductsDir + '\'))
# No BOM: matches what App Architect writes.
[System.IO.File]::WriteAllText($moduleXmlPath, $moduleXml, (New-Object System.Text.UTF8Encoding($false)))

# -- 3. Check the staging before handing it to the bundler ---------------------

if ($moduleXml -match '<%=') {
  throw 'moduleConfig.tmpl still has unreplaced tokens.'
}

$missing = @(
  'argos-dashboard.mobapp.module.xml',
  'module-info.json',
  'module-fragment.html',
  'build\release.jsb2',
  'configuration\development.js',
  'configuration\production.js',
  'content\css\dashboard.css',
  'src\ApplicationModule.js',
  'src\Views\Dashboard.js',
  'dashboard\config.js',
  'dashboard\slx-dashboard.index.js'
) | Where-Object { -not (Test-Path -LiteralPath (Join-Path $ModuleDir $_)) }

if ($missing) {
  throw "Staging is incomplete, missing: $($missing -join ', ')"
}

# -- 4. Bundle -----------------------------------------------------------------

# Diff against the baseline rather than BundleMethod:All on purpose. The model
# has to contain SlxMobile.mobapp.ptl.xml for the bundler to walk into
# SourceFiles at all, but with :All the portal is bundled as an installable
# ModelItem, so installing this bundle would overwrite the customer's mobile
# portal definition. Diffing against a baseline that holds the same portal and
# an empty SourceFiles demotes it to a Context (hierarchy only) and leaves just
# the argos-dashboard module as payload.
& $Bundler /BundlerAction:b /IsCRMBundle:true `
  "/ProjectPath:$ModelDir" `
  "/BundleFileName:$BundleFile" `
  /BundleMethod:Diff `
  "/PreviousProjectPath:$BaselineDir" `
  "/ConfigFileName:$(Join-Path $PSScriptRoot 'bundle.config')"

if (-not (Test-Path -LiteralPath $BundleFile -PathType Leaf)) {
  throw "Bundler.exe did not produce '$BundleFile' (exit code $LASTEXITCODE)."
}

# -- 5. Check the bundle ------------------------------------------------------

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($BundleFile)
try {
  $entries = @($zip.Entries | ForEach-Object { $_.FullName })

  $manifestEntry = $zip.GetEntry('manifest.xml')
  if (-not $manifestEntry) { throw 'Bundle has no manifest.xml.' }
  $reader = New-Object System.IO.StreamReader($manifestEntry.Open())
  try { $manifest = [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
} finally {
  $zip.Dispose()
}

# The portal must be hierarchy only. If this trips, the bundle would overwrite
# the mobile portal definition on install.
$portal = @($manifest.SelectNodes('//*[Url]') | Where-Object {
  $_.Url -like '*SlxMobile.mobapp.ptl.xml' -and $_.Url -notlike '*SourceFiles*'
})
if ($portal.Count -ne 1) {
  throw "Expected exactly one mobile portal item in the manifest, found $($portal.Count)."
}
if ($portal[0].BundleItemType -ne 'Context') {
  throw "Mobile portal is bundled as '$($portal[0].BundleItemType)', expected 'Context'."
}
if ($entries -contains 'Portal/SlxMobile/SlxMobile.mobapp.ptl.xml') {
  throw 'Bundle ships SlxMobile.mobapp.ptl.xml; it would overwrite the mobile portal on install.'
}

$prefix = 'Portal/SlxMobile/SourceFiles/products/argos-dashboard/'
foreach ($required in @(
  ($prefix + 'argos-dashboard.mobapp.module.xml'),
  ($prefix + 'module-info.json'),
  ($prefix + 'src/ApplicationModule.js'),
  ($prefix + 'dashboard/config.js')
)) {
  if ($entries -notcontains $required) { throw "Bundle is missing '$required'." }
}

$stray = @($entries | Where-Object {
  $_ -notin @('bundleData.xml', 'manifest.xml') -and -not $_.StartsWith('Portal/')
})
if ($stray.Count) { throw "Bundle has unexpected entries: $($stray -join ', ')" }

Write-Host "Bundle written to $BundleFile ($($entries.Count) entries)"
