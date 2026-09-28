/**
 * Consentimiento de cookies.
 *
 * Qué hace:
 *   - La primera visita muestra un aviso con Rechazar / Aceptar (mismo
 *     formato y mismo peso, como pide la AEPD) y un enlace a Configurar.
 *   - La elección se guarda en el navegador 12 meses; después se vuelve a
 *     preguntar.
 *   - "Configurar cookies" en el pie (o cualquier elemento con
 *     data-abrir-cookies) reabre el aviso con las opciones desplegadas.
 *
 * Google Tag Manager / Analytics: los IDs van en GTM_ID o GA_ID (abajo);
 * se cargan solo con consentimiento.
 *
 * Cualquier OTRO script opcional se escribe como
 *
 *     <script type="text/plain" data-consentimiento="analiticas" src="..."></script>
 *
 * El navegador no lo ejecuta (type="text/plain"); este archivo lo activa
 * solo si el visitante ha aceptado las analíticas. Si luego las rechaza,
 * se borran las cookies de analítica conocidas y se recarga la página para
 * que dejen de funcionar los scripts ya cargados.
 *
 * Sin IDs ni scripts marcados así, aceptar o rechazar no cambia nada.
 */
(function () {
  // Contenedor de Google Tag Manager. Google Analytics se configura DENTRO
  // del contenedor (etiqueta de Google con el ID "G-..."), no aquí. Se carga
  // SOLO si el visitante acepta las cookies de análisis; si las rechaza, ni
  // se descarga. El <noscript> que propone Google no se usa a propósito:
  // cargaría Google a visitantes sin JS, que no pueden dar consentimiento.
  var GTM_ID = ''; // Contenedor creado: GTM-NT8R7BB8 (sin uso; Analytics va directo)

  // Alternativa sin Tag Manager: ID de Google Analytics 4 directo. Usar uno
  // de los dos, no ambos (si Analytics está también en el contenedor, cada
  // visita contaría doble).
  var GA_ID = 'G-TFT5J46CCJ';

  var CLAVE = 'procelaos_consentimiento';
  var VERSION = 1;
  var VIGENCIA_MS = 365 * 24 * 60 * 60 * 1000;
  // Prefijos de cookies de las herramientas de analítica habituales
  // (Google Analytics, Microsoft Clarity, Hotjar...), para borrarlas al
  // retirar el consentimiento.
  var PREFIJOS_ANALITICA = ['_ga', '_gid', '_gat', '_clck', '_clsk', '_hj'];

  var aviso = null;

  function leer() {
    try {
      var d = JSON.parse(window.localStorage.getItem(CLAVE));
      if (!d || d.v !== VERSION || Date.now() - d.fecha > VIGENCIA_MS) return null;
      return d;
    } catch (e) {
      return null;
    }
  }

  function guardar(analiticas) {
    var anterior = leer();
    var d = { v: VERSION, analiticas: !!analiticas, fecha: Date.now() };
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(d));
    } catch (e) {
      // Almacenamiento bloqueado (modo privado estricto): la elección vale
      // para esta página y se volverá a preguntar en la siguiente.
    }

    if (anterior && anterior.analiticas && !d.analiticas) {
      borrarCookiesAnalitica();
      window.location.reload();
      return;
    }
    aplicar(d);
  }

  function aplicar(d) {
    if (!d || !d.analiticas) return;
    activarScripts('analiticas');
    cargarTagManager();
    cargarGoogleAnalytics();
  }

  // El fragmento oficial de Tag Manager, ejecutado solo tras el
  // consentimiento en vez de en el <head> de cada página.
  function cargarTagManager() {
    if (!GTM_ID || window.__procelaosGtm) return;
    window.__procelaosGtm = true;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
    document.head.appendChild(s);
  }

  function cargarGoogleAnalytics() {
    if (!GA_ID || window.gtag) return;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  // Sustituye cada <script type="text/plain" data-consentimiento="..."> por
  // uno ejecutable con los mismos atributos y contenido.
  function activarScripts(categoria) {
    var pendientes = document.querySelectorAll('script[type="text/plain"][data-consentimiento="' + categoria + '"]');
    Array.prototype.forEach.call(pendientes, function (viejo) {
      var nuevo = document.createElement('script');
      Array.prototype.forEach.call(viejo.attributes, function (a) {
        if (a.name !== 'type' && a.name !== 'data-consentimiento') nuevo.setAttribute(a.name, a.value);
      });
      nuevo.text = viejo.text;
      viejo.parentNode.replaceChild(nuevo, viejo);
    });
  }

  function borrarCookiesAnalitica() {
    var dominios = ['', window.location.hostname, '.' + window.location.hostname.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var nombre = c.split('=')[0].trim();
      var esAnalitica = PREFIJOS_ANALITICA.some(function (p) { return nombre.indexOf(p) === 0; });
      if (!esAnalitica) return;
      dominios.forEach(function (dom) {
        document.cookie = nombre + '=; Max-Age=0; path=/' + (dom ? '; domain=' + dom : '');
      });
    });
  }

  /* --------------------------------------------------------------------
     Aviso
     -------------------------------------------------------------------- */

  function crearAviso() {
    var el = document.createElement('section');
    el.className = 'cookies';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-labelledby', 'cookiesTitulo');
    el.setAttribute('aria-describedby', 'cookiesTexto');
    el.hidden = true;

    el.innerHTML =
      '<p class="eyebrow cookies__eyebrow">Cookies</p>' +
      '<h2 class="cookies__titulo" id="cookiesTitulo">¿Nos dejas medir las visitas?</h2>' +
      '<p class="cookies__texto" id="cookiesTexto">Solo usamos cookies de analítica si nos das permiso: sirven para contar visitas y ver qué páginas se leen. Sin ellas, la web funciona igual. <a href="/cookies">Política de cookies</a></p>' +

      '<div class="cookies__panel" id="cookiesPanel" hidden>' +
        '<div class="cookies__opcion">' +
          '<div>' +
            '<p class="cookies__opcion-titulo">Necesarias</p>' +
            '<p class="cookies__opcion-texto">Guardan tu elección sobre este aviso.</p>' +
          '</div>' +
          '<span class="cookies__fijo">Siempre activas</span>' +
        '</div>' +
        '<div class="cookies__opcion">' +
          '<div>' +
            '<p class="cookies__opcion-titulo" id="cookiesAnaliticasTitulo">Analíticas</p>' +
            '<p class="cookies__opcion-texto">Cuentan visitas y páginas vistas, de forma agregada.</p>' +
          '</div>' +
          '<label class="interruptor">' +
            '<input type="checkbox" role="switch" id="cookiesAnaliticas" aria-labelledby="cookiesAnaliticasTitulo">' +
            '<span class="interruptor__pista" aria-hidden="true"></span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div class="cookies__acciones">' +
        '<button type="button" class="btn cookies__btn" data-cookies="rechazar">Rechazar</button>' +
        '<button type="button" class="btn cookies__btn" data-cookies="aceptar">Aceptar</button>' +
        '<button type="button" class="btn cookies__btn cookies__btn--guardar" data-cookies="guardar" hidden>Guardar preferencias</button>' +
      '</div>' +
      '<button type="button" class="cookies__configurar" data-cookies="configurar" aria-expanded="false" aria-controls="cookiesPanel">Configurar</button>';

    el.addEventListener('click', function (e) {
      var boton = e.target.closest('[data-cookies]');
      if (!boton) return;
      var accion = boton.getAttribute('data-cookies');

      if (accion === 'aceptar') cerrarCon(true);
      else if (accion === 'rechazar') cerrarCon(false);
      else if (accion === 'guardar') cerrarCon(el.querySelector('#cookiesAnaliticas').checked);
      else if (accion === 'configurar') mostrarPanel(el.querySelector('#cookiesPanel').hidden);
    });

    // Justo después del enlace "Saltar al contenido": así el aviso es de lo
    // primero que encuentra quien navega con teclado o lector de pantalla.
    var salto = document.querySelector('.skip-link');
    if (salto) salto.insertAdjacentElement('afterend', el);
    else document.body.insertBefore(el, document.body.firstChild);

    return el;
  }

  function mostrarPanel(abrir) {
    var panel = aviso.querySelector('#cookiesPanel');
    panel.hidden = !abrir;
    aviso.querySelector('[data-cookies="configurar"]').setAttribute('aria-expanded', abrir ? 'true' : 'false');
    aviso.querySelector('[data-cookies="configurar"]').textContent = abrir ? 'Ocultar opciones' : 'Configurar';
    aviso.querySelector('[data-cookies="guardar"]').hidden = !abrir;
    aviso.classList.toggle('cookies--configurando', abrir);
  }

  function abrir(conOpciones) {
    if (!aviso) aviso = crearAviso();

    var actual = leer();
    aviso.querySelector('#cookiesAnaliticas').checked = !!(actual && actual.analiticas);
    mostrarPanel(!!conOpciones);

    aviso.hidden = false;
    // Dos frames: quitar "hidden" y añadir la clase en el mismo frame se
    // colapsa y no se ve la entrada.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        aviso.classList.add('is-visible');
      });
    });

    if (conOpciones) aviso.querySelector('#cookiesAnaliticas').focus();
  }

  function cerrarCon(analiticas) {
    aviso.classList.remove('is-visible');
    setTimeout(function () { aviso.hidden = true; }, 300);
    guardar(analiticas);
  }

  /* --------------------------------------------------------------------
     Arranque
     -------------------------------------------------------------------- */

  function iniciar() {
    var d = leer();
    aplicar(d);

    // Enlace para reabrir el aviso desde el pie de todas las páginas, justo
    // detrás de "Cookies". Lo añade el JS porque sin JS no hay aviso que
    // reabrir.
    var enlaceCookies = document.querySelector('.site-footer__legal a[href="/cookies"]');
    if (enlaceCookies && !document.querySelector('.site-footer__legal [data-abrir-cookies]')) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'enlace-cookies';
      boton.setAttribute('data-abrir-cookies', '');
      boton.textContent = 'Configurar cookies';
      enlaceCookies.insertAdjacentElement('afterend', boton);
      enlaceCookies.insertAdjacentText('afterend', ' · ');
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-abrir-cookies]')) abrir(true);
    });

    if (!d) setTimeout(function () { abrir(false); }, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
