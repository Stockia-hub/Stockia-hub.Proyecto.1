// ============================================================
// Stockia v5.2 — Logo SVG centralizado
// Reemplaza los 13 bloques SVG inline duplicados en cada HTML.
//
// Uso en HTML:
//   App pages (nav):  <a class="nav-logo" data-logo="nav" href="..."></a>
//   Auth pages login: <span data-logo="auth-login"></span>
//   Auth pages resto: <span data-logo="auth" class="logo-svg"></span>
//
// Requiere: cargarse con atributo defer en el <head>.
// ============================================================

(function () {
  // Contenido SVG compartido por todas las variantes
  var _inner = [
    '<text x="0" y="40" font-family="Poppins,sans-serif" font-weight="800" font-size="42" fill="white" letter-spacing="-1">St</text>',
    '<g transform="translate(55,7)">',
      '<rect x="0" y="12" width="26" height="18" rx="3" fill="white" opacity=".15"/>',
      '<rect x="0" y="12" width="26" height="18" rx="3" fill="none" stroke="white" stroke-width="2.5"/>',
      '<path d="M0 12 L5 5 L21 5 L26 12" fill="none" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>',
      '<line x1="5" y1="5" x2="7" y2="12" stroke="white" stroke-width="1.5" opacity=".6"/>',
      '<line x1="21" y1="5" x2="19" y2="12" stroke="white" stroke-width="1.5" opacity=".6"/>',
      '<line x1="13" y1="12" x2="13" y2="30" stroke="white" stroke-width="1.2" opacity=".4"/>',
    '</g>',
    '<text x="86" y="40" font-family="Poppins,sans-serif" font-weight="800" font-size="42" fill="white" letter-spacing="-1">ckia</text>',
  ].join('');

  // Nav (páginas de la app)
  document.querySelectorAll('[data-logo="nav"]').forEach(function (el) {
    el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" class="nav-logo-svg">' + _inner + '</svg>';
  });

  // Auth — login.html (con width/height explícitos)
  document.querySelectorAll('[data-logo="auth-login"]').forEach(function (el) {
    el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" width="200" height="46">' + _inner + '</svg>';
  });

  // Auth — recuperar.html y nueva-password.html (con class="logo-svg")
  document.querySelectorAll('[data-logo="auth"]').forEach(function (el) {
    el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 50" class="logo-svg">' + _inner + '</svg>';
  });
})();
