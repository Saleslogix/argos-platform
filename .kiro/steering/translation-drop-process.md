---
inclusion: manual
---

# Mobile Translation Drop Process

How to take a translation drop from the translators and get localization bundles built.
There are two modes. The common steps are the same in both; the branch, push, build and
cleanup steps differ.

| Mode | Purpose | Branch | Reaches `develop`? |
|---|---|---|---|
| Pseudo | Test the pipeline and UI with pseudo-translated strings | `PseudoTranslations` (long-lived) | Never. No PR, ever |
| Real | Ship real translated strings | Working branch such as `translation-updates`, from `develop` | Yes, via a PR |

**Check which mode you are in before you start.** The pseudo steps (trim `lang-pack`, never
merge, no PR) are wrong for a real drop.

The XBar / OrangeCrush process is documented separately in the OrangeCrush repo
(`.kiro/steering/translation-drop-process.md`). The two processes differ in almost every
detail. Do not cross-apply the steps.

Repo: `C:\SourceCode\argos-platform`

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

---

# Common steps (both modes)

## C1 — copy the drop files

Drops arrive as `<group>\<locale>\strings.l20n`, with groups `argos`, `contour`,
`crm`, `icboe`, plus `help\<group>\<locale>\help.html` in real drops. Example source:
`C:\Temp\Localization\Mobile 4.4.0`.

Destination mapping (`argos` goes to the SDK, the other three to the product):

| Group     | Destination |
|-----------|-------------|
| `argos`   | `argos-sdk\localization\locales\argos\<locale>\strings.l20n` |
| `contour` | `products\argos-saleslogix\localization\locales\contour\<locale>\strings.l20n` |
| `crm`     | `products\argos-saleslogix\localization\locales\crm\<locale>\strings.l20n` |
| `icboe`   | `products\argos-saleslogix\localization\locales\icboe\<locale>\strings.l20n` |

This copies **every locale folder found in the drop**, so it works for one locale (pseudo)
or six (real). The drop's folder name is not always the repo's: the drop uses `es-ES`,
the repo's strings folders use `es`. The `$rename` table handles that.

```powershell
$src  = "C:\Temp\Localization\Mobile 4.4.0"
$repo = "C:\SourceCode\argos-platform"
$rename = @{ "es-ES" = "es" }          # drop folder name -> repo folder name

$destRoot = @{
  "argos"   = "argos-sdk\localization\locales\argos"
  "contour" = "products\argos-saleslogix\localization\locales\contour"
  "crm"     = "products\argos-saleslogix\localization\locales\crm"
  "icboe"   = "products\argos-saleslogix\localization\locales\icboe"
}
$files = @()   # destination files written, used by C2
foreach ($g in $destRoot.Keys) {
  foreach ($d in Get-ChildItem (Join-Path $src $g) -Directory) {
    $loc = if ($rename.ContainsKey($d.Name)) { $rename[$d.Name] } else { $d.Name }
    $dest = Join-Path $repo "$($destRoot[$g])\$loc\strings.l20n"
    Copy-Item -LiteralPath (Join-Path $d.FullName "strings.l20n") -Destination $dest -Force
    $files += $dest
  }
}
git status --short   # expect every file MODIFIED, not new
```

If any file shows as new rather than modified, the locale folder name is wrong. A file
that is byte-for-byte unchanged from the repo (after C2) will not appear in
`git status`. That is normal: drops often re-send locales that did not change.

## C2 — fix encoding (always needed)

Drops come as **UTF-16 LE with BOM**. The repo requires **UTF-8 with no BOM**.
This is a recurring problem; see commit `d06918fd5` "fix encoding issues in
translation drop".

Convert every file C1 wrote. The reader auto-detects UTF-16 LE/BE and UTF-8 from the
BOM, and the writer always emits UTF-8 with no BOM, so it is safe to run on files that
are already UTF-8.

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
foreach ($p in $files) {
  $sr = New-Object System.IO.StreamReader($p, [System.Text.Encoding]::Default, $true)
  $text = $sr.ReadToEnd(); $sr.Close()
  [System.IO.File]::WriteAllText($p, $text, $utf8NoBom)
}
```

### Verify that every l20n file in the repo is UTF-8

This scans **all** `.l20n` files under both localization folders, not just the ones you
copied, and fails loudly on anything that is not strict UTF-8 without BOM, or has NUL
bytes or U+FFFD replacement characters (damage that happened before the file reached us):

```powershell
$bad = 0
Get-ChildItem "$repo\argos-sdk\localization","$repo\products\argos-saleslogix\localization" `
    -Recurse -File -Filter *.l20n | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)
  $kind = if ($b.Length -ge 2 -and $b[0] -eq 0xFF -and $b[1] -eq 0xFE) { "UTF-16LE" }
          elseif ($b.Length -ge 2 -and $b[0] -eq 0xFE -and $b[1] -eq 0xFF) { "UTF-16BE" }
          elseif ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { "UTF-8 BOM" }
          else { "" }
  $enc = New-Object System.Text.UTF8Encoding($false,$true)
  try { $t = $enc.GetString($b) } catch { $kind = "INVALID UTF-8" ; $t = "" }
  if ($b -contains 0) { $kind += " NULs" }
  if ($t.Contains([string][char]0xFFFD)) { $kind += " U+FFFD" }
  if ($kind) { $bad++; "{0,-18} {1}" -f $kind.Trim(), $_.FullName.Replace("$repo\","") }
}
"{0} file(s) not clean UTF-8 without BOM" -f $bad
```

Expect `0`, with one known exception: `products/argos-saleslogix/localization/locales/crm/es/regional.l20n`
carries a UTF-8 BOM in the repo already. It is a lint warning, not an error, and is
not part of a drop. Leave it unless you are touching that file.

Also compare sizes: a converted file should be roughly **half** its original byte count
(UTF-16 is 2 bytes per ASCII char, plus the 2-byte BOM).

The repo's own check is `tools/lint-l20n.js`, which flags UTF-16 as an error and
UTF-8 BOM as a warning. It needs `npm install` first. See C4.

### HTML help files are different

`help.html` files in drops arrive **UTF-8 with BOM**, but the repo stores them **without**
BOM (41 of 42 today). When you copy help files (R3), strip the BOM.

**Line endings:** leave them alone. Drops are CRLF, the repo stores LF, and
`core.autocrlf=true` normalizes on commit. A text-level diff in
`git diff --cached --stat` (rather than "binary files differ") confirms the
encoding fix worked.

## C3 — check double-quote escaping

Inner double quotes must be backslash-escaped. Translators do not do this.

Expected form: `someKey: "Some\"string\"."`

```powershell
foreach ($p in $files) {
  $lines = [System.IO.File]::ReadAllLines($p)
  $suspect = @()
  for ($i=0; $i -lt $lines.Count; $i++) {
    if (([regex]::Matches($lines[$i], '"')).Count -gt 2) { $suspect += "L$($i+1): $($lines[$i])" }
  }
  if ($suspect.Count) {
    "$($p.Replace("$repo\",'')) : $($suspect.Count) suspect lines"
    $suspect | Select-Object -First 10
  }
}
```

Only files with suspects are printed. In the 4.4.0 drop, `argos\fr` (3 lines), `crm\de`
(10) and `icboe\de` (1) had them.

To fix them, escape the inner quotes of the value on each suspect line. This keeps line
endings and writes UTF-8 without BOM. Review the result with `git diff`:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
foreach ($p in $files) {
  $lines = [regex]::Split([System.IO.File]::ReadAllText($p), '(?<=\n)')   # keep EOLs
  $changed = 0
  for ($i=0; $i -lt $lines.Count; $i++) {
    if (([regex]::Matches($lines[$i], '"')).Count -le 2) { continue }
    $m = [regex]::Match($lines[$i], '^(?<pre>\s*[^\s:]+\s*:\s*")(?<val>.*)(?<post>"\s*)$', 'Singleline')
    if (-not $m.Success) { "NO MATCH $p L$($i+1)"; continue }
    $eol = [regex]::Match($m.Groups['post'].Value, '\s*$').Value
    $q   = $m.Groups['post'].Value.Substring(0, $m.Groups['post'].Value.Length - $eol.Length)
    $new = $m.Groups['pre'].Value + ($m.Groups['val'].Value -replace '(?<!\\)"', '\"') + $q + $eol
    if ($new -ne $lines[$i]) { $lines[$i] = $new; $changed++ }
  }
  if ($changed) { [System.IO.File]::WriteAllText($p, ($lines -join ''), $utf8NoBom) }
}
```

Only run it on lines the scan reported. It assumes one `key: "value"` per line, and
prints `NO MATCH` for anything else, which you then fix by hand. Then run C4: the l20n
linter reports unescaped quotes as grammar errors (12 on the unfixed 4.4.0 `argos\fr`).

A value line should hold exactly 2 quote chars (the delimiters). More than 2 means
either an unescaped inner quote to fix, or an already-escaped `\"` that is fine.
Inspect the reported lines and escape as needed.

Note: lines like `entityDisplayNamePlural : "..."` have a space before the colon.
That is pre-existing repo style, not an error.

## C4 — run lint before pushing

The Jenkins pipeline runs `npm run lint` and `build\release.cmd` for both `argos-sdk`
and `argos-saleslogix` *before* `grunt bundle` and `grunt lang-pack`, and throws on
failure.

**Jenkins does not check l20n files.** `npm run lint` is ESLint on `./src` only. The l20n
linter (`lint:l20n`) runs as part of `npm test`, and the Jenkinsfile has `npm run test`
commented out. So a UTF-16 file, a BOM or an unbalanced quote passes Jenkins and fails
at runtime or in a later `grunt-convert`. Run the l20n linter yourself:

```powershell
cd c:\SourceCode\argos-platform
npm install                                   # once; lint-l20n needs antlr4
cd argos-sdk ; npm run lint ; npm run lint:l20n
cd ..\products\argos-saleslogix ; npm run lint ; npm run lint:l20n
```

`lint:l20n` exits non-zero on UTF-16, U+FFFD or a grammar error, and warns on a UTF-8 BOM.
The one existing BOM warning (`crm/es/regional.l20n`) is expected.

## C5 — verify a push reached GitHub

PowerShell reports exit code 1 on git pushes because git writes `remote:` lines to
stderr. That is not a failure. Verify for real (substitute the branch you pushed):

```powershell
git rev-parse <branch>
(Invoke-RestMethod "https://api.github.com/repos/Saleslogix/argos-platform/branches/<branch>").commit.sha
```

## C6 — Jenkins facts that apply to any branch

Job: http://crm-jenkins.testlogix.com:8080/job/argos-platform/

Multibranch pipeline, `GitHubSCMSource` on `Saleslogix/argos-platform`, script
`Jenkinsfile`.

- **New commits do not build automatically right away.** There is no webhook. The
  `PeriodicFolderTrigger` interval is 4 hours. To build now, log into Jenkins in a
  browser and click **Scan Repository Now** in the left sidebar.
- This cannot be triggered from the shell. Jenkins answers unauthenticated requests
  as `anonymous`, which has read permission but not build, so a scripted POST to
  `/build` returns 403.
- Branch discovery is `BranchDiscoveryTrait strategyId=1` = all branches except those
  that also have a PR filed. A branch with a PR shows up as a `PR-nn` job instead
  (this is why `dependabot/*` branches appear as `PR-nn` jobs).
- The Jenkinsfile keys the bundle output path on `%BRANCH_NAME%`:
  `\\usdavwtldata.testlogix.com\devbuilds\builds\mobile\bundles\<BRANCH_NAME>\<BUILD_NUMBER>\*.zip`

---

# Pseudo drop

Branch: `PseudoTranslations` (long-lived, **never** merged, no PR ever opened).

## Why there is no pull request

The pseudo strings must never reach `develop`. Review and merge are only gates on
getting code *into* a shared branch. Pushing to `PseudoTranslations` needs no
approval, and Jenkins builds it as its own branch. Ignore the "Create a pull
request" link git prints after pushing.

## P1 — sync the branch (before the common steps)

```powershell
cd c:\SourceCode\argos-platform
git switch PseudoTranslations
git fetch github
git merge github/develop     # keep pseudo build current with real code
```

This is the only merge direction that ever happens.

## P2 — run C1 to C3

Copy the drop, fix the encoding, check the quote escaping.

## P3 — limit lang-pack to the one locale

`products\argos-saleslogix\Gruntfile.js` lists every locale under `lang-pack`.
Trim it to just the one being tested so the build is not building a bundle for every locale (12 on `develop`):

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

## P4 — run C4, then commit and push to GitHub

```powershell
$locale = "nl"     # the one locale in the pseudo drop
git add argos-sdk/localization/locales/argos/$locale/strings.l20n `
        products/argos-saleslogix/localization/locales/contour/$locale/strings.l20n `
        products/argos-saleslogix/localization/locales/crm/$locale/strings.l20n `
        products/argos-saleslogix/localization/locales/icboe/$locale/strings.l20n `
        products/argos-saleslogix/Gruntfile.js
git commit -m "Add <LOCALE> pseudo translation strings and limit lang-pack to <locale>"
git push github PseudoTranslations
```

Push to `github`, not `origin`. Jenkins watches GitHub only. Verify with C5.

## P5 — trigger the build and collect

Scan Repository Now (see C6). `PseudoTranslations` has no PR, so it is discovered.

Bundles:

```
\\usdavwtldata.testlogix.com\devbuilds\builds\mobile\bundles\PseudoTranslations\<BUILD_NUMBER>\*.zip
```

Pseudo bundles stay isolated from `develop` output because the path is keyed on the
branch name.

---

# Real drop

Real strings go to `develop` through a pull request. Reconstructed from the git history
of past drops, not from a live run, so items marked **(confirm)** need checking on the
next real drop and this section should then be tightened.

Past drops, for reference:

| Date | PR | Content |
|---|---|---|
| 2026-09-21 | #66 `MobileTranslationDrio` | zh-CN drop (strings and help), the l20n linter, encoding fixes |
| 2026-10-20 | #72 `translation-updates` | SDK strings: `argos-sdk/.../locales/argos/{de,es,fr,it,pt-BR}` |
| 2026-10-20 | #73 `translation-updates` | Product strings and help: `products/argos-saleslogix/.../{contour,crm,icboe}/{de,es,fr,it,pt-BR}` |

A drop can be split into more than one PR (SDK and product above). `argos-platform` is the only destination. The product
lives in `products/argos-saleslogix` here; do not open translation PRs against the
standalone `argos-saleslogix` repo.

## R1 — branch from `develop`

```powershell
cd c:\SourceCode\argos-platform
git fetch github
git switch -c translation-updates github/develop    # or a dated/named branch
```

Do **not** start from `PseudoTranslations`. It carries pseudo strings and a trimmed
`lang-pack`.

## R2 — run C1 to C3

Copy the drop, fix the encoding (and run the repo-wide UTF-8 check), check the quote
escaping. The C1 script already loops over every locale in the drop. A new locale folder
shows as new in `git status`, which is expected only when a locale is being added.

Locale folder names are not uniform: the strings folders use `es` and `pt-BR`, while
the help folders use `es-ES` and also contain `pt`. The drop uses `es-ES` for both.
C1 maps strings `es-ES` to `es`; help files keep `es-ES`.

## R3 — help files

The history shows real drops also update HTML help, which the pseudo process does not:

```
products\argos-saleslogix\help\locales\<group>\<locale>\help.html     groups: contour, crm, icboe
```

The 4.4.0 drop has them at `help\<group>\<locale>\help.html`, next to the strings groups,
and with the same `es-ES` locale name. Copy them to the paths above, **stripping the
UTF-8 BOM** (the drop has one, the repo does not):

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
foreach ($g in "contour","crm","icboe") {
  foreach ($d in Get-ChildItem "$src\help\$g" -Directory) {
    $dest = "$repo\products\argos-saleslogix\help\locales\$g\$($d.Name)\help.html"
    $text = [System.IO.File]::ReadAllText("$($d.FullName)\help.html")   # detects BOM
    [System.IO.File]::WriteAllText($dest, $text, $utf8NoBom)
  }
}
```

Check `git diff --cached --stat` shows a text diff, not a whole-file rewrite.
**(confirm)** that the help destination folder always exists. Existing folders include
both `es` and `es-ES`.

## R4 — the English source

Drops can also touch the English source strings
(`argos-sdk/localization/locales/argos/en/strings.l20n` changed in #66). If the drop
carries an `en` file, review that diff separately. It is a source change, not a
translation. **(confirm)**

## R5 — leave `Gruntfile.js` alone

Unlike the pseudo flow, do **not** trim `lang-pack`. On `develop` it lists every
shipped locale (de, en-GB, es, pt-BR, fr, it, ja, nl, ru, th, zh-CN, zh-TW), with
`bundleName` strings such as `Mobile 4.4.0 DE`. Only edit it to add or rename a
locale, or when the product version in `bundleName` changes.

## R6 — lint, commit, push, PR

Run C4 (ESLint and `lint:l20n`) first. Only ESLint runs in Jenkins; the l20n linter does
not, so this local run is the only l20n gate.

```powershell
git add argos-sdk/localization products/argos-saleslogix/localization products/argos-saleslogix/help
git status --short            # review: only expected locale files
git commit -m "Update Saleslogix translations"
git push github translation-updates
```

Push to `github`, not `origin`; check it with C5. Then open a pull request into
`develop` on `Saleslogix/argos-platform`. Splitting SDK and product changes into two
PRs, as in #72 and #73, is acceptable. **(confirm)** whether review is required before
merge.

## R7 — build and collect

The PR branch builds as `PR-nn` and, once merged, `develop` builds (see C6). Real
bundles are keyed on the branch name, so they appear under `develop` (or `PR-nn`)
instead of `PseudoTranslations`:

```
\\usdavwtldata.testlogix.com\devbuilds\builds\mobile\bundles\develop\<BUILD_NUMBER>\*.zip
```

**(confirm)** the exact folder name for a PR build and who consumes the final bundles.

## Still open

- Whether anything beyond the lint and l20n checks validates placeholders (such as
  `{0}`) in real strings.
- Who reviews and approves translation PRs.

Steps C1 to C6 apply unchanged unless this section says otherwise.
