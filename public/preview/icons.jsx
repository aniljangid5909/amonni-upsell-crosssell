/* ============================================================
   Icon set — monoline 20x20, Polaris-style. currentColor stroke.
   ============================================================ */
const ICON_PATHS = {
  home: "M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5",
  funnel: "M3 4h14l-5.5 7v5l-3 1.5V11L3 4Z",
  chart: "M4 16V8M9 16V4M14 16v-6M3 16h14",
  beaker: "M8 3v5L4 16a1 1 0 0 0 1 1.5h10A1 1 0 0 0 16 16L12 8V3M7 3h6M6.5 12h7",
  sparkle: "M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6L10 3Z",
  cart: "M3 4h2l1.5 9h8L17 7H6M8 17a1 1 0 1 0 0-.01M14 17a1 1 0 1 0 0-.01",
  tag: "M3 3h6l8 8-6 6-8-8V3Zm3 3h.01",
  lock: "M6 9V6.5a4 4 0 0 1 8 0V9M5 9h10v8H5V9Z",
  settings: "M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7 3-1.6.9.3 1.9-1.7.9-1.4-1.3-1.9.6L10 17l-.7-1.8-1.9-.6-1.4 1.3-1.7-.9.3-1.9L3 10l1.6-.9-.3-1.9 1.7-.9 1.4 1.3 1.9-.6L10 3l.7 1.8 1.9.6 1.4-1.3 1.7.9-.3 1.9L17 10Z",
  plus: "M10 4v12M4 10h12",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm4.5-1.5L17 17",
  bell: "M10 3a5 5 0 0 0-5 5c0 4-1.5 5-1.5 5h13S15 12 15 8a5 5 0 0 0-5-5ZM8.5 16a1.5 1.5 0 0 0 3 0",
  chevDown: "M5 8l5 5 5-5",
  chevRight: "M8 5l5 5-5 5",
  chevLeft: "M12 5l-5 5 5 5",
  check: "M4 10.5l4 4 8-9",
  x: "M5 5l10 10M15 5L5 15",
  drag: "M7 5h.01M13 5h.01M7 10h.01M13 10h.01M7 15h.01M13 15h.01",
  dots: "M5 10h.01M10 10h.01M15 10h.01",
  edit: "M4 16l1-3 8-8 2 2-8 8-3 1ZM12 5l3 3",
  trash: "M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11",
  copy: "M7 7V4h9v9h-3M4 7h9v9H4V7Z",
  eye: "M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Zm8 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  pause: "M7 4v12M13 4v12",
  play: "M6 4l10 6-10 6V4Z",
  arrowUp: "M10 16V4M5 9l5-5 5 5",
  arrowRight: "M4 10h12M11 5l5 5-5 5",
  arrowDown: "M10 4v12M5 11l5 5 5-5",
  info: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-10h.01M10 10v4",
  star: "M10 3l2.1 4.4 4.9.6-3.6 3.4.9 4.8L10 14.3 5.7 16.6l.9-4.8L3 8.4l4.9-.6L10 3Z",
  filter: "M3 5h14M6 10h8M9 15h2",
  external: "M8 4H4v12h12v-4M12 4h4v4M16 4l-7 7",
  bolt: "M11 3 4 11h5l-1 6 7-8h-5l1-6Z",
  refresh: "M16 10a6 6 0 1 1-1.8-4.3M16 3v3h-3",
  grid: "M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm8 0h6v6h-6v-6Z",
  list: "M6 5h11M6 10h11M6 15h11M3 5h.01M3 10h.01M3 15h.01",
  target: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-3a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3a1 1 0 1 0 0-.01",
  question: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM8 8a2 2 0 1 1 2.6 1.9c-.6.2-.6.6-.6 1.1M10 14h.01",
  app: "M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm9.5 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z",
  store: "M3 8l1-4h12l1 4M4 8v8h12V8M4 8h12M8 16v-4h4v4",
};

function Icon({ name, size = 18, color, style, strokeWidth = 1.6, fill = "none" }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill}
         stroke={color || "currentColor"} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0, display: "block", ...style }}>
      <path d={d} />
    </svg>
  );
}

Object.assign(window, { Icon, ICON_PATHS });
