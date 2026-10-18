(function (root) {
  'use strict';
  const format = typeof module === 'object' && module.exports ? require('./theme-format.js') : root.ThemeFormat;
  const namedColors = ['Emboss', 'Shadow', 'Red', 'Orange', 'Grey', 'Green', 'Blue', 'Yellow', 'Purple', 'Pink', 'Brown', 'Black', 'White'];
  const defaults = () => ({ target: '#FFFFFF', blend: 0, hue: 0, contrast: 0, brightness: 0, saturation: 0, red: 0, green: 0, blue: 0, excludeGrays: false, excludeNames: false });
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
    if (!d) return { h: 0, s: 0, l };
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: h * 60, s: d / (1 - Math.abs(2 * l - 1)), l };
  }
  function hslToRgb({ h, s, l }) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const sectors = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
    const [r, g, b] = sectors[Math.floor(h / 60)].map(v => (v + m) * 255);
    return { r, g, b };
  }
  function transform(entry, settings) {
    const base = entry.color;
    if ((settings.excludeGrays && base.r === base.g && base.g === base.b) || (settings.excludeNames && namedColors.some(name => entry.name.toLowerCase().includes(name.toLowerCase())))) return format.toHex(base);
    const color = { ...base };
    if (settings.blend) {
      const target = format.parseColor(settings.target), weight = settings.blend / 100;
      for (const channel of ['r', 'g', 'b']) color[channel] += (target[channel] - color[channel]) * weight;
    }
    if (settings.hue) { const hsl = rgbToHsl(color); hsl.h += settings.hue; Object.assign(color, hslToRgb(hsl)); }
    if (settings.contrast) {
      const factor = 2 ** (settings.contrast / 50);
      for (const channel of ['r', 'g', 'b']) color[channel] = clamp((color[channel] - 127.5) * factor + 127.5, 0, 255);
    }
    if (settings.brightness) { const hsl = rgbToHsl(color); hsl.l = clamp(hsl.l + settings.brightness / 100); Object.assign(color, hslToRgb(hsl)); }
    if (settings.saturation) {
      const hsl = rgbToHsl(color), amount = settings.saturation / 100;
      hsl.s = clamp(amount < 0 ? hsl.s * (1 + amount) : hsl.s + (1 - hsl.s) * amount);
      Object.assign(color, hslToRgb(hsl));
    }
    color.r *= 1 - settings.red / 100; color.g *= 1 - settings.green / 100; color.b *= 1 - settings.blue / 100;
    return format.toHex(color);
  }
  const api = { defaults, transform, rgbToHsl, hslToRgb };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ThemeColors = api;
})(globalThis);
