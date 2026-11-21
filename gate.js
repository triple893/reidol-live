/* 家族限定ページ用の簡易合言葉門番（静的サイト向け・平文非保持・SHA-256照合）
 * 使い方: HTML の <head> 内に <script src="gate.js"></script> を1行追加する。
 * 注意: クライアント側の門番は「うっかり開いた第三者を止める簡易な鍵」であり、
 * 開発者ツールやソース直接閲覧を防ぐ強いセキュリティではない。
 * 本人がハッシュ値を入れる場所: 下の DEFAULT_CONFIG.passHash の '__PASS_HASH__' を
 * 64桁の小文字16進 SHA-256 値に差し替える（平文の合言葉は書かない）。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.DonzPassGate = api;
    if (typeof root.document === 'object' && root.document && !root.__DONZ_GATE_DISABLE_AUTO__) {
      api.boot(root, root.DONZ_GATE_CONFIG || {});
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PLACEHOLDER = '__PASS_HASH__';
  const DEFAULT_CONFIG = Object.freeze({
    passHash: 'bcab260d340ab28f559a1ee5765e2f87129b3587b395e4b77f9ab09de29bd74d',
    storageKey: 'donz.gate.v1',
    ttlMs: 30 * 24 * 60 * 60 * 1000,
    title: '合言葉をいれてね',
    subtitle: '家族で遊ぶための入口です',
    placeholder: 'ひらがなでOK',
    submitLabel: 'はいる',
  });

  // ---- 純JS SHA-256（FIPS 180-4。HTTPS以外のローカル実機確認やNodeでも同一結果を返す）
  const SHA_H0 = [];
  const SHA_K = [];
  (function initShaConstants() {
    const isPrime = (n) => {
      for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
      return n > 1;
    };
    const frac32 = (x) => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
    for (let n = 2; SHA_K.length < 64; n++) {
      if (!isPrime(n)) continue;
      if (SHA_H0.length < 8) SHA_H0.push(frac32(Math.sqrt(n)));
      SHA_K.push(frac32(Math.cbrt(n)));
    }
  })();

  function utf8Bytes(str) {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(str);
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          c = ((c - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
          i++;
        }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return new Uint8Array(out);
  }

  function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
  }

  function sha256Hex(text) {
    const src = utf8Bytes(String(text));
    const len = src.length;
    const total = Math.ceil((len + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(src);
    buf[len] = 0x80;
    const view = new DataView(buf.buffer);
    const bitLen = len * 8;
    view.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(total - 4, bitLen >>> 0, false);

    const H = SHA_H0.slice();
    const w = new Int32Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getInt32(off + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + SHA_K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  // ---- 合言葉の揺れ吸収（全角半角・空白・カタカナ→ひらがな・大小文字）
  function normalizePassphrase(raw) {
    const s = String(raw == null ? '' : raw);
    const nfkc = typeof s.normalize === 'function' ? s.normalize('NFKC') : s;
    const compact = nfkc.replace(/\s+/g, '').toLowerCase();
    return compact.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  function isValidHash(hash) {
    return typeof hash === 'string' && /^[0-9a-f]{64}$/i.test(hash.trim());
  }

  function hashPassphrase(raw) {
    const normalized = normalizePassphrase(raw);
    if (!normalized) return '';
    return sha256Hex(normalized);
  }

  function timingSafeEqualHex(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  // 未設定（__PASS_HASH__ のまま等）は必ず false（フェイルクローズ）
  function verifyPassphrase(raw, expectedHash) {
    if (!isValidHash(expectedHash)) return false;
    const actual = hashPassphrase(raw);
    if (!actual) return false;
    return timingSafeEqualHex(actual, expectedHash.trim().toLowerCase());
  }

  function readUnlock(storage, key, expectedHash, ttlMs, now) {
    if (!storage || !isValidHash(expectedHash)) return false;
    try {
      const parsed = JSON.parse(storage.getItem(key) || 'null');
      if (!parsed || typeof parsed !== 'object') return false;
      if (!timingSafeEqualHex(String(parsed.h || '').toLowerCase(), expectedHash.trim().toLowerCase())) return false;
      const at = Number(parsed.at);
      if (!Number.isFinite(at)) return false;
      if (Number.isFinite(ttlMs) && ttlMs > 0 && now - at > ttlMs) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function writeUnlock(storage, key, expectedHash, now) {
    if (!storage || !isValidHash(expectedHash)) return;
    try {
      storage.setItem(key, JSON.stringify({ h: expectedHash.trim().toLowerCase(), at: now }));
    } catch (e) {}
  }

  function clearUnlock(storage, key) {
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch (e) {}
  }

  function hasLockQuery(search) {
    try {
      return new URLSearchParams(String(search || '')).get('lock') === '1';
    } catch (e) {
      return false;
    }
  }

  const GATE_CSS = [
    'html.donz-gate-locked, html.donz-gate-locked body { overflow: hidden !important; background: #140d11 !important; }',
    'html.donz-gate-locked body > :not(#donz-gate-root) { display: none !important; visibility: hidden !important; pointer-events: none !important; }',
    '#donz-gate-root {',
    '  position: fixed; inset: 0; z-index: 2147483647; box-sizing: border-box;',
    '  display: flex; align-items: center; justify-content: center; overflow-y: auto;',
    '  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));',
    '  background: radial-gradient(circle at 50% 20%, #3a2138, #140d11 72%);',
    '  color: #fff6ee; font: 500 16px/1.5 system-ui, -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif;',
    '  -webkit-text-size-adjust: 100%; touch-action: manipulation;',
    '}',
    '#donz-gate-root * { box-sizing: border-box; }',
    '#donz-gate-card {',
    '  width: min(400px, 100%); margin: auto; padding: 24px 20px; border-radius: 22px;',
    '  background: linear-gradient(145deg, rgba(48,43,73,0.96), rgba(23,23,45,0.98));',
    '  border: 1px solid rgba(231,214,255,0.28); box-shadow: 0 12px 36px rgba(0,0,0,0.55);',
    '  display: grid; gap: 14px; text-align: left;',
    '}',
    '#donz-gate-title { margin: 0; font-size: 22px; font-weight: 700; color: #ffcf4a; text-align: center; }',
    '#donz-gate-sub { margin: 0; font-size: 14px; color: #d6c5cc; text-align: center; }',
    '#donz-gate-form { display: grid; gap: 12px; margin: 0; }',
    '#donz-gate-input {',
    '  width: 100%; min-height: 48px; padding: 10px 14px; border-radius: 14px;',
    '  font: inherit; font-size: 16px; color: #fff6ee; background: rgba(255,255,255,0.1);',
    '  border: 1px solid rgba(255,255,255,0.34); -webkit-user-select: text; user-select: text;',
    '}',
    '#donz-gate-input:focus { outline: 2px solid #ffcf4a; outline-offset: 2px; border-color: #ffcf4a; }',
    '#donz-gate-err { margin: 0; min-height: 1.5em; font-size: 14px; color: #ff7b8b; text-align: center; }',
    '#donz-gate-submit {',
    '  width: 100%; min-height: 52px; padding: 10px 18px; border: 0; border-radius: 26px;',
    '  font: inherit; font-size: 17px; font-weight: 700; color: #1a0f13; cursor: pointer;',
    '  background: linear-gradient(135deg, #ffcf4a, #ff9a3c); box-shadow: 0 6px 20px rgba(255,154,60,0.35);',
    '}',
    '#donz-gate-submit:disabled { opacity: 0.45; cursor: not-allowed; }',
  ].join('\n');

  function boot(win, overrides) {
    const cfg = Object.assign({}, DEFAULT_CONFIG, overrides || {});
    const doc = win.document;
    const nowFn = typeof cfg.now === 'function' ? cfg.now : () => Date.now();
    let storage = null;
    try {
      storage = win.localStorage || null;
    } catch (e) {
      storage = null;
    }

    const search = win.location && typeof win.location.search === 'string' ? win.location.search : '';
    if (hasLockQuery(search)) {
      clearUnlock(storage, cfg.storageKey);
      try {
        if (win.history && typeof win.history.replaceState === 'function' && win.location && win.location.href) {
          const u = new URL(win.location.href);
          u.searchParams.delete('lock');
          win.history.replaceState(null, '', u.pathname + u.search + u.hash);
        }
      } catch (e) {}
    }

    const expectedHash = typeof cfg.passHash === 'string' ? cfg.passHash.trim().toLowerCase() : '';
    const configured = isValidHash(expectedHash);

    if (configured && readUnlock(storage, cfg.storageKey, expectedHash, cfg.ttlMs, nowFn())) {
      return { locked: false, configured: true, unlock: () => {}, lock: () => {} };
    }

    // 描画前に即ロックして元画面のチラ見えと背後操作を防ぐ
    let locked = true;
    const savedHidden = [];
    if (doc.documentElement && doc.documentElement.classList) {
      doc.documentElement.classList.add('donz-gate-locked');
    }
    if (!doc.getElementById('donz-gate-style')) {
      const style = doc.createElement('style');
      style.id = 'donz-gate-style';
      style.textContent = GATE_CSS;
      (doc.head || doc.documentElement).appendChild(style);
    }

    const blockBehindPointer = (e) => {
      if (!locked) return;
      const root = doc.getElementById('donz-gate-root');
      const inside = !!(root && e.target && typeof root.contains === 'function' && root.contains(e.target));
      if (!inside && typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    };
    const blockBehindKey = (e) => {
      if (!locked) return;
      const root = doc.getElementById('donz-gate-root');
      if (root && e.target && typeof root.contains === 'function' && root.contains(e.target)) return;
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    };
    if (typeof doc.addEventListener === 'function') {
      doc.addEventListener('pointerdown', blockBehindPointer, true);
      doc.addEventListener('keydown', blockBehindKey, true);
    }

    function applyInertToSiblings(rootEl) {
      if (!doc.body || !doc.body.children) return;
      for (const el of Array.from(doc.body.children)) {
        if (el === rootEl) continue;
        savedHidden.push({
          el,
          ariaHidden: el.getAttribute ? el.getAttribute('aria-hidden') : null,
          inert: el.inert,
        });
        if (typeof el.setAttribute === 'function') el.setAttribute('aria-hidden', 'true');
        try { el.inert = true; } catch (e) {}
      }
    }

    function restoreSiblings() {
      while (savedHidden.length) {
        const item = savedHidden.pop();
        try { item.el.inert = Boolean(item.inert); } catch (e) {}
        if (typeof item.el.setAttribute === 'function') {
          if (item.ariaHidden == null) item.el.removeAttribute('aria-hidden');
          else item.el.setAttribute('aria-hidden', item.ariaHidden);
        }
      }
    }

    function unlock() {
      if (!locked) return;
      locked = false;
      if (configured) writeUnlock(storage, cfg.storageKey, expectedHash, nowFn());
      if (doc.documentElement && doc.documentElement.classList) {
        doc.documentElement.classList.remove('donz-gate-locked');
      }
      restoreSiblings();
      const rootEl = doc.getElementById('donz-gate-root');
      if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      const styleEl = doc.getElementById('donz-gate-style');
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('pointerdown', blockBehindPointer, true);
        doc.removeEventListener('keydown', blockBehindKey, true);
      }
      const fireResize = () => {
        try {
          if (typeof win.dispatchEvent === 'function') {
            const Ev = typeof win.Event === 'function' ? win.Event : (typeof Event === 'function' ? Event : null);
            win.dispatchEvent(Ev ? new Ev('resize') : { type: 'resize' });
          }
        } catch (e) {}
      };
      fireResize();
      if (typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(fireResize);
    }

    function mountUI() {
      if (!locked || !doc.body || doc.getElementById('donz-gate-root')) return;
      const rootEl = doc.createElement('div');
      rootEl.id = 'donz-gate-root';
      rootEl.setAttribute('role', 'dialog');
      rootEl.setAttribute('aria-modal', 'true');
      rootEl.setAttribute('aria-labelledby', 'donz-gate-title');

      const card = doc.createElement('div');
      card.id = 'donz-gate-card';

      const title = doc.createElement('h1');
      title.id = 'donz-gate-title';
      title.textContent = cfg.title;

      const sub = doc.createElement('p');
      sub.id = 'donz-gate-sub';
      sub.textContent = cfg.subtitle;

      const form = doc.createElement('form');
      form.id = 'donz-gate-form';
      form.setAttribute('novalidate', '');

      const input = doc.createElement('input');
      input.id = 'donz-gate-input';
      input.type = 'text';
      input.setAttribute('inputmode', 'text');
      input.setAttribute('lang', 'ja');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('enterkeyhint', 'go');
      input.setAttribute('aria-label', '合言葉');
      input.placeholder = cfg.placeholder;

      const err = doc.createElement('p');
      err.id = 'donz-gate-err';
      err.setAttribute('role', 'alert');
      err.setAttribute('aria-live', 'polite');

      const submit = doc.createElement('button');
      submit.id = 'donz-gate-submit';
      submit.type = 'submit';
      submit.textContent = cfg.submitLabel;

      if (!configured) {
        input.disabled = true;
        submit.disabled = true;
        err.textContent = '準備中です（合言葉がまだ設定されていません）';
      }

      form.addEventListener('submit', (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (!configured) {
          err.textContent = '準備中です（合言葉がまだ設定されていません）';
          return;
        }
        const raw = input.value;
        if (!normalizePassphrase(raw)) {
          err.textContent = '合言葉を入れてね';
          try { input.focus(); } catch (ex) {}
          return;
        }
        if (verifyPassphrase(raw, expectedHash)) {
          input.value = '';
          err.textContent = '';
          unlock();
          return;
        }
        input.value = '';
        err.textContent = '合言葉がちがうみたい';
        try { input.focus(); } catch (ex) {}
      });

      form.appendChild(input);
      form.appendChild(err);
      form.appendChild(submit);
      card.appendChild(title);
      card.appendChild(sub);
      card.appendChild(form);
      rootEl.appendChild(card);

      applyInertToSiblings(rootEl);
      doc.body.appendChild(rootEl);
      if (configured) {
        try { input.focus(); } catch (e) {}
      }
    }

    if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', mountUI, { once: true });
    } else {
      mountUI();
    }

    return {
      get locked() { return locked; },
      configured,
      unlock,
      lock: () => clearUnlock(storage, cfg.storageKey),
      mountUI,
    };
  }

  return Object.freeze({
    PLACEHOLDER,
    DEFAULT_CONFIG,
    sha256Hex,
    normalizePassphrase,
    hashPassphrase,
    isValidHash,
    verifyPassphrase,
    readUnlock,
    writeUnlock,
    clearUnlock,
    hasLockQuery,
    boot,
  });
});
