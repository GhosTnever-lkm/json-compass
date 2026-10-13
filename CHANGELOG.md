# Changelog

## 1.0.2 — 2026-10-13

- Added a clear 200-level nesting limit for the main inspector and document comparison, preventing deeply nested JSON from failing later during recursive rendering or diffing.
- Updated the documented version and limits.

## 1.0.1 — 2026-10-11

- Extract JSON path formatting and document comparison into a testable core module.
- Add regression tests and CI; load the browser app as an ES module.
- Refresh version and download instructions.

## 1.0.0 — 2026-10-08

- First public release of JSON Compass.
- Added local JSON formatting, minification, file open and export.
- Added a collapsible document tree, path copying, overview metrics, and search.
- Added side-by-side document comparison with added, removed, and changed paths.
- Added responsive layout, theme toggle, privacy notes, and a 25 MB file limit.
