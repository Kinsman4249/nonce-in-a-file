'use strict';

// -------------------------------------------------------------------------
// Wire up the builder UI
// -------------------------------------------------------------------------
var mark = document.getElementById('topMark');
mark.src = DEFAULT_LOGO;
// Keep the browser-tab favicon in sync with the top-left mark, so both use
// the same image even when an owner sets LOGO_URL (a hosted or data logo).
var fav = document.querySelector('link[rel="icon"]');
if (fav) { fav.href = mark.src; }
document.title = BUILDER_TITLE;

// Collapsible optional sections: clicking a card header expands/collapses
// that card's body. The primary File card is never collapsible. Each header
// is bound directly (rather than via delegation) so a click on the header
// button always toggles its own card, regardless of event target.
(function () {
  var heads = document.querySelectorAll('.card.collapsible .card-head');
  for (var h = 0; h < heads.length; h++) {
    (function (head) {
      head.addEventListener('click', function (ev) {
        ev.preventDefault();
        var card = head.closest ? head.closest('.card.collapsible') : head.parentNode;
        if (!card) { return; }
        var collapsed = card.classList.toggle('collapsed');
        head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
    })(heads[h]);
  }
})();
// Preload the Argon2 WASM engine in the background so building is fast.
loadArgon2().catch(function () {
  var pwSel = document.getElementById('kdfScheme');
  if (pwSel && pwSel.value === 'argon2id') {
    pwSel.value = 'pbkdf2';
    var w = document.getElementById('warnings'); if (w) {
      w.style.display = 'block'; w.innerHTML = '<ul><li>Argon2 engine failed to load; KDF was switched to PBKDF2 for this session.</li></ul>';
    }
    console.error('Argon2 WASM failed to load; password recipients will fall back to PBKDF2.');
  }
});
function setWarnings(list) {
  var el = document.getElementById('warnings');
  if (!list.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  el.innerHTML = '';
  var ul = document.createElement('ul');
  list.forEach(function (w) {
    var li = document.createElement('li');
    li.textContent = w;
    ul.appendChild(li);
  });
  el.appendChild(ul);
}
// Indeterminate progress + elapsed-seconds readout shown while a build runs,
// so the user knows Argon2id and compression are still working on a big file.
var _buildStartT = 0;
var _buildTimer = null;
function startProgress() {
  _buildStartT = Date.now();
  var box = document.getElementById('progress');
  var el = document.getElementById('elapsed');
  box.style.display = 'block';
  function tick() {
    el.textContent = Math.round((Date.now() - _buildStartT) / 1000);
  }
  tick();
  _buildTimer = setInterval(tick, 1000);
}
function stopProgress() {
  if (_buildTimer) { clearInterval(_buildTimer); _buildTimer = null; }
  var box = document.getElementById('progress');
  if (box) { box.style.display = 'none'; }
}
document.getElementById('generate').addEventListener('click', function () {
  var password = document.getElementById('password').value;
  var scheme = document.getElementById('kdfScheme').value === 'pbkdf2' ? 'pbkdf2' : 'argon2id';
  var errEl = document.getElementById('error');
  var noteEl = document.getElementById('note');
  var btn = this;
  errEl.style.display = 'none';
  noteEl.style.display = 'none';

  // Build a flat source list: either the note/secret text (single source, as
  // note.txt), or every file chosen in the (possibly multi-select) file input.
  var useNote = document.getElementById('useNote').checked;
  var sourceList;
  if (useNote) {
    var noteText = document.getElementById('noteText').value;
    if (!noteText.trim()) { errEl.textContent = 'Type a message to protect, or turn off "protect a written message".'; errEl.style.display = 'block'; return; }
    sourceList = [{ file: new Blob([noteText], { type: 'text/plain' }), name: 'note.txt', type: 'text/plain' }];
  } else {
    var fileEl = document.getElementById('file');
    if (!fileEl.files || !fileEl.files.length) { errEl.textContent = 'Choose a file to protect first.'; errEl.style.display = 'block'; return; }
    sourceList = Array.prototype.map.call(fileEl.files, function (f) {
      return { file: f, name: f.name, type: f.type || '' };
    });
  }
  var MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MiB: browser holds the whole file in memory.
  var totalBytes = 0;
  for (var si = 0; si < sourceList.length; si++) { totalBytes += (sourceList[si].file.size || 0); }
  if (totalBytes > MAX_TOTAL_BYTES) {
    errEl.textContent = 'Total selected size is over 100 MiB. Large files can crash the tab; split them or use a different tool.';
    errEl.style.display = 'block'; return;
  }
  if (password) {
    if (password.length > MAX_PASSWORD_LEN) {
      errEl.textContent = 'Password is longer than ' + MAX_PASSWORD_LEN + ' characters; shorten it.';
      errEl.style.display = 'block'; return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      errEl.textContent = 'Use a password of at least ' + MIN_PASSWORD_LEN + ' characters.';
      errEl.style.display = 'block'; return;
    }
    var confirmPw = document.getElementById('password2').value;
    if (password !== confirmPw) {
      errEl.textContent = 'Passwords do not match. Confirm your password exactly.';
      errEl.style.display = 'block'; return;
    }
    if (commonPassword(password)) {
      errEl.textContent = 'That password appears in known-password lists. Choose a unique one.';
      errEl.style.display = 'block'; return;
    }
    var pwBits = estimateBits(password);
    if (pwBits < MIN_PASSWORD_BITS) {
      errEl.textContent = 'Password is too weak: estimated ~' + pwBits + ' bits of entropy (minimum ' + MIN_PASSWORD_BITS + '). Mix upper/lowercase, digits, and symbols, or make it longer.';
      errEl.style.display = 'block'; return;
    }
  }

  var extraRecipients;
  try {
    extraRecipients = gatherRecipients();
  } catch (e) {
    errEl.textContent = e && e.message ? e.message : e;
    errEl.style.display = 'block'; return;
  }
  if (!password && extraRecipients.length === 0) {
    errEl.textContent = 'Add at least one recipient: fill in the password above, or add a password/public-key recipient below.';
    errEl.style.display = 'block'; return;
  }

  var sign = document.getElementById('enableSign').checked
    ? { enabled: true, label: document.getElementById('signerLabel').value.trim(), priv: document.getElementById('signPriv').value.trim() }
    : null;

  var o = {
    c1: normColor(document.getElementById('c1').value, '#fa396a'),
    c2: normColor(document.getElementById('c2').value, '#b166b1'),
    c3: normColor(document.getElementById('c3').value, '#5a9cfa'),
    bgColor: normColor(document.getElementById('bgColor').value, '#ffffff'),
    heading: document.getElementById('heading').value || 'This file is protected',
    description: document.getElementById('description').value,
    showLogo: document.getElementById('showLogo').checked,
    showBanner: document.getElementById('showBanner').checked,
    showHeading: document.getElementById('showHeading').checked,
    showDesc: document.getElementById('showDesc').checked,
    showLock: document.getElementById('showLock').checked,
    showShare: document.getElementById('showShare').checked,
    legal: { label: LEGAL_LABEL, url: LEGAL_URL },
    privacy: { label: PRIVACY_LABEL, url: PRIVACY_URL }
  };

  if (!validHttpUrl(LEARN_MORE_URL)) {
    errEl.textContent = 'The fixed Learn-more URL (LEARN_MORE_URL, injected at deploy time) is not a valid http(s) URL.';
    errEl.style.display = 'block'; return;
  }
  if (!validHttpUrl(LEGAL_URL) || !validHttpUrl(PRIVACY_URL)) {
    errEl.textContent = 'A fixed Legal/Privacy URL (LEGAL_URL / PRIVACY_URL, injected at deploy time) is not a valid http(s) URL.';
    errEl.style.display = 'block'; return;
  }

  var warnings = [];
  var customCss = '';
  var cssFile = document.getElementById('cssFile').files[0];

  var logoFile = document.getElementById('logoFile').files[0] || null;
  var lockFile = document.getElementById('lockFile').files[0] || null;
  var showCustom = document.getElementById('showCustom').checked && !!cssFile;

  // Surface contrast recommendations at build time too, so a palette that
  // becomes unreadable is flagged in the same warning list the builder shows.
  var cNotes = contrastNotes(o.c1, o.c2, o.c3, o.bgColor);
  if (cNotes.length) {
    warnings = warnings.concat(cNotes.map(function (n) { return 'Contrast: ' + n; }));
  }

  btn.disabled = true;
  btn.textContent = 'Building...';
  startProgress();

  var logoPromise;
  if (!o.showLogo) {
    logoPromise = Promise.resolve(null);
  } else if (logoFile) {
    logoPromise = imageToDataUri(logoFile);
  } else if (/^https?:/i.test(DEFAULT_LOGO)) {
    logoPromise = remoteToDataUri(DEFAULT_LOGO, warnings);
  } else {
    logoPromise = Promise.resolve(DEFAULT_LOGO);
  }
  var lockPromise = o.showLock
    ? imageToDataUri(lockFile).then(function (uri) { return uri || makeLockSvg(o.c1, o.c2, o.c3); })
    : Promise.resolve(null);
  var cssPromise = showCustom && cssFile
    ? readBytes(cssFile).then(function (bytes) {
        return sanitizeCss(new TextDecoder().decode(bytes), warnings);
      })
    : Promise.resolve('');

  Promise.all([logoPromise, lockPromise, cssPromise]).then(function (res) {
    o.logo = res[0] || svgUri(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'" +
      " stroke='#94a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<rect x='3' y='11' width='18' height='11' rx='2' ry='2'/>" +
      "<path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>"
    );
    o.lock = res[1];
    o.customCss = res[2];
    setWarnings(warnings);
    return encryptFiles(sourceList, password, extraRecipients, sign, scheme);
  }).then(function (payload) {
    var outName = sourceList.length > 1
      ? safeName(sourceList[0].name).replace(/\.html$/, '') + '-bundle.html'
      : safeName(sourceList[0].name);
    var html = makeOutput(o, payload);
    var a = document.createElement('a');
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    var builtWhat = sourceList.length > 1
      ? 'a ' + sourceList.length + '-file bundle'
      : safeName(sourceList[0].name);
    if (!payload.sign) {
      noteEl.textContent = 'Built ' + builtWhat + '. It unlocks for any recipient in the ring (correct password or matching private key).';
      noteEl.style.display = 'block';
      return;
    }
    // Signed build: surface the recipient-visible key fingerprint so the
    // sender knows exactly what to communicate out-of-band before the
    // recipient will see a green "verified" badge.
    crypto.subtle.digest('SHA-256', b64ToBytes(payload.sign.pub)).then(function (d) {
      var b = new Uint8Array(d);
      var fp = '';
      for (var i = 0; i < 8; i++) { fp += ('0' + b[i].toString(16)).slice(-2); }
      noteEl.innerHTML = '';
      noteEl.appendChild(document.createTextNode('Built ' + builtWhat + '. It unlocks for any recipient in the ring (correct password or matching private key). Recipients will see key fingerprint '));
      var fpEl = document.createElement('span');
      fpEl.textContent = fp;
      fpEl.style.cursor = 'pointer';
      fpEl.style.fontWeight = '700';
      fpEl.style.textDecoration = 'underline';
      fpEl.title = 'Click to copy the fingerprint';
      fpEl.addEventListener('click', function () {
        copyToClipboard(fp, fpEl, fp, fp + ' (copied)', 'Copy failed', '');
      });
      noteEl.appendChild(fpEl);
      noteEl.appendChild(document.createTextNode(' - share it out-of-band (chat, card, call) so they can confirm you as the sender; their badge stays amber until they do.'));
      noteEl.style.display = 'block';
    });
  }).catch(function (e) {
    errEl.textContent = 'Build failed: ' + (e && e.message ? e.message : e);
    errEl.style.display = 'block';
    console.error(e);
  }).finally(function () {
    btn.disabled = false;
    btn.textContent = 'Build protected file';
    stopProgress();
  });
});
