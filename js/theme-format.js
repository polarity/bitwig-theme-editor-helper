(function (root) {
  'use strict';
  const COLOR_START = /^(?:#|0x)/i;
  const BARE_COLOR = /^(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
  function parseColor(value) {
    if (typeof value !== 'string') throw new Error('Expected a hex color.');
    let hex = value.trim().replace(/^(?:#|0x)/i, '');
    if (!BARE_COLOR.test(hex)) throw new Error('Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA.');
    const hasAlpha = hex.length === 4 || hex.length === 8;
    if (hex.length < 5) hex = [...hex].map(c => c + c).join('');
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hasAlpha ? parseInt(hex.slice(6, 8), 16) : 255, hasAlpha };
  }
  function toHex(color, alpha = color.hasAlpha || color.a !== 255) {
    const byte = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
    return '#' + [color.r, color.g, color.b, ...(alpha ? [color.a] : [])].map(byte).join('').toUpperCase();
  }
  const pathLabel = path => '$' + path.map(key => '[' + JSON.stringify(key) + ']').join('');
  function checkedColor(value, where) {
    try { return parseColor(value); } catch (error) { throw new Error(`${where}: invalid color ${JSON.stringify(value)}. ${error.message}`); }
  }
  function parseTheme(source, name = '') {
    if (typeof source !== 'string' || !source.trim()) throw new Error('The theme is empty.');
    const content = source.replace(/^\uFEFF/, '');
    const document = { name, source, entries: [], settings: [], format: /^\s*[\[{]/.test(content) ? 'json' : 'bte' };
    if (document.format === 'json') {
      try { document.data = JSON.parse(content); } catch (error) { throw new Error(`Invalid JSON: ${error.message}`); }
      if (!document.data || Array.isArray(document.data) || typeof document.data !== 'object') throw new Error('JSON theme must be an object.');
      function visit(object, path) {
        for (const [key, value] of Object.entries(object)) {
          const next = [...path, Array.isArray(object) ? Number(key) : key];
          if (typeof value === 'string' && COLOR_START.test(value.trim())) {
            document.entries.push({ id: JSON.stringify(next), name: key, path: next, location: pathLabel(next), original: value, color: checkedColor(value, pathLabel(next)) });
          } else if (key === 'Gradient' && typeof value === 'boolean') {
            document.settings.push({ id: JSON.stringify(next), path: next, value, name: 'Gradient', location: pathLabel(next) });
          } else if (value && typeof value === 'object') visit(value, next);
        }
      }
      visit(document.data, []);
    } else {
      document.lines = source.split(/(\r\n|\n|\r)/);
      for (let index = 0; index < document.lines.length; index += 2) {
        const line = document.lines[index];
        if (/^\s*(?:\/\/|$)/.test(line)) continue;
        const match = /^(\s*([^:]+?):\s*)([^\r\n]*?)(\s*(?:\/\/.*)?)$/.exec(line);
        if (!match) {
          if (/^\s*[^/].*:\s*(?:#|0x)/i.test(line)) throw new Error(`Line ${index / 2 + 1}: invalid color declaration.`);
          continue;
        }
        const [, prefix, rawKey, value, suffix] = match;
        const key = rawKey.trim(), location = `Line ${index / 2 + 1}`;
        if (key === 'Gradient') {
          if (!/^(?:true|false)$/.test(value)) throw new Error(`${location}: Gradient must be true or false.`);
          document.settings.push({ id: `line:${index}`, index, prefix, suffix, name: key, location, value: value === 'true' });
        } else if (COLOR_START.test(value) || BARE_COLOR.test(value)) {
          document.entries.push({ id: `line:${index}`, index, prefix, suffix, name: key, path: [key], location, original: value, color: checkedColor(value, `${location} (${key})`) });
        }
      }
    }
    if (document.format === 'bte' && !document.entries.length && !document.settings.length) throw new Error('No BTE colors or Gradient setting found.');
    return document;
  }
  function serializeTheme(document, colors, settings = {}, targetFormat = document.format) {
    if (!['json', 'bte'].includes(targetFormat)) throw new Error('Unsupported export format.');
    if (targetFormat !== document.format) {
      if (targetFormat !== 'bte') throw new Error('Export imported BTE themes in their original format.');
      const values = new Map();
      const add = (entry, value) => {
        if (!entry.name.trim() || /[:\r\n]|\/\//.test(entry.name) || entry.name !== entry.name.trim() || (entry.name === 'Gradient' && typeof value !== 'boolean')) {
          throw new Error(`${entry.location}: this name cannot be represented in BTE.`);
        }
        if (values.has(entry.name) && values.get(entry.name) !== value) {
          throw new Error(`BTE cannot store different values for duplicate name "${entry.name}". Use JSON or make their values identical.`);
        }
        values.set(entry.name, value);
      };
      for (const setting of document.settings) add(setting, Object.hasOwn(settings, setting.id) ? settings[setting.id] : setting.value);
      for (const entry of document.entries) add(entry, colors[entry.id] ?? toHex(entry.color));
      if (!values.size) throw new Error('No colors or Gradient setting available for BTE export.');
      return [...values].map(([name, value]) => `${name}: ${value}`).join('\n') + '\n';
    }
    if (document.format === 'json') {
      const data = JSON.parse(JSON.stringify(document.data));
      const assign = (path, value) => { let parent = data; for (const part of path.slice(0, -1)) parent = parent[part]; parent[path[path.length - 1]] = value; };
      for (const entry of document.entries) {
        const hex = colors[entry.id];
        if (hex !== undefined && hex !== toHex(entry.color)) assign(entry.path, hex);
      }
      for (const setting of document.settings) if (Object.hasOwn(settings, setting.id)) assign(setting.path, settings[setting.id]);
      return JSON.stringify(data, null, 2) + '\n';
    }
    const lines = document.lines.slice();
    for (const entry of document.entries) {
      const hex = colors[entry.id];
      if (hex !== undefined && hex !== toHex(entry.color)) lines[entry.index] = entry.prefix + hex + entry.suffix;
    }
    for (const setting of document.settings) if (Object.hasOwn(settings, setting.id) && settings[setting.id] !== setting.value) lines[setting.index] = setting.prefix + settings[setting.id] + setting.suffix;
    return lines.join('');
  }
  const api = { parseColor, toHex, parseTheme, serializeTheme };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ThemeFormat = api;
})(globalThis);
