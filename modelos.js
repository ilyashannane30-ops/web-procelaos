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

// Altura de reposo de las cejas en la cabeza del trabajador (se recalcula
// al cargar el modelo, ver más abajo). La usan
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
   TRABAJADOR — HOLOGRAMA

   Cuerpo humano real (malla base de MakeHuman, CC0) convertido a
   modelos3d/trabajador-holo.glb por holo-lab/construir.mjs. El GLB trae:
     - triángulos para el relleno y aristas de los quads para la malla
     - pesos de piel ya reducidos a los 13 grupos que anima la escena
     - pivotes de articulación, puntos del escáner, ojos y oreja

   La piel se ata a los MISMOS grupos de siempre (torso, pecho, cabeza,
   hombro/codo/mano, cadera/rodilla): la IK y el guion siguen rotando
   grupos y el cuerpo se deforma con ellos. Nada del guion sabe que hay
   una malla con piel debajo.

   Estética: relleno azul noche con borde fresnel, aristas claras con
   mezcla aditiva, puntos blancos en las articulaciones, pedestal de
   anillos y un barrido de luz que sube por el cuerpo.
   ========================================================================== */

// Uniformes compartidos por relleno y malla: cambiar un color aquí cambia
// la figura entera, y el tiempo se actualiza una sola vez por frame.
var UNIFORMES_HOLO = {
  uTiempo: { value: 0 },
  uRelleno: { value: new THREE.Color(0x071629) },
  uLinea: { value: new THREE.Color(0xDCEEFF) },
  uBorde: { value: new THREE.Color(0x5AAEFF) },
  // Color y opacidad propios de las aristas: con 13.000 quads en ~250 px
  // de figura, una línea blanca opaca convierte el cuerpo en gris liso.
  uColorMalla: { value: new THREE.Color(0x7FC2FF) },
  uOpacidadLinea: { value: 0.3 }
};

var COLOR_HOLO_PUNTO = 0xF2F8FF;

// Barrido: franja de luz que sube del suelo a la cabeza cada ~5 s.
var GLSL_BARRIDO = [
  'float barrido(float altura) {',
  '  float h = mod(uTiempo * 0.85, 5.5) - 0.6;',
  '  return smoothstep(0.32, 0.0, abs(altura - h));',
  '}'
].join('\n');

var VERTEX_RELLENO = [
  '#include <common>',
  '#include <skinning_pars_vertex>',
  'varying vec3 vNormal;',
  'varying float vAltura;',
  'void main() {',
  '  #include <beginnormal_vertex>',
  '  #include <skinbase_vertex>',
  '  #include <skinnormal_vertex>',
  '  #include <defaultnormal_vertex>',
  '  #include <begin_vertex>',
  '  #include <skinning_vertex>',
  '  #include <project_vertex>',
  '  vNormal = normalize(transformedNormal);',
  '  vAltura = (modelMatrix * vec4(transformed, 1.0)).y;',
  '}'
].join('\n');

var FRAGMENT_RELLENO = [
  'uniform float uTiempo;',
  'uniform vec3 uRelleno;',
  'uniform vec3 uLinea;',
  'uniform vec3 uBorde;',
  'varying vec3 vNormal;',
  'varying float vAltura;',
  GLSL_BARRIDO,
  'void main() {',
  // Cámara ortográfica: la dirección de vista es +Z en espacio de vista.
  '  float fresnel = pow(1.0 - abs(normalize(vNormal).z), 1.8);',
  '  vec3 color = uRelleno + uBorde * fresnel * 1.6 + uLinea * barrido(vAltura) * 0.12;',
  '  gl_FragColor = vec4(color, 1.0);',
  '  #include <colorspace_fragment>',
  '}'
].join('\n');

var VERTEX_LINEA = [
  '#include <common>',
  '#include <skinning_pars_vertex>',
  'varying float vAltura;',
  'void main() {',
  '  #include <skinbase_vertex>',
  '  #include <begin_vertex>',
  '  #include <skinning_vertex>',
  '  #include <project_vertex>',
  '  vAltura = (modelMatrix * vec4(transformed, 1.0)).y;',
  '}'
].join('\n');

var FRAGMENT_LINEA = [
  'uniform float uTiempo;',
  'uniform vec3 uColorMalla;',
  'uniform float uOpacidadLinea;',
  'varying float vAltura;',
  GLSL_BARRIDO,
  'void main() {',
  '  gl_FragColor = vec4(uColorMalla, min(1.0, uOpacidadLinea + barrido(vAltura) * 0.5));',
  '  #include <colorspace_fragment>',
  '}'
].join('\n');

/* --- Carga del GLB --------------------------------------------------------

   Lector mínimo en vez de GLTFLoader: el archivo lo genera nuestro propio
   script con un formato fijo, y así no se descargan ~100 KB más de
   librería. Top-level await: el import de escena3d.js espera a que el
   modelo esté listo, y si la descarga falla el import falla y la web se
   queda con el SVG estático, igual que con cualquier otro error. */

async function cargarGLB(url) {
  var respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error('No se pudo cargar ' + url + ' (' + respuesta.status + ')');
  var buf = await respuesta.arrayBuffer();
  var vista = new DataView(buf);
  var largoJson = vista.getUint32(12, true);
  var json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, largoJson)));
  var inicioBin = 20 + largoJson + 8;

  var TIPOS = { 5126: Float32Array, 5121: Uint8Array, 5123: Uint16Array };
  var COMPONENTES = { SCALAR: 1, VEC3: 3, VEC4: 4 };

  function accesor(i) {
    var a = json.accessors[i];
    var v = json.bufferViews[a.bufferView];
    return new TIPOS[a.componentType](buf, inicioBin + v.byteOffset, a.count * COMPONENTES[a.type]);
  }

  var prims = json.meshes[0].primitives;
  return {
    posiciones: accesor(prims[0].attributes.POSITION),
    huesos: accesor(prims[0].attributes.JOINTS_0),
    pesos: accesor(prims[0].attributes.WEIGHTS_0),
    triangulos: accesor(prims[0].indices),
    aristas: accesor(prims[1].indices),
    extras: json.meshes[0].extras
  };
}

var MODELO = await cargarGLB(new URL('./modelos3d/trabajador-holo.glb', import.meta.url));

// Altura de las cejas en la cabeza, sacada del modelo.
ALTURA_CEJAS = MODELO.extras.cejaY - MODELO.extras.pivotes.cabeza[1];

var materialPunto = null;
var materialHaloPunto = null;

function materialesPunto() {
  if (!materialPunto) {
    materialPunto = new THREE.MeshBasicMaterial({ color: COLOR_HOLO_PUNTO });
    materialHaloPunto = new THREE.MeshBasicMaterial({
      color: UNIFORMES_HOLO.uBorde.value,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }
}

// Geometrías pequeñas cacheadas (puntos, ojos, cejas).
var geometriasSuaves = {};

function geometriaSuave(clave, crear) {
  if (!geometriasSuaves[clave]) geometriasSuaves[clave] = crear();
  return geometriasSuaves[clave];
}

/**
 * Marcador de articulación: punto blanco con un halo aditivo, pegado a la
 * superficie delantera, como en un escáner corporal.
 */
function punto(padre, posicion) {
  materialesPunto();
  var nucleo = new THREE.Mesh(
    geometriaSuave('punto', function () { return new THREE.SphereGeometry(0.042, 12, 8); }),
    materialPunto
  );
  var halo = new THREE.Mesh(
    geometriaSuave('haloPunto', function () { return new THREE.SphereGeometry(0.095, 12, 8); }),
    materialHaloPunto
  );
  nucleo.position.copy(posicion);
  halo.position.copy(posicion);
  padre.add(nucleo, halo);
}

// Anillos del pedestal: se animan desde actualizarHolograma.
var anillosHolo = [];

function materialDeAnillo(opacidad) {
  return new THREE.MeshBasicMaterial({
    color: UNIFORMES_HOLO.uBorde.value,
    transparent: true,
    opacity: opacidad,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

/**
 * Pedestal de proyección: disco tenue, tres anillos fijos y una onda que se
 * expande. Sustituye a la sombra de contacto; sigue siendo el primer hijo
 * de la raíz, igual que la sombra (escena3d.js lo busca ahí).
 */
function pedestal() {
  var g = new THREE.Group();
  g.position.y = 0.02;
  g.rotation.x = -Math.PI / 2;

  g.add(new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), materialDeAnillo(0.22)));

  [[0.72, 0.025, 0.9], [0.9, 0.016, 0.6], [1.08, 0.013, 0.4]].forEach(function (a) {
    g.add(new THREE.Mesh(new THREE.RingGeometry(a[0], a[0] + a[1], 72), materialDeAnillo(a[2])));
  });

  var onda = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 72), materialDeAnillo(0));
  g.add(onda);
  anillosHolo.push(onda);

  return g;
}

/**
 * Avance de los efectos del holograma (barrido y onda del pedestal). Se
 * llama una vez por frame con el tiempo en segundos.
 */
export function actualizarHolograma(tiempo) {
  UNIFORMES_HOLO.uTiempo.value = tiempo;

  var fase = (tiempo % 2.6) / 2.6;
  for (var i = 0; i < anillosHolo.length; i++) {
    var r = 0.65 + fase * 0.65;
    anillosHolo[i].scale.set(r, r, 1);
    anillosHolo[i].material.opacity = 0.7 * (1 - fase);
  }
}

var _abajo = new THREE.Vector3(0, -1, 0);

export function crearTrabajador() {
  var ex = MODELO.extras;
  var piv = ex.pivotes;
  var v3 = function (a) { return new THREE.Vector3(a[0], a[1], a[2]); };

  var raiz = new THREE.Group();
  raiz.add(pedestal());

  // --- Grupos articulados, con los pivotes del modelo ----------------------

  function grupoEn(padre, posRaiz, posPadre) {
    var g = new THREE.Group();
    g.position.copy(v3(posRaiz)).sub(v3(posPadre || [0, 0, 0]));
    padre.add(g);
    return g;
  }

  function pierna(lado) {
    var cadera = grupoEn(raiz, piv['cadera' + lado]);
    var rodilla = grupoEn(cadera, piv['rodilla' + lado], piv['cadera' + lado]);
    return { cadera: cadera, rodilla: rodilla };
  }

  var piernaIzq = pierna('Izq');
  var piernaDer = pierna('Der');

  // Torso: el Group permite inclinarlo entero (encogerse, enderezarse).
  var torso = grupoEn(raiz, piv.torso);

  // Columna: lo que va de la cintura hacia arriba cuelga de este pivote, así
  // el cuerpo se encorva por la espalda en vez de inclinarse como un tablón.
  var pecho = grupoEn(torso, piv.pecho, piv.torso);
  var cabeza = grupoEn(pecho, piv.cabeza, piv.pecho);

  // Brazos: la IK espera el codo en (0, -L1, 0) del hombro y la mano en
  // (0, -L2, 0) del codo. En la pose de atado, cada grupo se gira para que
  // su -Y apunte por el hueso del modelo (brazos en A).
  function brazo(lado) {
    var pH = v3(piv['hombro' + lado]);
    var pC = v3(piv['codo' + lado]);
    var pM = v3(piv['mano' + lado]);
    var L1 = pH.distanceTo(pC);
    var L2 = pC.distanceTo(pM);

    var hombro = grupoEn(pecho, piv['hombro' + lado], piv.pecho);
    var qHombro = new THREE.Quaternion().setFromUnitVectors(_abajo, pC.clone().sub(pH).normalize());
    hombro.quaternion.copy(qHombro);

    var codo = new THREE.Group();
    codo.position.y = -L1;
    var qCodo = new THREE.Quaternion().setFromUnitVectors(_abajo, pM.clone().sub(pC).normalize());
    codo.quaternion.copy(qHombro.clone().invert().multiply(qCodo));
    hombro.add(codo);

    // Punto de agarre al final del antebrazo: aquí se cuelgan el móvil o
    // el bolígrafo, y de aquí se los llevará el robot en el estado 04.
    var mano = new THREE.Group();
    mano.position.y = -L2;
    codo.add(mano);

    return { hombro: hombro, codo: codo, mano: mano, l1: L1, l2: L2 };
  }

  var brazoIzq = brazo('Izq');
  var brazoDer = brazo('Der');

  raiz.updateMatrixWorld(true);

  // --- Piel ------------------------------------------------------------------

  var porNombre = {
    torso: torso, pecho: pecho, cabeza: cabeza,
    hombroIzq: brazoIzq.hombro, codoIzq: brazoIzq.codo, manoIzq: brazoIzq.mano,
    hombroDer: brazoDer.hombro, codoDer: brazoDer.codo, manoDer: brazoDer.mano,
    caderaIzq: piernaIzq.cadera, rodillaIzq: piernaIzq.rodilla,
    caderaDer: piernaDer.cadera, rodillaDer: piernaDer.rodilla
  };
  // Los huesos son los propios grupos: Skeleton solo lee matrixWorld.
  var huesos = ex.grupos.map(function (n) { return porNombre[n]; });
  var esqueleto = new THREE.Skeleton(huesos);

  var posicion = new THREE.BufferAttribute(MODELO.posiciones, 3);
  var indiceHueso = new THREE.BufferAttribute(MODELO.huesos, 4);
  var pesoHueso = new THREE.BufferAttribute(MODELO.pesos, 4, true);

  var geoCuerpo = new THREE.BufferGeometry();
  geoCuerpo.setAttribute('position', posicion);
  geoCuerpo.setAttribute('skinIndex', indiceHueso);
  geoCuerpo.setAttribute('skinWeight', pesoHueso);
  geoCuerpo.setIndex(new THREE.BufferAttribute(MODELO.triangulos, 1));
  geoCuerpo.computeVertexNormals();

  var geoMalla = new THREE.BufferGeometry();
  geoMalla.setAttribute('position', posicion);
  geoMalla.setAttribute('skinIndex', indiceHueso);
  geoMalla.setAttribute('skinWeight', pesoHueso);
  geoMalla.setIndex(new THREE.BufferAttribute(MODELO.aristas, 1));

  var cuerpo = new THREE.SkinnedMesh(geoCuerpo, new THREE.ShaderMaterial({
    uniforms: UNIFORMES_HOLO,
    vertexShader: VERTEX_RELLENO,
    fragmentShader: FRAGMENT_RELLENO,
    // Empujado un poco hacia atrás: la malla de aristas tiene que ganar
    // siempre la prueba de profundidad contra su propio relleno.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  }));

  // Malla de aristas con piel. three.js no tiene "SkinnedLineSegments": se
  // usa un SkinnedMesh marcado como LineSegments para que el renderer lo
  // dibuje con gl.LINES y le siga aplicando el esqueleto (comprobado con
  // three 0.160; revisar si se actualiza la versión).
  var malla = new THREE.SkinnedMesh(geoMalla, new THREE.ShaderMaterial({
    uniforms: UNIFORMES_HOLO,
    vertexShader: VERTEX_LINEA,
    fragmentShader: FRAGMENT_LINEA,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  malla.isMesh = false;
  malla.isLine = true;
  malla.isLineSegments = true;

  [cuerpo, malla].forEach(function (m) {
    m.frustumCulled = false;
    raiz.add(m);
    m.updateMatrixWorld(true);
    m.bind(esqueleto);
  });

  // --- Puntos, ojos y cejas (en coordenadas de su grupo) -------------------

  function local(grupo, a) {
    return grupo.worldToLocal(v3(a));
  }

  ex.puntos.forEach(function (p) {
    var grupo = porNombre[p[0]];
    punto(grupo, local(grupo, [p[1], p[2], p[3]]));
  });

  materialesPunto();
  var ojos = ex.ojos.map(function (o) {
    var ojo = new THREE.Mesh(
      geometriaSuave('ojoHolo', function () { return new THREE.SphereGeometry(1, 12, 8); }),
      materialPunto
    );
    ojo.scale.set(0.022, 0.012, 0.01);
    ojo.position.copy(local(cabeza, o));
    // La escala ES el tamaño: el parpadeo multiplica esta altura.
    ojo.userData.altoAbierto = ojo.scale.y;
    cabeza.add(ojo);
    return ojo;
  });

  // Cejas: un trazo de luz dentro de un grupo, para que el guion pueda
  // subirlas (position.y) e inclinarlas (rotation.z) sin tocar el giro que
  // las tumba.
  var cejas = ojos.map(function (ojo) {
    var ceja = new THREE.Group();
    ceja.position.set(ojo.position.x, ALTURA_CEJAS, ojo.position.z - 0.01);
    var trazo = new THREE.Mesh(
      geometriaSuave('cejaHolo', function () { return new THREE.CapsuleGeometry(0.008, 0.05, 4, 8); }),
      materialHaloPunto
    );
    trazo.rotation.z = Math.PI / 2;
    ceja.add(trazo);
    cabeza.add(ceja);
    return ceja;
  });

  // Oreja del lado del móvil, en coordenadas de la cabeza.
  var oreja = local(cabeza, ex.oreja);

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
    brazoDer: brazoDer,
    // Altura de reposo del torso: la respiración oscila alrededor de ella.
    alturaTorso: torso.position.y,
    // Dónde va el móvil y dónde lo sujeta la mano. Como un móvil real
    // pegado a la oreja: el altavoz (arriba) a la altura de la oreja y el
    // resto bajando hacia la boca, así que su centro queda por debajo.
    posMovil: oreja.clone().add(new THREE.Vector3(-0.05, -0.09, 0.04)),
    // La muñeca, por debajo del centro del móvil: la palma lo sujeta por
    // el medio en vez de cogerlo por el borde de abajo.
    agarreMovil: oreja.clone().add(new THREE.Vector3(-0.09, -0.22, 0.07))
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
