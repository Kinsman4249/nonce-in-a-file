'use strict';

// -------------------------------------------------------------------------
// Default stylesheet baked into every output file's page (Part 4 theme).
// -------------------------------------------------------------------------
var OUTPUT_CSS = [
  '*{box-sizing:border-box}',
  'html,body{margin:0;padding:0}',
  "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
  '     color:var(--text);min-height:100vh}',
  '.banner{display:flex;align-items:center;justify-content:space-between;padding:16px 22px}',
  '.banner img{height:36px;width:auto}',
  // Hidden for now; retained for a future menu. To re-enable, set
  // display:block here (and remove the override below).
  '.burger{display:none}',
  '.burger span{display:block;width:22px;height:3px;background:var(--onBanner);border-radius:2px;margin:3px 0}',
  '.logo-only{padding:20px 22px 4px}',
  '.logo-only img{height:36px;width:auto}',
  '.content{max-width:560px;margin:0 auto;padding:44px 24px 72px}',
  'h1{font-size:32px;font-weight:800;margin:0 0 12px;color:var(--text)}',
  '.desc{font-size:16px;color:var(--textSoft);margin:0 0 28px;line-height:1.5}',
  // The coloured logo: centred on the page and a little larger than before.
  '.lock-icon{width:88px;height:88px;display:block;margin:8px auto 26px}',
  '.lock-text{color:var(--textSoft);font-size:15px;margin:0 0 16px}',
  'label{display:block;font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text)}',
  'input[type=password]{width:100%;padding:12px 14px;font-size:16px;border:1px solid var(--border);border-radius:8px}',
  'input[type=password]:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--focusRing)}',
  'button[type=submit]{width:100%;margin-top:12px;padding:13px;font-size:16px;font-weight:700;color:var(--onAccent);',
  '  background:var(--accent);border:0;border-radius:8px;cursor:pointer}',
  'button[type=submit]:hover{background:var(--accentStrong)}',
  'button[type=submit]:disabled{opacity:.6;cursor:progress}',
  '.error{color:#b91c1c;font-size:14px;margin:12px 0 0}',
  '.note{color:#0f766e;font-size:14px;margin:12px 0 0}',
  '.foot{display:flex;gap:18px;margin-top:40px;flex-wrap:wrap}',
  '.foot a{color:var(--link);text-decoration:none;font-size:14px;font-weight:600}',
  '.foot a:hover{text-decoration:underline}',
  '.builtby{font-size:12px;color:var(--textSoft);margin-top:28px}',
  '.builtby a{color:var(--link);text-decoration:none;font-weight:600}',
  '.builtby a:hover{text-decoration:underline}',
  '.sign{font-size:14px;margin:0 0 20px;padding:10px 12px;border-radius:8px}',
  '.signmsg{margin:0 0 4px}',
  '.sign.info{color:#92400e;background:#fffbeb;border:1px solid #fde68a}',
  '.sign.info .confirm{margin-top:8px}',
  '.sign.ok{color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4}',
  '.sign.ok .confirm{margin-top:8px}',
  '.sign.bad{color:#b91c1c;background:#fef2f2;border:1px solid #fecaca}',
  '.sign .confirm{display:block;font-size:13px;color:inherit}',
  '.sign .confirmlabel{display:block;margin-bottom:6px}',
  '.sign .confirm input[type=text]{display:block;width:100%;box-sizing:border-box;padding:8px 10px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border:1px solid var(--border);border-radius:6px;background:#fff;color:inherit;letter-spacing:1px}',
  '.sign .confirm input[type=text]:focus{outline:none;border-color:var(--accent)}',
  '.keysub{margin-top:24px;padding-top:18px;border-top:1px solid var(--border)}',
  'textarea{width:100%;padding:12px 14px;font-size:14px;border:1px solid var(--border);border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
  'textarea:focus{outline:none;border-color:var(--accent)}',
  'button.key{width:100%;margin-top:10px;padding:11px;font-size:15px;font-weight:700;color:var(--onAccent2);background:var(--accent2);border:0;border-radius:8px;cursor:pointer}',
  'button.key:hover{filter:brightness(1.05)}',
  '#files{margin-top:8px}',
  '#files ul{list-style:none;margin:0;padding:0}',
  '#files li{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:15px}',
  '#files li span{word-break:break-all}',
  '#files li button, #files>button{margin:0;padding:9px 16px;border:0;border-radius:8px;background:var(--accent2);color:var(--onAccent2);font-weight:700;cursor:pointer;font-size:14px}',
  '#files>button{margin-top:14px;width:100%}',
  '.share{margin-top:28px;text-align:center}',
  'button.sharelink{background:none;border:0;padding:0;margin:0;color:var(--link);font-size:14px;font-weight:600;cursor:pointer;text-decoration:underline}',
  'button.sharelink:hover{text-decoration:none}',
  '.sharepan{margin-top:14px;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);display:inline-block;max-width:100%}',
  '.sharepan .sharelbl{font-size:13px;color:var(--textSoft);margin:0 0 12px}',
  '.sharepan[hidden]{display:none}',
  '.sharepan .squares svg{display:block;margin:0 auto;max-width:100%;height:auto}',
  // Inline message display for a message-only file: the unlocked plain text is
  // shown read-only inside a scrollable box with a Download button below, so a
  // short secret/message is readable on the page instead of forcing a download.
  '#msg{margin-top:16px}',
  '#msg.prlbl{font-size:14px;font-weight:600;color:var(--text);margin:0 0 8px}',
  '#msg pre{white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:14px;line-height:1.5;margin:0 0 12px}',
  '#msg button{margin:0;padding:9px 16px;border:0;border-radius:8px;background:var(--accent2);color:var(--onAccent2);font-weight:700;cursor:pointer;font-size:14px}'
].join('\n');

// -------------------------------------------------------------------------
// Decryption script embedded in every output file (Part 2). Contains ONLY
// decrypt-and-download logic. Deliberately no key-derivation for encodING,
// no IV/salt generation, no encryption routine - just the inverse of what
// the builder produced, against the single embedded CONFIG.payload.
// -------------------------------------------------------------------------
var OUTPUT_JS = [
  ';(function(){',
  '  "use strict";',
  '  var CONFIG = __CONFIG__;',
  '  var LABEL = "Unlock & download";',
  '  var payload = CONFIG.payload;',
  '  var pwRecs = (payload.recipients||[]).filter(function(r){return r.type==="password";});',
  '  var keyRecs = (payload.recipients||[]).filter(function(r){return r.type==="ecdh";});',
  '  // Set when any recipient\'s key-commitment matches but its content decrypt',
  '  // still fails. That combination means the key is right and the data is',
  '  // broken (corrupted or tampered), not that the user typed the wrong secret.',
  '  var sawCommit=false;',
  '  var engineMissing=false;',
  '  function concatBytes(a,b){var o=new Uint8Array(a.length+b.length);o.set(a,0);o.set(b,a.length);return o;}',
  '  // Key-commitment check (C3): recompute SHA-256(commitKey || wrapped) from',
  '  // the recipient\'s own derived key and compare constant-time against the',
  '  // stored tag. A wrong key can therefore never "fit" a crafted ciphertext,',
  '  // even when a file has several recipients.',
  '  function b64ToBytes(b64){var s=atob(b64);var u=new Uint8Array(s.length);',
  '    for(var i=0;i<s.length;i++){u[i]=s.charCodeAt(i);}return u;}',
  '  function decompress(buf){var ds=new DecompressionStream("gzip");',
  '    var w=ds.writable.getWriter();',
  '    w.write(buf); w.close();',
  '    return new Response(ds.readable).arrayBuffer();}',
  '  function stripPem(t){return String(t||"").replace(/-----BEGIN [^-]*-----/g,"")',
  '    .replace(/-----END [^-]*-----/g,"").replace(/\\s+/g,"");}',
  '  function downloadBlob(blob){',
  '    var a=document.createElement("a");',
  '    var url=URL.createObjectURL(blob);',
  '    a.href=url; a.download=blob.name||"download";',
  '    document.body.appendChild(a); a.click();',
  '    setTimeout(function(){URL.revokeObjectURL(url); a.remove();},1000);',
  '  }',
  '  function download(final,meta){',
  '    var blob=new Blob([final],{type:meta.t||"application/octet-stream"});',
  '    downloadBlob(blob);',
  '    note.textContent="Download started. If nothing happened, check your browser download settings.";',
  '    note.hidden=false;',
  '  }',
  '  // Multi-file bundle (v4): the header carries a `files` manifest. Decompress',
  '  // each file in manifest order into a File and render per-file download',
  '  // buttons plus a "Download all" action into the #files container.',
  '  function renderMulti(files,meta){',
  '    var box=document.getElementById("files");',
  '    if(!box){files.forEach(function(blob){downloadBlob(blob);});return;}',
  '    note.textContent="Entered key is valid. "+files.length+" item"+(files.length===1?"":"s")+" ready.";',
  '    note.hidden=false;',
  '    box.hidden=false;',
  '    var ul=document.createElement("ul");',
  '    files.forEach(function(blob,i){',
  '      var li=document.createElement("li");',
  '      var sp=document.createElement("span");sp.textContent=(blob.name||("item "+(i+1)));',
  '      var b=document.createElement("button");b.type="button";b.textContent="Download";',
  '      (function(bb){b.addEventListener("click",function(){downloadBlob(bb);});})(blob);',
  '      li.appendChild(sp);li.appendChild(b);ul.appendChild(li);',
  '    });',
  '    box.appendChild(ul);',
  '    if(files.length>1){',
  '      var all=document.createElement("button");all.type="button";all.textContent="Download all";',
  '      all.addEventListener("click",function(){files.forEach(function(blob){downloadBlob(blob);});});',
  '      box.appendChild(all);',
  '    }',
  '  }',
  // Message-only single file (v3, text/plain): decode the unlocked bytes and
  // show them read-only in a #msg box with a Download button, rather than
  // auto-downloading a text file the recipient could have just read inline.
  '  function renderText(text,name){',
  '    var box=document.getElementById("msg");',
  '    if(!box){downloadBlob(new File([text],name||"note.txt",{type:"text/plain"}));return;}',
  '    note.textContent="Entered key is valid. Message ready below.";note.hidden=false;',
  '    var pre=document.createElement("pre");pre.textContent=text;',
  '    var dl=document.createElement("button");dl.type="button";',
  '    dl.textContent="Download "+(name||"message");',
  '    dl.addEventListener("click",function(){',
  '      downloadBlob(new Blob([text],{type:"text/plain"}));',
  '      note.textContent="Download started. If nothing happened, check your browser download settings.";note.hidden=false;',
  '    });',
  '    box.appendChild(pre);box.appendChild(dl);box.hidden=false;',
  '  }',
  '  function decryptMulti(body,meta){',
  '    var files=[];var off=0;',
  '    function step(idx){',
  '      if(idx>=meta.files.length){return Promise.resolve();}',
  '      var f=meta.files[idx];',
  '      var seg=body.subarray(off,off+f.len);off+=f.len;',
  '      var load=f.z?decompress(seg).then(function(ab){return new Uint8Array(ab);}):Promise.resolve(seg);',
  '      return load.then(function(b){',
  '        files.push(new File([b],f.n||("item"+(idx+1)),{type:f.t||"application/octet-stream"}));',
  '        return step(idx+1);',
  '      });',
  '    }',
  '    return step(0).then(function(){renderMulti(files,meta);});',
  '  }',
  '  function decryptAndDownload(dataKey){',
  '    return crypto.subtle.decrypt(',
  '      {name:"AES-GCM",iv:b64ToBytes(payload.iv)},dataKey,b64ToBytes(payload.ct)).then(function(ab){',
  '        var pt=new Uint8Array(ab);',
  '        var nl=0;while(nl<pt.length&&pt[nl]!==10){nl++;}',
  '        var meta=JSON.parse(new TextDecoder().decode(pt.subarray(0,nl)));',
  '        var body=pt.subarray(nl+1);',
  '        if(meta.pad){body=body.subarray(0,body.length-meta.pad);}',
  '        if(meta.files){return decryptMulti(body,meta);}',
  '        var load=meta.z?decompress(body):Promise.resolve(body);',
  '        return load.then(function(final){',
  '          if(meta.t==="text/plain"){',
  '            renderText(new TextDecoder().decode(new Uint8Array(final)),meta.n);',
  '          } else {',
  '            download(final,meta);',
  '          }',
  '        });',
  '      });',
  '  }',
  '  // Derive the 64 bytes (wrap key + commit key) for one password recipient.',
  '  // Reads the algorithm and parameters from the recipient entry - never',
  '  // hardcoded - so files outlive KDF/parameter bumps (C2). The header is',
  '  // attacker-controllable, so parameters are hard-capped (Argon2id time<=16,',
  '  // mem<=256 MiB, parallelism<=4; PBKDF2 iters<=8,000,000, hash pinned to',
  '  // SHA-256) and hashLen must be exactly 64 (the 32+32 wrap/commit layout).',
  '  // An entry violating a cap is treated as invalid and skipped, so a crafted',
  '  // file can never freeze the tab with a huge mem/iters.',
  '  function derivePassword(r,pw){',
  '    if(r.kdf==="argon2id"){',
  '      var t=+r.t||0,m=+r.m||0,p=+r.p||0,hl=+r.hashLen||0;',
  '      if(t>16||t<1){return Promise.reject(new Error("invalid argon2 time"));}',
  '      if(m>262144||m<1){return Promise.reject(new Error("invalid argon2 mem"));}',
  '      if(p>4||p<1){return Promise.reject(new Error("invalid argon2 parallelism"));}',
  '      if(hl!==64){return Promise.reject(new Error("invalid argon2 hashLen"));}',
  '      return argon2.hash({pass:new TextEncoder().encode(pw),salt:b64ToBytes(r.salt),',
  '        time:t,mem:m,parallelism:p,hashLen:hl,type:argon2.ArgonType.Argon2id})',
  '        .then(function(h){return new Uint8Array(h.hash);});',
  '    }',
  '    if(r.kdf!=="pbkdf2"){return Promise.reject(new Error("unknown kdf"));}',
  '    var it=+r.iters||0;',
  '    if(it<1||it>8000000){return Promise.reject(new Error("invalid pbkdf2 iterations"));}',
  '    if(r.hash!=="SHA-256"){return Promise.reject(new Error("invalid pbkdf2 hash"));}',
  '    return crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"])',
  '      .then(function(km){return crypto.subtle.deriveBits(',
  '        {name:"PBKDF2",salt:b64ToBytes(r.salt),iterations:it,hash:"SHA-256"},',
  '        km,512);})',
  '      .then(function(ab){return new Uint8Array(ab);});',
  '  }',
  '  // Expand an ECDH shared secret to the same 64-byte layout as password KDFs.',
  '  function deriveEcdh(r,privKey){',
  '    return crypto.subtle.importKey("raw",b64ToBytes(r.ephemeral),',
  '      {name:"ECDH",namedCurve:"P-256"},false,[])',
  '      .then(function(pub){return crypto.subtle.deriveBits({name:"ECDH",public:pub},privKey,256);})',
  '      .then(function(ss){return crypto.subtle.importKey("raw",ss,"HKDF",false,["deriveBits"])',
  '        .then(function(ikm){return crypto.subtle.deriveBits(',
  '          {name:"HKDF",hash:"SHA-256",salt:b64ToBytes(r.hkdfSalt),info:new TextEncoder().encode("nonce-in-a-file:ecdh-wrap:v"+payload.v)},',
  '          ikm,512);});})',
  '      .then(function(kb){return new Uint8Array(kb);});',
  '  }',
  '  function commitMatches(r,commBytes,wrappedBytes){',
  '    var expect;',
  '    try{expect=b64ToBytes(r.commit);}catch(e){return Promise.resolve(false);}',
  '    return crypto.subtle.digest("SHA-256",concatBytes(commBytes,wrappedBytes)).then(function(d){',
  '      var dg=new Uint8Array(d);',
  '      if(dg.length!==expect.length){return false;}',
  '      var diff=0;for(var i=0;i<dg.length;i++){diff|=dg[i]^expect[i];}',
  '      return diff===0;',
  '    }).catch(function(){return false;});',
  '  }',
  '  // Unwrap after a successful key-commitment match; wrong keys bail early.',
  '  function rawKeyToDataKey(r,kb){',
  '    var enc=kb.subarray(0,32),comm=kb.subarray(32);',
  '    var wrapped=b64ToBytes(r.wrapped);',
  '    return commitMatches(r,comm,wrapped).then(function(ok){',
  '      if(!ok){throw new Error("commit");}',
  '      sawCommit=true;',
  '      return crypto.subtle.importKey("raw",enc,{name:"AES-GCM",length:256},false,["unwrapKey"]);',
  '    }).then(function(wk){return crypto.subtle.unwrapKey(',
  '      "raw",wrapped,wk,{name:"AES-GCM",iv:b64ToBytes(r.wrapIv)},',
  '      {name:"AES-GCM",length:256},false,["decrypt"]);});',
  '  }',
  '  function tryPassword(pw){',
  '    var i=0;',
  '    function next(){',
  '      if(i>=pwRecs.length){return Promise.resolve(false);}',
  '      var r=pwRecs[i++];',
  '      if(r.kdf==="argon2id"&&typeof argon2==="undefined"){engineMissing=true;return next();}',
  '      return derivePassword(r,pw).then(function(kb){return rawKeyToDataKey(r,kb);})',
  '        .then(function(dk){return decryptAndDownload(dk).then(function(){return true;});})',
  '        .catch(function(){return next();});',
  '    }',
  '    return next();',
  '  }',
  '  function tryKey(text){',
  '    var privB64=stripPem(text);',
  '    var i=0;',
  '    function next(){',
  '      if(i>=keyRecs.length){return Promise.resolve(false);}',
  '      var r=keyRecs[i++];',
  '      return crypto.subtle.importKey("pkcs8",b64ToBytes(privB64),',
  '        {name:"ECDH",namedCurve:"P-256"},false,["deriveBits"])',
  '        .then(function(priv){return deriveEcdh(r,priv).then(function(kb){return rawKeyToDataKey(r,kb);});})',
  '        .then(function(dk){return decryptAndDownload(dk).then(function(){return true;});})',
  '        .catch(function(){return next();});',
  '    }',
  '    return next();',
  '  }',
  '  var err=document.getElementById("err");',
  '  var note=document.getElementById("note");',
  '  var pwForm=document.getElementById("unlock");',
  '  var pw=document.getElementById("pw");',
  '  var go=document.getElementById("go");',
  '  var keyEl=document.getElementById("key");',
  '  var goKey=document.getElementById("gokey");',
  '  function setBusy(b){',
  '    if(pw){pw.disabled=b;} if(go){go.disabled=b;}',
  '    if(keyEl){keyEl.disabled=b;} if(goKey){goKey.disabled=b;}',
  '    if(b&&go){go.textContent="Decrypting...";}',
  '    if(!b&&go){go.textContent=LABEL;}',
  '  }',
  '  function fail(msg){err.textContent=msg;err.hidden=false;}',
  '  // If a key-commitment matched but the content decrypt failed, the secret',
  '  // is right and the file itself is broken - report that distinctly instead',
  '  // of blaming the user\'s secret.',
  '  function failUnlock(wrongSecretMsg){',
  '    fail(sawCommit?"This file appears corrupted or was modified.":wrongSecretMsg);',
  '  }',
  '  if(pwForm){',
  '    pwForm.addEventListener("submit",function(ev){',
  '      ev.preventDefault(); err.hidden=true; note.hidden=true; setBusy(true); sawCommit=false;',
  '      tryPassword(pw.value).then(function(ok){',
  '        if(!ok){failUnlock(engineMissing?"Cannot unlock: the Argon2 engine did not load in this browser.":"Incorrect password for any recipient of this file.");}',
  '        else if(pw){pw.value="";pw.focus();}',
  '      }).catch(function(){failUnlock("Incorrect password for any recipient of this file.");})',
  '      .finally(function(){setBusy(false);});',
  '    });',
  '  }',
  '  if(goKey){',
  '    goKey.addEventListener("click",function(){',
  '      err.hidden=true; note.hidden=true; setBusy(true); sawCommit=false;',
  '      tryKey(keyEl.value).then(function(ok){',
  '        if(!ok){failUnlock("No listed public key matches that private key.");}',
  '      }).catch(function(){failUnlock("Could not unlock with that private key. Check it is a valid ECDH P-256 key.");})',
  '      .finally(function(){setBusy(false);});',
  '    });',
  '  }',
  '  var sigEl=document.getElementById("signed");',
  '  if(sigEl&&payload.sign){',
  '    // A verified signature only proves the file was not altered since',
  '    // signing. Because the signer\'s public key ships inside this same file,',
  '    // verifying against it does NOT prove who sent it - anyone could have',
  '    // re-signed with their own key. So the badge never goes green on its',
  '    // own: it shows amber (integrity OK) until the recipient types back the',
  '    // 8-byte key fingerprint the sender gave them out-of-band and it matches.',
  '    // The fingerprint is never rendered on this page, so it cannot be lifted',
  '    // from the file: only someone who really received it can enter it.',
  '    var pubBytes=b64ToBytes(payload.sign.pub);',
  '    function fpHex(d){var b=new Uint8Array(d),h="";for(var i=0;i<8;i++){h+=("0"+b[i].toString(16)).slice(-2);}return h;}',
  '    var sigMsg=document.getElementById("signedMsg");',
  '    var confirmWrap=document.getElementById("signConfirmWrap");',
  '    var confirmBox=document.getElementById("signConfirm");',
  '    Promise.all([',
  '      crypto.subtle.digest("SHA-256",pubBytes),',
  '      crypto.subtle.importKey("spki",pubBytes,',
  '        {name:"ECDSA",namedCurve:"P-256"},false,["verify"])',
  '        .then(function(vk){return crypto.subtle.verify(',
  '          {name:"ECDSA",hash:"SHA-256"},vk,b64ToBytes(payload.sign.sig),',
  '          concatBytes(new TextEncoder().encode("label:"+((payload.sign&&payload.sign.label)||"")+"\\n"),',
  '          concatBytes(b64ToBytes(payload.iv),b64ToBytes(payload.ct))));})',
  '    ]).then(function(ar){',
  '      var fp=fpHex(ar[0]);',
  '      if(!ar[1]){',
  '        sigEl.className="sign bad"; sigMsg.textContent=',
  '          "Warning: signature could not be verified - the file may have been altered or is not from the stated sender. Unlock is still allowed; do not trust the contents.";',
  '        confirmWrap.hidden=true; sigEl.hidden=false; return;',
  '      }',
  '      function paint(){',
  '        var entered=String(confirmBox.value||"").replace(/[\\s:]/g,"").toLowerCase();',
  '        if(entered.length>0&&entered===fp){',
  '          sigEl.className="sign ok";',
  '          sigMsg.textContent="Signed and verified: from "+(payload.sign.label||"this sender")+" (key "+fp+"). Fingerprint matched; file not altered since signing.";',
  '        }else{',
  '          sigEl.className="sign info";',
  '          sigMsg.textContent="Integrity OK - not altered since signing, but sender authenticating has NOT yet been confirmed. Enter the key fingerprint you received from the sender out-of-band to confirm them as the source; the badge turns green only when it matches.";',
  '        }',
  '      }',
  '      confirmBox.addEventListener("input",paint);',
  '      confirmWrap.hidden=false;',
  '      sigEl.hidden=false;',
  '      paint();',
  '    })',
  '    .catch(function(){',
  '      sigEl.className="sign bad"; sigMsg.textContent="Warning: signature could not be verified.";',
  '      confirmWrap.hidden=true; sigEl.hidden=false;',
  '    });',
  '  }',
  // Runtime "Share this file" QR. Only meaningful when the page has a real,
  // shareable URL: a generated file opened from disk (file://) has none, so
  // the block stays hidden. When served over http(s), the button reveals a
  // QR of the current location, rendered offline by the embedded
  // qrcode-generator encoder and shown as an inline SVG.
  '  /*__SHARE_BLOCK_START__*/',
  '  var shareEl=document.getElementById("share");',
  '  if(shareEl){',
  '    var hosted=/^https?:$/.test(String(location&&location.protocol||""));',
  '    if(hosted){',
  '      shareEl.hidden=false;',
  '      var shareToggle=document.getElementById("shareToggle");',
  '      var sharePan=document.getElementById("sharePan");',
  '      var rendered=false;',
  '      function renderShareQr(){',
  '        try{',
  '          var box=document.getElementById("shareQr");',
  '          var url=String(location.href||"");',
  '          if(!box||!url||typeof qrcode!=="function"){return;}',
  '          var q=qrcode(0,"M"); q.addData(url,"Byte"); q.make();',
  '          var n=q.getModuleCount(),s=6,html="",r,c;',
  '          html+="<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\""+(n*s)+"\\" height=\\""+(n*s)+"\\" shape-rendering=\\"crispEdges\\" role=\\"img\\" aria-label=\\"QR code linking to this page\\"><rect width=\\"100%\\" height=\\"100%\\" fill=\\"#ffffff\\"/>";',
  '          for(r=0;r<n;r++){for(c=0;c<n;c++){if(q.isDark(r,c)){html+="<rect x=\\""+(c*s)+"\\" y=\\""+(r*s)+"\\" width=\\""+s+"\\" height=\\""+s+"\\" fill=\\"#000000\\"/>";}}}',
  '          html+="</svg>";',
  '          box.innerHTML=html;',
  '          rendered=true;',
  '        }catch(e){}',
  '      }',
  '      shareToggle.addEventListener("click",function(){',
  '        if(!rendered){renderShareQr();}',
  '        var wasHidden=sharePan.hidden;',
  '        sharePan.hidden=!wasHidden;',
  '        var opening=!sharePan.hidden;',
  '        shareToggle.textContent=opening?"Hide share code":"Share this file";',
  '        shareToggle.setAttribute("aria-expanded",opening?"true":"false");',
  '      });',
  '    }',
  '  }',
  '  /*__SHARE_BLOCK_END__*/',
  '})();'
].join('\n');

// -------------------------------------------------------------------------
// Assemble one self-contained output file (Part 2). Conditional elements are
// baked in here at generation time - the output file has no runtime
// configuration of its own.
// -------------------------------------------------------------------------
function makeOutput(o, payload) {
  var gradient = 'linear-gradient(90deg,' + o.c1 + ',' + o.c2 + ',' + o.c3 + ')';
  // Derive the page's accent/link/border/text colours from the banner gradient
  // and the page background, then expose them as CSS variables so OUTPUT_CSS
  // (which references var(--...) throughout) stays fully themed per build.
  // See buildTheme()/makeLockSvg() above; contrastNotes() validates readability.
  var theme = buildTheme(o.c1, o.c2, o.c3, o.bgColor);
  var themeVars = [
    '--text:' + theme.text + ';',
    '--textSoft:' + theme.textSoft + ';',
    '--border:' + theme.border + ';',
    '--surface:' + theme.surface + ';',
    '--accent:' + theme.accent + ';',
    '--accentStrong:' + theme.accentStrong + ';',
    '--onAccent:' + theme.onAccent + ';',
    '--accent2:' + theme.accent2 + ';',
    '--accent2Strong:' + theme.accent2Strong + ';',
    '--onAccent2:' + theme.onAccent2 + ';',
    '--link:' + theme.link + ';',
    '--onBanner:' + theme.onBanner + ';',
    '--focusRing:' + theme.focusRing + ';'
  ].join('');
  // The top-left logo doubles as the browser-tab favicon: it is already a
  // data:image URI (allowed by the output CSP's img-src data:), so no
  // separate icon file is needed and the page stays fully self-contained.
  // When the logo is disabled, an empty data favicon is used, which also
  // stops Firefox from auto-fetching /favicon.ico from the origin (img-src
  // data: forbids it, so the browser would log a CSP violation otherwise).
  var favicon = o.logo || 'data:,';

  var banner = '';
  if (o.showBanner) {
    banner = [
      '<div class="banner" role="banner" style="background:' + gradient + ';">',
      o.showLogo ? '<img alt="" src="' + o.logo + '">' : '<span></span>',
      '<span class="burger" aria-hidden="true"><span></span><span></span><span></span></span>',
      '</div>'
    ].join('');
  } else if (o.showLogo) {
    banner = '<div class="logo-only"><img alt="" src="' + o.logo + '"></div>';
  }

  var head = o.showHeading ? '<h1>' + esc(o.heading) + '</h1>' : '';
  var desc = o.showDesc ? '<p class="desc">' + esc(o.description) + '</p>' : '';
  var lock = o.showLock
    ? '<img class="lock-icon" alt="" src="' + o.lock + '">'
    : '<p class="lock-text">Enter the password to unlock and download.</p>';

  var hasPw = (payload.recipients || []).some(function (r) { return r.type === 'password'; });
  var hasKey = (payload.recipients || []).some(function (r) { return r.type === 'ecdh'; });
  var signBadge = payload.sign
    ? [
        '<div id="signed" class="sign" hidden>',
        '<p id="signedMsg" class="signmsg"></p>',
        '<label id="signConfirmWrap" class="confirm" hidden>',
        '<span class="confirmlabel">Enter the key fingerprint the sender gave you out-of-band (chat, card, call):</span>',
        '<input type="text" id="signConfirm" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="e.g. 1a2b3c4d5e6f7a8b">',
        '</label>',
        '</div>'
      ].join('')
    : '';
  var pwForm = hasPw
    ? [
        '<form id="unlock" autocomplete="off">',
        '<label for="pw">Password</label>',
        '<input type="password" id="pw" name="pw" autocomplete="current-password" required autofocus>',
        '<button type="submit" id="go">Unlock &amp; download</button>',
        '</form>'
      ].join('')
    : '';
  var keyForm = hasKey
    ? [
        '<div class="keysub">',
        '<label for="key">Private key (ECDH)</label>',
        '<textarea id="key" placeholder="Paste your private key (base64 or PEM). This file was encrypted to the public keys in its recipient list."></textarea>',
        '<button type="button" id="gokey" class="key">Unlock with private key</button>',
        '</div>'
      ].join('')
    : '';

  var footer = [
    '<a href="' + esc(LEGAL_URL) + '" target="_blank" rel="noopener">' + esc(LEGAL_LABEL) + '</a>',
    '<a href="' + esc(PRIVACY_URL) + '" target="_blank" rel="noopener">' + esc(PRIVACY_LABEL) + '</a>',
    '<a href="' + esc(LEARN_MORE_URL) + '" target="_blank" rel="noopener">Learn more</a>'
  ];
  var foot = '<div class="foot">' + footer.join('') + '</div>';

  // Visible build provenance, separate from the Learn more link: when the
  // builder was served over http(s), show its origin as a clickable link so
  // a recipient can see which deployment/infra produced the file. A local
  // file:// copy has no origin and is noted as plain text instead.
  var builtByLine = BUILDER_ORIGIN
    ? '<p class="builtby">Built by the <a href="' + esc(BUILDER_ORIGIN) + '" target="_blank" rel="noopener">nonce-in-a-file builder</a></p>'
    : '<p class="builtby">Built by a local copy of the nonce-in-a-file builder</p>';

  // Runtime "Share this file" block. Hidden by default; the decryptor
  // reveals it only when this page is served over http(s) (a shareable
  // URL exists) and renders a QR of the current location on expand.
  // Disabled builds omit both this HTML and the runtime logic and the
  // embedded QR encoder, so no share button or QR ever appears.
  var shareBlock = o.showShare
    ? [
        '<div class="share" id="share" hidden>',
        '<button type="button" id="shareToggle" class="sharelink">Share this file</button>',
        '<div class="sharepan" id="sharePan" hidden>',
        '<p class="sharelbl">Scan the QR code to open this page on another device and share it:</p>',
        '<div class="squares" id="shareQr" role="img" aria-label="QR code linking to this page"></div>',
        '</div>',
        '</div>'
      ].join('')
    : '';

  // Runtime decryptor script, with the "Share this file" logic stripped out
  // (including its sentinel markers) when the build disabled the feature.
  var outputJs = OUTPUT_JS.replace('__CONFIG__', JSON.stringify({ payload: payload }).replace(/</g, '\\u003c'));
  if (!o.showShare) {
    outputJs = outputJs.replace(/\/\*__SHARE_BLOCK_START__\*\/[\s\S]*?\/\*__SHARE_BLOCK_END__\*\//, '');
  }

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<!--\n' + THIRD_PARTY_NOTICE + '\n-->',
    '<head>',
    '<meta charset="utf-8">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\' \'wasm-unsafe-eval\'; connect-src \'none\'; base-uri \'none\'; form-action \'none\'">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    // The top-left logo (data:image URI) doubles as the browser-tab favicon,
    // so the page stays self-contained with no separate icon file (img-src
    // data: allows it). When the logo is disabled, the empty data favicon
    // still stops Firefox from auto-fetching /favicon.ico from the origin,
    // which img-src data: would otherwise report as a CSP violation.
    '<link rel="icon" href="' + favicon + '">',
    // The title can no longer use the real filename, which is now encrypted
    // with the file; it falls back to the branding heading instead.
    '<title>' + esc(o.heading || 'Protected file') + '</title>',
    '<style>:root{' + themeVars + '}',
    OUTPUT_CSS,
    '</style>',
    o.customCss ? '<style>' + o.customCss + '</style>' : '',
    '</head>',
    '<body style="background:' + esc(o.bgColor) + ';">',
    banner,
    '<main class="content">',
    head,
    desc,
    lock,
    signBadge,
    '<p class="error" id="err" hidden></p>',
    pwForm,
    keyForm,
    '<div id="files" hidden></div>',
    // Inline plain-text display for a message-only file: the unlocked message
    // renders read-only here with a Download button, instead of the single
    // text/plain item being force-downloaded on unlock.
    '<div id="msg" hidden></div>',
    '<p class="note" id="note" hidden></p>',
    foot,
    builtByLine,
    shareBlock,
    '</main>',
    // Deploy the Argon2id WASM engine inline so the decryptor (which follows)
    // can run Argon2id with zero network access. The bundle is self-contained:
    // its WASM blob is base64-embedded in the source itself. Escape any "</script"
    // the vendor bundle might contain into a JS-string-literal-safe form so a
    // future bundle can never close this <script> tag early and break the output.
    // Each output inline script is tagged data-cfasync="false" so Cloudflare's
    // Rocket Loader does not defer and retype it: Rocket Loader rewrites the
    // inline scripts it picks up, and when the site's CSP blocks its own loader
    // script the deferred scripts never run, killing the decryptor and the
    // "Share this file" QR.
    '<script data-cfasync="false">',
    argon2LibSource().replace(/<\/script/g, '<\\/script'),
    '<' + '/' + 'script>',
    // Deploy the QR Code encoder inline (qrcode-generator, MIT) so the runtime
    // "Share this file" QR needs zero network access. Unmodified vendored
    // bundle (builder/vendor/qrcode.js); exposed as the global `qrcode`.
    // Omitted entirely when the build disabled the share/QR feature.
    o.showShare
      ? [
          '<script data-cfasync="false">',
          qrLibSource().replace(/<\/script/g, '<\\/script'),
          '<' + '/' + 'script>'
        ].join('\n')
      : '',
    '<script data-cfasync="false">',
    outputJs,
    '<' + '/' + 'script>',
    '</body>',
    '</html>'
  ].join('\n');
}
