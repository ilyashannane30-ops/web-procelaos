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
  crearEstelaPapel,
  crearMota,
  crearMovil,
  crearBoli,
  crearSuelo,
  PALETA
} from './modelos.js';
import { crearGuion } from './guion.js';

// Encuadre en unidades de mundo. La cámara ortográfica respeta AMBOS
// límites: normalmente manda la altura y solo cambia el aire lateral, pero
// si el contenedor se estrecha (móvil) y el ancho no llegaría al mínimo, se
// aleja en vez de recortar los lados. Contener, nunca recortar.
var ALTURA_MUNDO = 8.4;
var ANCHO_MUNDO_MIN = 12;

// Todo el contenido cuelga de un grupo desplazado para que la acción quede
// centrada en el encuadre.
var OFFSET_ESCENA_X = -1.9;

var GRADOS = Math.PI / 180;

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
  contenedor.appendChild(canvas);

  // --- Escena y cámara ----------------------------------------------------

  var escena = new THREE.Scene();

  var camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camara.position.set(9, 7.4, 15);
  camara.lookAt(0, 2.1, 0);

  escena.add(new THREE.AmbientLight(0xffffff, 0.72));

  var principal = new THREE.DirectionalLight(0xffffff, 0.95);
  principal.position.set(6, 10, 8);
  escena.add(principal);

  var relleno = new THREE.DirectionalLight(0x9CA3B5, 0.32);
  relleno.position.set(-7, 3, -5);
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

  // Pool del estado 06. Solo 10 objetos: la cantidad percibida la fabrican
  // la cadencia, el reciclado y los tres carriles, no el número. Cada uno
  // lleva dos estelas propias -- opacidad decreciente detrás del objeto
  // real -- que es lo que vende velocidad más que el movimiento en sí.
  var papelesFlujo = [];
  var estelasFlujo = [];
  for (var f = 0; f < 10; f++) {
    var pf = crearPapel();
    pf.visible = false;
    mundo.add(pf);
    papelesFlujo.push(pf);

    var e1 = crearEstelaPapel(0.32);
    var e2 = crearEstelaPapel(0.14);
    e1.visible = false;
    e2.visible = false;
    mundo.add(e1);
    mundo.add(e2);
    estelasFlujo.push({ cerca: e1, lejos: e2 });
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
    manoIzq: mundo.worldToLocal(trabajador.cabeza.localToWorld(new THREE.Vector3(-0.4, 0.3, 0.04))).clone(),
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
    poloDer: POLO_DER_INICIAL.clone()
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
  movil.position.set(-0.4, 0.26, 0.03);
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
    trabajador.cabeza.add(movil);
    movil.position.set(-0.4, 0.26, 0.03);
    movil.rotation.set(0, 0, -8 * GRADOS);
    movil.scale.set(1, 1, 1);
    movil.visible = true;

    boli.scale.set(1, 1, 1);

    trabajador.raiz.position.set(-1.55, 0, 0.55);
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
      estelasFlujo[f2].cerca.visible = false;
      estelasFlujo[f2].lejos.visible = false;
    }

    for (var mo2 = 0; mo2 < motas.length; mo2++) {
      motas[mo2].visible = false;
      motas[mo2].material.opacity = 0.9;
    }

    robot.raiz.visible = false;
    robot.raiz.position.set(10, 0, -0.6);
    robot.cabeza.rotation.set(0, 0, 0);
    robot.cuerpo.scale.set(1, 1, 1);

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
    estelasFlujo: estelasFlujo,
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
  }

  // --- Bucle --------------------------------------------------------------

  var tiempo = 0;
  var _destinoIzq = new THREE.Vector3();
  var _destinoDer = new THREE.Vector3();

  function tick(ahora) {
    var delta = relojUltimo === 0 ? 0.016 : (ahora - relojUltimo) / 1000;
    relojUltimo = ahora;
    tiempo += delta;

    // Balanceo idle del robot, con su propio ritmo, ajeno al guion.
    robot.flotante.position.y = 0.62 + Math.sin(tiempo * 1.6) * 0.06;

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
