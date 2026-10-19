# Bitwig reference preview

Adapted from [Berikai/bitwig-theme-editor-webui](https://github.com/Berikai/bitwig-theme-editor-webui), copyright (c) 2024 Berkay Eren Konuk, under the MIT license included in `LICENSE`.

Source revision: `d2bbeedd7a82e72a1e2216e898e93955b8dbebb9`.

Sources: `src/lib/BitwigUI/**/*.svelte` (all 26 components), and the 27 referenced colors in `src/lib/Scripts/Theme.js`.

`markup.js` contains static HTML and SVG rendered from those components with Svelte 4's server renderer during the port. Theme expressions were replaced with the CSS variables declared in `colors.js`; component-scoped styles are preserved in `preview.css`. The development scaling wrapper, screenshot reference, stores, event bindings and Svelte runtime are omitted. There is no build or Svelte dependency in this application. These files can be edited directly.

The local adapter in `js/preview.js` supplies responsive sizing, accessible selection, source disambiguation and highlighting. `js/preview-model.js` resolves imported colors without adding reference colors to the theme. Derived button shading retains the imported alpha rather than forcing the source UI's opaque gradient.

This is an approximation of the source project's Bitwig UI. Fixed icon/track colors and the abbreviated device area are retained; it is not connected to Bitwig Studio. Reference colors come from this revision, and do not claim to match the defaults of every Bitwig version.
