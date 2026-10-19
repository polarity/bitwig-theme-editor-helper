/* Pure preview lookup. Reference colors never enter the editable document. */
(function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const bindings = node ? require('../vendor/bitwig-preview/colors.js') : root.BitwigPreviewColors;
  const format = node ? require('./theme-format.js') : root.ThemeFormat;
  function candidates(document, binding) {
    const named = (document?.entries || []).filter(entry => entry.name === binding.name);
    const exact = named.filter(entry => entry.path.length === 2 && entry.path[0] === binding.group);
    if (exact.length) return exact;
    const nested = named.filter(entry => entry.path.length > 2 && entry.path.at(-2) === binding.group);
    return nested.length ? nested : named.filter(entry => entry.path.length === 1);
  }
  function snapshot(model, original = false, choices = {}) {
    return bindings.map(binding => {
      const matches = candidates(model?.document, binding);
      const entry = matches.length === 1 ? matches[0] : matches.find(entry => entry.id === choices[binding.variable]);
      return { ...binding, matches, entry, value: entry ? (original ? format.toHex(entry.color) : model.result(entry)) : binding.default,
        status: entry ? 'imported' : matches.length ? 'ambiguous' : 'missing' };
    });
  }
  // Preserve source alpha in the two derived shades used by the reference UI.
  function shades(button, grid) {
    const color = format.parseColor(grid);
    return { button: format.toHex(format.parseColor(button)), grid: format.toHex({ ...color, a: Math.floor(color.a / 3) }, true) };
  }
  const api = { bindings, candidates, snapshot, shades };
  if (node) module.exports = api;
  else root.ThemePreviewModel = api;
})(globalThis);
