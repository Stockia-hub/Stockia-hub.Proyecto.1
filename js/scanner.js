// ============================================================
// Stockia v5.2 — scanner.js
// Escáner de código de barras via cámara del celular.
// Usa BarcodeDetector API nativa (Chrome Android / Safari 17+).
// Fallback: entrada manual del código.
//
// Interfaz pública:
//   window._stockiaScanner.abrir(onCode, { titulo, continuo })
//   window._stockiaScanner.cerrar()
//   window._stockiaScanner.setResultado(msg, 'ok'|'err')
// ============================================================
(function () {
  'use strict';

  // ── Estilos del overlay ─────────────────────────────────
  const CSS = `
    #sc-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;animation:sc-in .2s ease}
    @keyframes sc-in{from{opacity:0}to{opacity:1}}
    #sc-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.65)}
    #sc-panel{position:relative;z-index:1;background:#111827;border-radius:20px 20px 0 0;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 40px rgba(0,0,0,.5)}
    #sc-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#1a2f6b;color:#fff;font-size:15px;font-weight:700;flex-shrink:0}
    #sc-close{background:rgba(255,255,255,.18);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center}
    #sc-close:hover{background:rgba(255,255,255,.3)}
    #sc-viewport{position:relative;width:100%;flex-shrink:0;overflow:hidden;background:#000;max-height:55vh;aspect-ratio:4/3}
    #sc-video{width:100%;height:100%;object-fit:cover;display:block}
    #sc-frame{position:absolute;inset:12% 15%;pointer-events:none}
    .sc-corner{position:absolute;width:26px;height:26px;border-color:#60a5fa;border-style:solid;border-width:0;transition:border-color .2s}
    .sc-corner.tl{top:0;left:0;border-top-width:3px;border-left-width:3px;border-radius:6px 0 0 0}
    .sc-corner.tr{top:0;right:0;border-top-width:3px;border-right-width:3px;border-radius:0 6px 0 0}
    .sc-corner.bl{bottom:0;left:0;border-bottom-width:3px;border-left-width:3px;border-radius:0 0 0 6px}
    .sc-corner.br{bottom:0;right:0;border-bottom-width:3px;border-right-width:3px;border-radius:0 0 6px 0}
    .sc-line{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#3b82f6,transparent);animation:sc-scan 2.2s ease-in-out infinite}
    @keyframes sc-scan{0%{top:5%;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:95%;opacity:0}}
    #sc-hint{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:12px;color:rgba(255,255,255,.8);text-shadow:0 1px 4px rgba(0,0,0,.7)}
    #sc-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .08s}
    #sc-frame.sc-hit .sc-corner{border-color:#34d399}
    #sc-feedback{padding:14px 18px;min-height:54px;display:flex;align-items:center;justify-content:center;font-size:14px;text-align:center;color:rgba(255,255,255,.55);flex-shrink:0}
    .sc-ok{color:#34d399!important;font-weight:700;font-size:15px!important}
    .sc-err{color:#fbbf24!important;font-weight:600}
    #sc-manual{display:flex;gap:8px;padding:0 18px 20px;flex-shrink:0}
    #sc-manual-inp{flex:1;padding:10px 14px;border-radius:10px;border:1.5px solid #374151;background:#1f2937;color:#fff;font-size:14px;font-family:inherit;outline:none}
    #sc-manual-inp:focus{border-color:#3b82f6}
    #sc-manual-inp::placeholder{color:#6b7280}
    #sc-manual-btn{padding:10px 16px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}
    #sc-manual-btn:hover{background:#2563eb}
  `;

  // ── Estado interno ──────────────────────────────────────
  let _overlay  = null, _video = null, _stream = null;
  let _detector = null, _scanning = false, _continuo = false;
  let _onCode   = null, _audioCtx = null;
  let _lastCode = '', _lastTime = 0;
  const DEBOUNCE = 2000;

  // ── API pública ─────────────────────────────────────────
  function abrir(onCode, opts = {}) {
    _onCode   = onCode;
    _continuo = opts.continuo || false;
    _build(opts.titulo || '📷 Escanear código de barras');
    _startCamera();
  }

  function cerrar() {
    _scanning = false;
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
    if (_overlay) { _overlay.remove(); _overlay = null; }
  }

  function setResultado(msg, tipo) {
    const el = document.getElementById('sc-feedback');
    if (!el) return;
    el.className = tipo === 'ok' ? 'sc-ok' : 'sc-err';
    el.innerHTML = msg;
  }

  // ── UI ──────────────────────────────────────────────────
  function _build(titulo) {
    document.getElementById('sc-overlay')?.remove();
    if (!document.getElementById('sc-css')) {
      const s = document.createElement('style');
      s.id = 'sc-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }

    _overlay = document.createElement('div');
    _overlay.id = 'sc-overlay';
    _overlay.innerHTML = `
      <div id="sc-backdrop"></div>
      <div id="sc-panel">
        <div id="sc-header">
          <span>${titulo}</span>
          <button id="sc-close">✕</button>
        </div>
        <div id="sc-viewport">
          <video id="sc-video" playsinline muted autoplay></video>
          <div id="sc-frame">
            <div class="sc-corner tl"></div><div class="sc-corner tr"></div>
            <div class="sc-corner bl"></div><div class="sc-corner br"></div>
            <div class="sc-line"></div>
          </div>
          <div id="sc-flash"></div>
          <div id="sc-hint">Apuntá la cámara al código de barras</div>
        </div>
        <div id="sc-feedback">Iniciando cámara...</div>
        <div id="sc-manual">
          <input id="sc-manual-inp" type="text" inputmode="numeric"
            placeholder="O ingresá el código manualmente">
          <button id="sc-manual-btn">Buscar</button>
        </div>
      </div>`;

    document.body.appendChild(_overlay);
    _video = document.getElementById('sc-video');

    document.getElementById('sc-close').onclick    = cerrar;
    document.getElementById('sc-backdrop').onclick = cerrar;
    const go = () => {
      const v = document.getElementById('sc-manual-inp').value.trim();
      if (v) { document.getElementById('sc-manual-inp').value = ''; _handle(v); }
    };
    document.getElementById('sc-manual-btn').onclick = go;
    document.getElementById('sc-manual-inp').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  // ── Cámara ──────────────────────────────────────────────
  async function _startCamera() {
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
      });
      _video.srcObject = _stream;
      await _video.play();
      _fb('Buscando código...', '');
      _initDetector();
    } catch (err) {
      _fb(_errMsg(err), 'sc-err');
    }
  }

  async function _initDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const fmts = await BarcodeDetector.getSupportedFormats();
        _detector = new BarcodeDetector({ formats: fmts });
        _scanning = true;
        _loop();
        return;
      } catch {}
    }
    _fb('Navegador sin soporte nativo de escaneo. Usá el campo de abajo.', 'sc-err');
    document.getElementById('sc-manual-inp').focus();
  }

  function _loop() {
    if (!_scanning) return;
    if (!_video || _video.readyState < 4) { requestAnimationFrame(_loop); return; }
    _detector.detect(_video).then(codes => {
      if (codes.length) {
        const code = codes[0].rawValue, now = Date.now();
        if (code !== _lastCode || (now - _lastTime) > DEBOUNCE) {
          _lastCode = code; _lastTime = now;
          _beep(); _flash(); _handle(code);
        }
      }
    }).catch(() => {}).finally(() => { if (_scanning) requestAnimationFrame(_loop); });
  }

  async function _handle(code) {
    _fb(`🔍 Buscando "${code}"...`, '');
    if (!_onCode) return;
    try {
      await _onCode(code);
      if (!_continuo) setTimeout(cerrar, 900);
    } catch {}
  }

  // ── Helpers ─────────────────────────────────────────────
  function _fb(msg, cls) {
    const el = document.getElementById('sc-feedback');
    if (!el) return;
    el.className = cls; el.innerHTML = msg;
  }
  function _beep() {
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = _audioCtx.createOscillator(), g = _audioCtx.createGain();
      o.connect(g); g.connect(_audioCtx.destination);
      o.frequency.value = 1800;
      g.gain.setValueAtTime(0.25, _audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.12);
      o.start(); o.stop(_audioCtx.currentTime + 0.12);
    } catch {}
  }
  function _flash() {
    const f = document.getElementById('sc-flash');
    if (f) { f.style.opacity = '0.5'; setTimeout(() => { if(f) f.style.opacity = '0'; }, 100); }
    const fr = document.getElementById('sc-frame');
    if (fr) { fr.classList.add('sc-hit'); setTimeout(() => fr.classList.remove('sc-hit'), 300); }
  }
  function _errMsg(e) {
    if (e.name === 'NotAllowedError') return '❌ Permiso de cámara denegado. Habilitalo en la configuración del navegador.';
    if (e.name === 'NotFoundError')   return '❌ No se encontró cámara en el dispositivo.';
    return '❌ Error de cámara: ' + e.message;
  }

  window._stockiaScanner = { abrir, cerrar, setResultado };
})();
