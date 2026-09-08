document.addEventListener('DOMContentLoaded', function () {

  // Menú móvil
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = siteNav.classList.toggle('is-open');
      document.body.classList.toggle('nav-open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });

    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        siteNav.classList.remove('is-open');
        document.body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  // Acordeón de FAQ
  var triggers = document.querySelectorAll('.accordion__trigger');

  triggers.forEach(function (trigger) {
    var panel = trigger.nextElementSibling;
    panel.style.maxHeight = null;

    trigger.addEventListener('click', function () {
      var isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      triggers.forEach(function (otherTrigger) {
        otherTrigger.setAttribute('aria-expanded', 'false');
        otherTrigger.nextElementSibling.style.maxHeight = null;
      });

      if (!isExpanded) {
        trigger.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  // Secuencia de entrada del hero: envuelve cada palabra del <h1> en un
  // span.hero-word para animarlas en cascada.
  var heroTitle = document.querySelector('.hero h1');
  if (heroTitle) {
    var originalNodes = Array.prototype.slice.call(heroTitle.childNodes);
    var delayStep = 45;
    var wordIndex = 0;
    var wordDurationMs = 420;

    heroTitle.textContent = '';

    originalNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (chunk === '') return;

          if (/^\s+$/.test(chunk)) {
            heroTitle.appendChild(document.createTextNode(chunk));
            return;
          }

          var word = document.createElement('span');
          word.className = 'hero-word';
          word.textContent = chunk;
          word.style.animationDelay = (wordIndex * delayStep) + 'ms';
          heroTitle.appendChild(word);
          wordIndex += 1;
        });
      } else {
        var baseDelay = wordIndex * delayStep;
        node.classList.add('hero-word', 'hero-word--highlight');
        node.style.animationDelay = baseDelay + 'ms, ' + (baseDelay + wordDurationMs) + 'ms';
        heroTitle.appendChild(node);
        wordIndex += 1;
      }
    });
  }

  // Header dinámico al hacer scroll
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    var scrollTicking = false;

    var actualizarHeaderScroll = function () {
      siteHeader.classList.toggle('site-header--scrolled', window.scrollY > 80);
      scrollTicking = false;
    };

    var onScrollHeader = function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(actualizarHeaderScroll);
        scrollTicking = true;
      }
    };

    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, { passive: true });
  }

  // Año en el footer
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  inicializarGraficoDeHitos();
  inicializarBotonesMagneticos();
  inicializarSpotlightTarjetas();
  inicializarParticulasFondo();
  inicializarRevealGenerico();
  inicializarFormularioLead();

  // Lightbox de la galería de capturas (capacidades.html).
  inicializarLightboxGaleria();

  function prefiereMovimientoReducido() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function inicializarGraficoDeHitos() {
    var storyChart = document.getElementById('storyChart');
    if (!storyChart) return;

    var path = storyChart.querySelector('.story-chart__path');
    var puntos = Array.prototype.slice.call(storyChart.querySelectorAll('.story-chart__point'));
    if (!path || puntos.length === 0) return;

    var DURACION_TRAZO_MS = 2000;

    var umbrales = calcularUmbralesPorPosicion(path, puntos);
    puntos.forEach(function (punto, i) {
      punto.style.transitionDelay = Math.round(umbrales[i] * DURACION_TRAZO_MS) + 'ms';
    });

    function activar() {
      storyChart.classList.add('is-visible');
    }

    if (prefiereMovimientoReducido()) {
      activar();
      return;
    }

    if ('IntersectionObserver' in window) {
      var chartObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            activar();
            chartObserver.unobserve(storyChart);
          }
        });
      }, { threshold: 0.4 });

      chartObserver.observe(storyChart);
    } else {
      activar();
    }
  }

  function calcularUmbralesPorPosicion(path, puntos) {
    var longitudTotal = path.getTotalLength();
    var muestras = 200;

    return puntos.map(function (punto) {
      var cx = parseFloat(punto.getAttribute('cx'));
      var cy = parseFloat(punto.getAttribute('cy'));
      var mejorT = 0;
      var mejorDistancia = Infinity;

      for (var i = 0; i <= muestras; i++) {
        var t = i / muestras;
        var p = path.getPointAtLength(t * longitudTotal);
        var dx = p.x - cx;
        var dy = p.y - cy;
        var distancia = dx * dx + dy * dy;

        if (distancia < mejorDistancia) {
          mejorDistancia = distancia;
          mejorT = t;
        }
      }

      return mejorT;
    });
  }

  function inicializarBotonesMagneticos() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (prefiereMovimientoReducido()) return;

    var RADIO = 40;
    var DESPLAZAMIENTO_MAX = 8;

    var botones = Array.prototype.slice.call(
      document.querySelectorAll('.hero__actions .btn--primary, .demo-cta .btn--primary, .cta-band__actions .btn--primary, .site-nav__actions .btn--primary')
    );
    if (botones.length === 0) return;

    var estados = botones.map(function (el) {
      el.classList.add('btn--magnetic');
      return { el: el, targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
    });

    var mouseX = null;
    var mouseY = null;
    var animando = false;

    function tick() {
      var enReposo = true;

      estados.forEach(function (estado) {
        if (mouseX !== null) {
          var rect = estado.el.getBoundingClientRect();
          var cx = rect.left + rect.width / 2;
          var cy = rect.top + rect.height / 2;
          var dx = mouseX - cx;
          var dy = mouseY - cy;
          var distX = Math.max(Math.abs(dx) - rect.width / 2, 0);
          var distY = Math.max(Math.abs(dy) - rect.height / 2, 0);
          var distancia = Math.sqrt(distX * distX + distY * distY);

          if (distancia < RADIO) {
            var fuerza = 1 - distancia / RADIO;
            estado.targetX = (dx / rect.width) * DESPLAZAMIENTO_MAX * fuerza;
            estado.targetY = (dy / rect.height) * DESPLAZAMIENTO_MAX * fuerza;
          } else {
            estado.targetX = 0;
            estado.targetY = 0;
          }
        } else {
          estado.targetX = 0;
          estado.targetY = 0;
        }

        var factor = (estado.targetX === 0 && estado.targetY === 0) ? 0.12 : 0.25;
        estado.currentX += (estado.targetX - estado.currentX) * factor;
        estado.currentY += (estado.targetY - estado.currentY) * factor;

        if (Math.abs(estado.currentX) < 0.05) estado.currentX = 0;
        if (Math.abs(estado.currentY) < 0.05) estado.currentY = 0;

        estado.el.style.setProperty('--magnet-x', estado.currentX.toFixed(2) + 'px');
        estado.el.style.setProperty('--magnet-y', estado.currentY.toFixed(2) + 'px');

        if (estado.currentX !== 0 || estado.currentY !== 0 || estado.targetX !== 0 || estado.targetY !== 0) {
          enReposo = false;
        }
      });

      if (enReposo) {
        animando = false;
        return;
      }

      window.requestAnimationFrame(tick);
    }

    function solicitarFrame() {
      if (!animando) {
        animando = true;
        window.requestAnimationFrame(tick);
      }
    }

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      solicitarFrame();
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      mouseX = null;
      mouseY = null;
      solicitarFrame();
    });
  }

  function inicializarParticulasFondo() {
    var canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var BLANCO = '255, 255, 255';
    var NARANJA = '255, 107, 26';
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    var RADIO_REPULSION = 110;
    var FUERZA_REPULSION = 2.4;

    var particulas = [];
    var anchoCss = 0;
    var altoCss = 0;
    var rafId = null;
    var resizeTimeout = null;
    var mouseX = null;
    var mouseY = null;

    function numeroDeParticulasPara(ancho, alto) {
      var area = ancho * alto;
      var densidad = ancho < 640 ? (1 / 16000) : ancho < 1024 ? (1 / 15000) : (1 / 14000);
      var cantidad = Math.round(area * densidad);
      return Math.max(18, Math.min(cantidad, 110));
    }

    function crearParticula() {
      var esNaranja = Math.random() < 0.2;
      return {
        x: Math.random() * anchoCss,
        y: Math.random() * altoCss,
        radio: 1.5 + Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        opacidad: 0.55 + Math.random() * 0.4,
        color: esNaranja ? NARANJA : BLANCO
      };
    }

    function generarParticulas() {
      var cuantas = numeroDeParticulasPara(anchoCss, altoCss);
      particulas = [];
      for (var i = 0; i < cuantas; i++) {
        particulas.push(crearParticula());
      }
    }

    function ajustarTamano() {
      anchoCss = window.innerWidth;
      altoCss = window.innerHeight;

      canvas.width = Math.round(anchoCss * DPR);
      canvas.height = Math.round(altoCss * DPR);
      canvas.style.width = anchoCss + 'px';
      canvas.style.height = altoCss + 'px';

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      generarParticulas();
    }

    function dibujarFrame() {
      ctx.clearRect(0, 0, anchoCss, altoCss);
      particulas.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.color + ', ' + p.opacidad + ')';
        ctx.fill();
      });
    }

    function actualizarParticulas() {
      particulas.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;

        if (mouseX !== null) {
          var dx = p.x - mouseX;
          var dy = p.y - mouseY;
          var distancia = Math.sqrt(dx * dx + dy * dy);

          if (distancia < RADIO_REPULSION && distancia > 0.01) {
            var fuerza = (1 - distancia / RADIO_REPULSION) * FUERZA_REPULSION;
            p.x += (dx / distancia) * fuerza;
            p.y += (dy / distancia) * fuerza;
          }
        }

        if (p.x < -p.radio) p.x = anchoCss + p.radio;
        else if (p.x > anchoCss + p.radio) p.x = -p.radio;

        if (p.y < -p.radio) p.y = altoCss + p.radio;
        else if (p.y > altoCss + p.radio) p.y = -p.radio;
      });
    }

    function tick() {
      actualizarParticulas();
      dibujarFrame();
      rafId = window.requestAnimationFrame(tick);
    }

    function iniciarAnimacion() {
      if (rafId !== null || prefiereMovimientoReducido() || document.hidden) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function detenerAnimacion() {
      if (rafId === null) return;
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    ajustarTamano();
    dibujarFrame();

    if (prefiereMovimientoReducido()) {
      // Ni una partícula en movimiento: se dibujan una vez, quietas.
    } else {
      iniciarAnimacion();

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          detenerAnimacion();
        } else {
          iniciarAnimacion();
        }
      });

      if (window.matchMedia('(hover: hover)').matches) {
        document.addEventListener('mousemove', function (e) {
          mouseX = e.clientX;
          mouseY = e.clientY;
        }, { passive: true });

        document.addEventListener('mouseleave', function () {
          mouseX = null;
          mouseY = null;
        });
      }
    }

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        ajustarTamano();
        dibujarFrame();
      }, 200);
    });
  }

  function inicializarRevealGenerico() {
    document.documentElement.classList.add('reveal-ready');

    var elementos = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (elementos.length === 0) return;

    if (prefiereMovimientoReducido()) {
      elementos.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      elementos.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var PASO_STAGGER_MS = 90;

    var observador = new IntersectionObserver(function (entries) {
      var indice = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        el.style.transitionDelay = (indice * PASO_STAGGER_MS) + 'ms';
        el.classList.add('is-visible');
        observador.unobserve(el);
        indice += 1;
      });
    }, { threshold: 0.12 });

    elementos.forEach(function (el) {
      observador.observe(el);
    });
  }

  function inicializarSpotlightTarjetas() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (prefiereMovimientoReducido()) return;

    var tarjetas = Array.prototype.slice.call(
      document.querySelectorAll('.card')
    );
    if (tarjetas.length === 0) return;

    tarjetas.forEach(function (tarjeta) {
      tarjeta.addEventListener('mousemove', function (e) {
        var rect = tarjeta.getBoundingClientRect();
        tarjeta.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        tarjeta.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
    });
  }

  // Formulario de captación (#diagnostico): wizard de 5 pasos, validación
  // por paso en cliente + honeypot anti-spam. Sin backend todavía -- TODO:
  // sustituir el bloque marcado más abajo por un fetch() real a un webhook
  // (ej. n8n) que guarde el lead y avise por Telegram/email.
  function inicializarFormularioLead() {
    var form = document.getElementById('leadForm');
    if (!form) return;

    var pasos = Array.prototype.slice.call(form.querySelectorAll('.wizard-step'));
    if (pasos.length === 0) return;

    var TOTAL_PASOS = pasos.length;
    var TITULOS = ['Contacto', 'Tu negocio', 'Situación actual', 'Qué automatizar', 'Presupuesto'];
    var pasoActual = 1;

    var errorEl = document.getElementById('leadFormError');
    var successEl = document.getElementById('leadFormSuccess');
    var btnAtras = document.getElementById('wizardBack');
    var btnSiguiente = document.getElementById('wizardNext');
    var btnEnviar = document.getElementById('wizardSubmit');
    var fillEl = document.getElementById('wizardFill');
    var numEl = document.getElementById('wizardStepNum');
    var tituloEl = document.getElementById('wizardStepTitle');

    var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function mostrarError(mensaje) {
      errorEl.textContent = mensaje;
      errorEl.hidden = false;
    }

    function limpiarError() {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    // Pills (selección única) y option-cards (única o múltiple, según
    // data-multi) comparten el mismo patrón: click alterna 'is-selected'.
    function inicializarSelectores(contenedorSelector) {
      var grupos = Array.prototype.slice.call(form.querySelectorAll(contenedorSelector));
      grupos.forEach(function (grupo) {
        var multi = grupo.getAttribute('data-multi') === 'true';
        var botones = Array.prototype.slice.call(grupo.querySelectorAll('button[data-value]'));
        botones.forEach(function (boton) {
          boton.addEventListener('click', function () {
            if (multi) {
              boton.classList.toggle('is-selected');
            } else {
              botones.forEach(function (b) { b.classList.remove('is-selected'); });
              boton.classList.add('is-selected');
            }
          });
        });
      });
    }
    inicializarSelectores('.pill-group');
    inicializarSelectores('.option-grid');

    function valorGrupo(fieldName) {
      var grupo = form.querySelector('[data-field="' + fieldName + '"]');
      if (!grupo) return null;
      var seleccionado = grupo.querySelector('.is-selected');
      return seleccionado ? seleccionado.getAttribute('data-value') : null;
    }

    function valoresGrupoMultiple(fieldName) {
      var grupo = form.querySelector('[data-field="' + fieldName + '"]');
      if (!grupo) return [];
      var seleccionados = Array.prototype.slice.call(grupo.querySelectorAll('.is-selected'));
      return seleccionados.map(function (el) { return el.getAttribute('data-value'); });
    }

    function grupoRequeridoVacio(fieldName) {
      var grupo = form.querySelector('[data-field="' + fieldName + '"]');
      if (!grupo || grupo.getAttribute('data-required') !== 'true') return false;
      return grupo.querySelectorAll('.is-selected').length === 0;
    }

    // Valida solo los campos obligatorios del paso visible -- igual que
    // el 'canContinue' del formulario original de referencia.
    function validarPaso(n) {
      if (n === 1) {
        var nombre = form.querySelector('#fNombre').value.trim();
        var email = form.querySelector('#fEmail').value.trim();
        if (!nombre) return 'Falta tu nombre completo.';
        if (!email) return 'Falta tu email.';
        if (!REGEX_EMAIL.test(email)) return 'Revisa el email, no parece válido.';
        return null;
      }
      if (n === 2) {
        if (!form.querySelector('#fIndustria').value.trim()) return 'Falta el sector o industria.';
        if (grupoRequeridoVacio('teamSize')) return 'Elige el tamaño del equipo.';
        return null;
      }
      if (n === 3) {
        if (!form.querySelector('#fTareas').value.trim()) return 'Cuéntanos qué tareas repetitivas os consumen tiempo.';
        return null;
      }
      if (n === 4) {
        if (grupoRequeridoVacio('areas')) return 'Elige al menos un proceso a automatizar.';
        return null;
      }
      if (n === 5) {
        if (grupoRequeridoVacio('plazo')) return 'Indica para cuándo lo necesitas.';
        if (!form.querySelector('#fRgpd').checked) return 'Hace falta aceptar la política de privacidad para continuar.';
        return null;
      }
      return null;
    }

    function mostrarPaso(n) {
      pasos.forEach(function (paso) {
        paso.hidden = parseInt(paso.getAttribute('data-step'), 10) !== n;
      });
      btnAtras.hidden = n === 1;
      btnSiguiente.hidden = n === TOTAL_PASOS;
      btnEnviar.hidden = n !== TOTAL_PASOS;
      fillEl.style.width = ((n / TOTAL_PASOS) * 100) + '%';
      numEl.textContent = n;
      tituloEl.textContent = TITULOS[n - 1];
      limpiarError();
    }

    btnSiguiente.addEventListener('click', function () {
      var error = validarPaso(pasoActual);
      if (error) {
        mostrarError(error);
        return;
      }
      if (pasoActual < TOTAL_PASOS) {
        pasoActual += 1;
        mostrarPaso(pasoActual);
      }
    });

    btnAtras.addEventListener('click', function () {
      if (pasoActual > 1) {
        pasoActual -= 1;
        mostrarPaso(pasoActual);
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      limpiarError();

      // Honeypot: si un bot ha rellenado este campo, se descarta en
      // silencio -- no se le avisa de que ha fallado nada.
      var hp = form.querySelector('#website_hp');
      if (hp && hp.value.trim() !== '') {
        return;
      }

      var error = validarPaso(TOTAL_PASOS);
      if (error) {
        mostrarError(error);
        return;
      }

      // --- INICIO bloque a sustituir por integración real ---
      var payload = {
        nombre: form.querySelector('#fNombre').value.trim(),
        empresa: form.querySelector('#fEmpresa').value.trim(),
        email: form.querySelector('#fEmail').value.trim(),
        telefono: form.querySelector('#fTelefono').value.trim(),
        web: form.querySelector('#fWeb').value.trim(),
        industria: form.querySelector('#fIndustria').value.trim(),
        rol: form.querySelector('#fRol').value.trim(),
        tamano_equipo: valorGrupo('teamSize'),
        tareas_repetitivas: form.querySelector('#fTareas').value.trim(),
        herramientas_actuales: form.querySelector('#fHerramientas').value.trim(),
        horas_semanales: valorGrupo('horas'),
        procesos_a_automatizar: valoresGrupoMultiple('areas'),
        proceso_ideal: form.querySelector('#fProcesoIdeal').value.trim(),
        prioridad: valorGrupo('prioridad'),
        plazo: valorGrupo('plazo'),
        info_adicional: form.querySelector('#fExtra').value.trim(),
        newsletter: form.querySelector('#fNewsletter').checked
      };
      console.log('Lead capturado (pendiente de enviar a webhook):', payload);
      // fetch('https://TU-WEBHOOK-N8N/lead', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });
      // --- FIN bloque a sustituir ---

      form.hidden = true;
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    mostrarPaso(pasoActual);
  }


  // Lightbox de la galería "Lo que podemos crear para ti": al pulsar una
  // captura se reutiliza el mismo diálogo para las 7, poniendo su imagen y
  // un pie formado por el nombre de pantalla (barra de la ventana) + el
  // titular de la tarjeta, así no hace falta duplicar ese texto en el HTML.
  //
  // Guarda nula al principio: en las páginas sin galería no hace nada.
  function inicializarLightboxGaleria() {
    var lightbox = document.getElementById('lightbox');
    var disparadores = Array.prototype.slice.call(document.querySelectorAll('.admin-card__zoom'));
    if (!lightbox || disparadores.length === 0) return;

    var dialogo = lightbox.querySelector('.lightbox__dialog');
    var imgEl = lightbox.querySelector('.lightbox__img');
    var pieEl = lightbox.querySelector('.lightbox__caption');
    var DURACION_CIERRE_MS = 280; // debe coincidir con la transition de .lightbox__dialog

    var ultimoFoco = null;
    var cierreTimeout = null;

    function abrir(disparador) {
      var img = disparador.querySelector('img');
      var tarjeta = disparador.closest('.admin-card');
      if (!img || !tarjeta) return;

      clearTimeout(cierreTimeout);
      ultimoFoco = disparador;

      var pantalla = tarjeta.querySelector('.admin-card__bar-title');
      var titular = tarjeta.querySelector('.admin-card__text h3');
      imgEl.src = img.currentSrc || img.src;
      imgEl.alt = img.alt;
      pieEl.textContent = (pantalla ? pantalla.textContent + ' \u2014 ' : '') + (titular ? titular.textContent : '');

      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';

      // Quitar "hidden" y añadir la clase en dos frames distintos: si no,
      // el navegador puede colapsar ambos cambios y no se ve la entrada.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          lightbox.classList.add('is-open');
        });
      });

      document.addEventListener('keydown', alPulsarTecla);
    }

    function cerrar() {
      if (lightbox.hidden) return;

      lightbox.classList.remove('is-open');
      document.removeEventListener('keydown', alPulsarTecla);
      document.body.style.overflow = '';

      cierreTimeout = setTimeout(function () {
        lightbox.hidden = true;
        imgEl.src = '';
      }, DURACION_CIERRE_MS);

      if (ultimoFoco) ultimoFoco.focus();
    }

    function alPulsarTecla(e) {
      if (e.key === 'Escape') cerrar();
    }

    disparadores.forEach(function (disparador) {
      disparador.addEventListener('click', function () { abrir(disparador); });
    });

    Array.prototype.slice.call(lightbox.querySelectorAll('[data-lightbox-close]')).forEach(function (el) {
      el.addEventListener('click', cerrar);
    });

    // El clic ya cierra al llegar al backdrop porque el diálogo no lo cubre
    // entero; esto es por si el diálogo crece y lo tapa bajo el cursor.
    if (dialogo) {
      dialogo.addEventListener('click', function (e) {
        if (e.target === dialogo) cerrar();
      });
    }
  }

});
