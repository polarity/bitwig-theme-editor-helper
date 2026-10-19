# Bitwig Theme Editor Helper

Edit Bitwig theme colors in your browser. Supports Bitwig Studio 5.x and 6.x, and `.bte` and `.json` themes, including nested JSON. Everything runs locally; no installation or uploads.

[Open the editor](https://polarity.github.io/bitwig-theme-editor-helper/main.html) or open [main.html](main.html) directly in your browser.

## How to use

1. **Choose your Bitwig version:** pick **Bitwig 6.x** or **Bitwig 5.x** in the toolbar. The choice sets the preview's reference colors and what **New Theme** creates: a flat `.bte` list for 6.x, or a `.json` theme with window and arranger sections for 5.x. Imported themes are never rewritten by this setting.
2. **Start a theme:** the editor opens with the reference palette of the selected version. Click **New Theme** in the toolbar to start again. Or **load a theme:** click **Open theme**, drag a file into the window, or choose **Paste text**. Find themes in the [community collection](https://github.com/Berikai/awesome-bitwig-themes).
3. **Adjust all colors:** use Blend, Hue shift, Contrast, Brightness, Saturation and Remove red/green/blue. Enable the protection options to exclude grays or named colors. **Randomize colors** assigns an independent random RGB color to each unprotected element, preserving alpha, protection options and individual corrections. Each click is one Undo step. Global sliders return to neutral and remain available to adjust the randomized palette. Reset global adjustments keeps the randomized colors; Reset all edits restores the original palette.
4. **Preview and fine-tune:** the Bitwig preview above the palette updates as you edit. Click a preview area or choose a **Preview color** to select its imported color, then edit its color, hex value or alpha in **Selected color**. You can also select from the palette. Individual corrections stay fixed when global sliders change.
5. **Compare:** toggle **Show original**. Use Undo/Redo or the reset buttons to revise changes.
6. **Save:** click **Export**, choose the original format or **BTE (.bte)** for JSON themes, then **Download** or **Copy text**. Apply the result using the external [Bitwig Theme Editor](https://github.com/Berikai/bitwig-theme-editor).

## Good to know

- The preview is an approximation adapted from [Berikai’s Bitwig Theme Editor WebUI](https://github.com/Berikai/bitwig-theme-editor-webui). The layout dates from the 5.x era, while its 27 colors follow the version you select. Some fixed reference details and an abbreviated device area remain. It is not connected to a running Bitwig instance.
- **Bitwig 5.x** references are the window and arranger colors from that WebUI (248 colors). **Bitwig 6.x** references are read from Bitwig Studio 6.1.4: the 270 colors its default theme defines plus the semantic colors the theme leaves to hardcoded defaults (activation, track, brand, device and tree colors), 355 in total. Bitwig 6 no longer has a *Hitech background* color, so that preview area uses **Nested Device Hole** instead; every other preview area keeps its original color name.
- The selected version also drives the status line: imported colors that version does not know are counted there. They stay editable and are exported unchanged, because Bitwig ignores names it does not use.
- Missing preview colors use reference values from the selected version; they are never added to your export. Unmapped imported colors can still be edited in the palette. Ambiguous sources open a chooser showing each imported path (or BTE line).
- Collapse **Bitwig preview** to make room for the palette. **Fit to width** shows the whole preview; **Original size** lets you scroll for a closer look. The preview color selector also reaches small borders and icons. Keyboard users can focus preview areas and press Enter or Space.
- Search and group filters only affect the view; global sliders still affect all imported colors.
- New themes include every color of the selected version's reference palette. Imported files retain their own entries; missing colors are not added.
- Export defaults to the original format and preserves BTE comments and other data. JSON themes can also be exported as BTE: color names are flattened, alpha and Gradient are retained, and other JSON metadata is omitted. Conflicting duplicate names or names that BTE cannot represent block conversion with an explanation; use JSON to preserve these structures.
- Export before loading another theme. Exported files contain final colors, not slider settings or edit history.

## Development checks

No build step is required. Run the pure model tests with `node --test tests/*.test.cjs`.

With Playwright and its Chromium browser installed, run `node tests/browser.cjs` and `node tests/preview.browser.cjs`. Both suites open `main.html` via `file://` and check that the editor makes no external requests. Set `THEME_CHROMIUM` to an installed Chrome or Chromium path to reuse it instead of Playwright's bundled browser, and optionally set `THEME_SCREENSHOT_DIR` to save desktop and mobile screenshots.

The Bitwig 6.x reference palette in [js/starter-theme-6.js](js/starter-theme-6.js) is generated. With Bitwig Studio 6.x installed and a JDK 17+ for `javap`, `node tools/bitwig-6-palette.mjs` regenerates it and `node tools/bitwig-6-palette.mjs --check` verifies the committed values.

Preview source attribution, revision and port details are in [vendor/bitwig-preview/NOTICE.md](vendor/bitwig-preview/NOTICE.md), with the upstream [MIT license](vendor/bitwig-preview/LICENSE).
