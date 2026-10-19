# Bitwig reference preview

Adapted from [Berikai/bitwig-theme-editor-webui](https://github.com/Berikai/bitwig-theme-editor-webui), copyright (c) 2024 Berkay Eren Konuk, under the MIT license included in `LICENSE`.

Source revision: `d2bbeedd7a82e72a1e2216e898e93955b8dbebb9`.

Sources: `src/lib/BitwigUI/**/*.svelte` (all 26 components), and the 27 referenced colors in `src/lib/Scripts/Theme.js`.

`markup.js` contains static HTML and SVG rendered from those components with Svelte 4's server renderer during the port. Theme expressions were replaced with the CSS variables declared in `colors.js`; component-scoped styles are preserved in `preview.css`. The development scaling wrapper, screenshot reference, stores, event bindings and Svelte runtime are omitted. There is no build or Svelte dependency in this application. These files can be edited directly.

The local adapter in `js/preview.js` supplies responsive sizing, accessible selection, source disambiguation and highlighting. `js/preview-model.js` resolves imported colors without adding reference colors to the theme, and supplies the per-version reference values. Derived button shading retains the imported alpha rather than forcing the source UI's opaque gradient.

This is an approximation of the source project's Bitwig UI. Its markup and layout come from the 5.x-era revision above; only the color values follow the selected Bitwig version. Fixed icon/track colors and the abbreviated device area are retained; it is not connected to Bitwig Studio.

## Version reference colors

`colors.js` holds the 27 preview bindings from that revision: the slot names, groups and their Bitwig 5.x reference values. `js/preview-model.js` keeps those slots fixed and swaps in the reference values of the selected version.

- **Bitwig 5.x** values are the window and arranger palette of the same upstream revision, embedded in `js/starter-theme.js` (248 colors). They are reproduced from that project's data, not from a Bitwig installation.
- **Bitwig 6.x** values are read from an installed Bitwig Studio 6.1.4 and embedded in `js/starter-theme-6.js` (355 colors):
  - `resources/themes/default.theme` — the 270 named color styles of the shipped theme. Twenty of them are stored relative to another color; they are resolved to absolute values, the ten without a reference color against `Window background`.
  - `bin/bitwig.jar!eff.class` — the hardcoded default color table for the semantic colors the theme does not define (activation, track, brand, device and tree colors). Theme values win wherever both define the same name.
  - Bitwig 6 dropped the *Hitech background* color, so the preview maps that slot to `Nested Device Hole`.

`tools/bitwig-6-palette.mjs` regenerates the 6.x file from an installation (`--check` verifies the committed values). It reads the theme file directly and disassembles `eff.class` with `javap`; the class targets a newer Java than most JDKs accept, so the tool lowers the class file major version in a temporary copy purely so `javap` will disassemble it. Nothing from the application is redistributed here beyond the color names and values themselves.

The window and arranger defaults from the same WebUI revision are embedded in `js/starter-theme.js` to provide the complete 5.x starter palette offline.
