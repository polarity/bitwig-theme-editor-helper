'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/theme-format.js');
const ThemeModel = require('../js/theme-model.js');
const P = require('../js/preview-model.js');
const binding = name => P.bindings.find(b => b.name === name);
const model = source => new ThemeModel(F.parseTheme(source));

test('all 27 reference bindings resolve without a document and stay outside export', () => {
  assert.equal(P.bindings.length, 27);
  assert.equal(new Set(P.bindings.map(b => b.variable)).size, 27);
  assert.ok(P.snapshot(null).every(b => b.status === 'missing' && b.value === b.default));
  const m = model('Window background: #12345678\n// keep\nUnknown: data');
  assert.equal(P.snapshot(m).filter(b => b.entry).length, 1);
  assert.equal(m.export(), m.document.source);
  assert.equal(m.document.entries.length, 1);
});

test('exact JSON section wins over flat and unrelated names; nested wrappers resolve by section', () => {
  const m = model(JSON.stringify({ 'Window background': '#111111', window: { 'Window background': '#222222' }, other: { 'Window background': '#333333' } }));
  assert.equal(P.snapshot(m).find(b => b.name === 'Window background').value, '#222222');
  const wrapped = model('{"theme":{"window":{"Window background":"#abcdef"}},"arranger":{"Window background":"#ff0000"}}');
  assert.equal(P.snapshot(wrapped).find(b => b.name === 'Window background').value, '#ABCDEF');
  const wrong = model('{"arranger":{"Window background":"#ff0000"}}');
  assert.equal(P.snapshot(wrong).find(b => b.name === 'Window background').status, 'missing');
});

test('flat JSON and BTE share exact name matching', () => {
  for (const source of ['Panel body: #abc', '{"Panel body":"#abc"}']) {
    assert.equal(P.snapshot(model(source)).find(b => b.name === 'Panel body').value, '#AABBCC');
  }
  assert.equal(P.snapshot(model('panel BODY: #abc')).find(b => b.name === 'Panel body').status, 'missing');
});

test('duplicate BTE keys and wrapped JSON candidates require an explicit source choice', () => {
  for (const source of ['Panel body: #111111\nPanel body: #222222', '{"a":{"window":{"Panel body":"#111111"}},"b":{"window":{"Panel body":"#222222"}}}']) {
    const m = model(source), b = binding('Panel body');
    const unresolved = P.snapshot(m).find(item => item.variable === b.variable);
    assert.equal(unresolved.status, 'ambiguous'); assert.equal(unresolved.value, b.default);
    assert.equal(unresolved.matches.length, 2);
    const resolved = P.snapshot(m, false, { [b.variable]: unresolved.matches[1].id }).find(item => item.variable === b.variable);
    assert.equal(resolved.value, '#222222');
    assert.equal(P.snapshot(m, false, { [b.variable]: 'stale' }).find(item => item.variable === b.variable).status, 'ambiguous');
  }
});

test('preview follows transforms, individual overrides, comparison, undo, redo and reset with alpha', () => {
  const m = model('Window background: #80402040'), value = (original = false) => P.snapshot(m, original)[0].value;
  m.edit(state => { state.global.brightness = 40; });
  assert.notEqual(value(), '#80402040'); assert.match(value(), /40$/);
  m.edit(state => { state.overrides[m.document.entries[0].id] = '#12345600'; });
  assert.equal(value(), '#12345600'); assert.equal(value(true), '#80402040');
  m.undo(); assert.notEqual(value(), '#12345600'); m.redo(); assert.equal(value(), '#12345600');
  m.edit(() => { m.state = m.initialState(); }); assert.equal(value(), '#80402040');
});

test('derived preview shades preserve button alpha and scale grid alpha', () => {
  assert.deepEqual(P.shades('#12345640', '#abcdef60'), { button: '#12345640', grid: '#ABCDEF20' });
  assert.deepEqual(P.shades('#12345600', '#abcdef00'), { button: '#12345600', grid: '#ABCDEF00' });
});
