/* Interactive adapter for the static, MIT-licensed Bitwig reference UI. */
(function (root) {
  'use strict';
  root.createThemePreview = function (onSelect) {
    const $ = id => document.getElementById(id), P = ThemePreviewModel;
    const scene = $('previewScene'), viewport = $('previewViewport'), stage = $('previewStage');
    scene.innerHTML = BitwigPreviewMarkup;
    let model = null, selected = null, snapshot = [], choices = {}, original = false, version = null;
    const surfaces = new Map();
    // Preview slots keep their variable across versions; only the color name and
    // reference value change, so the selector map can be built once.
    const initial = P.bindings();
    const byArea = area => initial.find(binding => binding.area === area).variable;
    const selectors = {
      'Window background': '#top_bar, #bottom_bar', 'Button background': '.button-background',
      'On': '#play, .on, #cpu_svg', 'Record button color': '#rec, .rec',
      'Hitech background': '.hitech-group', 'Hitech on': '.hitech-group svg',
      'Panel body': '.panel-body, #insp_title, .unselected-inst', 'Selected Panel body': '.selected-inst',
      'Hole (dark)': '.hole-dark, #device-bg', 'Hole (medium)': '.hole-medium, #browser-panel',
      'Hole (light)': '.hole-light', 'Display Background': '.display-background',
      'Device Header': '.column', 'Light Text': '.light-text', 'Dark Text': '.dark-text',
      'Normal Toggle Icon': '.normal-toggle-icon', 'Button in tree background': '.button-in-tree-background',
      'Dark Timeline Background': '.dark-timeline-background', 'Dark Timeline Header Background': '.dark-timeline-header-background',
      'Light Timeline Background': '.light-timeline-background', 'Light Timeline Header Background': '.light-timeline-header-background',
      'Irrelevant Timeline Background': '.irrelevant-timeline-background'
    };
    // Inline visual properties also cover text, borders and SVG attributes that
    // have no class in the original. Ignore custom-property declarations.
    for (const node of scene.querySelectorAll('*')) {
      const variables = new Set();
      for (const attr of ['fill', 'stroke']) {
        const match = /^var\((--bw-\d+)\)$/.exec(node.getAttribute(attr) || '');
        if (match) variables.add(match[1]);
      }
      const declarations = (node.getAttribute('style') || '').split(';').filter(declaration => !declaration.trim().startsWith('--'));
      declarations.sort((a, b) => Number(b.trim().startsWith('background')) - Number(a.trim().startsWith('background')));
      for (const declaration of declarations) for (const match of declaration.matchAll(/var\((--bw-\d+)\)/g)) variables.add(match[1]);
      if (variables.size) surfaces.set(node, variables);
    }
    for (const [name, selector] of Object.entries(selectors)) for (const node of scene.querySelectorAll(selector)) {
      const variables = surfaces.get(node) || new Set();
      surfaces.set(node, new Set([byArea(name), ...variables]));
    }
    const tabbed = new Set();
    for (const [node, variables] of surfaces) {
      const variable = [...variables][0];
      node.dataset.previewColor = variable;
      node.setAttribute('role', 'button');
      // One keyboard stop per color, instead of hundreds of timeline cells.
      node.setAttribute('tabindex', tabbed.has(variable) ? '-1' : '0');
      tabbed.add(variable);
    }
    const options = new Map();
    for (const binding of initial) {
      const option = new Option('', binding.variable); options.set(binding.variable, option); $('previewColor').add(option);
    }
    function fit() {
      const native = $('previewSize').value === 'native';
      const scale = native ? 1 : Math.min(1, viewport.clientWidth / 1228);
      scene.style.transform = `scale(${scale})`;
      stage.style.width = `${1228 * scale}px`; stage.style.height = `${768 * scale}px`;
    }
    new ResizeObserver(fit).observe(viewport);
    $('previewSize').addEventListener('change', fit);
    $('previewDetails').addEventListener('toggle', fit);
    function activate(variable) {
      const binding = snapshot.find(item => item.variable === variable);
      if (!binding) return;
      $('previewColor').value = variable;
      if (!binding.matches.length) {
        $('previewMessage').textContent = `${binding.group} / ${binding.name}: reference color ${binding.value}. ${model ? 'Not imported; load a theme containing this color to edit it.' : 'Open a theme to edit its colors.'}`;
      } else if (binding.matches.length > 1) {
        $('previewChoices').replaceChildren();
        $('previewChoiceTitle').textContent = `Choose ${binding.group} / ${binding.name}`;
        for (const entry of binding.matches) {
          const button = document.createElement('button'); button.type = 'button';
          button.textContent = `${entry.name} — ${entry.location}`;
          button.addEventListener('click', () => {
            choices[variable] = entry.id; $('previewChoiceDialog').close(); onSelect(entry); showSelection();
          });
          $('previewChoices').append(button);
        }
        $('previewChoiceDialog').showModal();
      } else { onSelect(binding.entry); showSelection(); }
    }
    function showSelection() {
      $('previewMessage').textContent = `${selected.name} — ${selected.location}. Edit this color in Selected color.`;
      if (innerWidth <= 1200) $('inspectorTitle').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    let hovered = null;
    scene.addEventListener('pointerover', event => {
      hovered?.classList.remove('bw-hover');
      hovered = event.target.closest('[data-preview-color]');
      hovered?.classList.add('bw-hover');
    });
    scene.addEventListener('pointerleave', () => { hovered?.classList.remove('bw-hover'); hovered = null; });
    scene.addEventListener('click', event => {
      const target = event.target.closest('[data-preview-color]');
      if (target) activate(target.dataset.previewColor);
    });
    scene.addEventListener('keydown', event => {
      if (['Enter', ' '].includes(event.key) && event.target.dataset.previewColor) {
        event.preventDefault(); activate(event.target.dataset.previewColor);
      }
    });
    $('previewSelectColor').addEventListener('click', () => activate($('previewColor').value));
    $('previewColor').addEventListener('change', () => activate($('previewColor').value));
    $('previewChoiceClose').addEventListener('click', () => $('previewChoiceDialog').close());
    function update(nextModel, nextSelected, compare, nextVersion) {
      if (model !== nextModel) { choices = {}; $('previewMessage').textContent = ''; }
      if (selected?.id !== nextSelected?.id) $('previewMessage').textContent = '';
      model = nextModel; selected = nextSelected; original = compare; version = P.version(nextVersion);
      snapshot = P.snapshot(model, original, choices, version.id);
      $('previewVersion').textContent = version.label;
      for (const binding of snapshot) {
        scene.style.setProperty(binding.variable, binding.value);
        options.get(binding.variable).textContent = `${binding.group} / ${binding.name}${binding.status === 'missing' ? ' · not imported' : binding.status === 'ambiguous' ? ' · choose source' : binding.matches.length > 1 ? ' · chosen source' : ''}`;
      }
      const slotValue = area => snapshot.find(binding => binding.area === area).value;
      const shades = P.shades(slotValue('Button background'), slotValue('Timeline Primary Grid'));
      scene.style.setProperty('--bw-button-gradient', shades.button); scene.style.setProperty('--bw-grid-subtle', shades.grid);
      for (const [node, variables] of surfaces) {
        const binding = snapshot.find(item => item.variable === node.dataset.previewColor);
        const label = `${binding.group} / ${binding.name} — ${binding.status === 'imported' ? binding.value : binding.status === 'missing' ? 'reference; not imported' : 'choose source'}`;
        node.setAttribute('aria-label', label);
        if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') node.title = label;
        const active = !!selected && snapshot.some(item => variables.has(item.variable) && item.entry?.id === selected.id);
        node.classList.toggle('bw-selected', active); node.setAttribute('aria-pressed', String(active));
      }
      const mapped = selected && snapshot.filter(binding => binding.entry?.id === selected.id);
      $('previewSelectedHint').textContent = selected ? mapped.length ? `${selected.name}: highlighted in preview.` : `${selected.name}: no matching area in this preview.` : '';
      const imported = snapshot.filter(binding => binding.entry).length;
      $('previewCoverage').textContent = model ? `${original ? 'Original' : 'Result'} · ${imported}/27 preview colors imported; others use ${version.label} reference values.` : `Reference preview · ${version.label} colors · Open a theme to see your colors.`;
      fit();
    }
    update(null, null, false);
    function choose(entry) {
      // Only a deliberate user selection resolves ambiguity, never the first
      // entry automatically selected when a document is imported.
      for (const binding of snapshot) if (binding.matches.some(match => match.id === entry.id)) choices[binding.variable] = entry.id;
    }
    return { update, choose };
  };
})(globalThis);
