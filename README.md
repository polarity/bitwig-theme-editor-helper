# Bitwig Theme Editor Helper

Edit Bitwig theme colors in your browser. Supports `.bte` and `.json`, including nested JSON themes. Everything runs locally; no installation or uploads.

[Open the editor](https://polarity.github.io/bitwig-theme-editor-helper/main.html) or open [main.html](main.html) directly in your browser.

## How to use

1. **Start a theme:** the editor opens with the original Bitwig reference palette (248 colors). Click **New Theme** in the toolbar to start again. Or **load a theme:** click **Open theme**, drag a file into the window, or choose **Paste text**. Find themes in the [community collection](https://github.com/Berikai/awesome-bitwig-themes).
2. **Adjust all colors:** use Blend, Hue shift, Contrast, Brightness, Saturation and Remove red/green/blue. Enable the protection options to exclude grays or named colors. **Randomize colors** applies a random color variation directly to the palette, preserving alpha, protection options and individual corrections. Each click is one Undo step. Global sliders return to neutral and remain available to adjust the randomized palette. Reset global adjustments keeps the randomized colors; Reset all edits restores the original palette.
3. **Preview and fine-tune:** the Bitwig preview above the palette updates as you edit. Click a preview area or choose a **Preview color** to select its imported color, then edit its color, hex value or alpha in **Selected color**. You can also select from the palette. Individual corrections stay fixed when global sliders change.
4. **Compare:** toggle **Show original**. Use Undo/Redo or the reset buttons to revise changes.
5. **Save:** click **Export**, then **Download** or **Copy text**. Apply the result using the external [Bitwig Theme Editor](https://github.com/Berikai/bitwig-theme-editor).

## Good to know

- The preview is an approximation adapted from [Berikai’s Bitwig Theme Editor WebUI](https://github.com/Berikai/bitwig-theme-editor-webui). It shows 27 mapped theme colors, with some fixed reference details and an abbreviated device area. It is not connected to a running Bitwig instance.
- Missing preview colors use reference values from the source project; they are never added to your export. Unmapped imported colors can still be edited in the palette. Ambiguous sources open a chooser showing each imported path (or BTE line).
- Collapse **Bitwig preview** to make room for the palette. **Fit to width** shows the whole preview; **Original size** lets you scroll for a closer look. The preview color selector also reaches small borders and icons. Keyboard users can focus preview areas and press Enter or Space.
- Search and group filters only affect the view; global sliders still affect all imported colors.
- New themes include every window and arranger color from the original reference palette. Imported files retain their own entries; missing colors are not added.
- Export keeps the original format and preserves BTE comments and other data.
- Export before loading another theme. Exported files contain final colors, not slider settings or edit history.

## Development checks

No build step is required. Run the pure model tests with `node --test tests/*.test.cjs`.

With Playwright and its Chromium browser installed, run `node tests/browser.cjs` and `node tests/preview.browser.cjs`. Both suites open `main.html` via `file://` and check that the editor makes no external requests. Optionally set `THEME_SCREENSHOT_DIR` to save desktop and mobile screenshots.

Preview source attribution, revision and port details are in [vendor/bitwig-preview/NOTICE.md](vendor/bitwig-preview/NOTICE.md), with the upstream [MIT license](vendor/bitwig-preview/LICENSE).
