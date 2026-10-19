/* Browser entry point. Classic scripts intentionally support file:// usage. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const F = ThemeFormat, C = ThemeColors;
  let model = null, selected = null, rows = [], headings = [], frame = null, importSequence = 0, exportSource = '';
  const preview = createThemePreview(selectEntry);
  const versionSelect = $('bitwigVersion');
  for (const entry of ThemeVersions.list) versionSelect.add(new Option(entry.label, entry.id));
  let version = ThemeVersions.defaultId;
  versionSelect.value = version;
  const versionInfo = () => ThemeVersions.get(version);
  const versionTitle = info => `${info.label} reference colors. ${info.note}`;
  /* Colors of the loaded theme that the selected Bitwig version does not use. */
  function versionNote(document = model?.document) {
    if (!document) return '';
    const unknown = ThemeVersions.unknown(document, version).length;
    return unknown ? ` ${unknown} of ${document.entries.length} colors are not in the ${versionInfo().label} palette.` : '';
  }
  versionSelect.title = versionTitle(versionInfo());
  versionSelect.addEventListener('change', () => {
    finishGesture(); version = versionSelect.value; versionSelect.title = versionTitle(versionInfo()); render();
    report(`Preview and new themes now use ${versionInfo().label}.${versionNote()}`);
  });
  function selectEntry(entry) {
    finishGesture(); selected = entry; preview.choose(entry);
    $('hexError').textContent = ''; $('hexInput').removeAttribute('aria-invalid');
    render();
  }
  const sliderSpecs = [
    ['blend', 'Blend', 0, 100, '%'], ['hue', 'Hue shift', -180, 180, '°'],
    ['contrast', 'Contrast', -100, 100, '%'], ['brightness', 'Brightness', -100, 100, '%'],
    ['saturation', 'Saturation', -100, 100, '%'], ['red', 'Remove red', 0, 100, '%'],
    ['green', 'Remove green', 0, 100, '%'], ['blue', 'Remove blue', 0, 100, '%']
  ];
  const groups = ['Button', 'Knob', 'Menu', 'Scrollbar', 'Text', 'Hole', 'Error', 'Link', 'Content', 'Emboss', 'Shadow', 'Led', 'Popup', 'Panel', 'Meter', 'Comp', 'Notification', 'Display', 'Activation', 'Icon', 'Bitwig', 'Mapping', 'Tooltip', 'Tree', 'Device'];
  function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function report(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function schedule() { if (frame === null) frame = requestAnimationFrame(() => { frame = null; render(); }); }
  function finishGesture() { if (model) { model.commit(); renderHistory(); } }
  function gestureControl(input, callback) {
    input.addEventListener('pointerdown', () => model?.begin());
    input.addEventListener('input', () => { if (!model) return; model.begin(); callback(); schedule(); });
    input.addEventListener('change', finishGesture);
    input.addEventListener('blur', finishGesture);
    input.addEventListener('keyup', event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) finishGesture(); });
  }
  for (const [key, title, min, max, unit] of sliderSpecs) {
    const block = element('div', 'slider-block'), top = element('div', 'slider-top');
    const label = element('label', '', title); label.htmlFor = key;
    const output = element('output', '', '0' + unit); output.id = key + 'Value'; output.htmlFor = key;
    const reset = element('button', 'reset-slider', '↺'); reset.type = 'button'; reset.title = `Reset ${title.toLowerCase()}`; reset.setAttribute('aria-label', reset.title);
    reset.addEventListener('click', () => { model.edit(state => { state.global[key] = 0; }); render(); });
    top.append(label, output, reset);
    const input = element('input'); input.type = 'range'; input.id = key; input.min = min; input.max = max; input.value = 0;
    gestureControl(input, () => { model.state.global[key] = Number(input.value); });
    block.append(top, input); $('sliders').append(block);
  }
  gestureControl($('targetColor'), () => { model.state.global.target = $('targetColor').value.toUpperCase(); });
  for (const key of ['excludeGrays', 'excludeNames']) $(key).addEventListener('change', () => { model.edit(state => { state.global[key] = $(key).checked; }); render(); });
  function groupFor(entry) {
    const category = groups.find(group => entry.name.toLowerCase().includes(group.toLowerCase())) || 'Other';
    return entry.path.length > 1 ? `${entry.path.slice(0, -1).join(' / ')} · ${category}` : category;
  }
  function buildPalette() {
    rows = []; headings = []; $('colorList').replaceChildren();
    $('group').replaceChildren(new Option('All groups', ''));
    const buckets = new Map();
    for (const entry of model.document.entries) {
      const group = groupFor(entry);
      if (!buckets.has(group)) buckets.set(group, []);
      buckets.get(group).push(entry);
    }
    const fragment = document.createDocumentFragment();
    for (const [group, entries] of [...buckets].sort(([a], [b]) => a.localeCompare(b))) {
      $('group').add(new Option(group, group));
      const heading = element('h3', 'group-heading', group); fragment.append(heading); headings.push({ group, heading });
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const button = element('button', 'color-row'); button.type = 'button'; button.setAttribute('aria-pressed', 'false');
        const info = element('span', 'color-info'), title = element('span', 'color-name', entry.name);
        const path = element('span', 'color-path', entry.location); info.append(title, path);
        const values = element('span', 'color-values'), original = element('span', 'swatch checker'), arrow = element('span', 'swatch-arrow', '→'), result = element('span', 'swatch checker'), hex = element('code'), badge = element('span', 'edit-badge');
        original.style.setProperty('--swatch', F.toHex(entry.color)); original.title = `Original ${F.toHex(entry.color)}`;
        values.append(original, arrow, result, hex); info.append(badge); button.append(info, values);
        button.addEventListener('click', () => selectEntry(entry));
        fragment.append(button); rows.push({ entry, group, button, result, hex, badge });
      }
    }
    $('colorList').append(fragment);
  }
  function buildSettings() {
    $('gradientSettings').replaceChildren();
    $('themeSettings').hidden = !model.document.settings.length;
    for (const setting of model.document.settings) {
      const label = element('label', 'setting-label'), checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.dataset.setting = setting.id;
      label.append(checkbox, document.createTextNode(' Gradient')); label.title = setting.location;
      if (model.document.settings.length > 1) label.append(element('small', 'hint path', setting.location));
      checkbox.addEventListener('change', () => { model.edit(state => { if (checkbox.checked === setting.value) delete state.settings[setting.id]; else state.settings[setting.id] = checkbox.checked; }); render(); });
      $('gradientSettings').append(label);
    }
  }
  function installTheme(source, name) {
    // Parse fully before replacing any workspace state.
    const parsed = F.parseTheme(source, name);
    importSequence++;
    model = new ThemeModel(parsed); selected = parsed.entries[0] || null;
    $('search').value = ''; $('modifiedOnly').checked = false; $('compare').checked = false;
    $('hexError').textContent = ''; $('hexInput').removeAttribute('aria-invalid');
    $('fileName').textContent = name || `Pasted theme.${parsed.format}`;
    $('fileInfo').textContent = `${parsed.format.toUpperCase()} · ${parsed.entries.length} colors · ${parsed.settings.length} settings`;
    for (const id of ['exportOpen', 'resetGlobal', 'resetAll', 'randomizeColors', 'search', 'group', 'modifiedOnly', 'compare']) $(id).disabled = false;
    $('globalControls').disabled = false;
    buildPalette(); buildSettings(); render();
    report(`Loaded ${parsed.entries.length} colors. Only imported entries are edited; missing entries keep their Bitwig defaults.${versionNote(parsed)}`);
  }
  async function readFile(file) {
    if (!file) return;
    const sequence = ++importSequence;
    try { const source = await file.text(); if (sequence === importSequence) installTheme(source, file.name); }
    catch (error) { if (sequence === importSequence) report(error.message, true); }
  }
  function renderHistory() {
    if (!model) return;
    $('undo').disabled = !model.past.length && !(model.gesture && model.dirty);
    $('redo').disabled = !model.future.length;
    $('dirty').textContent = model.dirty ? 'Edited' : 'Original';
  }
  function render() {
    if (!model) return;
    const settings = model.state.global, compare = $('compare').checked, query = $('search').value.trim().toLowerCase(), group = $('group').value, visibleGroups = new Set();
    let visible = 0, changed = 0;
    for (const [key, , , , unit] of sliderSpecs) { $(key).value = settings[key]; $(key + 'Value').value = settings[key] + unit; }
    $('targetColor').value = settings.target;
    $('excludeGrays').checked = settings.excludeGrays; $('excludeNames').checked = settings.excludeNames;
    for (const setting of model.document.settings) {
      const input = [...$('gradientSettings').querySelectorAll('input')].find(input => input.dataset.setting === setting.id);
      input.checked = model.state.settings[setting.id] ?? setting.value;
    }
    for (const row of rows) {
      const original = F.toHex(row.entry.color), result = model.result(row.entry), modified = original !== result;
      if (modified) changed++;
      const show = (!group || group === row.group) && (!$('modifiedOnly').checked || modified) && (!query || `${row.entry.name} ${row.entry.location} ${original} ${result}`.toLowerCase().includes(query));
      row.button.hidden = !show;
      if (show) { visible++; visibleGroups.add(row.group); }
      const displayed = compare ? original : result;
      row.result.style.setProperty('--swatch', displayed); row.result.title = `${compare ? 'Original' : 'Result'} ${displayed}`; row.hex.textContent = displayed;
      row.button.classList.toggle('selected', selected?.id === row.entry.id);
      row.button.setAttribute('aria-pressed', String(selected?.id === row.entry.id));
      row.button.classList.toggle('modified', modified);
      row.badge.textContent = Object.hasOwn(model.state.overrides, row.entry.id) ? 'INDIVIDUAL' : modified ? (result === model.state.palette[row.entry.id] ? 'RANDOMIZED' : 'GLOBAL') : '';
    }
    for (const { group, heading } of headings) heading.hidden = !visibleGroups.has(group);
    $('colorCount').textContent = `${visible} / ${rows.length}`; $('colorCount').title = `${changed} modified colors`;
    $('noResults').hidden = visible !== 0;
    if (!rows.length) $('noResults').textContent = 'This document has no color entries. Other values will be preserved on export.';
    else $('noResults').textContent = 'No colors match these filters.';
    document.body.classList.toggle('comparing', compare);
    renderInspector(); renderHistory(); preview.update(model, selected, compare, version);
  }
  function renderInspector() {
    $('selectHint').hidden = !!selected; $('inspectorContent').hidden = !selected;
    if (!selected) return;
    const original = F.toHex(selected.color), result = model.result(selected), compare = $('compare').checked, shown = compare ? original : result, color = F.parseColor(result);
    $('selectedName').textContent = selected.name; $('selectedPath').textContent = selected.location;
    $('originalSwatch').style.setProperty('--swatch', original); $('resultSwatch').style.setProperty('--swatch', shown);
    $('originalHex').textContent = original; $('resultHex').textContent = shown; $('resultLabel').textContent = compare ? 'Original preview' : 'Result';
    $('colorPicker').value = result.slice(0, 7); $('alpha').value = color.a; $('alphaValue').value = color.a;
    if (document.activeElement !== $('hexInput')) { $('hexInput').value = result; $('hexError').textContent = ''; $('hexInput').removeAttribute('aria-invalid'); }
    const overridden = Object.hasOwn(model.state.overrides, selected.id);
    $('overrideHint').textContent = compare ? 'Original preview is active. Turn it off to edit.' : overridden ? 'Individual correction · protected from global adjustments.' : 'Following global adjustments.';
    $('individualControls').disabled = compare;
    $('resetColor').disabled = !overridden || compare;
  }
  function setOverride(hex) { if (model && selected) model.state.overrides[selected.id] = hex; }
  gestureControl($('colorPicker'), () => {
    if (!selected) return;
    const current = F.parseColor(model.result(selected));
    setOverride(F.toHex({ ...F.parseColor($('colorPicker').value), a: current.a, hasAlpha: current.hasAlpha }));
  });
  gestureControl($('alpha'), () => {
    if (!selected) return;
    const current = F.parseColor(model.result(selected));
    setOverride(F.toHex({ ...current, a: Number($('alpha').value) }));
  });
  function applyHex() {
    if (!selected || $('individualControls').disabled) return;
    try {
      const hex = F.toHex(F.parseColor($('hexInput').value));
      model.edit(() => setOverride(hex)); $('hexInput').value = hex;
      $('hexError').textContent = ''; $('hexInput').removeAttribute('aria-invalid'); render();
    } catch (error) { $('hexError').textContent = error.message; $('hexInput').setAttribute('aria-invalid', 'true'); }
  }
  $('hexInput').addEventListener('change', applyHex);
  $('hexInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applyHex(); } });
  $('resetColor').addEventListener('click', () => { if (selected) { model.edit(state => { delete state.overrides[selected.id]; }); render(); } });
  $('randomizeColors').addEventListener('click', () => {
    finishGesture(); model.randomize(); $('compare').checked = false; render();
    report('Each unprotected element received its own random color. Global sliders are neutral. Alpha, protections and individual corrections are preserved. Undo to restore.');
  });
  $('resetGlobal').addEventListener('click', () => { model.edit(state => { state.global = C.defaults(); }); render(); });
  $('resetAll').addEventListener('click', () => { model.edit(() => { model.state = model.initialState(); }); render(); });
  $('undo').addEventListener('click', () => { model.undo(); render(); });
  $('redo').addEventListener('click', () => { model.redo(); render(); });
  for (const id of ['search', 'group', 'modifiedOnly', 'compare']) $(id).addEventListener('input', schedule);
  $('importFile').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', event => { readFile(event.target.files[0]); event.target.value = ''; });
  $('pasteOpen').addEventListener('click', () => { $('pasteError').textContent = ''; $('pasteDialog').showModal(); $('sourceText').focus(); });
  $('pasteForm').addEventListener('submit', event => {
    event.preventDefault();
    try { installTheme($('sourceText').value, ''); $('pasteDialog').close(); }
    catch (error) { $('pasteError').textContent = error.message; }
  });
  for (const close of document.querySelectorAll('[data-close]')) close.addEventListener('click', () => $(close.dataset.close).close());
  function exportExtension() { return $('exportFormat').value === 'original' ? model.document.format : 'bte'; }
  function updateExport() {
    const extension = exportExtension();
    try {
      exportSource = model.export(extension);
      $('exportText').value = exportSource;
      $('exportStatus').textContent = extension !== model.document.format
        ? 'BTE · colors and Gradient included. JSON groups are flattened; other metadata is omitted.'
        : `${extension.toUpperCase()} · global results and individual corrections included`;
      $('copyExport').disabled = $('downloadExport').disabled = false;
    } catch (error) {
      exportSource = ''; $('exportText').value = '';
      $('exportStatus').textContent = error.message;
      $('copyExport').disabled = $('downloadExport').disabled = true;
    }
  }
  $('exportOpen').addEventListener('click', () => {
    finishGesture();
    const extension = model.document.format;
    $('exportFormat').value = 'original';
    $('exportFormat').options[0].textContent = `${extension.toUpperCase()} (original)`;
    $('exportFormat').options[1].hidden = extension === 'bte';
    $('exportName').value = (model.document.name || `theme.${extension}`).replace(/\.(?:bte|json)$/i, '') + `-edited.${extension}`;
    updateExport();
    $('exportDialog').showModal();
  });
  $('exportFormat').addEventListener('change', () => {
    $('exportName').value = $('exportName').value.replace(/\.(?:bte|json)$/i, '') + '.' + exportExtension();
    updateExport();
  });
  $('copyExport').addEventListener('click', async () => {
    try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(exportSource); $('exportStatus').textContent = 'Theme text copied.'; }
    catch { $('exportText').focus(); $('exportText').select(); $('exportStatus').textContent = 'Clipboard unavailable here. Text selected — press Ctrl/Cmd+C to copy.'; }
  });
  $('downloadExport').addEventListener('click', () => {
    const extension = exportExtension();
    let name = $('exportName').value.trim() || `theme-edited.${extension}`;
    if (!name.toLowerCase().endsWith('.' + extension)) name += '.' + extension;
    const url = URL.createObjectURL(new Blob([exportSource], { type: extension === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' }));
    const link = element('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('exportStatus').textContent = 'Download requested. Your original file has not been overwritten.';
  });
  let dragDepth = 0;
  window.addEventListener('dragenter', event => { if ([...event.dataTransfer.types].includes('Files')) { event.preventDefault(); dragDepth++; document.body.classList.add('file-drag'); } });
  window.addEventListener('dragover', event => { if ([...event.dataTransfer.types].includes('Files')) event.preventDefault(); });
  window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('file-drag'); } });
  window.addEventListener('drop', event => { if (!event.dataTransfer.files.length) return; event.preventDefault(); dragDepth = 0; document.body.classList.remove('file-drag'); readFile(event.dataTransfer.files[0]); });
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editingText = target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || (target.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes(target.type));
    if (!model || document.querySelector('dialog[open]') || editingText || !(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y') {
      event.preventDefault();
      if (event.shiftKey || event.key.toLowerCase() === 'y') model.redo(); else model.undo();
      render();
    }
  });
  window.addEventListener('beforeunload', event => { if (model?.dirty) { event.preventDefault(); event.returnValue = ''; } });
  function newTheme() {
    const info = versionInfo();
    installTheme(info.source(), info.fileName);
    report(`New theme · ${info.label} starter palette with ${model.document.entries.length} colors. Adjust the colors or try Randomize colors.`);
  }
  $('newTheme').addEventListener('click', newTheme);
  newTheme();
})();
