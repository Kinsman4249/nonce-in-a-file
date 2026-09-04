'use strict';

// Local ECDH address book (Part B item 5). Opt-in localStorage persistence
// of public keys only (public material, never private keys). Nothing is
// written until the user clicks Save or Import; the keyring never leaves the
// device except through an explicit Export download.
var KEYRING_NS = 'nonce-in-a-file.keyring.v1';
function loadKeyring() {
  try {
    var raw = localStorage.getItem(KEYRING_NS);
    var arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) { return []; }
    return arr.filter(function (k) {
      return k && typeof k.pub === 'string' && (k.name === undefined || typeof k.name === 'string');
    }).map(function (k) { return { name: typeof k.name === 'string' ? k.name : '', pub: k.pub }; });
  } catch (e) { return []; }
}
function saveKeyring(list) {
  try {
    var slim = list.slice(0, 200).map(function (k) { return { name: k.name || '', pub: k.pub }; });
    localStorage.setItem(KEYRING_NS, JSON.stringify(slim));
  } catch (e) { /* storage unavailable (private mode/full); fail silently */ }
}
function refreshKeyringSelect() {
  var sel = document.getElementById('keyringList');
  if (!sel) { return; }
  var cur = sel.value;
  sel.innerHTML = '<option value="">Saved public keys...</option>';
  loadKeyring().forEach(function (k, i) {
    var opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = k.name || ('key ' + (i + 1));
    sel.appendChild(opt);
  });
  sel.value = cur;
}
document.getElementById('keyringSave').addEventListener('click', function () {
  var pub = document.getElementById('ecdPub').value.trim();
  if (!pub) {
    document.getElementById('error').textContent = 'Generate a public key first, or paste one into the public-key field above.';
    document.getElementById('error').style.display = 'block'; return;
  }
  var keys = loadKeyring();
  if (!keys.some(function (k) { return k.pub === pub; })) {
    keys.push({ name: '', pub: pub });
    saveKeyring(keys);
    document.getElementById('keyringSave').textContent = 'Saved to keyring';
    setTimeout(function () { document.getElementById('keyringSave').textContent = 'Save above public key'; }, 2000);
  }
  refreshKeyringSelect();
});
document.getElementById('keyringUse').addEventListener('click', function () {
  var sel = document.getElementById('keyringList');
  var keys = loadKeyring();
  var idx = Number(sel.value);
  if (isNaN(idx) || idx < 0 || idx >= keys.length) { return; }
  addRecipientRow('ecdh', keys[idx].pub);
});
document.getElementById('keyringExport').addEventListener('click', function () {
  var keys = loadKeyring();
  var blob = new Blob([JSON.stringify({ version: 1, keys: keys })], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'nonce-in-a-file-keyring.json';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
});
document.getElementById('keyringImport').addEventListener('change', function () {
  var f = document.getElementById('keyringImport').files[0];
  if (!f) { return; }
  readBytes(f).then(function (bytes) {
    var obj;
    try { obj = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { throw new Error('That file is not valid keyring JSON.'); }
    var imported = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.keys)) ? obj.keys : null;
    if (!imported) { throw new Error('That file is not valid keyring JSON (expected a keys array).'); }
    var keys = loadKeyring();
    imported.forEach(function (k) {
      if (k && typeof k.pub === 'string' && !keys.some(function (x) { return x.pub === k.pub; })) {
        keys.push({ name: typeof k.name === 'string' ? k.name : '', pub: k.pub });
      }
    });
    saveKeyring(keys);
    refreshKeyringSelect();
    document.getElementById('keyringImport').value = '';
  }).catch(function (e2) {
    document.getElementById('error').textContent = 'Keyring import failed: ' + (e2 && e2.message ? e2.message : e2);
    document.getElementById('error').style.display = 'block';
  });
});
refreshKeyringSelect();

// -------------------------------------------------------------------------
// Recipients / key ring: add password or ECDH public-key recipients.
// -------------------------------------------------------------------------
function addRecipientRow(kind, value) {
  var row = document.createElement('div');
  row.className = 'recrow';
  var select = document.createElement('select');
  select.innerHTML = '<option value="password">Password</option><option value="ecdh">Public key (ECDH)</option>';
  select.value = kind;
  var input = document.createElement('input');
  input.type = kind === 'password' ? 'password' : 'text';
  input.placeholder = kind === 'password'
    ? 'Recipient password (12+ characters)'
    : 'Paste recipient public key (base64 or PEM)';
  if (value) { input.value = value; }
  select.addEventListener('change', function () {
    input.type = select.value === 'password' ? 'password' : 'text';
    input.placeholder = select.value === 'password'
      ? 'Recipient password (12+ characters)'
      : 'Paste recipient public key (base64 or PEM)';
  });
  var del = document.createElement('button');
  del.type = 'button';
  del.className = 'recDel';
  del.textContent = 'Remove';
  del.addEventListener('click', function () { row.remove(); });
  row.appendChild(select);
  row.appendChild(input);
  row.appendChild(del);
  document.getElementById('recipientsList').appendChild(row);
}

// Reads every added recipient row, validating password recipients. Throws an
// Error with the reason if any row is unusable. Extra password recipients get
// the full primary-password policy (length, common-list, entropy floor, and a
// 1024-char cap), duplicate password recipients are dropped so Argon2id is
// never spent twice on the same secret, and the total is capped so building
// and unlocking stay responsive.
function gatherRecipients() {
  var recs = [];
  var seenPw = {};
  var total = 0;
  var rows = document.querySelectorAll('#recipientsList .recrow');
  for (var i = 0; i < rows.length; i++) {
    var kind = rows[i].querySelector('select').value;
    var val = rows[i].querySelector('input').value.trim();
    if (!val) { continue; }
    if (kind === 'password') {
      if (val.length > MAX_PASSWORD_LEN) {
        throw new Error('A recipient password is longer than ' + MAX_PASSWORD_LEN + ' characters.');
      }
      if (val.length < MIN_PASSWORD_LEN) {
        throw new Error('Every password recipient must be at least ' + MIN_PASSWORD_LEN + ' characters.');
      }
      if (commonPassword(val)) {
        throw new Error('A recipient password appears in known-password lists. Choose a unique one.');
      }
      if (estimateBits(val) < MIN_PASSWORD_BITS) {
        throw new Error('A recipient password must meet the same ' + MIN_PASSWORD_BITS + '-bit minimum as the primary password.');
      }
      if (seenPw[val]) { continue; }
      seenPw[val] = true;
    }
    recs.push({ kind: kind, value: val });
    total++;
    if (total > MAX_RECIPIENTS) {
      throw new Error('No more than ' + MAX_RECIPIENTS + ' recipients per file. Remove some to continue.');
    }
  }
  return recs;
}

document.getElementById('addPwRec').addEventListener('click', function () { addRecipientRow('password', ''); });
document.getElementById('addKeyRec').addEventListener('click', function () { addRecipientRow('ecdh', ''); });

// Key tool: generate an ECDH P-256 recipient key pair.
document.getElementById('genEcdh').addEventListener('click', function () {
  crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']).then(function (kp) {
    return Promise.all([
      crypto.subtle.exportKey('raw', kp.publicKey),
      crypto.subtle.exportKey('pkcs8', kp.privateKey)
    ]);
  }).then(function (ar) {
    document.getElementById('ecdPub').value = bytesToB64(new Uint8Array(ar[0]));
    document.getElementById('ecdPriv').value = bytesToB64(new Uint8Array(ar[1]));
  }).catch(function (e) {
    document.getElementById('error').textContent = 'Key generation failed: ' + (e && e.message ? e.message : e);
    document.getElementById('error').style.display = 'block';
  });
});
