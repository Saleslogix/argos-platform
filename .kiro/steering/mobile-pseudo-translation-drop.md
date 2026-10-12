---
inclusion: manual
---

# Mobile Pseudo Translation Drop Process

How to take a translation drop and get localization bundles built, without ever
merging the strings into `develop`.

Repo: `C:\SourceCode\argos-platform`
Branch: `PseudoTranslations` (long-lived, **never** merged, no PR ever opened)

## Why there is no pull request

The pseudo strings must never reach `develop`. Review and merge are only gates on
getting code *into* a shared branch. Pushing to `PseudoTranslations` needs no
approval, and Jenkins builds it as its own branch. Ignore the "Create a pull
request" link git prints after pushing.

## One-time clone setup

The clone's `origin` is Oxford (internal Bitbucket), but **GitHub is the source of
truth** and is what Jenkins watches. Both remotes are needed:

```
origin  ssh://git@oxfordssh.awsdev.infor.com:7999/infor-crm-slx/mobile/argos-platform.git
github  https://github.com/Saleslogix/argos-platform.git
```

```powershell
git remote add github https://github.com/Saleslogix/argos-platform.git
git fetch github
```

Use HTTPS, not SSH. SSH to github.com fails with "Host key verification failed"
because `~/.ssh/known_hosts` only has Oxford entries, and the local `id_rsa` is an
Oxford key.

## Step 1 — sync the branch

```powershell
cd c:\SourceCode\argos-platform
git switch PseudoTranslations
git fetch github
git merge github/develop     # keep pseudo build current with real code
```

This is the only merge direction that ever happens.

## Step 2 — copy the drop files

Drops arrive as `<group>\<locale>\strings.l20n`, with groups `argos`, `contour`,
`crm`, `icboe`. Example source: `C:\Temp\Localization\New folder\Mobile 4.4.0`.

Destination mapping (`argos` goes to the SDK, the other three to the product):

| Group     | Destination |
|-----------|-------------|
| `argos`   | `argos-sdk\localization\locales\argos\<locale>\strings.l20n` |
| `contour` | `products\argos-saleslogix\localization\locales\contour\<locale>\strings.l20n` |
| `crm`     | `products\argos-saleslogix\localization\locales\crm\<locale>\strings.l20n` |
| `icboe`   | `products\argos-saleslogix\localization\locales\icboe\<locale>\strings.l20n` |

```powershell
$src    = "C:\Temp\Localization\New folder\Mobile 4.4.0"
$locale = "nl"
$repo   = "C:\SourceCode\argos-platform"

$map = @{
  "argos"   = "argos-sdk\localization\locales\argos\$locale\strings.l20n"
  "contour" = "products\argos-saleslogix\localization\locales\contour\$locale\strings.l20n"
  "crm"     = "products\argos-saleslogix\localization\locales\crm\$locale\strings.l20n"
  "icboe"   = "products\argos-saleslogix\localization\locales\icboe\$locale\strings.l20n"
}
foreach ($g in $map.Keys) {
  Copy-Item -LiteralPath (Join-Path $src "$g\$locale\strings.l20n") `
            -Destination (Join-Path $repo $map[$g]) -Force
}
git status --short   # expect 4 files as MODIFIED, not new
```

If any file shows as new rather than modified, the locale folder name is wrong.

## Step 3 — fix encoding (always needed)

Drops come as **UTF-16 LE with BOM**. The repo requires **UTF-8 with no BOM**.
This is a recurring problem; see commit `d06918fd5` "fix encoding issues in
translation drop".

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
foreach ($g in $map.Keys) {
  $p  = Join-Path $repo $map[$g]
  $sr = New-Object System.IO.StreamReader($p, [System.Text.Encoding]::Default, $true)
  $text = $sr.ReadToEnd(); $sr.Close()
  [System.IO.File]::WriteAllText($p, $text, $utf8NoBom)
}
```

Verify: each file should end up at roughly **half** its original byte count
(UTF-16 is 2 bytes per ASCII char, plus the 2-byte BOM). Confirm no BOM, no NUL
bytes, and valid UTF-8:

```powershell
foreach ($g in $map.Keys) {
  $b = [System.IO.File]::ReadAllBytes((Join-Path $repo $map[$g]))
  $bom = ($b.Length -ge 2 -and $b[0] -eq 0xFF -and $b[1] -eq 0xFE)
  $enc = New-Object System.Text.UTF8Encoding($false,$true)
  try { [void]$enc.GetString($b); $ok = $true } catch { $ok = $false }
  $nul = 0; foreach ($x in $b) { if ($x -eq 0) { $nul++ } }
  "$g bytes=$($b.Length) utf16bom=$bom validUtf8=$ok nuls=$nul"
}
```

**Line endings:** leave them alone. Drops are CRLF, the repo stores LF, and
`core.autocrlf=true` normalizes on commit. A text-level diff in
`git diff --cached --stat` (rather than "binary files differ") confirms the
encoding fix worked.

## Step 4 — check double-quote escaping

Inner double quotes must be backslash-escaped. Translators do not do this.

Expected form: `someKey: "Some\"string\"."`

```powershell
foreach ($g in $map.Keys) {
  $lines = [System.IO.File]::ReadAllLines((Join-Path $repo $map[$g]))
  $bad = @()
  for ($i=0; $i -lt $lines.Count; $i++) {
    if (([regex]::Matches($lines[$i], '"')).Count -gt 2) { $bad += "L$($i+1): $($lines[$i])" }
  }
  "$g : $($bad.Count) suspect lines"
  $bad | Select-Object -First 10
}
```

A value line should hold exactly 2 quote chars (the delimiters). More than 2 means
either an unescaped inner quote to fix, or an already-escaped `\"` that is fine.
Inspect the reported lines and escape as needed.

Note: lines like `entityDisplayNamePlural : "..."` have a space before the colon.
That is pre-existing repo style, not an error.

## Step 5 — limit lang-pack to the one locale

`products\argos-saleslogix\Gruntfile.js` lists every locale under `lang-pack`.
Trim it to just the one being tested so the build is not building 13 bundles:

```javascript
'lang-pack': {
  'nl': {
    bundleName: "Mobile 4.4.0 NL",
  }
},
```

`lang-pack` is a grunt multi-task and only runs registered targets, so an
unregistered locale produces no bundle at all. Verify the edit parses:

```powershell
cd products\argos-saleslogix ; node -e "require('./Gruntfile.js'); console.log('OK')"
```

Note: `zh-CN` and `zh-TW` carry an extra `includes` block for `index.aspx`. Keep it
if testing those.

## Step 6 — commit and push to GitHub

```powershell
git add argos-sdk/localization/locales/argos/$locale/strings.l20n `
        products/argos-saleslogix/localization/locales/contour/$locale/strings.l20n `
        products/argos-saleslogix/localization/locales/crm/$locale/strings.l20n `
        products/argos-saleslogix/localization/locales/icboe/$locale/strings.l20n `
        products/argos-saleslogix/Gruntfile.js
git commit -m "Add <LOCALE> pseudo translation strings and limit lang-pack to <locale>"
git push github PseudoTranslations
```

Push to `github`, not `origin`. Jenkins watches GitHub only.

PowerShell reports exit code 1 on git pushes because git writes `remote:` lines to
stderr. That is not a failure. Verify for real:

```powershell
git rev-parse PseudoTranslations
(Invoke-RestMethod "https://api.github.com/repos/Saleslogix/argos-platform/branches/PseudoTranslations").commit.sha
```

## Step 7 — trigger the Jenkins build

Job: http://crm-jenkins.testlogix.com:8080/job/argos-platform/

Multibranch pipeline, `GitHubSCMSource` on `Saleslogix/argos-platform`, script
`Jenkinsfile`.

**New commits do not build automatically right away.** There is no webhook. The
`PeriodicFolderTrigger` interval is 4 hours. To build now, log into Jenkins in a
browser and click **Scan Repository Now** in the left sidebar.

This cannot be triggered from the shell. Jenkins answers unauthenticated requests
as `anonymous`, which has read permission but not build, so a scripted POST to
`/build` returns 403.

Branch discovery is `BranchDiscoveryTrait strategyId=1` = all branches except those
that also have a PR filed. `PseudoTranslations` has no PR, so it is discovered.
(This is also why `dependabot/*` branches appear as `PR-nn` jobs instead.)

## Step 8 — collect the bundles

```
\\usdavwtldata.testlogix.com\devbuilds\builds\mobile\bundles\PseudoTranslations\<BUILD_NUMBER>\*.zip
```

The Jenkinsfile keys that path on `%BRANCH_NAME%`, so pseudo bundles stay isolated
from `develop` output.

## Build gotcha

The pipeline runs `npm run lint` and `build\release.cmd` for both `argos-sdk` and
`argos-saleslogix` *before* `grunt bundle` and `grunt lang-pack`, and throws on
failure. There is also an l20n linter. Run lint locally before pushing rather than
debugging through Jenkins:

```powershell
cd argos-sdk ; npm run lint
cd ..\products\argos-saleslogix ; npm run lint
```
