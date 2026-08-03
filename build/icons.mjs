// Inline SVG icon set (24x24 grid, stroke-based unless noted).
// Drawn to match the icon language in the reference design.

const S = (d, extra = '') => `<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</g>${extra}`;

export const ICONS = {
  'arrow-right': S('<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>'),
  'play': S('<path d="M8 5.5v13l11-6.5z"/>'),
  'chevron-left': S('<path d="m15 5-7 7 7 7"/>'),
  'chevron-right': S('<path d="m9 5 7 7-7 7"/>'),
  'menu': S('<path d="M3 7h18M3 12h18M3 17h18"/>'),
  'close': S('<path d="M6 6l12 12M18 6L6 18"/>'),
  'pin': S('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>'),
  'clock': S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>'),
  'mail': S('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 7 8.4 6 8.4-6"/>'),
  'phone': S('<path d="M6.5 3.5h3l1.5 4-2 1.4a13 13 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"/>'),

  // section / stat icons
  'trophy': S('<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11"/><path d="M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11"/><path d="M12 14v3"/><path d="M8.5 20h7"/><path d="M10 17h4v3h-4z"/>'),
  'note': S('<path d="M9 18V6l9-2v12"/><circle cx="6.8" cy="18" r="2.4"/><circle cx="15.8" cy="16" r="2.4"/>'),
  'users': S('<circle cx="9.5" cy="9" r="3.2"/><path d="M4 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.6"/><path d="M17.5 14.4A5.2 5.2 0 0 1 20.5 19"/>'),
  'globe': S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.4 5.4 3.4 8.5S14.3 18.1 12 20.5c-2.3-2.4-3.4-5.4-3.4-8.5S9.7 5.9 12 3.5Z"/>'),
  'star': S('<path d="m12 4 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z"/>'),

  // service pillar icons
  'sax': S('<path d="M14 3.5v7.8a5.5 5.5 0 0 1-5.5 5.5A3.5 3.5 0 0 0 5 20.3"/><path d="M14 3.5h3.2"/><path d="M8.6 20.5h4.6a4 4 0 0 0 4-4V13"/><circle cx="11" cy="8.5" r=".9"/><circle cx="11" cy="12" r=".9"/>'),
  'handshake': S('<path d="M3.5 11.5 7 8h3.5l1.5 1.5L13.5 8H17l3.5 3.5"/><path d="M20.5 11.5v4a1.5 1.5 0 0 1-1.5 1.5h-1"/><path d="M3.5 11.5v4A1.5 1.5 0 0 0 5 17h1"/><path d="m9 14 2 2 2-2 2 2 2-2"/>'),
  'sliders': S('<path d="M6 3.5v6M6 14.5v6M12 3.5v9M12 17.5v3M18 3.5v3M18 11.5v9"/><circle cx="6" cy="12" r="2.2"/><circle cx="12" cy="15" r="2.2"/><circle cx="18" cy="9" r="2.2"/>'),
  'disc': S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3.5a8.5 8.5 0 0 1 6 2.5"/>'),

  // social (solid marks)
  'facebook': '<path fill="currentColor" d="M13.5 21v-7.8h2.6l.4-3h-3V8.3c0-.87.24-1.46 1.5-1.46h1.6V4.14A21 21 0 0 0 14.3 4c-2.32 0-3.9 1.42-3.9 4.02v2.24H7.8v3h2.6V21z"/>',
  'instagram': S('<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/><circle cx="12" cy="12" r="3.9"/>', '<circle cx="16.6" cy="7.4" r="1.15" fill="currentColor"/>'),
  'youtube': '<path fill="currentColor" d="M21.6 8.1a2.5 2.5 0 0 0-1.76-1.77C18.28 5.9 12 5.9 12 5.9s-6.28 0-7.84.43A2.5 2.5 0 0 0 2.4 8.1 26 26 0 0 0 2 12a26 26 0 0 0 .4 3.9 2.5 2.5 0 0 0 1.76 1.77C5.72 18.1 12 18.1 12 18.1s6.28 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-3.9M10.1 15V9l5.2 3z"/>',
  'tiktok': '<path fill="currentColor" d="M16.3 2.9c.42 2.1 1.72 3.5 3.85 3.72v2.5a6.6 6.6 0 0 1-3.83-1.15v5.3c0 4.32-3.9 6.9-7.35 5.2-2.2-1.1-3.2-3.5-2.7-5.9.5-2.4 2.6-4 5.1-3.9v2.6c-.34-.06-.7-.06-1.05 0a2.4 2.4 0 0 0-1.9 2.6 2.4 2.4 0 0 0 4.75-.4V2.9z"/>',
  'whatsapp': '<path fill="currentColor" d="M12.04 2.5a9.4 9.4 0 0 0-8 14.32L2.6 21.5l4.8-1.4a9.4 9.4 0 1 0 4.64-17.6m0 1.7a7.7 7.7 0 0 1 0 15.4 7.6 7.6 0 0 1-3.9-1.07l-.28-.16-2.85.83.85-2.77-.18-.29a7.7 7.7 0 0 1 6.36-11.94m-2.3 3.6c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.6c.13.17 1.75 2.78 4.32 3.79 2.13.84 2.57.67 3.03.63.46-.05 1.49-.61 1.7-1.2.21-.59.21-1.1.15-1.2s-.25-.17-.51-.3-1.49-.74-1.72-.82-.4-.13-.57.13-.65.82-.8.99-.3.19-.55.06a6.9 6.9 0 0 1-2.03-1.25 7.7 7.7 0 0 1-1.4-1.75c-.15-.25 0-.39.11-.51.11-.12.25-.3.38-.45s.17-.25.25-.42a.47.47 0 0 0-.02-.44c-.06-.13-.56-1.38-.79-1.88-.19-.42-.38-.4-.53-.4z"/>',
  'spotify': '<path fill="currentColor" d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8m4.3 13.6a.72.72 0 0 1-1 .24c-2.7-1.65-6.1-2.02-10.1-1.1a.73.73 0 0 1-.33-1.42c4.37-1 8.15-.57 11.18 1.28.34.21.45.66.24 1m1.15-2.56a.9.9 0 0 1-1.24.3c-3.09-1.9-7.8-2.45-11.46-1.34a.91.91 0 0 1-.53-1.74c4.18-1.27 9.37-.65 12.92 1.53.42.26.56.82.3 1.25m.1-2.67C13.85 8.77 7.9 8.57 4.36 9.64a1.09 1.09 0 0 1-.63-2.08c4.06-1.24 10.63-1 14.85 1.5a1.09 1.09 0 1 1-1.11 1.87"/>',
  'bandcamp': '<path fill="currentColor" d="M2.6 17.4 8.9 6.6h12.5l-6.3 10.8z"/>',
  'heart': '<path fill="currentColor" d="M12 20.3s-7.3-4.4-7.3-9.2A4.1 4.1 0 0 1 12 8.4a4.1 4.1 0 0 1 7.3 2.7c0 4.8-7.3 9.2-7.3 9.2"/>',
  'copy': S('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>'),
  'check': S('<path d="m5 13 4.5 4.5L19 7"/>'),
};

export const icon = (name, cls = '') => {
  const body = ICONS[name];
  if (!body) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
};
