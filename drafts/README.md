# Drafts

This directory is for debate pages that are prepared but not yet published to GitHub Pages.

Draft debate folders should use the same structure as `debates/<slug>/`, then be referenced from `site-data/debates.json` with:

```json
{
  "slug": "future-topic",
  "sourceDir": "drafts/debates/future-topic",
  "status": "scheduled",
  "publishAt": "2026-05-22T17:00:00+08:00"
}
```

The GitHub Pages build only copies debates whose `status` is `published`, or whose `status` is `scheduled` and `publishAt` is already due.

Important: if this repository is public, draft files committed here may still be visible on GitHub. They will not be included in the published GitHub Pages artifact before their release time, but repository viewers may still inspect source files. For truly private drafts, keep them in a private repository or another private source until release.
