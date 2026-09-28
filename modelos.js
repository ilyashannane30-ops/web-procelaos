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

// Altura de reposo de las cejas en la cabeza del trabajador. La usan
// escena3d.js (reinicio) y guion.js (gestos).
export var ALTURA_CEJAS = 0.57;

export var PALETA = {
  acento:     0xF8894B,
  figura:     0xDBD1C7,
  figuraOsc:  0xAC9D8E,
  // Trabajador vestido: camisa azul pizarra apagada (complementaria del
  // naranja del robot, sin competir con él), pantalón y zapatos oscuros,
  // piel cálida y pelo castaño.
  piel:       0xDDB093,
  pielOsc:    0xC4957A,
  pelo:       0x3A2A20,
  camisa:     0x5C7A89,
  camisaOsc:  0x4A6371,
  pantalon:   0x3B3540,
  zapato:     0x221B16,
  ojo:        0x1A1411,
  // Robot más claro que antes: con el fondo oscuro de la web, el marrón
  // casi negro se perdía y la silueta no se leía.
  robot:      0x6A5642,
  robotOsc:   0x44372A,
  robotBrazo: 0x8A7259,
  robotCara:  0x14100C,
  papel:      0xF2EEE3,
  movil:      0x30271E,
  mesa:       0x4D3F31,
  mesaOsc:    0x3B3025
};

// Cache de materiales: uno por color para toda la escena. Con decenas de
// bloques esto importa más que la geometría.
//
// MeshStandardMaterial en vez de Lambert: los biseles redondeados recogen
// brillos y la escena deja de verse plana. El robot es algo metálico (más
// reflejo, menos rugosidad) y el resto mate; el naranja emite un poco de
// luz propia para que los detalles de acento brillen como pilotos.
var materiales = {};

var COLORES_ROBOT = [PALETA.robot, PALETA.robotOsc, PALETA.robotBrazo, PALETA.robotCara];

function material(color) {
  if (!materiales[color]) {
    var esRobot = COLORES_ROBOT.indexOf(color) !== -1;
    var esAcento = color === PALETA.acento;
    materiales[color] = new THREE.MeshStandardMaterial({
      color: color,
      roughness: esRobot ? 0.42 : 0.78,
      metalness: esRobot ? 0.35 : 0.02,
      emissive: esAcento ? PALETA.acento : 0x000000,
      emissiveIntensity: esAcento ? 0.35 : 0
    });
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

   Formas orgánicas, sin un solo bloque: el humano tiene que leerse como
   una persona y el robot como una máquina, y el contraste de formas
   (curvas frente a cajas) lo cuenta antes que cualquier color.

   - Miembros: troncos de cono que estrechan hacia la punta, unidos por
     esferas en hombro, codo, cadera y rodilla.
   - Torso: óvalo que se ensancha del abdomen al pecho, con hombros
     redondos.
   - Cabeza: elipsoide con pelo que la envuelve, orejas y nariz. En la cara
     solo ojos y cejas -- lo justo para que se lea hacia dónde mira y qué
     siente.

   La estructura de grupos (piernas, torso, pecho, cabeza, brazos) y todas
   las medidas de articulación son las mismas que usan la IK y el guion.
   ========================================================================== */

// Geometrías suaves, cacheadas por medidas como las cajas.
var geometriasSuaves = {};

function geometriaSuave(clave, crear) {
  if (!geometriasSuaves[clave]) geometriasSuaves[clave] = crear();
  return geometriasSuaves[clave];
}

/** Tronco de cono vertical (centro en x,y,z). escalaZ lo aplana de fondo. */
function tramo(radioArriba, radioAbajo, alto, color, x, y, z, escalaZ) {
  var g = geometriaSuave('t' + [radioArriba, radioAbajo, alto].join('|'), function () {
    return new THREE.CylinderGeometry(radioArriba, radioAbajo, alto, 22, 1);
  });
  var m = new THREE.Mesh(g, material(color));
  m.position.set(x || 0, y || 0, z || 0);
  if (escalaZ) m.scale.z = escalaZ;
  return m;
}

/** Elipsoide: esfera escalada por ejes (radios rx, ry, rz). */
function elipsoide(rx, ry, rz, color, x, y, z) {
  var g = geometriaSuave('esfera', function () {
    return new THREE.SphereGeometry(1, 28, 20);
  });
  var m = new THREE.Mesh(g, material(color));
  m.scale.set(rx, ry, rz);
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

/** Cápsula vertical: largo es el tramo recto, sin contar las semiesferas. */
function capsula(radio, largo, color, x, y, z) {
  var g = geometriaSuave('c' + radio + '|' + largo, function () {
    return new THREE.CapsuleGeometry(radio, largo, 6, 16);
  });
  var m = new THREE.Mesh(g, material(color));
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

export function crearTrabajador() {
  var raiz = new THREE.Group();

  raiz.add(sombraContacto(0.85));

  // Piernas articuladas: cadera (pivote arriba del muslo) -> rodilla. Así
  // puede flexionar las rodillas al encogerse y dar pasos al apartarse.
  var ALTURA_CADERA = 1.52;
  var ALTURA_RODILLA = 0.63;
  var LARGO_MUSLO = ALTURA_CADERA - ALTURA_RODILLA;   // 0,89

  function pierna(x) {
    var cadera = new THREE.Group();
    cadera.position.set(x, ALTURA_CADERA, 0);
    raiz.add(cadera);

    cadera.add(elipsoide(0.21, 0.2, 0.22, PALETA.pantalon, 0, -0.02, 0));                 // arranque del muslo
    cadera.add(tramo(0.2, 0.155, LARGO_MUSLO, PALETA.pantalon, 0, -LARGO_MUSLO / 2, 0));  // muslo

    var rodilla = new THREE.Group();
    rodilla.position.y = -LARGO_MUSLO;
    cadera.add(rodilla);

    rodilla.add(elipsoide(0.158, 0.16, 0.165, PALETA.pantalon, 0, 0, 0.005));   // rodilla
    rodilla.add(tramo(0.155, 0.12, 0.5, PALETA.pantalon, 0, -0.25, 0));         // pierna
    rodilla.add(tramo(0.12, 0.13, 0.06, PALETA.pantalon, 0, -0.5, 0));          // bajo del pantalón
    rodilla.add(elipsoide(0.085, 0.07, 0.085, PALETA.pielOsc, 0, -0.52, 0));    // tobillo

    // Zapato: un óvalo largo y bajo, más una suela algo más ancha.
    rodilla.add(elipsoide(0.13, 0.085, 0.27, PALETA.zapato, 0, -ALTURA_RODILLA + 0.08, 0.1));
    rodilla.add(elipsoide(0.14, 0.03, 0.285, PALETA.figuraOsc, 0, -ALTURA_RODILLA + 0.03, 0.1));

    return { cadera: cadera, rodilla: rodilla };
  }

  var piernaIzq = pierna(-0.22);
  var piernaDer = pierna(0.22);

  // Torso: el Group permite inclinarlo entero (encogerse, enderezarse).
  var torso = new THREE.Group();
  torso.position.y = 1.55;
  raiz.add(torso);

  // Pelvis y cintura: óvalos aplanados de fondo, con el cinturón entre
  // pantalón y camisa.
  torso.add(elipsoide(0.43, 0.24, 0.27, PALETA.pantalon, 0, 0.1, 0));             // pelvis
  torso.add(tramo(0.4, 0.42, 0.08, PALETA.zapato, 0, 0.3, 0, 0.64));              // cinturón
  torso.add(tramo(0.38, 0.4, 0.36, PALETA.camisa, 0, 0.5, 0, 0.62));              // cintura

  // Columna: todo lo que va de la cintura hacia arriba cuelga de este
  // pivote, así el cuerpo se encorva y se estira por la espalda en vez de
  // inclinarse entero como un tablón. Las cotas siguen expresadas respecto
  // al torso (de ahí el "- PIVOTE_COLUMNA").
  var PIVOTE_COLUMNA = 0.64;
  var pecho = new THREE.Group();
  pecho.position.y = PIVOTE_COLUMNA;
  torso.add(pecho);

  function enPecho(y) { return y - PIVOTE_COLUMNA; }

  // Abdomen -> pecho: se ensancha hacia arriba y remata en un óvalo que
  // redondea los hombros.
  // Baja hasta solapar la cintura: si no, al encorvarse se abre un hueco
  // entre camisa y cinturón.
  pecho.add(tramo(0.5, 0.38, 1.1, PALETA.camisa, 0, enPecho(1.2), 0, 0.56));
  pecho.add(elipsoide(0.52, 0.2, 0.3, PALETA.camisa, 0, enPecho(1.74), 0));        // hombros
  pecho.add(elipsoide(0.2, 0.2, 0.22, PALETA.camisa, -0.6, enPecho(1.66), 0));     // deltoides
  pecho.add(elipsoide(0.2, 0.2, 0.22, PALETA.camisa,  0.6, enPecho(1.66), 0));

  // Tapeta de botones y bolsillo: dos detalles planos pegados a la curva.
  pecho.add(capsula(0.025, 0.7, PALETA.camisaOsc, 0, enPecho(1.3), 0.285));
  pecho.add(elipsoide(0.1, 0.09, 0.02, PALETA.camisaOsc, -0.25, enPecho(1.48), 0.275));

  // Cuello y cuello de la camisa (un aro).
  pecho.add(tramo(0.12, 0.13, 0.26, PALETA.pielOsc, 0, enPecho(1.96), -0.01));
  var aroCuello = new THREE.Mesh(
    geometriaSuave('aroCuello', function () { return new THREE.TorusGeometry(0.15, 0.045, 10, 24); }),
    material(PALETA.camisaOsc)
  );
  aroCuello.rotation.x = Math.PI / 2;
  aroCuello.position.set(0, enPecho(1.87), 0);
  pecho.add(aroCuello);

  // Cabeza: elipsoide algo más alto que ancho.
  var cabeza = new THREE.Group();
  cabeza.position.y = enPecho(1.94);
  pecho.add(cabeza);

  cabeza.add(elipsoide(0.3, 0.36, 0.32, PALETA.piel, 0, 0.44, 0));             // cabeza
  cabeza.add(elipsoide(0.055, 0.085, 0.05, PALETA.pielOsc, -0.3, 0.42, 0));   // oreja
  cabeza.add(elipsoide(0.055, 0.085, 0.05, PALETA.pielOsc,  0.3, 0.42, 0));
  cabeza.add(elipsoide(0.045, 0.065, 0.055, PALETA.pielOsc, 0, 0.4, 0.31));   // nariz

  // Pelo: media esfera algo mayor que la cabeza, inclinada hacia atrás
  // para dejar la frente al aire y cubrir la nuca.
  var pelo = new THREE.Mesh(
    geometriaSuave('pelo', function () {
      return new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    }),
    material(PALETA.pelo)
  );
  pelo.scale.set(0.325, 0.385, 0.345);
  pelo.position.set(0, 0.47, -0.02);
  pelo.rotation.x = -0.42;
  cabeza.add(pelo);

  // Ojos: pegados a la superficie del elipsoide. Parpadean (ver
  // escena3d.js) escalándolos en vertical.
  var ojos = [-0.11, 0.11].map(function (x) {
    var ojo = elipsoide(0.032, 0.04, 0.02, PALETA.ojo, x, 0.49, 0.29);
    // La escala ES el tamaño del elipsoide: el parpadeo tiene que
    // multiplicar esta altura, no sustituirla.
    ojo.userData.altoAbierto = ojo.scale.y;
    cabeza.add(ojo);
    return ojo;
  });

  // Cejas: una cápsula tumbada dentro de un grupo, para que el guion
  // pueda subirlas (position.y) e inclinarlas (rotation.z) sin tocar el
  // giro que las tumba.
  var cejas = [-0.11, 0.11].map(function (x) {
    var ceja = new THREE.Group();
    ceja.position.set(x, ALTURA_CEJAS, 0.275);
    var trazo = capsula(0.017, 0.07, PALETA.pelo, 0, 0, 0);
    trazo.rotation.z = Math.PI / 2;
    ceja.add(trazo);
    cabeza.add(ceja);
    return ceja;
  });

  // Brazos: hombro -> codo -> mano. Las longitudes L1 y L2 no se tocan: la
  // IK y todos los destinos del guion están calibrados a ellas.
  function brazo(signo) {
    var L1 = 0.72;
    var L2 = 0.66;

    var hombro = new THREE.Group();
    hombro.position.set(signo * 0.62, enPecho(1.62), 0);
    pecho.add(hombro);

    hombro.add(elipsoide(0.16, 0.16, 0.16, PALETA.camisa, 0, -0.04, 0));        // hombro
    hombro.add(tramo(0.15, 0.125, 0.56, PALETA.camisa, 0, -0.32, 0));           // brazo
    hombro.add(tramo(0.14, 0.14, 0.1, PALETA.camisaOsc, 0, -0.62, 0));          // manga remangada

    var codo = new THREE.Group();
    codo.position.y = -L1;
    hombro.add(codo);

    codo.add(elipsoide(0.105, 0.105, 0.105, PALETA.piel, 0, 0, 0));             // codo
    codo.add(tramo(0.105, 0.08, 0.56, PALETA.piel, 0, -0.29, 0));               // antebrazo

    // Punto de agarre al final del antebrazo: aquí se cuelgan el móvil o
    // el bolígrafo, y de aquí se los llevará el robot en el estado 04.
    var mano = new THREE.Group();
    mano.position.y = -L2;
    codo.add(mano);

    mano.add(elipsoide(0.085, 0.12, 0.06, PALETA.piel, 0, -0.08, 0));           // palma
    var pulgar = capsula(0.032, 0.07, PALETA.piel, signo * -0.08, -0.05, 0.03);
    pulgar.rotation.z = signo * 0.5;
    mano.add(pulgar);

    return { hombro: hombro, codo: codo, mano: mano, l1: L1, l2: L2 };
  }

  var brazoIzq = brazo(-1);
  var brazoDer = brazo(1);

  return {
    raiz: raiz,
    torso: torso,
    pecho: pecho,
    cabeza: cabeza,
    ojos: ojos,
    cejas: cejas,
    piernaIzq: piernaIzq,
    piernaDer: piernaDer,
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
  // Ojos con material propio: brillan con el testigo y parpadean, así que
  // no pueden compartir el material naranja del resto de la escena.
  var materialOjos = material(PALETA.acento).clone();
  var ojos = [
    caja(0.2, 0.16, 0.05, PALETA.acento, -0.21, 0.42, 0.53),
    caja(0.2, 0.16, 0.05, PALETA.acento,  0.21, 0.42, 0.53)
  ];
  ojos.forEach(function (ojo) {
    ojo.material = materialOjos;
    cabeza.add(ojo);
  });
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
    ojos: ojos,
    materialOjos: materialOjos,
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
 * Hoja suelta. Se crean muchas, así que comparten geometría y material por
 * el cache de arriba.
 */
export function crearPapel() {
  var g = new THREE.Group();
  g.add(caja(0.86, 0.05, 1.12, PALETA.papel, 0, 0, 0));
  g.add(caja(0.52, 0.02, 0.07, PALETA.mesaOsc, 0, 0.035, -0.24));
  g.add(caja(0.52, 0.02, 0.07, PALETA.mesaOsc, 0, 0.035, -0.06));
  g.add(caja(0.34, 0.02, 0.07, PALETA.mesaOsc, -0.09, 0.035, 0.12));
  return g;
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
