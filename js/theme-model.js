(function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const format = node ? require('./theme-format.js') : root.ThemeFormat;
  const colors = node ? require('./colors.js') : root.ThemeColors;
  const clone = value => JSON.parse(JSON.stringify(value));
  class ThemeModel {
    constructor(document) {
      this.document = document; this.state = this.initialState();
      this.past = []; this.future = []; this.gesture = null;
    }
    initialState() { return { global: colors.defaults(), overrides: {}, settings: {} }; }
    begin() { if (!this.gesture) this.gesture = clone(this.state); }
    commit() {
      if (!this.gesture) return;
      if (JSON.stringify(this.gesture) !== JSON.stringify(this.state)) {
        this.past.push(this.gesture);
        if (this.past.length > 50) this.past.shift();
        this.future = [];
      }
      this.gesture = null;
    }
    edit(callback) { this.commit(); this.begin(); callback(this.state); this.commit(); }
    undo() { this.commit(); if (this.past.length) { this.future.push(clone(this.state)); this.state = this.past.pop(); } }
    redo() { this.commit(); if (this.future.length) { this.past.push(clone(this.state)); this.state = this.future.pop(); } }
    randomize(random = Math.random) {
      // A shared tint and hue keep the palette's light/dark relationships intact.
      const between = (min, max) => Math.floor(random() * (max - min + 1)) + min;
      this.edit(state => {
        state.global = {
          ...colors.defaults(),
          target: format.toHex(colors.hslToRgb({ h: between(0, 359), s: 0.65, l: 0.5 }), false),
          blend: between(8, 25), hue: between(-180, 180),
          contrast: between(-10, 15), brightness: between(-8, 8), saturation: between(-10, 40),
          excludeGrays: state.global.excludeGrays, excludeNames: state.global.excludeNames
        };
      });
    }
    result(entry) { return this.state.overrides[entry.id] ?? colors.transform(entry, this.state.global); }
    results() { return Object.fromEntries(this.document.entries.map(entry => [entry.id, this.result(entry)])); }
    export() { return format.serializeTheme(this.document, this.results(), this.state.settings); }
    get dirty() { return JSON.stringify(this.state) !== JSON.stringify(this.initialState()); }
  }
  if (node) module.exports = ThemeModel;
  else root.ThemeModel = ThemeModel;
})(globalThis);
