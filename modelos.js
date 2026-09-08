/**
 * Modelos voxel de la escena — todo generado por código, cero assets.
 *
 * Dos principios que conviene no romper al editar:
 *
 * 1. PIVOTES EN LAS ARTICULACIONES. Cada parte articulada es un Group cuyo
 *    origen está en la articulación, con la malla desplazada hacia abajo.
 *    Así animar es rotar el Group, sin recalcular posiciones. Toda la fase
 *    de animación depende de esto.
 *
 * 2. PALETA COMPARTIDA. Los colores son los tokens del sitio. Si cambia
 *    --accent en styles.css, cambia aquí también.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export var PALETA = {
  acento:     0xF8894B,
  figura:     0xDBD1C7,
  figuraOsc:  0xAC9D8E,
  robot:      0x45392C,
  robotOsc:   0x30271E,
  robotBrazo: 0x665441,
  robotCara:  0x1C1712,
  papel:      0xF2EEE3,
  movil:      0x30271E,
  mesa:       0x4D3F31,
  mesaOsc:    0x3B3025
};

// Cache de materiales: un solo MeshLambertMaterial por color para toda la
// escena. Con decenas de bloques esto importa más que la geometría.
var materiales = {};

function material(color) {
  if (!materiales[color]) {
    materiales[color] = new THREE.MeshLambertMaterial({ color: color });
  }
  return materiales[color];
}

// Cache de geometrías por tamaño. Antes se escalaba una única caja unitaria,
// pero con cantos redondeados eso no vale: escalar un cubo redondeado a un
// miembro alargado deforma el radio y los cantos salen ovalados. Cada tamaño
// distinto necesita su geometría, y el cache evita duplicarlas.
var geometrias = {};

function geometriaCaja(ancho, alto, fondo) {
  var clave = ancho.toFixed(3) + '|' + alto.toFixed(3) + '|' + fondo.toFixed(3);

  if (!geometrias[clave]) {
    // El radio se saca de la dimensión más pequeña: suficiente para matar la
    // arista dura sin llegar a redondear la silueta, que es lo que haría
    // perder el carácter voxel. 3 segmentos en vez de 2: el canto se lee
    // como un bisel trabajado y no como un chaflán recto.
    var radio = Math.min(ancho, alto, fondo) * 0.22;
    // 1 segmento de redondeo, no 3: a este tamaño en pantalla la diferencia
    // no se aprecia, y el coste cae de 588 a 108 triángulos POR BLOQUE.
    // Con ~73 bloques entre los dos personajes, eso son 35.000 triángulos
    // de diferencia, que es justo lo que se paga en un móvil de gama media.
    geometrias[clave] = new RoundedBoxGeometry(ancho, alto, fondo, 1, radio);
  }

  return geometrias[clave];
}

/**
 * Bloque. (x, y, z) es el CENTRO salvo que se indique lo contrario.
 */
function caja(ancho, alto, fondo, color, x, y, z) {
  var m = new THREE.Mesh(geometriaCaja(ancho, alto, fondo), material(color));
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

var geometriasEsfera = {};

/**
 * Articulación. Lo que más cambia la lectura de la figura: sin una pieza
 * en la unión, los miembros se leen como bloques sueltos flotando; con
 * ella, el cuerpo se lee como un cuerpo articulado.
 */
function esfera(radio, color, x, y, z) {
  var clave = radio.toFixed(3);
  if (!geometriasEsfera[clave]) {
    // 12x8: suficiente para que no se vea facetada a este tamaño, y muy
    // barato. Subirlo no se aprecia y multiplica triángulos.
    geometriasEsfera[clave] = new THREE.SphereGeometry(radio, 12, 8);
  }
  var m = new THREE.Mesh(geometriasEsfera[clave], material(color));
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

var geometriasCilindro = {};

/** Piezas mecánicas del robot: ejes, boquillas, remates. */
function cilindro(radio, alto, color, x, y, z) {
  var clave = radio.toFixed(3) + '|' + alto.toFixed(3);
  if (!geometriasCilindro[clave]) {
    geometriasCilindro[clave] = new THREE.CylinderGeometry(radio, radio, alto, 12);
  }
  var m = new THREE.Mesh(geometriasCilindro[clave], material(color));
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

/**
 * Sombra de contacto falsa: un disco oscuro plano. Cuesta una centésima
 * parte de una sombra dinámica y en voxel se lee igual de bien.
 */
function sombraContacto(radio) {
  var g = new THREE.Mesh(
    new THREE.CircleGeometry(radio, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  g.rotation.x = -Math.PI / 2;
  g.position.y = 0.02;
  return g;
}

/* ==========================================================================
   CINEMÁTICA INVERSA DE DOS HUESOS

   Fijar ángulos de hombro y codo a ojo no funciona: un grado de más en el
   hombro desplaza la mano varios centímetros y hay que reajustar el codo.
   Con esto la pose se declara por su destino — "la mano va sobre el papel",
   "la mano va a la oreja" — y los ángulos salen solos.

   Para la animación esto importa todavía más: se interpola el punto de
   destino, que es una línea recta, en vez de tres ángulos a la vez.
   ========================================================================== */

var ABAJO = new THREE.Vector3(0, -1, 0);
var _objetivo = new THREE.Vector3();
var _direccion = new THREE.Vector3();
var _polo = new THREE.Vector3();
var _ejeX = new THREE.Vector3();
var _ejeY = new THREE.Vector3();
var _ejeZ = new THREE.Vector3();
var _base = new THREE.Matrix4();

// Polo por defecto: codo hacia abajo y ligeramente atrás.
var POLO_DEFECTO = new THREE.Vector3(0, -1, -0.3);

function limitar(v) {
  return Math.max(-1, Math.min(1, v));
}

/**
 * Coloca la mano de un brazo en un punto del MUNDO.
 *
 * @param brazo          {hombro, codo, mano, l1, l2}
 * @param objetivoMundo  THREE.Vector3 en coordenadas de mundo
 * @param polo           dirección hacia la que debe salir el CODO, en el
 *                       espacio del torso. Sin esto el plano de flexión sale
 *                       arbitrario y el brazo puede doblarse hacia dentro del
 *                       cuerpo y quedar escondido tras el torso.
 *
 * Requiere que las matrices de mundo estén al día: llama antes a
 * escena.updateMatrixWorld(true) si acabas de mover el torso o la raíz.
 */
export function apuntarBrazo(brazo, objetivoMundo, polo) {
  var hombro = brazo.hombro;

  // El objetivo se pasa al espacio del padre del hombro (el torso), que es
  // donde vive hombro.position.
  _objetivo.copy(objetivoMundo);
  hombro.parent.updateWorldMatrix(true, false);
  hombro.parent.worldToLocal(_objetivo);

  _direccion.subVectors(_objetivo, hombro.position);

  var L1 = brazo.l1;
  var L2 = brazo.l2;

  // Nunca se estira del todo: un brazo perfectamente recto se ve rígido y
  // además hace que la IK oscile en el límite.
  var distancia = Math.min(_direccion.length(), (L1 + L2) * 0.985);
  if (distancia < 0.0001) return;

  _direccion.normalize();

  // 1. Construir la orientación del hombro con una base explícita, en vez de
  //    dejar que setFromUnitVectors elija un giro cualquiera:
  //    - el eje -Y local (por donde cuelga el brazo) apunta al objetivo
  //    - el eje X local es el eje de flexión, perpendicular al plano que
  //      forman la dirección y el polo
  //    Así el codo sale SIEMPRE hacia el lado que indica el polo.
  _polo.copy(polo || POLO_DEFECTO).normalize();
  _ejeX.crossVectors(_direccion, _polo);

  // Dirección y polo paralelos: no definen un plano. Se coge un eje
  // cualquiera perpendicular para no producir una matriz degenerada.
  if (_ejeX.lengthSq() < 0.000001) {
    _ejeX.set(1, 0, 0).cross(_direccion);
    if (_ejeX.lengthSq() < 0.000001) _ejeX.set(0, 0, 1).cross(_direccion);
  }
  _ejeX.normalize();

  _ejeY.copy(_direccion).negate();
  _ejeZ.crossVectors(_ejeX, _ejeY).normalize();

  _base.makeBasis(_ejeX, _ejeY, _ejeZ);
  hombro.quaternion.setFromRotationMatrix(_base);

  // 2. Abrir el triángulo hombro-codo-mano por la ley de los cosenos. El
  //    giro es sobre el eje X local, que ya apunta al lado correcto.
  var a = Math.acos(limitar(
    (distancia * distancia + L1 * L1 - L2 * L2) / (2 * distancia * L1)
  ));
  var b = Math.PI - Math.acos(limitar(
    (L1 * L1 + L2 * L2 - distancia * distancia) / (2 * L1 * L2)
  ));

  hombro.rotateX(a);
  brazo.codo.rotation.set(-b, 0, 0);
}

/* ==========================================================================
   TRABAJADOR

   Silueta esquemática pero no simplona: sin cara ni detalle superfluo, y a
   la vez con los tramos anatómicos que hacen que un cuerpo se lea como un
   cuerpo. Tres decisiones que cargan casi todo el peso:

   1. MIEMBROS POR TRAMOS. Cada hueso son dos bloques de anchura decreciente
      en vez de uno solo. Un brazo de grosor constante es lo que delata al
      muñeco de bloques.
   2. ARTICULACIONES VISIBLES. Un bloque en hombro, codo, cadera y rodilla.
      Sin ellos los miembros parecen palos sueltos pegados al torso.
   3. TORSO EN CUATRO PLANOS con anchura Y fondo distintos, no una caja.
   ========================================================================== */

export function crearTrabajador() {
  var raiz = new THREE.Group();

  raiz.add(sombraContacto(0.85));

  // Piernas: cadera -> muslo (dos tramos) -> rodilla -> pantorrilla (dos
  // tramos) -> tobillo -> pie. No se articulan en toda la pieza, pero el
  // escalonado de grosores ya evita que se lean como dos postes.
  function pierna(x) {
    var g = new THREE.Group();
    g.position.x = x;

    g.add(caja(0.38, 0.5, 0.4, PALETA.figuraOsc, 0, 1.3, 0));      // muslo alto
    g.add(caja(0.33, 0.45, 0.35, PALETA.figuraOsc, 0, 0.86, 0));   // muslo bajo
    g.add(caja(0.32, 0.2, 0.34, PALETA.figura, 0, 0.63, 0.01));    // rodilla
    g.add(caja(0.3, 0.4, 0.32, PALETA.figuraOsc, 0, 0.38, 0.01));  // gemelo
    g.add(caja(0.25, 0.28, 0.27, PALETA.figuraOsc, 0, 0.14, 0.01)); // tobillo
    g.add(caja(0.28, 0.14, 0.5, PALETA.figura, 0, 0.07, 0.12));    // pie

    raiz.add(g);
    return g;
  }

  pierna(-0.24);
  pierna(0.24);

  // Torso: el Group permite inclinarlo entero (encogerse, enderezarse).
  var torso = new THREE.Group();
  torso.position.y = 1.55;
  raiz.add(torso);

  // Cuatro planos con anchura Y fondo propios: la cadera es estrecha y
  // profunda, el pecho ancho y plano. Eso es lo que da volumen de cuerpo.
  torso.add(caja(0.84, 0.3, 0.48, PALETA.figuraOsc, 0, 0.15, 0));  // cadera
  torso.add(caja(0.76, 0.34, 0.42, PALETA.figura, 0, 0.47, 0));    // cintura
  torso.add(caja(0.9, 0.5, 0.48, PALETA.figura, 0, 0.89, 0));      // abdomen
  torso.add(caja(1.04, 0.62, 0.54, PALETA.figura, 0, 1.44, 0));    // pecho
  torso.add(caja(0.96, 0.22, 0.5, PALETA.figura, 0, 1.82, 0));     // clavículas

  // Deltoides: rematan el pecho y dan el nacimiento redondeado del brazo,
  // en vez de que salga de una esquina viva.
  torso.add(caja(0.36, 0.4, 0.46, PALETA.figura, -0.62, 1.66, 0));
  torso.add(caja(0.36, 0.4, 0.46, PALETA.figura,  0.62, 1.66, 0));

  torso.add(caja(0.24, 0.16, 0.24, PALETA.figuraOsc, 0, 1.98, -0.02)); // cuello

  // Cabeza: cráneo + mandíbula algo más estrecha y menos profunda. Un cubo
  // único era buena parte del efecto muñeco.
  var cabeza = new THREE.Group();
  cabeza.position.y = 1.94;
  torso.add(cabeza);
  cabeza.add(caja(0.68, 0.5, 0.64, PALETA.figura, 0, 0.5, 0));      // cráneo
  cabeza.add(caja(0.58, 0.26, 0.56, PALETA.figura, 0, 0.19, 0.02)); // mandíbula

  // Brazos: hombro -> antebrazo, cada hueso en dos tramos que estrechan,
  // con bloque de articulación en hombro y codo. Las longitudes L1 y L2 no
  // se tocan: la IK y todos los destinos del guion están calibrados a ellas.
  function brazo(signo) {
    var L1 = 0.72;
    var L2 = 0.66;

    var hombro = new THREE.Group();
    hombro.position.set(signo * 0.62, 1.62, 0);
    torso.add(hombro);

    hombro.add(caja(0.3, 0.28, 0.32, PALETA.figura, 0, -0.1, 0));       // articulación
    hombro.add(caja(0.28, 0.3, 0.3, PALETA.figura, 0, -0.32, 0));       // bíceps
    hombro.add(caja(0.25, 0.28, 0.27, PALETA.figura, 0, -0.58, 0));     // sobre el codo

    var codo = new THREE.Group();
    codo.position.y = -L1;
    hombro.add(codo);

    codo.add(caja(0.26, 0.2, 0.28, PALETA.figura, 0, 0.02, 0));         // articulación
    codo.add(caja(0.24, 0.3, 0.26, PALETA.figura, 0, -0.2, 0));         // antebrazo
    codo.add(caja(0.2, 0.26, 0.22, PALETA.figura, 0, -0.48, 0));        // muñeca

    // Punto de agarre al final del antebrazo: aquí se cuelgan el móvil o
    // el bolígrafo, y de aquí se los llevará el robot en el estado 04.
    var mano = new THREE.Group();
    mano.position.y = -L2;
    codo.add(mano);

    mano.add(caja(0.2, 0.24, 0.14, PALETA.figura, 0, -0.09, 0));        // palma
    mano.add(caja(0.09, 0.16, 0.12, PALETA.figura, signo * -0.12, -0.05, 0.02)); // pulgar

    return { hombro: hombro, codo: codo, mano: mano, l1: L1, l2: L2 };
  }

  var brazoIzq = brazo(-1);
  var brazoDer = brazo(1);

  return {
    raiz: raiz,
    torso: torso,
    cabeza: cabeza,
    brazoIzq: brazoIzq,
    brazoDer: brazoDer
  };
}

/* ==========================================================================
   ROBOT

   Bloques rectos y simetría estricta: su quietud es lo que lo hace legible
   como solución frente a la diagonal crispada del trabajador.

   La riqueza viene de superponer planos a distinta profundidad -- pecho
   hundido, placas laterales, rejillas -- no de añadir piezas sueltas. Un
   robot con muchos cachos pegados parece un juguete; uno con capas parece
   una máquina.
   ========================================================================== */

export function crearRobot() {
  var raiz = new THREE.Group();

  // Sombra ajustada al cuerpo: antes era mucho más ancha que el robot y en
  // vez de "flota" leía como "levita sobre un agujero".
  raiz.add(sombraContacto(0.82));

  // Flota, pero bajo: no tiene piernas y el hueco bajo el cuerpo es parte
  // del look. Demasiada altura lo desconecta del suelo.
  var flotante = new THREE.Group();
  flotante.position.y = 0.62;
  raiz.add(flotante);

  var cuerpo = new THREE.Group();
  flotante.add(cuerpo);

  // Chasis en tres tramos: base estrecha, torso, y hombros más anchos.
  cuerpo.add(caja(1.34, 0.34, 0.92, PALETA.robotOsc, 0, 0.2, 0));   // base
  cuerpo.add(caja(1.62, 1.24, 1.06, PALETA.robot, 0, 1.0, 0));      // torso
  cuerpo.add(caja(1.76, 0.42, 1.12, PALETA.robot, 0, 1.78, 0));     // hombros

  // Pecho hundido: una placa más oscura y retranqueada, con el indicador
  // encima. Es lo que da sensación de carcasa en vez de bloque macizo.
  cuerpo.add(caja(1.02, 0.72, 0.06, PALETA.robotOsc, 0, 1.16, 0.5));
  cuerpo.add(caja(0.66, 0.12, 0.05, PALETA.acento, 0, 1.34, 0.55));
  cuerpo.add(caja(0.42, 0.08, 0.05, PALETA.robotBrazo, 0, 1.14, 0.55));
  cuerpo.add(caja(0.28, 0.08, 0.05, PALETA.robotBrazo, -0.1, 0.98, 0.55));

  // Placas laterales, ligeramente sobresalidas.
  cuerpo.add(caja(0.1, 0.9, 0.72, PALETA.robotBrazo, -0.82, 1.06, 0));
  cuerpo.add(caja(0.1, 0.9, 0.72, PALETA.robotBrazo, 0.82, 1.06, 0));

  // Ranura de salida: por aquí sale el trabajo procesado en el estado 06.
  cuerpo.add(caja(1.2, 0.16, 0.06, PALETA.robotCara, 0, 0.52, 0.48));

  // Cabeza: cráneo + visor hundido + mentón. El visor retranqueado es lo
  // que hace que los ojos se lean como luces dentro de una carcasa.
  var cabeza = new THREE.Group();
  cabeza.position.y = 2.34;
  cuerpo.add(cabeza);

  cabeza.add(caja(1.24, 0.72, 0.98, PALETA.robot, 0, 0.4, 0));       // cráneo
  cabeza.add(caja(1.06, 0.16, 0.9, PALETA.robotOsc, 0, 0.02, 0));    // mentón
  cabeza.add(caja(0.94, 0.34, 0.06, PALETA.robotCara, 0, 0.42, 0.49)); // visor
  cabeza.add(caja(0.2, 0.16, 0.05, PALETA.acento, -0.21, 0.42, 0.53));
  cabeza.add(caja(0.2, 0.16, 0.05, PALETA.acento,  0.21, 0.42, 0.53));
  cabeza.add(caja(0.12, 0.3, 0.5, PALETA.robotBrazo, -0.63, 0.4, 0)); // oreja
  cabeza.add(caja(0.12, 0.3, 0.5, PALETA.robotBrazo,  0.63, 0.4, 0));

  // Antena con testigo: se enciende al aparecer (estado 03) y pulsa durante
  // el procesamiento (estado 06).
  cabeza.add(caja(0.12, 0.34, 0.12, PALETA.robotOsc, 0, 0.92, 0));
  var testigo = caja(0.24, 0.24, 0.24, PALETA.acento, 0, 1.18, 0);
  cabeza.add(testigo);

  // Brazos en tono medio, no en el oscuro del cuerpo: en oscuro se
  // despegaban visualmente y parecían losas flotando.
  function brazo(signo) {
    var L1 = 0.6;
    var L2 = 0.55;

    var hombro = new THREE.Group();
    hombro.position.set(signo * 0.94, 1.72, 0.08);
    cuerpo.add(hombro);

    hombro.add(caja(0.4, 0.36, 0.44, PALETA.robot, 0, -0.06, 0));      // hombrera
    hombro.add(caja(0.3, 0.34, 0.32, PALETA.robotBrazo, 0, -0.36, 0)); // brazo

    var codo = new THREE.Group();
    codo.position.y = -L1;
    hombro.add(codo);

    codo.add(caja(0.28, 0.2, 0.3, PALETA.robot, 0, 0.02, 0));          // articulación
    codo.add(caja(0.26, 0.32, 0.28, PALETA.robotBrazo, 0, -0.24, 0));  // antebrazo

    var mano = new THREE.Group();
    mano.position.y = -L2;
    codo.add(mano);

    mano.add(caja(0.24, 0.2, 0.24, PALETA.robotBrazo, 0, -0.06, 0));   // pinza
    mano.add(caja(0.07, 0.16, 0.2, PALETA.robotOsc, -0.09, -0.2, 0));
    mano.add(caja(0.07, 0.16, 0.2, PALETA.robotOsc,  0.09, -0.2, 0));

    return { hombro: hombro, codo: codo, mano: mano, l1: L1, l2: L2 };
  }

  return {
    raiz: raiz,
    flotante: flotante,
    cuerpo: cuerpo,
    cabeza: cabeza,
    testigo: testigo,
    brazoIzq: brazo(-1),
    brazoDer: brazo(1)
  };
}

/* ==========================================================================
   OBJETOS
   ========================================================================== */

export function crearEscritorio() {
  var g = new THREE.Group();
  g.add(caja(3.9, 0.18, 1.75, PALETA.mesa, 0, 1.85, 0));
  g.add(caja(0.22, 1.85, 0.22, PALETA.mesaOsc, -1.72, 0.92, -0.68));
  g.add(caja(0.22, 1.85, 0.22, PALETA.mesaOsc,  1.72, 0.92, -0.68));
  g.add(caja(0.22, 1.85, 0.22, PALETA.mesaOsc, -1.72, 0.92,  0.68));
  g.add(caja(0.22, 1.85, 0.22, PALETA.mesaOsc,  1.72, 0.92,  0.68));
  return g;
}

/**
 * Hoja suelta. Se crean muchas y se reciclan durante el estado 06, así que
 * comparten geometría y material por el cache de arriba.
 */
export function crearPapel() {
  var g = new THREE.Group();
  g.add(caja(0.86, 0.05, 1.12, PALETA.papel, 0, 0, 0));
  g.add(caja(0.52, 0.02, 0.07, PALETA.mesaOsc, 0, 0.035, -0.24));
  g.add(caja(0.52, 0.02, 0.07, PALETA.mesaOsc, 0, 0.035, -0.06));
  g.add(caja(0.34, 0.02, 0.07, PALETA.mesaOsc, -0.09, 0.035, 0.12));
  return g;
}

// Material BASE de la estela, uno por nivel de opacidad. Sirve solo de
// plantilla: cada estela CLONA este material, nunca lo comparte. Si se
// compartiera, animar la opacidad de una hoja cambiaría la opacidad de las
// diez a la vez -- exactamente el mismo fallo que el testigo del robot.
var materialesEstelaBase = {};

function materialEstelaBase(opacidad) {
  var clave = opacidad.toFixed(2);
  if (!materialesEstelaBase[clave]) {
    materialesEstelaBase[clave] = new THREE.MeshBasicMaterial({
      color: PALETA.papel,
      transparent: true,
      opacity: opacidad,
      depthWrite: false   // evita el z-fighting entre estela y hoja real
    });
  }
  return materialesEstelaBase[clave];
}

/**
 * Silueta plana de un papel, sin las líneas interiores: la estela no
 * necesita detalle, solo la forma reconocible con opacidad decreciente
 * detrás del objeto real. Es el recurso que vende velocidad en el estado
 * 06 -- más que la propia velocidad del movimiento.
 *
 * La geometría SÍ se comparte (cache por tamaño, como el resto de bloques);
 * el material se CLONA porque su opacidad se anima por instancia.
 */
export function crearEstelaPapel(opacidad) {
  return new THREE.Mesh(
    geometriaCaja(0.86, 0.05, 1.12),
    materialEstelaBase(opacidad).clone()
  );
}

/**
 * Mota de succión: fragmento diminuto que viaja desde la mesa hacia el
 * robot durante la absorción. Comunica la fuerza que atrae los papeles
 * mediante trayectoria y velocidad, no mediante más brillo.
 *
 * Material clonado por instancia: su opacidad se anima por separado.
 */
var materialMotaBase = null;

export function crearMota() {
  if (!materialMotaBase) {
    materialMotaBase = new THREE.MeshBasicMaterial({
      color: PALETA.acento,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
  }
  return new THREE.Mesh(geometriaCaja(0.1, 0.1, 0.1), materialMotaBase.clone());
}

export function crearMovil() {
  var g = new THREE.Group();
  g.add(caja(0.34, 0.62, 0.08, PALETA.movil, 0, 0, 0));
  g.add(caja(0.26, 0.46, 0.03, PALETA.acento, 0, 0.02, 0.05));
  return g;
}

export function crearBoli() {
  var g = new THREE.Group();
  g.add(caja(0.08, 0.52, 0.08, PALETA.robotOsc, 0, 0, 0));
  g.add(caja(0.07, 0.12, 0.07, PALETA.acento, 0, -0.3, 0));
  return g;
}

/**
 * Suelo: solo una franja tenue que ancla a las figuras. Sin plano completo
 * -- un suelo grande cerraría el encuadre y la escena debe respirar.
 */
export function crearSuelo() {
  var g = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 9),
    new THREE.MeshBasicMaterial({ color: 0x1C1611, transparent: true, opacity: 0.55 })
  );
  g.rotation.x = -Math.PI / 2;
  return g;
}
