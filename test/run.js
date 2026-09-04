'use strict';
/*
 * Reusable e2e / conformance tests for the runtime "Share this file" QR feature.
 *
 * Run with:  node test/run.js   (no npm install; Node >= 16 for core crypto)
 *
 * What it verifies without a browser, DOM, or WebCrypto:
 *
 *   A) QR round-trips: the exact qrcode-generator invocation the generated
 *      file uses (qrcode(0,"M"); addData(url,"Byte"); make(); isDark) produces
 *      a matrix that the independent jsqr decoder reads back to the original
 *      URL. This is the standards-conformance check that the QR a recipient
 *      scans will actually open the page.
 *
 *   B) Embedded-copy integrity: the base64 QR bundle embedded in the builder
 *      (QR_B64 / QR_SHA256) decodes to byte-for-byte the vendored source at
 *      builder/vendor/qrcode.js, so the copy shipped inside every generated
 *      file can never drift from the reviewed, arm's-length vendored file.
 *
*  E) Signed-file badge: a generated file never shows the green "Signed and
 *      verified" badge on its own, and never reveals the key fingerprint (so it
 *      cannot be lifted from the file to fake the out-of-band test). It starts
 *      amber (integrity OK) with an out-of-band entry box, turns green only
 *      after the recipient types back the correct 8-byte fingerprint, reverts
 *      to amber on a wrong/blank entry, shows red for a tampered file, and
 *      stays hidden for an unsigned file.
 *
 * Both libraries are permissive (MIT encoder, Apache-2.0 decoder) and live in
 * the repo (builder/vendor/, test/vendor/) with their licenses - no BUSL change.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const qrcode = require(path.join(ROOT, 'builder', 'vendor', 'qrcode.js'));
const jsQR = require(path.join(ROOT, 'test', 'vendor', 'jsqr.js'));

const SAMPLE_URLS = [
  'https://example.com/',
  'https://example.com/share/123',
  'https://files.example.org/docs/memo.pdf?ver=2&lang=en',
  'https://some.domain.tld:8443/deep/path/segment/one/two/three/four?paramA=1&paramB=two&flag',
  'https://repo.localhost/packages/nonce-in-a-file/blob/main/README.md',
];

function pass(name) { console.log('  ok  ' + name); }
function fail(name, detail) {
  console.error('  FAIL ' + name + (detail ? '\n       ' + detail : ''));
  process.exitCode = 1;
}

function rasterize(q, scale, quiet) {
  const n = q.getModuleCount();
  const W = (n + 2 * quiet) * scale;
  const data = new Uint8ClampedArray(W * W * 4).fill(255);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!q.isDark(r, c)) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const px = ((r + quiet) * scale + dy) * W + ((c + quiet) * scale + dx);
      data[px * 4] = 0; data[px * 4 + 1] = 0; data[px * 4 + 2] = 0;
    }
  }
  return { data, width: W, height: W };
}

console.log('\n[A] QR round-trip (Arase encoder -> jsqr decoder)');
for (const url of SAMPLE_URLS) {
  const q = qrcode(0, 'M');
  q.addData(url, 'Byte');
  q.make();
  const img = rasterize(q, 4, 4);
  const res = jsQR(img.data, img.width, img.height);
  if (res && res.data === url) pass('decodes "' + url + '" (module count ' + q.getModuleCount() + ')');
  else fail('decodes "' + url + '"', 'got ' + (res && res.data));
}

console.log('\n[B] Embedded-copy integrity (builder QR_B64/QR_SHA256 vs vendor)');
const qrB64Src = fs.readFileSync(path.join(ROOT, 'builder', 'js', 'qr-b64.js'), 'utf8');
const shaMatch = qrB64Src.match(/var QR_SHA256 = '([0-9a-f]{64})';/);
const b64Match = qrB64Src.match(/var QR_B64 = '([^']+)';/);
const vendor = fs.readFileSync(path.join(ROOT, 'builder', 'vendor', 'qrcode.js'), 'utf8');

if (!b64Match || !shaMatch) { fail('builder carries QR_B64 / QR_SHA256 constants', 'constants not found'); }
else {
  const decoded = Buffer.from(b64Match[1], 'base64').toString('utf8');
  if (decoded === vendor) pass('QR_B64 decodes to builder/vendor/qrcode.js byte-for-byte');
  else fail('QR_B64 decodes to builder/vendor/qrcode.js', 'embedded bundle differs from vendored source');

  const actualSha = crypto.createHash('sha256').update(decoded).digest('hex');
  if (actualSha === shaMatch[1]) pass('QR_B64 SHA-256 matches recorded QR_SHA256');
  else fail('QR_B64 SHA-256 matches recorded QR_SHA256', actualSha);
}

console.log('\n[C] Vendored sources carry permissive licenses');
const encHeader = vendor.slice(0, 300);
if (/MIT/i.test(encHeader)) pass('qrcode-generator headers contains MIT');
else fail('qrcode-generator header contains MIT', 'header: ' + encHeader.slice(0, 80));
const decHeader = fs.readFileSync(path.join(ROOT, 'test', 'vendor', 'jsqr.js'), 'utf8').slice(0, 300);
if (/Apache License/i.test(decHeader) || /cozmo|jsQR/i.test(decHeader)) pass('jsqr appears to be Apache-2.0 (jscozmo/jsQR)');
else fail('jsqr license header present', decHeader.slice(0, 80));

console.log('\n[C.5] Output inline scripts carry data-cfasync="false" (Rocket Loader)');
// Cloudflare Rocket Loader defers and retypes inline scripts it picks up; when the
// file's CSP then blocks Rocket Loader's own loader, those deferred scripts never
// run and the decryptor (and its "Share this file" QR) stays dead. Every output
// inline <script> must therefore opt out so Rocket Loader leaves it alone. These
// tags live inside the makeOutput template strings in builder/js/output.js.
const outputSrc = fs.readFileSync(path.join(ROOT, 'builder', 'js', 'output.js'), 'utf8');
const cfasync = (outputSrc.match(/<script data-cfasync="false">/g) || []).length;
if (cfasync >= 3) pass('all output inline scripts declare data-cfasync="false" (' + cfasync + ' found)');
else fail('all output inline scripts declare data-cfasync="false"', 'found ' + cfasync + ' of 3');

console.log('\n[D] Runtime share UI (DOM stub: hosted vs file://)');
// Extract the generated fiel decayptor body (OUTPUT_JS) and boot it under a
// minimal DOM stub to confirm: served over http(s) the toggle reveals a QR
// SVG; opened from disk it stays hidden.
function makeEl(id) {
  const el = { id, hidden: true, value: '', className: '', disabled: false,
    textContent: '', innerHTML: '', children: [], _handlers: {},
    addEventListener(n, fn) { this._handlers[n] = fn; }, setAttribute(k, v) { this[k] = v; },
    appendChild(c) { this.children.push(c); }, focus() {}, click() {} };
  return el;
}
function bootDecryptor(href) {
  const s = outputSrc;
  const start = s.indexOf('var OUTPUT_JS = [');
  const join = s.indexOf('].join', start);
  const arrText = s.slice(start + 'var OUTPUT_JS = ['.length, join).replace(/,\s*([,\]])/g, '$1');
  const outjs = new Function('return [' + arrText + ']')().join('\n');
  const els = {};
  global.document = { getElementById(id) { return els[id] || (els[id] = makeEl(id)); }, createElement() { return makeEl('a'); } };
  global.location = { protocol: /^https:/.test(href) ? 'https:' : 'file:', href };
  global.atob = (s2) => Buffer.from(s2, 'base64').toString('binary');
  global.window = global;
  global.qrcode = qrcode;
  const config = JSON.stringify({ payload: { v: 4, recipients: [], iv: '', ct: '', sign: null } }).replace(/</g, '\\u003c');
  new Function(outjs.replace('__CONFIG__', config))();
  return els;
}
{
  const els = bootDecryptor('https://example.com/files/doc.html');
  const toggle = els['shareToggle'], pan = els['sharePan'];
  const okRevealed = els['share'].hidden === false;
  toggle._handlers.click();
  const qr = els['shareQr'];
  const okSvg = qr && qr.innerHTML.indexOf('<svg') === 0 && qr.innerHTML.indexOf('</svg>') > -1;
  const okOpened = pan.hidden === false;
  if (okRevealed && okSvg && okOpened) pass('hosted: toggle reveals a QR SVG and opens the panel');
  else fail('hosted: toggle reveals a QR SVG and opens the panel', JSON.stringify({ okRevealed, okSvg, okOpened }));
  delete global.document; delete global.location; delete global.atob; delete global.window;
}
{
  const els = bootDecryptor('file:///home/u/doc.html');
  if (els['share'].hidden === true) pass('file:// : share block stays hidden (no shareable URL)');
  else fail('file:// : share block stays hidden (no shareable URL)');
  delete global.document; delete global.location; delete global.atob; delete global.window;
}

console.log('\n[E] Signed-file badge (amber until recipient confirms out-of-band)');
// For a signed payload the signature badge runs an async WebCrypto chain and
// sets a change handler on the confirmation box, so each boot waits for the
// digest/verify to resolve before asserting. Reuses the makeEl DOM stub.
function bootSigned(href, payload) {
  const s = outputSrc;
  const start = s.indexOf('var OUTPUT_JS = [');
  const join = s.indexOf('].join', start);
  const arrText = s.slice(start + 'var OUTPUT_JS = ['.length, join).replace(/,\s*([,\]])/g, '$1');
  const outjs = new Function('return [' + arrText + ']')().join('\n');
  const els = {};
  global.document = { getElementById(id) { return els[id] || (els[id] = makeEl(id)); }, createElement() { return makeEl('a'); } };
  global.location = { protocol: 'https:', href };
  global.atob = (s2) => Buffer.from(s2, 'base64').toString('binary');
  global.window = global;
  const config = JSON.stringify({ payload }).replace(/</g, '\\u003c');
  new Function(outjs.replace('__CONFIG__', config))();
  return els;
}
(async () => {
  try {
    const wc = crypto.webcrypto;
    const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
    const spki = new Uint8Array(await wc.subtle.exportKey('spki', kp.publicKey));
    const pub = Buffer.from(spki).toString('base64');
    const ivBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const ctBytes = new Uint8Array([16, 17, 18, 19, 20]);
    const iv = Buffer.from(ivBytes).toString('base64');
    const ct = Buffer.from(ctBytes).toString('base64');
    const label = 'Acme HR';
    const data = new TextEncoder().encode('label:' + label + '\n');
    const ivct = new Uint8Array(ivBytes.length + ctBytes.length);
    ivct.set(ivBytes, 0); ivct.set(ctBytes, ivBytes.length);
    const toSign = new Uint8Array(data.length + ivct.length);
    toSign.set(data, 0); toSign.set(ivct, data.length);
    const sig = new Uint8Array(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, toSign));

    const payload = { v: 4, iv, ct, recipients: [], sign: { label, pub, sig: Buffer.from(sig).toString('base64') } };

    // Expected 8-byte fingerprint the decrypted page computes from the public key.
    const fp = Array.from(crypto.createHash('sha256').update(Buffer.from(pub, 'base64')).digest().slice(0, 8))
      .map(b => ('0' + b.toString(16)).slice(-2)).join('');

    const els = bootSigned('https://example.com/doc.html', payload);
    await new Promise(r => setTimeout(r, 300));
    if (els['signed'].className === 'sign info') pass('starts amber (integrity OK), not green');
    else fail('starts amber (integrity OK), not green', els['signed'].className);
    if (els['signConfirmWrap'].hidden === false) pass('out-of-band fingerprint entry box is shown');
    else fail('out-of-band fingerprint entry box is shown');
    if (/out-of-band/.test(els['signedMsg'].textContent) && els['signedMsg'].textContent.indexOf(fp) === -1) {
      pass('amber message asks to enter the fingerprint but does not reveal it');
    } else fail('amber message asks to enter the fingerprint but does not reveal it', els['signedMsg'].textContent);

    els['signConfirm'].value = fp;
    els['signConfirm']._handlers.input();
    if (els['signed'].className === 'sign ok') pass('turns green when the correct fingerprint is entered');
    else fail('turns green when the correct fingerprint is entered', els['signed'].className);
    if (/Signed and verified/.test(els['signedMsg'].textContent)) pass('green message reports verified');
    else fail('green message reports verified', els['signedMsg'].textContent);

    els['signConfirm'].value = '00000000';
    els['signConfirm']._handlers.input();
    if (els['signed'].className === 'sign info') pass('stays amber when an incorrect fingerprint is entered');
    else fail('stays amber when an incorrect fingerprint is entered', els['signed'].className);
    if (els['signedMsg'].textContent.indexOf(fp) === -1) pass('incorrect entry never reveals the fingerprint');
    else fail('incorrect entry never reveals the fingerprint', els['signedMsg'].textContent);
    delete global.document; delete global.location; delete global.atob; delete global.window;

    const badPayload = JSON.parse(JSON.stringify(payload));
    badPayload.ct = Buffer.from([99, 99, 99, 99, 99]).toString('base64');
    const els2 = bootSigned('https://example.com/doc2.html', badPayload);
    await new Promise(r => setTimeout(r, 300));
    if (els2['signed'].className === 'sign bad') pass('tampered file shows red, no confirm box');
    else fail('tampered file shows red, no confirm box', els2['signed'].className);
    if (els2['signConfirmWrap'].hidden === true) pass('tampered file hides the confirm box');
    else fail('tampered file hides the confirm box');
    delete global.document; delete global.location; delete global.atob; delete global.window;

    const unsigned = bootSigned('https://example.com/doc3.html', { v: 4, iv, ct, recipients: [], sign: null });
    if (unsigned['signed'].hidden === true) pass('unsigned file keeps the badge hidden');
    else fail('unsigned file keeps the badge hidden');
    delete global.document; delete global.location; delete global.atob; delete global.window;
  } catch (e) {
    fail('signed-file badge', (e && e.stack) || e);
  }
  console.log('\nDone.');
})();