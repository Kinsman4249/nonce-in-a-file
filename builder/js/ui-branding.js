'use strict';

// Live banner preview: reflect the branding section's gradient and its show
// toggle at the top of the page. The same three color inputs feed the banner
// that makeOutput embeds in the protected file, so this is an exact preview.
(function () {
  var c1 = document.getElementById('c1');
  var c2 = document.getElementById('c2');
  var c3 = document.getElementById('c3');
  var bgColor = document.getElementById('bgColor');
  var showBanner = document.getElementById('showBanner');
  var prev = document.getElementById('bannerPreview');
  var mark = document.getElementById('bannerMark');
  var notes = document.getElementById('contrastNotes');
  var customOnText = document.getElementById('customOnText');
  var btnTextColor = document.getElementById('btnTextColor');
  if (!c1 || !c2 || !c3 || !showBanner || !prev) { return; }

  function update() {
    var on = showBanner.checked;
    prev.style.display = on ? '' : 'none';
    var v1 = normColor(c1.value, '#fa396a');
    var v2 = normColor(c2.value, '#b166b1');
    var v3 = normColor(c3.value, '#5a9cfa');
    if (on) {
      prev.style.background = 'linear-gradient(90deg,' + v1 + ',' + v2 + ',' + v3 + ')';
      if (mark) { mark.src = makeLockSvg(v1, v2, v3); }
    }
    // Live readability recommendations for the chosen palette.
    if (notes) {
      var btnTextOverride = (customOnText && customOnText.checked && btnTextColor)
        ? normColor(btnTextColor.value, '#ffffff')
        : '';
      var list = contrastNotes(v1, v2, v3, normColor(bgColor ? bgColor.value : '#ffffff', '#ffffff'), btnTextOverride);
      if (!list.length) {
        notes.style.display = 'none';
        notes.innerHTML = '';
      } else {
        notes.style.display = 'block';
        notes.innerHTML = '<ul><li>' + list.join('</li><li>') + '</li></ul>';
      }
    }
  }

  [c1, c2, c3, bgColor].forEach(function (el) {
    if (!el) { return; }
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  });
  if (customOnText) { customOnText.addEventListener('change', update); }
  if (btnTextColor) { btnTextColor.addEventListener('input', update); btnTextColor.addEventListener('change', update); }
  showBanner.addEventListener('change', update);
  update();
})();

document.getElementById('fixedLinks').innerHTML =
  '<p class="hint">Legal: <a href="' + esc(LEGAL_URL) + '" target="_blank" rel="noopener">' + esc(LEGAL_LABEL) + '</a> ' + esc(LEGAL_URL) + '</p>' +
  '<p class="hint">Privacy: <a href="' + esc(PRIVACY_URL) + '" target="_blank" rel="noopener">' + esc(PRIVACY_LABEL) + '</a> ' + esc(PRIVACY_URL) + '</p>' +
  '<p class="hint">Learn more: <a href="' + esc(LEARN_MORE_URL) + '" target="_blank" rel="noopener">' + esc(LEARN_MORE_URL) + '</a></p>' +
  '<p class="hint">These three destinations are fixed by this deployment and cannot be overridden here; change them by editing the repo variables (Legal, Privacy, Learn more) or forking.</p>' +
  '<p class="hint">Build provenance: ' + (BUILDER_ORIGIN ? 'this page is hosted at ' + esc(BUILDER_ORIGIN) : 'this page is a local file:// copy (no hosting origin; output files note the local copy)') + '</p>';
