/**
 * Escena 3D del relevo — fase 5: coreografía completa.
 *
 * Reparto de responsabilidades:
 *   modelos.js  construye la geometría y resuelve la cinemática inversa
 *   guion.js    mueve los puntos de destino en el tiempo (GSAP)
 *   este módulo monta la escena y, en cada frame, aplica la IK a los
 *               destinos que el guion haya dejado en "estado"
 *
 * Es decir: el guion nunca toca ángulos de articulaciones. Interpolar un
 * punto en el espacio es una recta; interpolar tres ángulos a la vez
 * produce arcos raros y hay que recalcular todo al mover algo.
 */

import * as THREE from 'three';
import {
  apuntarBrazo,
  crearTrabajador,
  crearRobot,
  crearEscritorio,
  crearPapel,
  crearMota,
  crearMovil,
  crearBoli,
  crearSuelo,
  PALETA,
  ALTURA_CEJAS
} from './modelos.js';
import { crearGuion } from './guion.js';

// Encuadre en unidades de mundo. La cámara ortográfica respeta AMBOS
// límites: normalmente manda la altura y solo cambia el aire lateral, pero
// si el contenedor se estrecha (móvil) y el ancho no llegaría al mínimo, se
// aleja en vez de recortar los lados. Contener, nunca recortar.
var ALTURA_MUNDO = 8.4;
// La acción ocupa en pantalla unas 10 unidades (el trabajador apartado a
// la izquierda, el robot a la derecha) y no está centrada: el trabajador
// llega a ~5,8 del centro. 13 da margen en ese lado también en móvil,
// donde la caja es más estrecha y es este mínimo el que manda.
var ANCHO_MUNDO_MIN = 13;
// Medio ancho que nunca se puede recortar. El acercamiento del guion se
// limita para respetarlo: en una caja estrecha no hay sitio para acercarse.
var MEDIO_ANCHO_VISIBLE = 6.4;

// Todo el contenido cuelga de un grupo desplazado para que la acción quede
// centrada en el encuadre.
// Medido en móvil a lo largo de toda la animación: con -1,9 el trabajador
// apartado tocaba el borde izquierdo mientras a la derecha del robot
// sobraba sitio. -1,3 reparte el margen entre los dos lados.
var OFFSET_ESCENA_X = -1.3;

var GRADOS = Math.PI / 180;

// Inclinación de la espalda del trabajador al empezar cada vuelta.
var INCLINACION_INICIAL = 7 * GRADOS;

// Polos de flexión por defecto (pose de escribir/hablar del estado 01-02).
// Hacia dónde sale cada codo: sin esto el plano de flexión es arbitrario y
// el brazo puede doblarse hacia dentro del cuerpo. El guion los REEMPLAZA
// a partir del relevo, cuando la pose pasa a brazos relajados -- reusar el
// mismo polo ahí tira el codo hacia dentro (verificado numéricamente).
var POLO_IZQ_INICIAL = new THREE.Vector3(-0.6, 0, 1);
var POLO_DER_INICIAL = new THREE.Vector3(0.85, -0.5, -0.5);

export function iniciarEscena(contenedor) {
  var rafId = null;
  var resizeTimeout = null;
  var relojUltimo = 0;

  // --- Renderer -----------------------------------------------------------

  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var canvas = renderer.domElement;
  canvas.className = 'escena__canvas';
  // La opacidad la lleva el guion (fundido de cada vuelta); la transición
  // CSS del canvas la retrasaría y el fundido llegaría tarde.
  canvas.style.transition = 'none';
  canvas.style.opacity = '0';
  contenedor.appendChild(canvas);

  // --- Escena y cámara ----------------------------------------------------

  var escena = new THREE.Scene();

  // La cámara no está quieta: deriva muy despacio alrededor de su posición
  // base y sigue un poco al ratón (ver tick). Con una ortográfica fija la
  // escena se leía como un diorama congelado.
  var CAMARA_BASE = new THREE.Vector3(9, 7.4, 15);
  var CAMARA_OBJETIVO = new THREE.Vector3(0, 2.1, 0);

  var camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camara.position.copy(CAMARA_BASE);
  camara.lookAt(CAMARA_OBJETIVO);

  // Luz de cielo cálida y suelo oscuro: los volúmenes se modelan solos
  // (arriba claro, abajo en sombra) sin la luz plana de un ambient.
  escena.add(new THREE.HemisphereLight(0xFFF1E4, 0x2A1E14, 1.35));

  var principal = new THREE.DirectionalLight(0xFFE9D6, 1.9);
  principal.position.set(6, 10, 8);
  escena.add(principal);

  // Contraluz naranja desde detrás: dibuja un filo de luz en los biseles
  // de las siluetas y las despega del fondo oscuro.
  var contraluz = new THREE.DirectionalLight(0xF8894B, 0.85);
  contraluz.position.set(-6, 5, -9);
  escena.add(contraluz);

  var relleno = new THREE.DirectionalLight(0x9FB4C8, 0.35);
  relleno.position.set(-7, 3, 6);
  escena.add(relleno);

  // --- Montaje ------------------------------------------------------------

  var mundo = new THREE.Group();
  mundo.position.x = OFFSET_ESCENA_X;
  escena.add(mundo);

  mundo.add(crearSuelo());

  var escritorio = crearEscritorio();
  escritorio.position.set(1.3, 0, 0);
  mundo.add(escritorio);

  var trabajador = crearTrabajador();
  trabajador.raiz.position.set(-1.55, 0, 0.55);
  mundo.add(trabajador.raiz);

  // Pose de partida del estado 01: torso hacia el escritorio, cabeza al
  // lado contrario, al móvil. Trabaja donde no mira.
  trabajador.torso.rotation.y = 26 * GRADOS;
  trabajador.torso.rotation.z = 4 * GRADOS;
  trabajador.cabeza.rotation.y = -34 * GRADOS;
  trabajador.cabeza.rotation.z = 15 * GRADOS;
  // Algo encorvado sobre la mesa desde el principio: la espalda se dobla,
  // no el cuerpo entero.
  trabajador.pecho.rotation.x = INCLINACION_INICIAL;

  var hojaActiva = crearPapel();
  hojaActiva.position.set(-0.37, 1.99, 0.42);
  hojaActiva.rotation.y = -10 * GRADOS;
  mundo.add(hojaActiva);

  // Pila inicial del estado 01. Va en su propio pool porque el robot
  // tiene que absorberla igual que el resto: si no, estas hojas se quedan
  // en la mesa hasta el final y contradicen toda la historia.
  var papelesMesa = [];
  var alturasPila = [0, 0.06, 0.12];
  for (var i = 0; i < alturasPila.length; i++) {
    var hoja = crearPapel();
    hoja.position.set(2.3, 1.99 + alturasPila[i], -0.25);
    hoja.rotation.y = (Math.random() - 0.5) * 12 * GRADOS;
    mundo.add(hoja);
    papelesMesa.push(hoja);
  }
  papelesMesa.push(hojaActiva);

  // Pool de papeles que CAEN en el estado 02 y son absorbidos en el 04.
  // Cada uno lleva anotado su destino sobre la mesa.
  var papelesCaida = [];
  for (var c = 0; c < 8; c++) {
    var pc = crearPapel();
    pc.visible = false;
    pc.userData.destino = new THREE.Vector3(
      1.9 + (c % 3) * 0.55,
      2.05 + Math.floor(c / 3) * 0.08,
      -0.5 + (c % 2) * 0.5
    );
    mundo.add(pc);
    papelesCaida.push(pc);
  }

  // Pool del estado 06: hojas que caen sobre la mesa y el robot absorbe,
  // igual que en el relevo.
  var papelesFlujo = [];
  for (var f = 0; f < 10; f++) {
    var pf = crearPapel();
    pf.visible = false;
    mundo.add(pf);
    papelesFlujo.push(pf);
  }

  // Motas de succión: fragmentos que viajan de la mesa al robot durante la
  // absorción. Comunican la fuerza mediante trayectoria y velocidad, no
  // añadiendo brillo -- un halo naranja más no explica nada.
  var motas = [];
  for (var mo = 0; mo < 16; mo++) {
    var mt = crearMota();
    mt.visible = false;
    mundo.add(mt);
    motas.push(mt);
  }

  escena.updateMatrixWorld(true);

  // Destinos de las manos. El guion mueve ESTOS puntos; los ángulos salen
  // de la IK en cada frame.
  // Los destinos se guardan en el espacio del grupo "mundo", NO en mundo
  // real. Es el mismo espacio en el que el guion escribe todo lo demás
  // (posiciones de robot, papeles, trabajador), así que no hay dos sistemas
  // de coordenadas conviviendo. La conversión a mundo real se hace en un
  // único sitio, el tick, justo antes de resolver la IK.
  var estado = {
    manoIzq: mundo.worldToLocal(trabajador.cabeza.localToWorld(new THREE.Vector3(-0.4, 0.42, 0.05))).clone(),
    manoDer: mundo.worldToLocal(hojaActiva.localToWorld(new THREE.Vector3(0, 0.26, 0.14))).clone(),
    brilloTestigo: 0,
    campo: 0,
    // Desplazamiento del trazo al escribir. Aparte del destino base: si se
    // animara el destino con valores relativos, cada vuelta del bucle
    // acumularía deriva y la mano acabaría fuera del papel.
    escritura: 0,
    // El polo vive aquí, no como constante, para que el guion pueda
    // interpolarlo entre la pose de escribir/hablar y la de brazos
    // relajados. Cambiar el destino sin cambiar el polo es lo que producía
    // el codo metido hacia dentro del cuerpo.
    poloIzq: POLO_IZQ_INICIAL.clone(),
    poloDer: POLO_DER_INICIAL.clone(),
    // Encuadre: el guion acerca la cámara en el relevo y la devuelve al
    // final. 1 = plano normal.
    zoom: 1,
    // Opacidad de la escena entera: fundido a negro al final de cada vuelta
    // para que el reinicio no se vea como un salto.
    fundido: 0
  };

  // Copias del estado inicial, para poder devolver todo a su sitio en cada
  // vuelta del bucle.
  var INICIO = {
    manoIzq: estado.manoIzq.clone(),
    manoDer: estado.manoDer.clone(),
    hojaActiva: hojaActiva.position.clone(),
    papelesMesa: []
  };

  var movil = crearMovil();
  movil.position.set(-0.37, 0.4, 0.04);
  movil.rotation.set(0, 0, -8 * GRADOS);
  trabajador.cabeza.add(movil);

  var boli = crearBoli();
  boli.rotation.set(26 * GRADOS, 0, 18 * GRADOS);
  boli.position.set(0, -0.2, 0.04);
  trabajador.brazoDer.mano.add(boli);

  var robot = crearRobot();
  robot.raiz.position.set(10, 0, -0.6);
  // -45 grados: girado claramente hacia la mesa (que queda a su izquierda)
  // sin llegar a darle la espalda a la cámara. A -80 miraría de lleno a la
  // mesa pero se vería de espaldas; a -14 parecía posando de frente.
  robot.raiz.rotation.y = -45 * GRADOS;
  robot.raiz.visible = false;
  mundo.add(robot.raiz);

  robot.brazoIzq.hombro.rotation.z = 7 * GRADOS;
  robot.brazoDer.hombro.rotation.z = -7 * GRADOS;
  robot.brazoIzq.codo.rotation.x = 26 * GRADOS;
  robot.brazoDer.codo.rotation.x = 26 * GRADOS;

  // El testigo necesita material propio: el cache de modelos.js comparte un
  // material por color, así que subirle el emissive al compartido teñiría
  // todos los elementos naranjas de la escena.
  robot.testigo.material = robot.testigo.material.clone();

  // Luz real en la antena: cuando el testigo brilla, ilumina de naranja la
  // cabeza del robot y lo que tiene cerca. Es lo que convierte el brillo en
  // presencia y no en un cubo pintado.
  var luzTestigo = new THREE.PointLight(PALETA.acento, 0, 7, 1.6);
  luzTestigo.position.copy(robot.testigo.position);
  robot.cabeza.add(luzTestigo);

  // Sombras de contacto: el primer hijo de cada raíz (ver sombraContacto).
  var sombraRobot = robot.raiz.children[0];
  var sombraTrabajador = trabajador.raiz.children[0];


  // Posiciones de partida de las hojas de la mesa, para restaurarlas.
  for (var pm = 0; pm < papelesMesa.length; pm++) {
    INICIO.papelesMesa.push(papelesMesa[pm].position.clone());
  }

  /**
   * Devuelve TODO al estado de partida. Imprescindible para el bucle: el
   * móvil cambia de padre a mitad de la animación y varios objetos quedan
   * escalados a cero o invisibles, cosas que GSAP no deshace solo.
   */
  function reiniciar() {
    movil.userData.enMundo = false;
    trabajador.cabeza.add(movil);
    movil.position.set(-0.37, 0.4, 0.04);
    movil.rotation.set(0, 0, -8 * GRADOS);
    movil.scale.set(1, 1, 1);
    movil.visible = true;

    boli.scale.set(1, 1, 1);

    trabajador.raiz.position.set(-1.55, 0, 0.55);
    trabajador.pecho.rotation.set(INCLINACION_INICIAL, 0, 0);
    trabajador.cejas.forEach(function (c) {
      c.position.y = ALTURA_CEJAS;
      c.rotation.z = 0;
    });
    [trabajador.piernaIzq, trabajador.piernaDer].forEach(function (p) {
      p.cadera.rotation.set(0, 0, 0);
      p.rodilla.rotation.set(0, 0, 0);
    });
    trabajador.torso.scale.set(1, 1, 1);
    trabajador.torso.rotation.set(0, 26 * GRADOS, 4 * GRADOS);
    trabajador.cabeza.rotation.set(0, -34 * GRADOS, 15 * GRADOS);

    for (var i = 0; i < papelesMesa.length; i++) {
      papelesMesa[i].visible = true;
      papelesMesa[i].position.copy(INICIO.papelesMesa[i]);
      papelesMesa[i].rotation.set(0, 0, 0);
      papelesMesa[i].scale.set(1, 1, 1);
    }

    for (var c2 = 0; c2 < papelesCaida.length; c2++) papelesCaida[c2].visible = false;
    for (var f2 = 0; f2 < papelesFlujo.length; f2++) {
      papelesFlujo[f2].visible = false;
      papelesFlujo[f2].scale.set(1, 1, 1);
    }

    for (var mo2 = 0; mo2 < motas.length; mo2++) {
      motas[mo2].visible = false;
      motas[mo2].material.opacity = 0.9;
    }

    robot.raiz.visible = false;
    robot.raiz.position.set(10, 0, -0.6);
    robot.cabeza.rotation.set(0, 0, 0);
    robot.cuerpo.scale.set(1, 1, 1);
    robot.cuerpo.rotation.set(0, 0, 0);
    estado.zoom = 1;

    estado.manoIzq.copy(INICIO.manoIzq);
    estado.manoDer.copy(INICIO.manoDer);
    estado.brilloTestigo = 0;
    estado.campo = 0;
    estado.escritura = 0;
    estado.poloIzq.copy(POLO_IZQ_INICIAL);
    estado.poloDer.copy(POLO_DER_INICIAL);
  }

  // --- Guion --------------------------------------------------------------

  var guion = crearGuion({
    trabajador: trabajador,
    robot: robot,
    movil: movil,
    boli: boli,
    papelesCaida: papelesCaida,
    papelesMesa: papelesMesa,
    escritorio: escritorio,
    papelesFlujo: papelesFlujo,
    motas: motas,
    estado: estado,
    reiniciar: reiniciar,
    // El móvil vive colgado de la cabeza para quedar siempre pegado a la
    // oreja. Cuando el robot se lo lleva hay que pasarlo al mundo,
    // conservando su posición en pantalla.
    reparentarMovil: function () {
      var p = new THREE.Vector3();
      movil.getWorldPosition(p);
      mundo.worldToLocal(p);
      mundo.add(movil);
      movil.position.copy(p);
      movil.userData.enMundo = true;
    }
  });

  // --- Dimensionado -------------------------------------------------------

  function ajustarTamano() {
    var ancho = contenedor.clientWidth;
    var alto = contenedor.clientHeight;
    if (ancho === 0 || alto === 0) return;

    renderer.setSize(ancho, alto, false);

    var aspecto = ancho / alto;
    var mitadAlto = ALTURA_MUNDO / 2;
    var mitadAncho = mitadAlto * aspecto;

    if (mitadAncho < ANCHO_MUNDO_MIN / 2) {
      mitadAncho = ANCHO_MUNDO_MIN / 2;
      mitadAlto = mitadAncho / aspecto;
    }

    camara.left = -mitadAncho;
    camara.right = mitadAncho;
    camara.top = mitadAlto;
    camara.bottom = -mitadAlto;
    camara.updateProjectionMatrix();

    zoomMaximo = Math.max(1, mitadAncho / MEDIO_ANCHO_VISIBLE);
  }

  var zoomMaximo = 1;

  // --- Bucle --------------------------------------------------------------

  var tiempo = 0;
  var _destinoIzq = new THREE.Vector3();
  var _destinoDer = new THREE.Vector3();

  // Paralaje con el ratón: valores de -1 a 1 que la cámara persigue con
  // retardo. Solo con puntero real; en táctil se queda en 0.
  var raton = { x: 0, y: 0 };
  var ratonSuave = { x: 0, y: 0 };

  function alMoverRaton(e) {
    var r = contenedor.getBoundingClientRect();
    raton.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    raton.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  }

  function alSalirRaton() {
    raton.x = 0;
    raton.y = 0;
  }

  var conRaton = window.matchMedia('(hover: hover)').matches;
  if (conRaton) {
    contenedor.addEventListener('pointermove', alMoverRaton, { passive: true });
    contenedor.addEventListener('pointerleave', alSalirRaton);
  }

  // Parpadeo del robot: cada 2,5-5 s los ojos se cierran 120 ms.
  var proximoParpadeo = 2;
  var finParpadeo = 0;

  // El trabajador parpadea más a menudo y con su propio ritmo (una
  // persona bajo presión parpadea más que una máquina).
  var proximoParpadeoHumano = 1.2;
  var finParpadeoHumano = 0;

  var _camaraPos = new THREE.Vector3();

  function tick(ahora) {
    var delta = relojUltimo === 0 ? 0.016 : (ahora - relojUltimo) / 1000;
    // Tope al delta: al volver de otra pestaña no hay que saltar de golpe.
    delta = Math.min(delta, 0.05);
    relojUltimo = ahora;
    tiempo += delta;

    // Flotación idle del robot, con su propio ritmo, ajena al guion: sube y
    // baja, y se mece un poco en dos ejes desfasados para que no parezca un
    // pistón.
    var flotacion = Math.sin(tiempo * 1.6);
    robot.flotante.position.y = 0.62 + flotacion * 0.06;
    robot.flotante.rotation.z = Math.sin(tiempo * 0.9) * 0.025;
    robot.flotante.rotation.x = Math.sin(tiempo * 1.2 + 1.3) * 0.018;

    // La sombra responde a la altura: más pequeña y tenue cuando sube.
    var s = 1 - flotacion * 0.07;
    sombraRobot.scale.set(s, s, s);
    sombraRobot.material.opacity = 0.28 - flotacion * 0.05;

    // Respiración del trabajador: el torso sube y baja muy poco. Usa la
    // posición, que el guion no toca (él anima escala y rotación).
    trabajador.torso.position.y = 1.55 + Math.sin(tiempo * 2.1) * 0.012;

    // Parpadeo.
    if (tiempo >= proximoParpadeo) {
      finParpadeo = tiempo + 0.12;
      proximoParpadeo = tiempo + 2.5 + Math.random() * 2.5;
    }
    var ojoY = tiempo < finParpadeo ? 0.15 : 1;
    robot.ojos[0].scale.y = ojoY;
    robot.ojos[1].scale.y = ojoY;

    if (tiempo >= proximoParpadeoHumano) {
      finParpadeoHumano = tiempo + 0.11;
      proximoParpadeoHumano = tiempo + 1.6 + Math.random() * 2.4;
    }
    var ojoHumanoY = tiempo < finParpadeoHumano ? 0.12 : 1;
    trabajador.ojos[0].scale.y = trabajador.ojos[0].userData.altoAbierto * ojoHumanoY;
    trabajador.ojos[1].scale.y = trabajador.ojos[1].userData.altoAbierto * ojoHumanoY;

    // Cámara: deriva lenta + paralaje del ratón + zoom del guion.
    var k = 1 - Math.pow(0.02, delta); // suavizado independiente del framerate
    ratonSuave.x += (raton.x - ratonSuave.x) * k;
    ratonSuave.y += (raton.y - ratonSuave.y) * k;

    _camaraPos.copy(CAMARA_BASE);
    _camaraPos.x += Math.sin(tiempo * 0.23) * 0.5 + ratonSuave.x * 0.9;
    _camaraPos.y += Math.sin(tiempo * 0.17 + 0.8) * 0.25 - ratonSuave.y * 0.5;
    camara.position.copy(_camaraPos);
    camara.lookAt(CAMARA_OBJETIVO);

    var zoom = Math.min(estado.zoom, zoomMaximo);
    if (Math.abs(camara.zoom - zoom) > 0.0001) {
      camara.zoom = zoom;
      camara.updateProjectionMatrix();
    }

    canvas.style.opacity = estado.fundido;

    // El guion ya ha movido torso, cabeza y destinos: las matrices tienen
    // que estar al día ANTES de resolver la IK.
    escena.updateMatrixWorld(true);

    // Único punto de conversión: del espacio del grupo al mundo real. La
    // IK trabaja siempre en mundo real; el guion, siempre en espacio de
    // grupo. Mezclar ambos fue lo que estiraba el brazo en horizontal.
    _destinoIzq.copy(estado.manoIzq);
    mundo.localToWorld(_destinoIzq);
    apuntarBrazo(trabajador.brazoIzq, _destinoIzq, estado.poloIzq);

    _destinoDer.copy(estado.manoDer);
    _destinoDer.x += estado.escritura;
    mundo.localToWorld(_destinoDer);
    apuntarBrazo(trabajador.brazoDer, _destinoDer, estado.poloDer);

    robot.testigo.material.emissive.setHex(PALETA.acento);
    robot.testigo.material.emissiveIntensity = estado.brilloTestigo;
    // Los ojos acompañan al testigo, con un mínimo para no apagarse nunca.
    robot.materialOjos.emissiveIntensity = 0.5 + estado.brilloTestigo * 0.7;
    luzTestigo.intensity = estado.brilloTestigo * 5;

    renderer.render(escena, camara);
    rafId = window.requestAnimationFrame(tick);
  }

  function reanudar() {
    if (rafId !== null) return;
    relojUltimo = 0;
    guion.play();
    rafId = window.requestAnimationFrame(tick);
  }

  function pausar() {
    if (rafId === null) return;
    guion.pause();
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }

  // --- Eventos ------------------------------------------------------------

  function alRedimensionar() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      ajustarTamano();
      renderer.render(escena, camara);
    }, 200);
  }

  window.addEventListener('resize', alRedimensionar);

  ajustarTamano();
  escena.updateMatrixWorld(true);
  apuntarBrazo(trabajador.brazoIzq, mundo.localToWorld(estado.manoIzq.clone()), estado.poloIzq);
  apuntarBrazo(trabajador.brazoDer, mundo.localToWorld(estado.manoDer.clone()), estado.poloDer);
  renderer.render(escena, camara);

  return {
    reanudar: reanudar,
    pausar: pausar,
    destruir: function () {
      pausar();
      guion.kill();
      window.removeEventListener('resize', alRedimensionar);
      contenedor.removeEventListener('pointermove', alMoverRaton);
      contenedor.removeEventListener('pointerleave', alSalirRaton);
      clearTimeout(resizeTimeout);
      escena.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
}
