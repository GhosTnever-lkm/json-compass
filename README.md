<div align="center">

# JSON Compass

**A private, local-first workbench for exploring JSON.**

Format, minify, search, inspect structure, compare documents, and export a clean file — right in your browser.

[Open the app](https://ghostnever-lkm.github.io/json-compass/) · [Releases](https://github.com/GhosTnever-lkm/json-compass/releases) · [Report an issue](https://github.com/GhosTnever-lkm/json-compass/issues)

</div>

---

## Why JSON Compass?

Small JSON tools often send pasted data to a server, hide useful structure, or make comparisons hard to read. JSON Compass keeps the entire workflow on your device and gives you a clear view of the document shape and exact paths.

## Features

- **Format and minify** valid JSON, with a live syntax and error state.
- **Explore the structure** as a collapsible tree; copy paths such as `$.users[0].email`.
- **Find keys and values** and see the paths where they occur.
- **Compare two documents** to see added, removed, and changed values by path.
- **Open, drag in, and export** `.json` files without uploading them.
- **Switch themes** and use the responsive layout on a phone or desktop.
- **No dependencies, backend, account, or telemetry.**

## Use it

### Online

Open [JSON Compass](https://ghostnever-lkm.github.io/json-compass/). Paste JSON into **Input**. The formatted result, overview, search, and structure update as you type. Select **Compare** to diff two JSON documents.

### Run from a download

1. Download `JSON-Compass-v1.0.1.zip` from the [latest release](https://github.com/GhosTnever-lkm/json-compass/releases/latest).
2. Extract the archive.
3. Open `index.html` in a modern browser.

The app is static and needs no build step or local server. Google Fonts are an optional visual enhancement; the app works with system fonts if they are unavailable.

### Host your own copy

Fork or download this repository and publish its root folder with GitHub Pages or any static web host. There is no package installation.

## Privacy

JSON Compass processes pasted text and selected files in the current browser tab. It does not make application requests to send document content elsewhere. The interface imports optional fonts from Google Fonts; no JSON is included in that request. For a fully offline session, download the source first and disconnect from the network.

The default browser theme preference is stored in local storage. Your JSON contents are not stored by the app.

## Keyboard and accessibility

- Standard text editing and browser keyboard navigation work throughout.
- Press **Enter** in the search field to run a search.
- The tree can be browsed with keyboard focus; use each disclosure button to expand or collapse a node.
- All key controls have visible focus styles and accessible names.

## Development checks

Requires Node.js 20 or newer:

```sh
npm test
npm run check
```

## Limits

- JSON must be valid according to the browser's `JSON.parse`; comments and trailing commas are not accepted.
- File input is capped at 25 MB to keep the browser responsive.
- The compare view shows up to 1,000 individual changes.
- This is a JSON inspector, not a JSON Schema validator.

## Project details

- Version: **1.0.1**
- License: [MIT](LICENSE)
- Author: [GhosTnever-lkm](https://github.com/GhosTnever-lkm)

## Support / Pro Version

The core application is free and open source. If it saves you time, support future development through [Buy Me a Coffee](https://buymeacoffee.com/azizazimov8) or [Boosty](https://boosty.to/azizazimov). There is no paid Pro version for this project at this time.

---

<div align="center"><sub>Built for careful work with JSON. Your data stays yours.</sub></div>
