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
  dividirTitularesEnPalabras();
  inicializarRevealGenerico();
  inicializarWidgetJornada();
  inicializarFranjaDeTareas();
  inicializarBarraDeProgreso();
  inicializarHeroInteractivo();
  inicializarRecorrido();
  inicializarGlitchTitular();

  // Lightbox de la galería de capturas (capacidades.html).
  inicializarLightboxGaleria();

  function prefiereMovimientoReducido() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Franja superior: en vez de repetir el nombre, lista tareas reales que el
  // sistema deja hechas. Se reconstruye desde JS para que las páginas no
  // carguen 12 spans idénticos; el HTML solo lleva un item de reserva.
  function inicializarFranjaDeTareas() {
    var track = document.querySelector('.brand-band__track');
    if (!track) return;

    var tareas = [
      'Facturas al Excel',
      'Emails de seguimiento',
      'Respuestas a clientes',
      'Agenda y recordatorios',
      'Presupuestos',
      'Informe del lunes',
      'Leads sin contestar'
    ];

    function grupo() {
      var g = document.createElement('div');
      g.className = 'brand-band__group';
      // Dos vueltas de la lista por grupo: el track siempre es más ancho
      // que la pantalla y el bucle de -50% no deja huecos.
      for (var v = 0; v < 2; v++) {
        tareas.forEach(function (t) {
          var item = document.createElement('span');
          item.className = 'brand-band__item';
          var marca = document.createElement('i');
          marca.textContent = '✓';
          item.appendChild(marca);
          item.appendChild(document.createTextNode(t));
          g.appendChild(item);
        });
      }
      return g;
    }

    track.textContent = '';
    track.appendChild(grupo());
    track.appendChild(grupo());
  }

  // Glitch "hacker" sobre la parte destacada del titular del hero: cada ~3s
  // una ráfaga de medio segundo en la que las dos copias (::before/::after)
  // se desplazan en franjas y muestran el texto con caracteres revueltos.
  // El texto real del span no se toca nunca.
  function inicializarGlitchTitular() {
    var destacado = document.querySelector('.hero h1 .highlight');
    if (!destacado) return;
    if (prefiereMovimientoReducido()) return;

    var ORIGINAL = destacado.textContent;
    var SIMBOLOS = '#%&@$/\\<>*+=_01{}[]';
    var INTERVALO_MS = 3000;
    var RAFAGA_MS = 500;
    var PASO_MS = 60;

    destacado.classList.add('glitch');
    destacado.setAttribute('data-text', ORIGINAL);

    function revolver() {
      return ORIGINAL.split('').map(function (c) {
        if (c === ' ' || Math.random() > 0.3) return c;
        return SIMBOLOS.charAt(Math.floor(Math.random() * SIMBOLOS.length));
      }).join('');
    }

    function rafaga() {
      if (document.hidden) return;

      var inicio = Date.now();
      destacado.classList.remove('is-glitching');
      void destacado.offsetWidth; // reinicia las animaciones CSS
      destacado.classList.add('is-glitching');

      var temporizador = setInterval(function () {
        if (Date.now() - inicio >= RAFAGA_MS) {
          clearInterval(temporizador);
          destacado.setAttribute('data-text', ORIGINAL);
          destacado.classList.remove('is-glitching');
          return;
        }
        destacado.setAttribute('data-text', revolver());
      }, PASO_MS);
    }

    // Primera ráfaga cuando ya ha terminado la entrada del titular.
    setTimeout(function () {
      rafaga();
      setInterval(rafaga, INTERVALO_MS);
    }, 1800);
  }

  // Barra fina de progreso de lectura, fija arriba del todo.
  function inicializarBarraDeProgreso() {
    if (prefiereMovimientoReducido()) return;

    var barra = document.createElement('div');
    barra.className = 'scroll-progress';
    barra.setAttribute('aria-hidden', 'true');
    document.body.appendChild(barra);

    var pendiente = false;

    function actualizar() {
      var total = document.documentElement.scrollHeight - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      barra.style.setProperty('--sp', p.toFixed(4));
      pendiente = false;
    }

    window.addEventListener('scroll', function () {
      if (!pendiente) {
        pendiente = true;
        window.requestAnimationFrame(actualizar);
      }
    }, { passive: true });

    window.addEventListener('resize', actualizar);
    actualizar();
  }

  // Hero: un resplandor sigue al cursor y el widget se inclina hacia él.
  // Solo con puntero real y sin movimiento reducido.
  function inicializarHeroInteractivo() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (prefiereMovimientoReducido()) return;

    var widget = document.getElementById('jornadaWidget');
    var MAX_GRADOS = 6;
    var pendiente = false;
    var ultimo = null;

    function pintar() {
      pendiente = false;
      if (!ultimo) return;

      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--hx', (ultimo.x - r.left) + 'px');
      hero.style.setProperty('--hy', (ultimo.y - r.top) + 'px');

      if (widget) {
        var w = widget.getBoundingClientRect();
        var dx = (ultimo.x - (w.left + w.width / 2)) / (window.innerWidth / 2);
        var dy = (ultimo.y - (w.top + w.height / 2)) / (window.innerHeight / 2);
        dx = Math.max(-1, Math.min(1, dx));
        dy = Math.max(-1, Math.min(1, dy));
        widget.style.transform = 'perspective(900px) rotateY(' + (dx * MAX_GRADOS).toFixed(2) + 'deg) rotateX(' + (-dy * MAX_GRADOS).toFixed(2) + 'deg)';
      }
    }

    hero.addEventListener('pointermove', function (e) {
      ultimo = { x: e.clientX, y: e.clientY };
      hero.classList.add('has-pointer');
      if (!pendiente) {
        pendiente = true;
        window.requestAnimationFrame(pintar);
      }
    }, { passive: true });

    hero.addEventListener('pointerleave', function () {
      ultimo = null;
      hero.classList.remove('has-pointer');
      if (widget) widget.style.transform = '';
    });
  }

  // Titulares con .split: cada palabra sube desde una máscara, en cascada,
  // cuando el bloque entra en pantalla (lo dispara .is-visible del reveal).
  function dividirTitularesEnPalabras() {
    var titulares = Array.prototype.slice.call(document.querySelectorAll('.split'));

    titulares.forEach(function (el) {
      var texto = el.textContent;
      var palabras = texto.split(/\s+/).filter(Boolean);
      el.setAttribute('aria-label', texto);
      el.textContent = '';

      palabras.forEach(function (palabra, i) {
        var mascara = document.createElement('span');
        mascara.className = 'split__w';
        mascara.setAttribute('aria-hidden', 'true');

        var interior = document.createElement('span');
        interior.textContent = palabra;
        interior.style.transitionDelay = (i * 55) + 'ms';

        mascara.appendChild(interior);
        el.appendChild(mascara);
        if (i < palabras.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
  }

  // "Cómo trabajamos": la línea se rellena según el scroll y cada nodo se
  // enciende cuando el relleno lo alcanza. Vertical en móvil, horizontal en
  // escritorio (el eje se decide mirando el layout real, no un breakpoint
  // duplicado aquí).
  function inicializarRecorrido() {
    var lista = document.getElementById('recorridoLista');
    if (!lista) return;

    var pasos = Array.prototype.slice.call(lista.querySelectorAll('.recorrido__paso'));
    if (pasos.length === 0) return;

    function encenderTodo() {
      lista.style.setProperty('--p', 1);
      pasos.forEach(function (p) { p.classList.add('is-on'); });
    }

    if (prefiereMovimientoReducido()) {
      encenderTodo();
      return;
    }

    var umbrales = [];
    var objetivo = 0;   // lo que pide el scroll
    var mostrado = 0;   // lo que se pinta: persigue al objetivo sin prisa
    var SUAVIZADO = 0.035;
    var animando = false;

    function medir() {
      var horizontal = pasos[0].offsetTop === pasos[pasos.length - 1].offsetTop;
      var lr = lista.getBoundingClientRect();
      umbrales = pasos.map(function (paso) {
        var nodo = paso.querySelector('.recorrido__nodo');
        var nr = nodo.getBoundingClientRect();
        var centro = horizontal ? (nr.left + nr.width / 2 - lr.left) / lr.width
                                : (nr.top + nr.height / 2 - lr.top) / lr.height;
        return Math.max(0, Math.min(1, centro));
      });
    }

    function calcularObjetivo() {
      var r = lista.getBoundingClientRect();
      var vh = window.innerHeight;
      // El relleno empieza cuando la lista sube al 85% del viewport y
      // termina cuando su parte inferior llega al 35%: un tramo de scroll
      // largo, para que la línea avance despacio.
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.5);
      objetivo = Math.max(0, Math.min(1, p));
    }

    function pintar() {
      lista.style.setProperty('--p', mostrado.toFixed(4));
      // Cada paso se enciende cuando la línea pintada lo alcanza, no cuando
      // lo pide el scroll: así el nodo y la línea llegan a la vez.
      pasos.forEach(function (paso, i) {
        paso.classList.toggle('is-on', mostrado >= umbrales[i] - 0.001);
      });
    }

    function tick() {
      mostrado += (objetivo - mostrado) * SUAVIZADO;
      if (Math.abs(objetivo - mostrado) < 0.001) {
        mostrado = objetivo;
        animando = false;
        pintar();
        return;
      }
      pintar();
      window.requestAnimationFrame(tick);
    }

    function solicitar() {
      calcularObjetivo();
      if (!animando) {
        animando = true;
        window.requestAnimationFrame(tick);
      }
    }

    medir();
    solicitar();
    window.addEventListener('scroll', solicitar, { passive: true });
    window.addEventListener('resize', function () { medir(); solicitar(); });
    // Las fuentes web cambian las alturas: se vuelve a medir al cargarlas.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { medir(); solicitar(); });
    }
  }

  // Widget "tu-jornada-laboral.exe" del hero: reloj analógico (hora + minutero)
  // que recorre una jornada de 09:00 a 18:00 en cámara rápida y compara, con
  // contadores que suben de uno en uno, las mismas seis tareas hechas a mano
  // frente a hechas con IA.
  function inicializarWidgetJornada() {
    var widget = document.getElementById('jornadaWidget');
    if (!widget) return;

    var RADIUS = 74;
    var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    var INICIO_MIN = 9 * 60;   // 09:00
    var FIN_MIN = 18 * 60;     // 18:00
    var DURACION_DIA_MIN = FIN_MIN - INICIO_MIN; // 540 minutos simulados
    var CICLO_MS = 9000;       // 9s reales = toda la jornada, en bucle

    var MANUAL_TOTAL = 6;
    var MANUAL_TAREAS_FINALES = 3; // a mano solo da tiempo a 3 de las 6
    var MANUAL_TASKS = [
      'Copiar facturas al Excel',
      'Redactar 20 emails de seguimiento',
      'Analizar 5.000 filas de ventas'
    ];

    var IA_TOTAL = 6;
    var IA_INICIO_DONE = 2;
    var IA_LIBRE_MIN = 3 * 60 + 24; // libre a las 12:24 (204 min tras las 9:00)
    var AI_TASKS = [
      'Responder consultas de clientes',
      'Montar el vídeo de la campaña',
      'Generar 30 creatividades para redes',
      'Revisar el inventario'
    ];

    var ringProgress = document.getElementById('jornadaRingProgress');
    var handHora = document.getElementById('jornadaHandHora');
    var handMin = document.getElementById('jornadaHandMin');
    var timeEl = document.getElementById('jornadaTime');
    var manualQuedan = document.getElementById('jornadaManualQuedan');
    var manualTask = document.getElementById('jornadaManualTask');
    var manualCount = document.getElementById('jornadaManualCount');
    var aiQuedan = document.getElementById('jornadaAiQuedan');
    var aiIcon = document.getElementById('jornadaAiIcon');
    var aiTask = document.getElementById('jornadaAiTask');
    var aiCount = document.getElementById('jornadaAiCount');
    var recovered = document.getElementById('jornadaRecovered');

    ringProgress.style.strokeDasharray = CIRCUMFERENCE;

    function formatearHora(totalMin) {
      var h = Math.floor(totalMin / 60);
      var m = Math.floor(totalMin % 60);
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function pintar(simMin) {
      simMin = Math.min(simMin, DURACION_DIA_MIN);
      var totalMin = INICIO_MIN + simMin;

      timeEl.textContent = formatearHora(totalMin);
      ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - simMin / DURACION_DIA_MIN);

      var anguloHora = ((totalMin % (12 * 60)) / (12 * 60)) * 360;
      var anguloMin = ((totalMin % 60) / 60) * 360;
      handHora.style.transform = 'rotate(' + anguloHora + 'deg)';
      handMin.style.transform = 'rotate(' + anguloMin + 'deg)';

      var pasoManual = DURACION_DIA_MIN / MANUAL_TAREAS_FINALES;
      var manualDone = Math.min(MANUAL_TAREAS_FINALES, Math.floor(simMin / pasoManual));
      manualQuedan.textContent = 'Quedan ' + (MANUAL_TOTAL - manualDone);
      manualTask.textContent = MANUAL_TASKS[Math.min(manualDone, MANUAL_TASKS.length - 1)];
      manualCount.textContent = manualDone + '/' + MANUAL_TOTAL;

      var pasosIA = IA_TOTAL - IA_INICIO_DONE;
      var pasoIA = IA_LIBRE_MIN / pasosIA;
      var aiComplete = simMin >= IA_LIBRE_MIN;
      var aiDone = aiComplete ? IA_TOTAL : Math.min(IA_TOTAL, IA_INICIO_DONE + Math.floor(simMin / pasoIA));

      aiQuedan.textContent = aiComplete ? 'Todo hecho' : ('Quedan ' + (IA_TOTAL - aiDone));
      aiTask.textContent = aiComplete ? 'Libre desde las 12:24' : AI_TASKS[Math.min(aiDone - IA_INICIO_DONE, AI_TASKS.length - 1)];
      aiCount.textContent = aiDone + '/' + IA_TOTAL;
      aiIcon.classList.toggle('is-complete', aiComplete);

      if (aiComplete) {
        var horasRecuperadas = (simMin - IA_LIBRE_MIN) / 60;
        recovered.textContent = '+' + horasRecuperadas.toFixed(1) + ' h recuperadas';
        recovered.classList.add('is-visible');
      } else {
        recovered.classList.remove('is-visible');
      }
    }

    if (prefiereMovimientoReducido()) {
      pintar(DURACION_DIA_MIN);
      return;
    }

    var inicio = null;

    function frame(marca) {
      if (inicio === null) inicio = marca;
      var transcurrido = (marca - inicio) % CICLO_MS;
      pintar((transcurrido / CICLO_MS) * DURACION_DIA_MIN);
      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
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
    var NARANJA = '248, 137, 75';
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
