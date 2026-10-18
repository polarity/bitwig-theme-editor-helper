# Bitwig Theme Editor Helper

A local, browser-based color workspace for Bitwig Studio themes. Open [main.html](main.html) directly in a modern browser, or use the [hosted editor](https://polarity.github.io/bitwig-theme-editor-helper/main.html). No server, build step, framework or runtime dependency is required.

## Documentation index

| Task | Reference |
| --- | --- |
| Import, edit and export a theme | [Workflow](#workflow) |
| Understand supported files and preservation | [File formats](#file-formats) |
| Understand color operations and overrides | [Color editing](#color-editing) |
| Run checks or change the implementation | [Development and validation](#development-and-validation) |
| Apply an exported theme in Bitwig | [External Bitwig Theme Editor](https://github.com/Berikai/bitwig-theme-editor) |
| Find themes | [Community collection](https://github.com/Berikai/awesome-bitwig-themes) |

## Workflow

1. Open a `.bte` or `.json` file, drop it into the window, or choose **Paste text**. The file contents determine the format, regardless of its extension. An example palette is available in the empty workspace.
2. Adjust the global sliders. Every imported color is included unless an exclusion applies. Search, group filtering and **Modified only** only change what is displayed.
3. Select a color to compare its original and result. Edit its RGB color, hex value or alpha to create an individual correction. **Reset individual correction** returns that entry to the global result.
4. Toggle **Show original** to inspect the original palette without changing edits or exported results. Individual editing is disabled during this comparison.
5. Choose **Export**, then download the file or copy the generated text. The original format is retained. If clipboard access is unavailable, the text is selected for manual copying.
6. Use the external [Bitwig Theme Editor](https://github.com/Berikai/bitwig-theme-editor) and its documented workflow to apply the exported theme. This helper does not patch JARs, change an installation or communicate with running Bitwig.

Loading another theme starts a new workspace and clears its edit history. A failed import keeps the current workspace intact. Exported theme files contain the resulting colors, not editable slider settings or history. Reimport an export to use those colors as a new baseline.

File processing takes place entirely in the browser. There are no uploads, analytics, remote fonts or automatic network requests. Community and patcher links open external websites when clicked.

## File formats

**BTE** supports `Key: value` declarations, full-line and inline `//` comments, blank lines, and boolean `Gradient` settings. Colors may use `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, `0x` prefixes or bare hexadecimal values. Alpha is the final component, as in CSS RGBA. Unknown declarations and syntax are retained. Export changes only edited color/setting values, preserving comments, order, spacing, BOM and line endings. Duplicate names remain separate entries identified by source line.

**JSON** supports flat color objects and nested objects such as `window` and `arranger`, including colors inside arrays. Color values beginning with `#` or `0x` are recognized and validated; other values remain untouched. Full paths identify colors, so identical names in different sections stay separate. Boolean `Gradient` properties are exposed as settings. Export preserves the data structure and metadata and formats JSON with two-space indentation; unchanged color strings retain their original representation.

Invalid color values report their BTE line or JSON path. JSON syntax errors use the browser's parser diagnostic. Neither format is converted to the other, and old Bitwig color keys are not renamed automatically.

Only entries present in the imported file are edited. A partial BTE containing overrides does not include the rest of Bitwig's default palette. Import a complete palette if you want global adjustments to affect every color. Settings-only BTE and color-free JSON documents can also be exported.

## Color editing

Global operations always start from the imported colors, in this order:

| Operation | Behavior |
| --- | --- |
| Blend | Mix RGB toward the selected target, 0–100% |
| Hue shift | Rotate HSL hue, −180° to +180° |
| Contrast | Expand/compress RGB around 127.5 with factor `2^(value/50)`, −100 to +100 |
| Brightness | Add to HSL lightness, −100 to +100 percentage points |
| Saturation | Move HSL saturation proportionally toward zero or full saturation, −100 to +100% |
| Remove red / green / blue | Reduce each RGB channel by 0–100% |

Global operations preserve alpha. Values are bounded to valid color ranges and RGB channels are rounded when producing the final hex color. Zero adjustments preserve the original colors exactly.

**Protect exact grays** excludes original colors whose R, G and B channels are equal. **Protect named colors** uses the original helper's case-insensitive substring list: Emboss, Shadow, Red, Orange, Grey, Green, Blue, Yellow, Purple, Pink, Brown, Black and White. Both exclusions are off by default.

Individual corrections override the global result. Further global changes do not change those corrections. The alpha control uses byte values from 0 (transparent) to 255 (opaque). A hex edit replaces the entire color, including alpha; RGB-only input means opaque.

Each slider has a reset. **Reset** in Global adjustments clears global settings but retains individual corrections and theme settings. **Reset all edits** restores the imported baseline. Undo/Redo retains up to 50 steps, with one continuous slider movement counting as one step. Use Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y to redo. Text inputs retain their native editing shortcuts.

## Development and validation

The editor uses classic scripts so it works directly over `file://`:

- `js/theme-format.js`: format parsing, color decoding and structure-preserving export.
- `js/colors.js`: pure color operations and defaults.
- `js/theme-model.js`: global settings, individual corrections and history.
- `js/app.js`: DOM interactions; palette nodes are built once per import and updated in place.
- `styles.css`: responsive layout and theme-independent workspace styling.

The pure modules also expose CommonJS exports for dependency-free Node.js tests:

```sh
node --test tests/core.test.cjs
```

An optional browser integration suite requires Playwright with Chromium. With Playwright available in Node's module search path, run:

```sh
node tests/browser.cjs
```

If needed, install the test-only tools locally with `npm install --no-save --package-lock=false playwright` and `npx playwright install chromium`. They are not used by the application. Set `THEME_SCREENSHOT_DIR` to an output directory to capture desktop and narrow-layout screenshots.

The browser suite opens `main.html` directly without a server. It checks import/paste/drop, malformed-import recovery, BTE CRLF downloads, JSON downloads and reimport, color editing, history, comparison, settings, filters, keyboard interaction, retained palette nodes, horizontal overflow at desktop/mobile sizes, and absence of external requests or page errors. Applying an export in live Bitwig is a separate integration step and is not covered by these checks.
