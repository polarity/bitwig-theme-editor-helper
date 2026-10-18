# Bitwig Theme Editor Helper

Edit Bitwig theme colors in your browser. Supports `.bte` and `.json`, including nested JSON themes. Everything runs locally; no installation or uploads.

[Open the editor](https://polarity.github.io/bitwig-theme-editor-helper/main.html) or open [main.html](main.html) directly in your browser.

## How to use

1. **Load a theme:** click **Open theme**, drag a file into the window, or choose **Paste text**. Find themes in the [community collection](https://github.com/Berikai/awesome-bitwig-themes).
2. **Adjust all colors:** use Blend, Hue shift, Contrast, Brightness, Saturation and Remove red/green/blue. Enable the protection options to exclude grays or named colors.
3. **Fine-tune a color:** select it in the palette, then edit its color, hex value or alpha. Individual corrections stay fixed when global sliders change.
4. **Compare:** toggle **Show original**. Use Undo/Redo or the reset buttons to revise changes.
5. **Save:** click **Export**, then **Download** or **Copy text**. Apply the result using the external [Bitwig Theme Editor](https://github.com/Berikai/bitwig-theme-editor).

## Good to know

- Search and group filters only affect the view; global sliders still affect all imported colors.
- Only colors present in the file are edited. Import a complete palette to adjust every color.
- Export keeps the original format and preserves BTE comments and other data.
- Export before loading another theme. Exported files contain final colors, not slider settings or edit history.
