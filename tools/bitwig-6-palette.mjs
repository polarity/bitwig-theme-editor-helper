#!/usr/bin/env node
/* Regenerate js/starter-theme-6.js from a Bitwig Studio 6.x installation.
 *
 *   node tools/bitwig-6-palette.mjs [--bitwig <install dir>] [--javap <path>] [--check]
 *
 * Sources inside the installation:
 *   resources/themes/default.theme  colour styles of the shipped theme
 *   bin/bitwig.jar                  eff.class, the hardcoded default colour table
 *
 * The theme defines most colour styles absolutely and twenty relatively; relative
 * ones are resolved here (the ten surface-based ones against "Window background").
 * Bitwig keeps the remaining semantic colours - activation, track, brand, device
 * and tree colours - in eff.class, so both sources are merged, theme values first.
 *
 * Reading eff.class needs javap. The class targets a newer Java than most JDKs
 * accept, so its major version is lowered in a temporary copy; javap only
 * disassembles and never verifies the bytecode. Pass --javap if it is not found.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OPTIONS = parseArguments(process.argv.slice(2));
const INSTALL = OPTIONS.bitwig || findInstall();
const JAVAP = OPTIONS.javap || findJavap();

if (!INSTALL) fail('Could not find Bitwig Studio. Pass --bitwig "C:\\Program Files\\Bitwig Studio" (or the equivalent path).');
if (!existsSync(join(INSTALL, 'resources', 'themes', 'default.theme'))) fail(`No resources/themes/default.theme in ${INSTALL}.`);
if (!JAVAP) fail('Could not find javap. Install a JDK 17+ or pass --javap <path to javap>.');

const theme = parseTheme(readThemeText(join(INSTALL, 'resources', 'themes', 'default.theme')));
const defaults = parseDefaultTable(readZipEntry(join(INSTALL, 'bin', 'bitwig.jar'), 'eff.class'));
const palette = merge(theme, defaults);
const target = join(ROOT, 'js', 'starter-theme-6.js');

if (OPTIONS.check) {
  if (readFileSync(target, 'utf8') !== render(palette)) fail('js/starter-theme-6.js is out of date. Re-run without --check.');
  console.log(`js/starter-theme-6.js is up to date (${Object.keys(palette).length} colours).`);
} else {
  writeFileSync(target, render(palette));
  console.log(`Updated js/starter-theme-6.js from ${INSTALL} (${Object.keys(palette).length} colours).`);
}

function fail(message) { console.error(`error: ${message}`); process.exit(1); }

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--check') options.check = true;
    else if (argument === '--bitwig') options.bitwig = args[++index];
    else if (argument === '--javap') options.javap = args[++index];
    else fail(`Unknown argument ${argument}.`);
  }
  return options;
}

function findInstall() {
  return [process.env.BITWIG_HOME, 'C:\\Program Files\\Bitwig Studio', 'C:\\Program Files (x86)\\Bitwig Studio',
    '/Applications/Bitwig Studio.app/Contents/Resources', '/opt/bitwig-studio', '/usr/share/bitwig-studio']
    .filter(Boolean)
    .find(candidate => existsSync(join(candidate, 'resources', 'themes', 'default.theme'))) || null;
}

function findJavap() {
  const executable = process.platform === 'win32' ? 'javap.exe' : 'javap';
  const candidates = [process.env.JAVAP, process.env.JAVA_HOME && join(process.env.JAVA_HOME, 'bin', executable)].filter(Boolean);
  const found = candidates.find(candidate => existsSync(candidate));
  if (found) return found;
  for (const root of ['C:\\Program Files\\Java', 'C:\\Program Files\\Eclipse Adoptium', '/usr/lib/jvm', '/Library/Java/JavaVirtualMachines']) {
    if (!existsSync(root)) continue;
    for (const directory of readdirSync(root)) {
      for (const candidate of [join(root, directory, 'bin', executable), join(root, directory, 'Contents', 'Home', 'bin', executable)]) {
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  try { execFileSync('javap', ['-version'], { stdio: 'ignore' }); return 'javap'; } catch { return null; }
}

/* The theme file is a "BtWg" container whose body is text in printable runs. */
function readThemeText(path) {
  const text = [...readFileSync(path)].map(byte => (byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '\n')).join('');
  return text.replace(/\n\s*\n+/g, '\n');
}

function parseTheme(text) {
  const objects = new Map();
  let pendingId = null, pendingClass = null;
  for (const line of text.split('\n')) {
    const classMatch = /^class : "(.*)",$/.exec(line);
    if (classMatch) { pendingClass = classMatch[1]; pendingId = null; continue; }
    const idMatch = /^object_id : (\d+),$/.exec(line);
    if (idMatch) { objects.set(Number(idMatch[1]), { class: pendingClass, name: null }); pendingId = Number(idMatch[1]); continue; }
    const nameMatch = /^"name" : "(.*)",$/.exec(line);
    if (nameMatch && pendingId !== null && objects.get(pendingId)?.name === null) objects.get(pendingId).name = nameMatch[1];
  }
  const styles = new Map();
  for (const block of text.split(/(?=class : "widget_theme\.color_style",)/).slice(1)) {
    const body = block.replace(/^class : "widget_theme\.color_style",/, '').split('class : "')[0];
    const name = /"name" : "(.*)",/.exec(body)?.[1];
    const mode = Number(/"mode" : (\d+),/.exec(body)?.[1]);
    const values = /data : \[([^\]]*)\]/.exec(body)?.[1].split(',').map(Number);
    const reference = /"reference_color" : \{ object_ref : (\d+) \}/.exec(body)?.[1];
    const relative = ['relative_hue', 'relative_saturation', 'relative_lightness'].map(key => Number(new RegExp(`"${key}" : ([^,\\n]+),?`).exec(body)?.[1]));
    styles.set(name, { name, mode, values, reference: reference === undefined ? null : objects.get(Number(reference))?.name ?? null, relative });
  }
  if (!styles.size) fail('No colour styles in the theme. Bitwig 6.x is required.');
  return styles;
}

/* Minimal ZIP reader: locate the central directory, then inflate one entry. */
function readZipEntry(archive, name) {
  const bytes = readFileSync(archive);
  let end = bytes.length - 22;
  while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) fail(`${archive} is not a readable archive.`);
  let pointer = bytes.readUInt32LE(end + 16);
  for (let count = bytes.readUInt16LE(end + 10); count > 0; count--) {
    if (bytes.readUInt32LE(pointer) !== 0x02014b50) fail('Unreadable ZIP central directory.');
    const method = bytes.readUInt16LE(pointer + 10);
    const compressedSize = bytes.readUInt32LE(pointer + 20);
    const nameLength = bytes.readUInt16LE(pointer + 28);
    const extraLength = bytes.readUInt16LE(pointer + 30);
    const commentLength = bytes.readUInt16LE(pointer + 32);
    const localOffset = bytes.readUInt32LE(pointer + 42);
    const entryName = bytes.toString('utf8', pointer + 46, pointer + 46 + nameLength);
    if (entryName === name) {
      const dataStart = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      return method === 0 ? data : method === 8 ? inflateRawSync(data) : fail(`Unsupported compression ${method} for ${name}.`);
    }
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return fail(`${name} not found in ${archive}.`);
}

/* cfM(String, int) registers a grey, cfM(String, int, int, int) an RGB colour and
 * cfM(String, int, int, int, int) an RGBA colour. */
function parseDefaultTable(classBytes) {
  const patched = Buffer.from(classBytes);
  if (patched.readUInt16BE(6) > 61) patched.writeUInt16BE(61, 6);
  const directory = mkdtempSync(join(tmpdir(), 'bitwig-palette-'));
  const file = join(directory, 'eff.class');
  writeFileSync(file, patched);
  let disassembly;
  try { disassembly = execFileSync(JAVAP, ['-p', '-c', '-constants', file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (error) { fail(`javap could not read eff.class: ${error.message.split('\n')[0]}. Use --javap with a JDK 17+.`); }
  finally { rmSync(directory, { recursive: true, force: true }); }
  const table = [];
  let name = null, values = [];
  for (const line of disassembly.split(/\r?\n/)) {
    const string = /^\s+\d+: ldc\s+#\d+\s+\/\/ String (.*)$/.exec(line);
    if (string) { name = string[1]; values = []; continue; }
    if (!name) continue;
    const push = /^\s+\d+: (?:bipush|sipush)\s+(-?\d+)$/.exec(line);
    const small = /^\s+\d+: iconst_(m1|[0-5])$/.exec(line);
    const call = /^\s+\d+: invokevirtual .*\/\/ Method (cfM|.*):\((.*)\).*$/.exec(line);
    if (push) { values.push(Number(push[1])); continue; }
    if (small) { values.push(small[1] === 'm1' ? -1 : Number(small[1])); continue; }
    if (call) {
      const arity = call[2].length - 'Ljava/lang/String;'.length;
      if (call[1] === 'cfM' && /^Ljava\/lang\/String;I+$/.test(call[2]) && values.length === arity) table.push({ name, values });
      name = null; values = [];
    }
  }
  if (!table.length) fail('Could not read the default colour table from eff.class. This Bitwig version may not be supported.');
  return table.map(({ name, values }) => ({
    name,
    hex: values.length === 1 ? toHex([values[0], values[0], values[0]]) : toHex(values.slice(0, 3), values.length === 4 ? values[3] : 255)
  }));
}

function merge(theme, defaults) {
  const resolved = new Map();
  function resolve(name, seen = new Set()) {
    if (resolved.has(name)) return resolved.get(name);
    const style = theme.get(name);
    if (!style || seen.has(name)) return null;
    seen.add(name);
    let base = style.values;
    if (style.mode !== 0) {
      const parent = resolve(style.reference ?? 'Window background', seen);
      if (!parent) return null;
      base = parent.values;
    }
    const color = { r: base[0] * 255, g: base[1] * 255, b: base[2] * 255, a: base[3] ?? 1 };
    if (style.mode !== 0) {
      const [hue, saturation, lightness] = style.relative;
      const hsl = rgbToHsl(color);
      Object.assign(color, hslToRgb({ h: hsl.h + (hue || 0), s: hsl.s + (saturation || 0), l: hsl.l + (lightness || 0) }));
      color.a = base[3] ?? 1;
    }
    const value = { hex: toHex([color.r, color.g, color.b], (base[3] ?? 1) * 255), values: base };
    resolved.set(name, value);
    return value;
  }
  const palette = {};
  for (const entry of defaults) if (!theme.has(entry.name)) palette[entry.name] = entry.hex;
  for (const name of theme.keys()) {
    const value = resolve(name);
    if (!value) fail(`Could not resolve the relative colour ${name}.`);
    palette[name] = value.hex;
  }
  return Object.fromEntries(Object.keys(palette).sort((a, b) => a.localeCompare(b, 'en')).map(name => [name, palette[name]]));
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, l = (max + min) / 2;
  if (!delta) return { h: 0, s: 0, l };
  const h = max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: h * 60, s: delta / (1 - Math.abs(2 * l - 1)), l };
}

function hslToRgb({ h, s, l }) {
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const sectors = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = sectors[Math.min(5, Math.floor(h / 60))].map(value => (value + m) * 255);
  return { r, g, b };
}

function toHex([r, g, b], alpha = 255) {
  const byte = value => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0').toUpperCase();
  return `#${byte(r)}${byte(g)}${byte(b)}${alpha === 255 ? '' : byte(alpha)}`;
}

function render(palette) {
  const lines = Object.entries(palette).map(([name, hex]) => `    ${JSON.stringify(name)}: ${JSON.stringify(hex)}`);
  return `/* Bitwig Studio 6.x reference palette. Generated; do not edit by hand.
 *
 * Values are the theme colours Bitwig 6.1.4 ships (resources/themes/default.theme)
 * plus the semantic colours its theme leaves to the hardcoded default table in
 * bitwig.jar!eff.class. Relative theme colours are resolved to absolute values:
 * reference-based ones from their reference colour, and the ten surface-based
 * ones from "Window background".
 *
 * Regenerate with \`node tools/bitwig-6-palette.mjs\`; the script reads an installed
 * Bitwig Studio 6.x. Colour values are factual data read from the application;
 * no third-party code is reproduced here. */
(function (root) {
  'use strict';
  const reference = '6.1.4';
  const palette = {
${lines.join(',\n')}
  };
  const source = () => Object.entries(palette).map(([name, hex]) => \`\${name}: \${hex}\`).join('\\n') + '\\n';
  const api = { reference, palette: () => ({ ...palette }), source };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StarterTheme6 = api;
})(globalThis);
`;
}
