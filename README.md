# Homebrew Package Lookup

Look up current version, dependencies, deprecation/disable status, and
30/90/365-day install counts for any Homebrew formula (CLI package) or
cask (macOS app), straight from the official `formulae.brew.sh` API.

Built for DevOps and tooling teams tracking package health and
adoption — e.g. spotting a deprecated dependency before it's
disabled, or gauging real install volume for a tool before adopting
it.

## Input

```json
{
  "packages": ["wget", "curl"],
  "packageType": "formula"
}
```

| Field | Type | Description |
|---|---|---|
| `packages` | array of strings (required) | One or more Homebrew tokens to look up, e.g. `"wget"` or `"visual-studio-code"`. Use the exact lowercase, hyphenated token — not the display name. |
| `packageType` | string | `"formula"` (CLI package) or `"cask"` (macOS GUI app). All packages in one run must be the same type. Default `"formula"`. |

## Output

One record per requested package:

```json
{
  "name": "wget",
  "packageType": "formula",
  "found": true,
  "displayName": "wget",
  "version": "1.25.0",
  "description": "Internet file retriever",
  "homepage": "https://www.gnu.org/software/wget/",
  "license": "GPL-3.0-or-later",
  "tap": "homebrew/core",
  "dependencies": ["libidn2", "libpsl", "openssl@3", "gettext", "libunistring"],
  "deprecated": false,
  "deprecationReason": null,
  "disabled": false,
  "disableReason": null,
  "installs30d": 16727,
  "installs90d": 56777,
  "installs365d": 330125
}
```

An unknown package name returns `{ "found": false }` for that entry
rather than failing the whole run or being silently skipped — useful
when checking a longer list where one name might be a typo or a
renamed/removed formula.

## How it works

Direct calls to the official [formulae.brew.sh
API](https://formulae.brew.sh/api/) (the same data source that
powers Homebrew's own package pages) — no proxy, no key, no scraping.

## Pricing note

Billed per **lookup** (one run), not per package returned — one
charge whether you request 1 package or 20.

## Related products

- [npm Package Tracker](https://github.com/timmKal01/npm-package-tracker) — release/deprecation events for npm packages
- [Docker Hub Image Tracker](https://github.com/timmKal01/docker-hub-image-tracker) — new/updated tags for container images
