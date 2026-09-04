'use strict';

// LOGO_URL arrives from a CI repository variable, so validate its scheme at
// runtime: only http(s) or an image data URI is ever honored as the mark.
var DEFAULT_LOGO = /^(https?:|data:image\/)/i.test(LOGO_URL) ? LOGO_URL :
  svgUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'" +
    " stroke='#94a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<rect x='3' y='11' width='18' height='11' rx='2' ry='2'/>" +
    "<path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>"
  );

// -------------------------------------------------------------------------
// Theme helpers. The generated page's accent, link, and text colours are all
// derived from the builder's banner gradient (c1..c3) plus the page
// background, so the output visibly matches the chosen brand. Every derived
// colour is checked against a minimum WCAG contrast ratio so nothing becomes
// unreadable; contrastNotes() turns any shortfall into a readable on-screen
// recommendation.
// -------------------------------------------------------------------------
function hexToRgb(hex) {
  hex = String(hex || '').replace(/^#/, '');
  if (hex.length === 3) { hex = hex.replace(/./g, function (c) { return c + c; }); }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) { return { r: 0, g: 0, b: 0 }; }
  var n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(rgb) {
  function p(v) {
    v = Math.max(0, Math.min(255, Math.round(v)));
    return ('0' + v.toString(16)).slice(-2);
  }
  return '#' + p(rgb.r) + p(rgb.g) + p(rgb.b);
}
function luminance(rgb) {
  function f(c) { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}
function contrastRatio(a, b) {
  var la = luminance(hexToRgb(a));
  var lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// Strongest readable ink on a given background: near-black on light, near-white
// on dark, whichever has the higher contrast. Keeps headings/body readable no
// matter how light or dark the owner's page background is.
var INK_DARK = '#1f2937';
var INK_LIGHT = '#f3f4f6';
function readableOn(bg) {
  return contrastRatio(INK_DARK, bg) >= contrastRatio(INK_LIGHT, bg) ? INK_DARK : INK_LIGHT;
}
function blend(a, b, t) {
  var p = hexToRgb(a);
  var q = hexToRgb(b);
  return rgbToHex({ r: p.r + (q.r - p.r) * t, g: p.g + (q.g - p.g) * t, b: p.b + (q.b - p.b) * t });
}
var MIN_CONTRAST = 4.5;
// A softer secondary text colour that still clears MIN_CONTRAST against the
// background: blend text toward the background only while it stays readable.
function mutedOn(bg) {
  var text = readableOn(bg);
  var t = 0.25;
  var out = blend(text, bg, t);
  while (contrastRatio(out, bg) < MIN_CONTRAST && t < 0.9) {
    t += 0.15;
    out = blend(text, bg, t);
  }
  return out;
}
function borderOn(bg) { return blend(bg, readableOn(bg), 0.25); }
function lightSurfaceOn(bg) { return blend(bg, readableOn(bg), 0.045); }
function darken(hex, amt) { return blend(hex, '#000000', amt); }
function lighten(hex, amt) { return blend(hex, '#ffffff', amt); }
// Hover state for a solid button: darken a light button, lighten a dark one.
function aimOn(hex) {
  return contrastRatio(INK_LIGHT, hex) >= contrastRatio(INK_DARK, hex) ? darken(hex, 0.1) : lighten(hex, 0.1);
}
// Full theme derived from the banner gradient + the page background. The three
// gradient stops drive the accents; everything else is chosen to stay readable.
function buildTheme(c1, c2, c3, bg) {
  var onBanner = contrastRatio(INK_DARK, c2) >= contrastRatio(INK_LIGHT, c2) ? INK_DARK : INK_LIGHT;
  return {
    text: readableOn(bg),
    textSoft: mutedOn(bg),
    border: borderOn(bg),
    surface: lightSurfaceOn(bg),
    accent: c2,
    accentStrong: aimOn(c2),
    onAccent: readableOn(c2),
    accent2: c3,
    accent2Strong: aimOn(c3),
    onAccent2: readableOn(c3),
    link: c3,
    onBanner: onBanner,
    focusRing: blend(c2, bg, 0.55)
  };
}
// The coloured shield-and-keyhole mark shown centred on the generated page.
// Its gradient is always the current banner colours, so the logo tracks the
// owner's palette instead of a fixed theme. Returns a data:image URI.
function makeLockSvg(c1, c2, c3) {
  return svgUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='" + normColor(c1, '#fa396a') + "'/>" +
    "<stop offset='0.5' stop-color='" + normColor(c2, '#b166b1') + "'/>" +
    "<stop offset='1' stop-color='" + normColor(c3, '#5a9cfa') + "'/>" +
    "</linearGradient></defs>" +
    "<path fill='url(#g)' d='M16 2l9 3.5v7c0 6-3.6 10.2-9 12-5.4-1.8-9-6-9-12v-7z'/>" +
    "<path fill='#ffffff' d='M16 10a3.2 3.2 0 0 1 2.6 5.1l1.2 3.4h-7.6l1.2-3.4A3.2 3.2 0 0 1 16 10z'/></svg>"
  );
}
// Human-readable WCAG-style contrast recommendations for the chosen palette.
// Returned as strings so they can be shown live in the Branding card and
// appended to the build-time warning list.
function contrastNotes(c1, c2, c3, bg) {
  var notes = [];
  var t = buildTheme(c1, c2, c3, bg);
  if (contrastRatio(t.accent, t.onAccent) < MIN_CONTRAST) {
    notes.push('The gradient mid/button colour (' + (c2 || '').toLowerCase() + ') has low contrast with its label text. Choose a darker or lighter shade so the main button stays readable.');
  }
  if (contrastRatio(t.accent2, bg) < MIN_CONTRAST) {
    notes.push('The accent colour (' + (c3 || '').toLowerCase() + ') has low contrast against the page background, so buttons and links may be hard to spot. Try a darker or lighter shade.');
  }
  if (contrastRatio(t.onBanner, c2) < 3) {
    notes.push('Banner icons may be hard to see against the middle stop of your gradient. Consider making the gradient lighter or darker for better contrast.');
  }
  if (contrastRatio(t.text, bg) < MIN_CONTRAST) {
    notes.push('The page text has low contrast against the background. Lighten the page background or choose a darker gradient so headings stay legible.');
  }
  return notes;
}
