'use strict';

// Live strength estimate under the password field; keeps the visibility of
// the build-time rules without blocking typing.
var pwEl = document.getElementById('password');
var pwHint = document.getElementById('pwStrength');
function updatePwStrength() {
  var pw = pwEl.value;
  if (!pw) { pwHint.textContent = ''; pwHint.className = 'pw-hint'; return; }
  if (commonPassword(pw)) {
    pwHint.textContent = 'This is a known common password - the builder will reject it.';
    pwHint.className = 'pw-hint weak'; return;
  }
  var bits = estimateBits(pw);
  if (pw.length < MIN_PASSWORD_LEN || bits < MIN_PASSWORD_BITS) {
    pwHint.textContent = 'Estimated ~' + bits + ' bits - below the ' + MIN_PASSWORD_BITS + '-bit minimum (and ' + MIN_PASSWORD_LEN + '+ characters). Mix character types or make it longer.';
    pwHint.className = 'pw-hint weak';
  } else {
    pwHint.textContent = 'Estimated ~' + bits + ' bits - meets the minimum.';
    pwHint.className = 'pw-hint ok';
  }
}
pwEl.addEventListener('input', updatePwStrength);
updatePwStrength();

// Live match check for the confirm-password field. Tints the box green when
// it matches the password, red with a bold message when it does not, so a
// recipient typo is caught before the file is built. Empty confirm stays
// neutral until the user has typed in it.
var confirmEl = document.getElementById('password2');
var confirmHintEl = document.getElementById('confirmHint');
function updateConfirmMatch() {
  if (!confirmEl || !confirmHintEl) { return; }
  var confirmVal = confirmEl.value;
  if (confirmVal === '') {
    confirmEl.classList.remove('match', 'mismatch');
    confirmHintEl.className = 'pw-hint';
    confirmHintEl.textContent = 'Must match the password above exactly. A typo here is the most common way a protected file becomes impossible to open.';
    return;
  }
  var match = confirmVal === pwEl.value;
  confirmEl.classList.toggle('match', match);
  confirmEl.classList.toggle('mismatch', !match);
  confirmHintEl.className = match ? 'pw-hint match-ok' : 'pw-hint mismatch-msg';
  confirmHintEl.textContent = match ? 'Passwords match.' : 'Passwords do not match.';
}
confirmEl.addEventListener('input', updateConfirmMatch);
pwEl.addEventListener('input', updateConfirmMatch);
updateConfirmMatch();

// Random strong-password generator (Part B). 20 characters drawn with
// crypto.getRandomValues from a mixed pool (upper/lower/digits/symbols),
// guaranteeing at least one of each class, for roughly 120 bits and an
// entropy estimate well above the MIN_PASSWORD_BITS floor. Pre-fills both the
// password and its confirmation so a recipient typo is unlikely to sink the
// file. No wordlist is embedded, so the bundle stays dependency-free.
function randInt(n) {
  var uv = new Uint32Array(1);
  crypto.getRandomValues(uv);
  return Math.floor((uv[0] / 4294967296) * n);
}
function generatePassword() {
  var upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  var lower = 'abcdefghijkmnopqrstuvwxyz';
  var digits = '23456789';
  var syms = '!@#$%^&*()-_=+[]{}:,.?';
  var all = upper + lower + digits + syms;
  var out = [upper, lower, digits, syms].map(function (c) { return c[randInt(c.length)]; });
  while (out.length < 20) { out.push(all[randInt(all.length)]); }
  for (var i = out.length - 1; i > 0; i--) {
    var j = randInt(i + 1);
    var t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out.join('');
}
var copyPwBtn = document.getElementById('copyPw');
document.getElementById('genPw').addEventListener('click', function () {
  var g = generatePassword();
  pwEl.value = g;
  document.getElementById('password2').value = g;
  updatePwStrength();
  updateConfirmMatch();
  if (copyPwBtn) { copyPwBtn.textContent = 'Password generated'; setTimeout(function () { copyPwBtn.textContent = 'Copy password'; }, 2000); }
});

// Copy `value` to the clipboard and briefly flash a status on `btn`. The
// button's resting label is `base`; on success it shows `done`, on failure
// `fail`, and if there is nothing to copy it shows `empty` for each branch.
function copyToClipboard(value, btn, base, done, fail, empty) {
  if (!value) { btn.textContent = empty; setTimeout(function () { btn.textContent = base; }, 2000); return; }
  navigator.clipboard.writeText(String(value)).then(function () {
    btn.textContent = done; setTimeout(function () { btn.textContent = base; }, 2000);
  }).catch(function () {
    btn.textContent = fail; setTimeout(function () { btn.textContent = base; }, 2000);
  });
}
if (copyPwBtn) {
  copyPwBtn.addEventListener('click', function () {
    copyToClipboard(pwEl.value, copyPwBtn, 'Copy password', 'Copied', 'Copy failed', 'Nothing to copy');
  });
}

// Drag & drop onto the File card: selecting a file by simply dropping it
// there. Highlights the card while a drag is over it and assigns the dropped
// file to the native file input so the rest of the build flow is unchanged.
var fileCard = document.getElementById('fileCard');
var fileInput = document.getElementById('file');
var dropHint = document.getElementById('dropHint');
var fileLbl = document.getElementById('fileLbl');
var fileChosen = document.getElementById('fileChosen');
// Refresh the styled "Choose files" button label and the readout with whatever
// is currently selected in the native file input.
function syncFileLabel() {
  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    if (fileLbl) { fileLbl.textContent = 'Choose files'; }
    if (fileChosen) { fileChosen.textContent = ''; }
    return;
  }
  var names = Array.prototype.map.call(fileInput.files, function (f) { return f.name; });
  if (fileLbl) { fileLbl.textContent = names.length === 1 ? names[0] : (names.length + ' files selected'); }
  if (fileChosen) { fileChosen.textContent = names.join(', '); }
}
if (fileInput) { fileInput.addEventListener('change', syncFileLabel); }
if (fileCard && fileInput) {
  ['dragenter', 'dragover'].forEach(function (evt) {
    fileCard.addEventListener(evt, function (e) { e.preventDefault(); fileCard.classList.add('dropping'); });
  });
  ['dragleave', 'dragend'].forEach(function (evt) {
    fileCard.addEventListener(evt, function (e) { e.preventDefault(); fileCard.classList.remove('dropping'); });
  });
  fileCard.addEventListener('drop', function (e) {
    e.preventDefault();
    fileCard.classList.remove('dropping');
    var dt = e.dataTransfer;
    if (!dt || !dt.files || !dt.files.length) { return; }
    fileInput.files = dt.files;
    syncFileLabel();
    if (dropHint) {
      dropHint.textContent = 'Selected ' + (dt.files[0].name || dt.files[0].type || 'file') + '.';
    }
  });
}

// Secret/note mode toggle: swap the (multi-select) file selector for a
// plain textarea. The note is bundled as a single text/plain source.
var useNoteEl = document.getElementById('useNote');
var noteFieldEl = document.getElementById('noteField');
var fileFieldEl = document.getElementById('fileField');
if (useNoteEl) {
  function syncNoteMode() {
    var note = useNoteEl.checked;
    noteFieldEl.style.display = note ? 'block' : 'none';
    fileFieldEl.style.display = note ? 'none' : 'block';
  }
  useNoteEl.addEventListener('change', syncNoteMode);
  syncNoteMode();
}
