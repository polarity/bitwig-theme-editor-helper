/* Upstream preview color bindings and reference values. MIT; see NOTICE.md. */
(function(root) {
  const bindings = [
  {
    "group": "window",
    "name": "Window background",
    "variable": "--bw-0",
    "default": "#2e2e2e"
  },
  {
    "group": "window",
    "name": "Light Text",
    "variable": "--bw-1",
    "default": "#ffffff"
  },
  {
    "group": "window",
    "name": "Dark Text",
    "variable": "--bw-2",
    "default": "#141414"
  },
  {
    "group": "window",
    "name": "Record button color",
    "variable": "--bw-3",
    "default": "#ec0808"
  },
  {
    "group": "window",
    "name": "Display Background",
    "variable": "--bw-4",
    "default": "#1d1d1d"
  },
  {
    "group": "window",
    "name": "Hole (light)",
    "variable": "--bw-5",
    "default": "#414141"
  },
  {
    "group": "window",
    "name": "Hole (medium)",
    "variable": "--bw-6",
    "default": "#2e2e2e"
  },
  {
    "group": "window",
    "name": "Button stroke",
    "variable": "--bw-7",
    "default": "#323232"
  },
  {
    "group": "window",
    "name": "Panel body",
    "variable": "--bw-8",
    "default": "#535353"
  },
  {
    "group": "window",
    "name": "Panel stroke",
    "variable": "--bw-9",
    "default": "#535353"
  },
  {
    "group": "window",
    "name": "Button background",
    "variable": "--bw-10",
    "default": "#76767680"
  },
  {
    "group": "window",
    "name": "On",
    "variable": "--bw-11",
    "default": "#ff8713"
  },
  {
    "group": "window",
    "name": "Monitoring buttons color",
    "variable": "--bw-12",
    "default": "#cfc500"
  },
  {
    "group": "window",
    "name": "Hitech background",
    "variable": "--bw-13",
    "default": "#2b3236"
  },
  {
    "group": "window",
    "name": "Hitech on",
    "variable": "--bw-14",
    "default": "#3ebaff"
  },
  {
    "group": "window",
    "name": "Hole (dark)",
    "variable": "--bw-15",
    "default": "#0d0d0d"
  },
  {
    "group": "window",
    "name": "Device Header",
    "variable": "--bw-16",
    "default": "#3c3c3c"
  },
  {
    "group": "arranger",
    "name": "Dark Timeline Background",
    "variable": "--bw-17",
    "default": "#797979"
  },
  {
    "group": "arranger",
    "name": "Dark Timeline Header Background",
    "variable": "--bw-18",
    "default": "#323232"
  },
  {
    "group": "window",
    "name": "Active Panel stroke",
    "variable": "--bw-19",
    "default": "#787878"
  },
  {
    "group": "window",
    "name": "Normal Toggle Icon",
    "variable": "--bw-20",
    "default": "#9e9e9e"
  },
  {
    "group": "window",
    "name": "Button in tree background",
    "variable": "--bw-21",
    "default": "#505050"
  },
  {
    "group": "arranger",
    "name": "Light Timeline Header Background",
    "variable": "--bw-22",
    "default": "#353535"
  },
  {
    "group": "arranger",
    "name": "Light Timeline Background",
    "variable": "--bw-23",
    "default": "#8f8f8f"
  },
  {
    "group": "arranger",
    "name": "Irrelevant Timeline Background",
    "variable": "--bw-24",
    "default": "#858585"
  },
  {
    "group": "arranger",
    "name": "Timeline Primary Grid",
    "variable": "--bw-25",
    "default": "#00000064"
  },
  {
    "group": "window",
    "name": "Selected Panel body",
    "variable": "--bw-26",
    "default": "#9c9c9c"
  }
];
  if (typeof module === "object" && module.exports) module.exports = bindings;
  else root.BitwigPreviewColors = bindings;
})(globalThis);
