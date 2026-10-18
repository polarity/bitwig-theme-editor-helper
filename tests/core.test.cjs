'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/theme-format.js');
const C = require('../js/colors.js');
const ThemeModel = require('../js/theme-model.js');
const entry = (hex, name = 'Accent') => ({ id: 'color', name, color: F.parseColor(hex) });
const transform = (hex, settings, name) => C.transform(entry(hex, name), { ...C.defaults(), ...settings });

test('hex formats use RGBA alpha, including shorthand and transparent colors', () => {
  for (const [input, output] of [['#123', '#112233'], ['#abcd', '#AABBCCDD'], ['#12345678', '#12345678'], ['0xFF000000', '#FF000000'], ['a0b1c2', '#A0B1C2'], ['#0000', '#00000000']]) assert.equal(F.toHex(F.parseColor(input)), output);
  for (const invalid of ['#12', '#fffff', '#xyz', '#fffffffff', 'red', '', null]) assert.throws(() => F.parseColor(invalid));
});

test('BTE no-op export preserves BOM, mixed newlines, comments, unknown syntax and duplicate keys', () => {
  const source = '\uFEFF// Header\r\n\r\nGradient: true // preserve me\n  Button:   #AbCd  // comment: value\rUnknown: future syntax\r\nraw extension line\nButton: #00000000';
  const doc = F.parseTheme(source);
  assert.equal(doc.entries.length, 2);
  assert.notEqual(doc.entries[0].id, doc.entries[1].id);
  assert.equal(doc.settings.length, 1);
  assert.equal(new ThemeModel(doc).export(), source);
  const model = new ThemeModel(doc);
  model.state.overrides[doc.entries[0].id] = '#11223344';
  model.state.settings[doc.settings[0].id] = false;
  assert.equal(model.export(), source.replace('true //', 'false //').replace('#AbCd', '#11223344'));
});

test('BTE handles inline comments without spaces and does not treat Gradient as a color', () => {
  const doc = F.parseTheme('Gradient:false\nPanel:0x1234// note\nAccent: abcdef\n');
  assert.equal(doc.entries.length, 2);
  assert.equal(F.toHex(doc.entries[0].color), '#11223344');
  assert.equal(doc.settings[0].value, false);
});

test('JSON preserves flat/nested structures, arrays, metadata and distinct full paths', () => {
  const source = { window: { Accent: '#1234', Gradient: false }, arranger: { Accent: '#aabbcc' }, list: [false, 42, '#001122'], author: 'Robert', version: 3, other: null };
  const doc = F.parseTheme(JSON.stringify(source));
  assert.equal(doc.entries.length, 3);
  assert.equal(new Set(doc.entries.map(color => color.id)).size, 3);
  const model = new ThemeModel(doc);
  assert.deepEqual(JSON.parse(model.export()), source);
  model.state.overrides[doc.entries[0].id] = '#AABBCCDD';
  model.state.settings[doc.settings[0].id] = true;
  const expected = JSON.parse(JSON.stringify(source)); expected.window.Accent = '#AABBCCDD'; expected.window.Gradient = true;
  assert.deepEqual(JSON.parse(model.export()), expected);
  const flat = F.parseTheme('{"Button":"#123456", "count":5}');
  assert.equal(flat.entries[0].location, '$["Button"]');
});

test('invalid imports report line or full JSON path', () => {
  assert.throws(() => F.parseTheme('Gradient: true\nButton: #12qq'), /Line 2 \(Button\): invalid color/);
  assert.throws(() => F.parseTheme('{"window":{"Accent":"#nope"}}'), /\$\["window"\]\["Accent"\]/);
  assert.throws(() => F.parseTheme('{"broken":'), /Invalid JSON/);
  assert.throws(() => F.parseTheme('[1,2,3]'), /must be an object/);
  assert.throws(() => F.parseTheme('Gradient: maybe'), /Line 1: Gradient/);
  assert.throws(() => F.parseTheme('not a theme'), /No BTE colors/);
  assert.throws(() => F.parseTheme(''), /empty/);
});

test('neutral transforms are exact and never change alpha', () => {
  for (let i = 0; i < 256; i++) {
    const color = { r: i, g: (i * 71) % 256, b: (i * 23) % 256, a: i, hasAlpha: true };
    const hex = F.toHex(color);
    assert.equal(transform(hex, {}), hex);
    for (const settings of [{ blend: 100 }, { hue: -180 }, { contrast: 100 }, { brightness: -50 }, { saturation: 75 }, { red: 100, blue: 35, green: 10 }, { blend: 20, hue: 80, contrast: 15, brightness: 2, saturation: -20, red: 10 }]) assert.equal(F.parseColor(transform(hex, settings)).a, i);
  }
});

test('hue wraps and contrast expands around midpoint instead of adding brightness', () => {
  assert.equal(transform('#FF0000', { hue: 120 }), '#00FF00');
  assert.equal(transform('#FF0000', { hue: -120 }), '#0000FF');
  assert.equal(transform('#345678', { hue: 360 }), '#345678');
  assert.equal(transform('#406080', { contrast: 50 }), '#014181');
  assert.equal(transform('#000000', { brightness: 50 }), '#808080');
  assert.equal(transform('#FFFFFF', { brightness: -100 }), '#000000');
});

test('saturation endpoints, RGB channel reduction and blend are independent of alpha', () => {
  assert.equal(transform('#FF000080', { saturation: -100 }), '#80808080');
  assert.equal(transform('#804040', { saturation: 100 }), '#C00000');
  assert.equal(transform('#ABCDEF40', { red: 100, green: 100, blue: 100 }), '#00000040');
  assert.equal(transform('#12345600', { blend: 100, target: '#ABCDEF' }), '#ABCDEF00');
  assert.equal(transform('#FF0000', { blend: 100, target: '#00FF00', hue: 120 }), '#0000FF');
});

test('gray and named exclusions inspect originals and preserve alpha', () => {
  assert.equal(transform('#80808034', { brightness: 60, excludeGrays: true }), '#80808034');
  assert.notEqual(transform('#80808134', { brightness: 60, excludeGrays: true }), '#80808134');
  assert.equal(transform('#12345678', { hue: 150, excludeNames: true }, 'Meter Red'), '#12345678');
  assert.notEqual(transform('#12345678', { hue: 150, excludeNames: true }, 'Accent'), '#12345678');
});

test('individual corrections persist across global edits; resets and undo restore the correct layers', () => {
  const model = new ThemeModel(F.parseTheme('Accent: #FF000080\nButton: #123456\n'));
  const first = model.document.entries[0];
  model.edit(state => { state.global.hue = 120; });
  assert.equal(model.result(first), '#00FF0080');
  model.edit(state => { state.overrides[first.id] = '#11223344'; });
  model.edit(state => { state.global.hue = -120; });
  assert.equal(model.result(first), '#11223344');
  model.edit(state => { delete state.overrides[first.id]; });
  assert.equal(model.result(first), '#0000FF80');
  model.undo(); assert.equal(model.result(first), '#11223344');
  model.redo(); assert.equal(model.result(first), '#0000FF80');
  model.edit(() => { model.state = model.initialState(); }); assert.equal(model.dirty, false);
  model.undo(); assert.equal(model.result(first), '#0000FF80');
});

test('one gesture is one history step, capped at 50; edits after undo invalidate redo', () => {
  const model = new ThemeModel(F.parseTheme('Accent: #123456'));
  model.begin();
  for (let i = 1; i <= 30; i++) model.state.global.hue = i;
  model.commit(); assert.equal(model.past.length, 1);
  model.undo(); assert.equal(model.state.global.hue, 0);
  model.redo(); assert.equal(model.state.global.hue, 30);
  for (let i = 31; i < 100; i++) model.edit(state => { state.global.hue = i; });
  assert.equal(model.past.length, 50);
  model.undo(); model.edit(state => { state.global.hue = -90; }); assert.equal(model.future.length, 0);
  const count = model.past.length; model.begin(); model.commit(); assert.equal(model.past.length, count);
});

test('edited BTE and JSON exports reimport with identical rendered colors and settings', () => {
  for (const source of ['// Test\nGradient: true\nAccent: #1234\nUnknown: keep\nButton: #f00\n', '{"window":{"Accent":"#1234","Gradient":true},"arranger":{"Button":"#f00"},"unknown":17}']) {
    const model = new ThemeModel(F.parseTheme(source));
    model.state.global = { ...C.defaults(), hue: 50, contrast: 10, saturation: 25, brightness: 5, red: 10 };
    model.state.overrides[model.document.entries[0].id] = '#ABCDEF00';
    model.state.settings[model.document.settings[0].id] = false;
    const reimport = new ThemeModel(F.parseTheme(model.export()));
    assert.deepEqual(Object.values(reimport.results()), Object.values(model.results()));
    assert.equal(reimport.document.settings[0].value, false);
  }
});
