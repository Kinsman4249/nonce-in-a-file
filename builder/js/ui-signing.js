'use strict';

// Signing: generate an ECDSA P-256 private key and drop it into the field.
document.getElementById('genSign').addEventListener('click', function () {
  generateSignKeypair().then(function (p) {
    document.getElementById('signPriv').value = p.priv;
  }).catch(function (e) {
    document.getElementById('error').textContent = 'Signing key generation failed: ' + (e && e.message ? e.message : e);
    document.getElementById('error').style.display = 'block';
  });
});

// Copy the signing private key to the clipboard so it can be saved elsewhere.
var copySignBtn = document.getElementById('copySign');
if (copySignBtn) {
  copySignBtn.addEventListener('click', function () {
    var priv = document.getElementById('signPriv').value.trim();
    copyToClipboard(priv, copySignBtn, 'Copy signing key', 'Copied', 'Copy failed', 'Generate a key first');
  });
}
