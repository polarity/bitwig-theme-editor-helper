/* Bitwig Studio version registry.
 *
 * Each version pairs the reference palette used by the preview with the starter
 * theme created by "New Theme". Bitwig 5.x themes are JSON documents with
 * window/arranger sections; Bitwig 6.x themes are flat BTE color lists. */
(function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const five = node ? require('./starter-theme.js') : root.StarterTheme;
  const six = node ? require('./starter-theme-6.js') : root.StarterTheme6;
  const list = [
    {
      id: '6', label: 'Bitwig 6.x', reference: six.reference, format: 'bte', fileName: 'new-theme.bte',
      palette: six.palette(), source: six.source,
      note: 'Flat BTE color list. Bitwig 6 reads theme.bte; the palette includes the colors its default theme does not define.'
    },
    {
      id: '5', label: 'Bitwig 5.x', reference: five.reference, format: 'json', fileName: 'new-theme.json',
      palette: five.palette(), source: five.source,
      note: 'JSON theme with window and arranger sections.'
    }
  ];
  const byId = new Map(list.map(version => [version.id, version]));
  const defaultId = '6';
  function get(id) { return byId.get(String(id)) || byId.get(defaultId); }
  /* Imported colors Bitwig cannot resolve in the selected version. */
  function unknown(document, id) {
    const palette = get(id).palette;
    return (document?.entries || []).filter(entry => !Object.hasOwn(palette, entry.name));
  }
  const api = { list, defaultId, get, unknown };
  if (node) module.exports = api;
  else root.ThemeVersions = api;
})(globalThis);
