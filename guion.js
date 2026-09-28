/**
 * Guion de la escena — los 7 estados del storyboard, 10 segundos.
 *
 * REGLA CENTRAL: aquí NUNCA se tocan ángulos de hombro ni de codo. El guion
 * mueve puntos de destino en el espacio (dónde va cada mano) y el bucle de
 * render resuelve la cinemática inversa cada frame. Interpolar un punto es
 * una línea recta; interpolar tres ángulos a la vez produce arcos raros.
 *
 * Los tiempos son los validados en el storyboard:
 *   01 Sobrecarga      0    -> 2,2
 *   02 La carga crece  2,2  -> 3,6   (termina con 200ms de congelación)
 *   03 Aparece la IA   3,6  -> 4,9
 *   04 El relevo       4,9  -> 6,6   <- el momento clave
 *   05 Arranque        6,6  -> 7,2   (latigazo: 120ms secos + 480ms)
 *   06 Procesamiento   7,2  -> 8,9
 *   07 Liberado        8,9  -> 10
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ALTURA_CEJAS as CEJA_Y } from './modelos.js';

var GRADOS = Math.PI / 180;

export function crearGuion(refs) {
  var trabajador = refs.trabajador;
  var robot = refs.robot;
  var estado = refs.estado;

  // repeatDelay: el estado 07 se sostiene antes de volver a empezar. El
  // storyboard pedía no volver al 01 (contaría que el problema regresa),
  // pero en una web el bucle es inevitable: al menos que respire.
  // onRepeat devuelve todo a su sitio: el móvil cambia de padre a mitad de
  // la animación y varios objetos quedan escalados a cero o invisibles,
  // cosas que GSAP no deshace por su cuenta al repetir.
  // Sin repeatDelay: la pausa final va DENTRO del timeline (el estado 07 se
  // sostiene y luego funde a negro). Así el reinicio de onRepeat ocurre con
  // la escena invisible y no se ve ningún salto.
  var t = gsap.timeline({
    paused: true,
    repeat: -1,
    onRepeat: refs.reiniciar
  });

  // Entrada de cada vuelta: la escena aparece desde negro.
  t.fromTo(estado, { fundido: 0 }, { fundido: 1, duration: 0.6, ease: 'power2.out' }, 0);

  // Posiciones de referencia, en el espacio del grupo "mundo".
  var X_TRABAJADOR = -1.55;
  var X_TRABAJADOR_DESPLAZADO = -3.7;
  var X_ROBOT_FUERA = 10;
  var X_ROBOT_ENTRADA = 5.4;

  /* ----------------------------------------------------------------------
     ESTADO 01 — Sobrecarga (0 -> 2,2)
     Dos bucles desincronizados a propósito: la mano que escribe va rápida
     (0,4s) y la cabeza asiente lenta (1,1s). Nunca coinciden, y esa
     desincronía es la que genera incomodidad sin nombrarla.
     ---------------------------------------------------------------------- */

  t.addLabel('sobrecarga', 0);

  // Rayar el papel: la mano recorre la línea y vuelve al margen.
  t.fromTo(estado, { escritura: 0 }, {
    escritura: 0.34, duration: 0.4, ease: 'none',
    repeat: 4, yoyo: true
  }, 0);

  // Asentir al móvil, a otro ritmo.
  t.to(trabajador.cabeza.rotation, {
    x: 9 * GRADOS, duration: 1.1, ease: 'sine.inOut',
    repeat: 1, yoyo: true
  }, 0);

  // Nervios: golpea el suelo con el pie derecho, rápido y sin parar, un
  // tercer ritmo que tampoco coincide con los otros dos.
  t.to(trabajador.piernaDer.rodilla.rotation, {
    x: 14 * GRADOS, duration: 0.12, ease: 'sine.inOut', repeat: 13, yoyo: true
  }, 0.3);
  t.to(trabajador.piernaDer.cadera.rotation, {
    x: -6 * GRADOS, duration: 0.12, ease: 'sine.inOut', repeat: 13, yoyo: true
  }, 0.3);

  // Cejas de preocupación: se inclinan hacia el centro (el extremo
  // interior sube). La izquierda está en -x, así que gira al revés.
  trabajador.cejas.forEach(function (ceja, i) {
    t.to(ceja.rotation, { z: (i === 0 ? 1 : -1) * 16 * GRADOS, duration: 0.6, ease: 'power2.out' }, 0.2);
  });

  /* ----------------------------------------------------------------------
     ESTADO 02 — La carga crece (2,2 -> 3,6)
     La figura no se mueve de sitio: la presión sube, él no. Se encoge, y
     los papeles caen con la cadencia acelerando (0,5s -> 0,15s), que es lo
     que hace el trabajo, no la cantidad.
     ---------------------------------------------------------------------- */

  t.addLabel('carga', 2.2);

  // Encogerse: hombros arriba, torso más bajo, brazos más rápidos.
  t.to(trabajador.torso.scale, { y: 0.95, duration: 1.2, ease: 'power2.in' }, 2.2);
  t.to(trabajador.torso.rotation, { z: 11 * GRADOS, duration: 1.2, ease: 'power2.in' }, 2.2);
  t.to(trabajador.cabeza.rotation, { z: 24 * GRADOS, duration: 1.2, ease: 'power2.in' }, 2.2);

  // Se encoge por la espalda y las rodillas, no solo aplastando el torso:
  // la columna se curva hacia la mesa y las rodillas ceden un poco.
  t.to(trabajador.pecho.rotation, { x: 17 * GRADOS, duration: 1.2, ease: 'power2.in' }, 2.2);
  [trabajador.piernaIzq, trabajador.piernaDer].forEach(function (p) {
    t.to(p.cadera.rotation, { x: -8 * GRADOS, duration: 1.2, ease: 'power2.in' }, 2.2);
    t.to(p.rodilla.rotation, { x: 15 * GRADOS, duration: 1.2, ease: 'power2.in' }, 2.2);
  });

  // Cae el segundo papel y levanta la vista de golpe hacia la mesa, con
  // las cejas arriba; luego vuelve, más hundido, a lo suyo.
  t.to(trabajador.cabeza.rotation, { x: -14 * GRADOS, duration: 0.22, ease: 'power2.out' }, 2.72);
  t.to(trabajador.cabeza.rotation, { x: 6 * GRADOS, duration: 0.4, ease: 'power2.inOut' }, 3.05);
  trabajador.cejas.forEach(function (ceja) {
    t.to(ceja.position, { y: CEJA_Y + 0.035, duration: 0.18, ease: 'power2.out' }, 2.72);
    t.to(ceja.position, { y: CEJA_Y, duration: 0.4, ease: 'power2.inOut' }, 3.05);
  });

  // Mientras escribe, la espalda acompaña el trazo con un vaivén corto.
  t.to(trabajador.pecho.rotation, {
    y: -5 * GRADOS, duration: 0.55, ease: 'sine.inOut', repeat: 3, yoyo: true
  }, 0);

  // La mano que escribe acelera y pierde recorrido: más prisa, menos avance.
  t.fromTo(estado, { escritura: 0 }, {
    escritura: 0.2, duration: 0.16, ease: 'none',
    repeat: 7, yoyo: true
  }, 2.3);
  t.to(estado, { escritura: 0, duration: 0.2 }, 3.6);

  // Caída de papeles con cadencia acelerando.
  var caidas = [0, 0.5, 0.92, 1.26, 1.52, 1.7, 1.83, 1.94];
  refs.papelesCaida.forEach(function (papel, i) {
    var cuando = 2.2 + (caidas[i] || 2);
    var destino = papel.userData.destino;

    t.set(papel, { visible: true }, cuando);
    t.fromTo(papel.position,
      { x: destino.x, y: 7, z: destino.z },
      { y: destino.y, duration: 0.55, ease: 'power2.in' },
      cuando
    );
    t.fromTo(papel.rotation,
      { y: (Math.random() - 0.5) },
      { y: (Math.random() - 0.5) * 0.3, duration: 0.55, ease: 'power2.out' },
      cuando
    );
  });

  // CONGELACIÓN de 200ms: la bisagra de toda la pieza. Es un hueco vacío en
  // el timeline, entre 3,4 y 3,6. No se toca nada a propósito.

  /* ----------------------------------------------------------------------
     ESTADO 03 — Aparece la IA (3,6 -> 4,9)
     Solo se mueve el robot. Entrada con desaceleración fuerte y sin rebote:
     su calma es lo que lo hace legible como solución.
     ---------------------------------------------------------------------- */

  t.addLabel('robot', 3.6);

  t.set(robot.raiz, { visible: true }, 3.6);
  t.fromTo(robot.raiz.position,
    { x: X_ROBOT_FUERA },
    { x: X_ROBOT_ENTRADA, duration: 1.0, ease: 'power3.out' },
    3.6
  );

  // Inercia: mientras frena, el cuerpo se inclina hacia donde iba y, al
  // pararse, vuelve a su sitio pasándose un poco. Sin esto el robot se
  // detenía como una pieza de ajedrez. Se inclina el cuerpo, no la raíz:
  // la raíz sigue en su trayectoria recta.
  t.fromTo(robot.cuerpo.rotation, { z: 0 }, { z: 9 * GRADOS, duration: 0.7, ease: 'power2.out' }, 3.7);
  t.to(robot.cuerpo.rotation, { z: 0, duration: 0.9, ease: 'back.out(2.4)' }, 4.4);

  // La cámara se acerca un poco para el momento clave, y se queda cerca
  // durante el relevo y el procesamiento.
  t.to(estado, { zoom: 1.08, duration: 1.8, ease: 'power2.inOut' }, 4.4);

  // El testigo se enciende al detenerse: el único naranja saturado.
  t.to(estado, { brilloTestigo: 1, duration: 0.35, ease: 'power2.out' }, 4.5);

  // Beat de intención: mira el móvil antes de actuar. Es lo que separa
  // "el robot hace cosas" de "el robot decide".
  t.to(robot.cabeza.rotation, { y: -22 * GRADOS, duration: 0.4, ease: 'power2.inOut' }, 4.5);

  /* ----------------------------------------------------------------------
     ESTADO 04 — El relevo (4,9 -> 6,6)  ★ EL FOTOGRAMA CLAVE

     El robot NO se mueve ni se acerca: absorbe a distancia desde su sitio.
     La mesa TAMPOCO se mueve. Lo único que viaja es el trabajo, y esa es
     justo la idea -- si el robot tuviera que colocarse encima de la mesa,
     la lectura sería "ocupa tu puesto"; quieto y a distancia, la lectura
     es "procesa tu trabajo sin invadir nada".

     La absorción se cuenta con TRAYECTORIA y ACELERACIÓN, no con brillo:
     cada papel sale de la mesa, se inclina, gira y acelera hacia el pecho
     del robot, donde se encoge hasta desaparecer DENTRO de él.
     ---------------------------------------------------------------------- */

  t.addLabel('relevo', 4.9);

  // Punto de absorción: el pecho del robot, no un punto en el aire. Es
  // donde los papeles tienen que desaparecer para que se lea "entra".
  var ABSORCION = { x: X_ROBOT_ENTRADA - 0.35, y: 1.75, z: -0.25 };

  // La cabeza vuelve del beat de intención al frente de su propio torso,
  // que ya está girado hacia la mesa: cabeza y cuerpo trabajan juntos.
  t.to(robot.cabeza.rotation, { y: -12 * GRADOS, duration: 0.6, ease: 'power2.inOut' }, 5.1);

  // Los brazos del robot se abren ligeramente hacia la mesa: es lo que
  // conecta el gesto con lo que está pasando, sin que llegue a "coger".
  t.to(robot.brazoIzq.hombro.rotation, { z: 26 * GRADOS, x: -14 * GRADOS, duration: 0.7, ease: 'power2.out' }, 5.0);
  t.to(robot.brazoDer.hombro.rotation, { z: -18 * GRADOS, x: -8 * GRADOS, duration: 0.7, ease: 'power2.out' }, 5.0);
  t.to(robot.brazoIzq.codo.rotation, { x: 40 * GRADOS, duration: 0.7, ease: 'power2.out' }, 5.0);
  t.to(robot.brazoDer.codo.rotation, { x: 40 * GRADOS, duration: 0.7, ease: 'power2.out' }, 5.0);

  // El móvil se despega de la oreja y va al robot. Cambia de padre para
  // moverlo en el espacio del grupo, no en el de la cabeza.
  //
  // El viaje NO se anima con un t.to sobre movil.position: GSAP guardaría
  // como origen su posición en el mundo y, al repetir el bucle, la volvería
  // a aplicar cuando el móvil ya cuelga otra vez de la cabeza -- el móvil
  // salía disparado a una esquina. Se anima un progreso y se interpola a
  // mano, solo mientras el móvil está suelto en el mundo.
  var viajeMovil = { p: 0 };
  var origenMovil = new THREE.Vector3();
  var destinoMovil = new THREE.Vector3(ABSORCION.x, ABSORCION.y, ABSORCION.z);

  t.add(function () {
    refs.reparentarMovil();
    origenMovil.copy(refs.movil.position);
  }, 5.15);

  t.fromTo(viajeMovil, { p: 0 }, {
    p: 1, duration: 0.85, ease: 'power3.in',   // acelera al acercarse
    onUpdate: function () {
      if (!refs.movil.userData.enMundo) return;
      refs.movil.position.lerpVectors(origenMovil, destinoMovil, viajeMovil.p);
    }
  }, 5.15);
  t.to(refs.movil.rotation, {
    x: 3.4, y: 2.6, z: 1.8, duration: 0.85, ease: 'power2.in'
  }, 5.15);
  // Se encoge JUSTO al llegar: desaparece dentro del robot, no en el aire.
  t.to(refs.movil.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.16, ease: 'power2.in' }, 5.84);

  // Las manos se vacían y caen: brazos colgando, sin resistirse.
  t.to(estado.manoIzq, {
    x: X_TRABAJADOR_DESPLAZADO - 0.78, y: 1.98, z: 0.68,
    duration: 0.8, ease: 'power2.inOut'
  }, 5.15);
  t.to(estado.manoDer, {
    x: X_TRABAJADOR_DESPLAZADO + 0.78, y: 1.98, z: 0.68,
    duration: 0.8, ease: 'power2.inOut'
  }, 5.15);

  // El polo cambia A LA VEZ que el destino: la pose de "escribir/hablar"
  // exige un plano de flexión, la de "brazos relajados" otro completamente
  // distinto. Verificado: con el polo viejo el codo derecho quedaba a
  // z=0,39 (detrás del cuerpo, en z=0,55); con este, ambos codos quedan
  // delante y simétricos.
  t.to(estado.poloIzq, { x: -0.35, y: -0.25, z: 1, duration: 0.8, ease: 'power2.inOut' }, 5.15);
  t.to(estado.poloDer, { x: 0.35, y: -0.25, z: 1, duration: 0.8, ease: 'power2.inOut' }, 5.15);

  t.to(refs.boli.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25 }, 5.2);

  // La persona sale desplazada, a la vez que el trabajo se va.
  t.to(trabajador.raiz.position, {
    x: X_TRABAJADOR_DESPLAZADO, duration: 0.9, ease: 'power2.inOut'
  }, 5.15);
  t.to(trabajador.torso.rotation, { y: 6 * GRADOS, duration: 0.9, ease: 'power2.inOut' }, 5.15);
  // Sigue con la mirada al móvil que se va: la cabeza gira hacia el robot
  // (a su derecha) y las cejas se levantan -- sorpresa, no alarma.
  t.to(trabajador.cabeza.rotation, { y: 30 * GRADOS, x: 0, z: 6 * GRADOS, duration: 0.7, ease: 'power2.out' }, 5.15);
  trabajador.cejas.forEach(function (ceja) {
    t.to(ceja.position, { y: CEJA_Y + 0.05, duration: 0.2, ease: 'power2.out' }, 5.15);
    t.to(ceja.rotation, { z: 0, duration: 0.2, ease: 'power2.out' }, 5.15);
  });

  // Se apartan con PASOS, no deslizándose. Tres pasos laterales hacia la
  // izquierda en los 0,9 s del desplazamiento: la pierna izquierda abre y
  // levanta la rodilla, la derecha la sigue medio paso después, y el
  // cuerpo sube un poco en cada apoyo.
  // (Cadera: rotation.z negativa abre la pierna hacia -x; rodilla:
  // rotation.x positiva dobla el gemelo hacia atrás.)
  var PASO = 0.3;
  for (var k = 0; k < 3; k++) {
    var inicioPaso = 5.15 + k * PASO;

    t.to(trabajador.piernaIzq.cadera.rotation, { z: -13 * GRADOS, x: -14 * GRADOS, duration: PASO / 2, ease: 'sine.out' }, inicioPaso);
    t.to(trabajador.piernaIzq.cadera.rotation, { z: 0, x: 0, duration: PASO / 2, ease: 'sine.in' }, inicioPaso + PASO / 2);
    t.to(trabajador.piernaIzq.rodilla.rotation, { x: 34 * GRADOS, duration: PASO / 2, ease: 'sine.out' }, inicioPaso);
    t.to(trabajador.piernaIzq.rodilla.rotation, { x: 0, duration: PASO / 2, ease: 'sine.in' }, inicioPaso + PASO / 2);

    t.to(trabajador.piernaDer.cadera.rotation, { z: 10 * GRADOS, x: -10 * GRADOS, duration: PASO / 2, ease: 'sine.out' }, inicioPaso + PASO / 2);
    t.to(trabajador.piernaDer.cadera.rotation, { z: 0, x: 0, duration: PASO / 2, ease: 'sine.in' }, inicioPaso + PASO);
    t.to(trabajador.piernaDer.rodilla.rotation, { x: 28 * GRADOS, duration: PASO / 2, ease: 'sine.out' }, inicioPaso + PASO / 2);
    t.to(trabajador.piernaDer.rodilla.rotation, { x: 0, duration: PASO / 2, ease: 'sine.in' }, inicioPaso + PASO);
  }

  t.to(trabajador.raiz.position, {
    y: 0.05, duration: PASO / 2, ease: 'sine.inOut', repeat: 5, yoyo: true
  }, 5.15);

  // Al apartarse se incorpora: la espalda deja de estar doblada sobre la
  // mesa (ya no tiene nada que hacer en ella).
  t.to(trabajador.pecho.rotation, { x: 4 * GRADOS, y: 0, duration: 0.9, ease: 'power2.inOut' }, 5.15);

  /* Absorción de los papeles ------------------------------------------- */

  // Un papel absorbido: despega de la mesa, sube un poco, se inclina y
  // acelera hacia el pecho del robot, donde se encoge hasta desaparecer.
  // El "power3.in" es lo que hace la fuerza creciente -- sale despacio y
  // llega rápido, como si tirasen de él cada vez con más fuerza.
  function absorber(papel, cuando, duracion) {
    // Despegue: se levanta de la mesa antes de salir disparado. Sin este
    // tramo, el papel parece deslizarse por el aire desde el principio.
    t.to(papel.position, {
      y: '+=0.45', duration: 0.22, ease: 'power2.out'
    }, cuando);

    t.to(papel.position, {
      x: ABSORCION.x, y: ABSORCION.y, z: ABSORCION.z,
      duration: duracion, ease: 'power3.in'
    }, cuando + 0.18);

    // Giro creciente en dos ejes: da la sensación de ser arrastrado, no
    // de volar recto.
    t.to(papel.rotation, {
      x: 0.9, y: 2.4, z: -1.1, duration: duracion + 0.18, ease: 'power2.in'
    }, cuando);

    // Se encoge en el último tramo: entra en el robot.
    t.to(papel.scale, {
      x: 0.05, y: 0.05, z: 0.05, duration: 0.18, ease: 'power2.in'
    }, cuando + 0.18 + duracion - 0.16);

    t.set(papel, { visible: false }, cuando + 0.18 + duracion + 0.02);
  }

  refs.papelesCaida.forEach(function (papel, i) {
    absorber(papel, 5.3 + i * 0.055, 0.62);
  });

  // La pila que ya estaba sobre la mesa antes de empezar (incluida la hoja
  // que rellenaba) se va con el resto: si se queda ahí, contradice toda la
  // historia -- el robot no se habría llevado el trabajo, solo una parte.
  refs.papelesMesa.forEach(function (papel, i) {
    absorber(papel, 5.34 + i * 0.06, 0.6);
  });

  /* Motas de succión ---------------------------------------------------- */

  // Fragmentos que recorren la misma trayectoria que los papeles, más
  // rápidos y escalonados. Son los que hacen visible la "fuerza": marcan
  // el camino entre la mesa y el robot de forma continua, también en los
  // huecos entre papel y papel.
  refs.motas.forEach(function (mota, i) {
    var cuando = 5.2 + i * 0.055;
    var origen = {
      x: 0.9 + (i % 4) * 0.55,
      y: 2.05 + (i % 3) * 0.22,
      z: -0.55 + (i % 5) * 0.28
    };

    t.set(mota, { visible: true }, cuando);
    t.fromTo(mota.position,
      { x: origen.x, y: origen.y, z: origen.z },
      { x: ABSORCION.x, y: ABSORCION.y, z: ABSORCION.z, duration: 0.5, ease: 'power3.in' },
      cuando
    );
    t.fromTo(mota.material, { opacity: 0 }, { opacity: 0.9, duration: 0.12 }, cuando);
    t.to(mota.material, { opacity: 0, duration: 0.14 }, cuando + 0.36);
    t.set(mota, { visible: false }, cuando + 0.5);
  });

  /* ----------------------------------------------------------------------
     ESTADO 05 — Arranque (6,6 -> 7,2)
     Latigazo, no pausa: 120ms de contracción muy seca y 480ms de expansión.
     El reparto asimétrico es lo que lo convierte en golpe.
     ---------------------------------------------------------------------- */

  t.addLabel('arranque', 6.6);

  // Anticipación: un estiramiento mínimo (80ms) justo antes de la
  // contracción. Sin esto la contracción se ve como un corte seco; con
  // esto se lee como un golpe con recorrido, aunque dure una fracción.
  t.to(robot.cuerpo.scale, { x: 1.04, y: 1.03, z: 1.04, duration: 0.08, ease: 'sine.out' }, 6.52);

  t.to(robot.cuerpo.scale, { x: 0.9, y: 0.88, z: 0.9, duration: 0.12, ease: 'power3.in' }, 6.6);
  t.to(robot.cuerpo.scale, { x: 1, y: 1, z: 1, duration: 0.48, ease: 'elastic.out(1, 0.45)' }, 6.72);
  t.to(estado, { brilloTestigo: 2.2, duration: 0.12 }, 6.72);

  /* ----------------------------------------------------------------------
     ESTADO 06 — Procesamiento (7,2 -> 8,9)
     10 hojas nuevas caen sobre la mesa y el robot las absorbe una a una,
     con el mismo gesto que en el relevo. Cadencia de 130 ms. El robot casi
     no se mueve: contraste exacto con el 01.
     ---------------------------------------------------------------------- */

  t.addLabel('proceso', 7.2);

  // El testigo pulsa mientras procesa: sin esto, el brillo del arranque se
  // queda plano durante todo el estado y el robot se lee como "encendido",
  // no como "trabajando". 8 repeticiones de 180ms cubren la ventana entera.
  t.to(estado, {
    brilloTestigo: 1.5, duration: 0.18, ease: 'sine.inOut',
    repeat: 8, yoyo: true
  }, 7.2);

  // Asiente al ritmo del trabajo: un gesto pequeño y regular que dice
  // "procesando" sin moverse del sitio.
  t.to(robot.cabeza.rotation, {
    x: 5 * GRADOS, duration: 0.32, ease: 'sine.inOut',
    repeat: 3, yoyo: true
  }, 7.25);

  // Los brazos acompañan el flujo con un vaivén mínimo, desfasados.
  t.to(robot.brazoIzq.codo.rotation, {
    x: 48 * GRADOS, duration: 0.3, ease: 'sine.inOut', repeat: 3, yoyo: true
  }, 7.25);
  t.to(robot.brazoDer.codo.rotation, {
    x: 48 * GRADOS, duration: 0.3, ease: 'sine.inOut', repeat: 3, yoyo: true
  }, 7.4);

  // El trabajo sigue llegando y el robot lo absorbe EXACTAMENTE igual que
  // en el relevo: cada hoja nueva cae sobre la mesa (como en el estado 02)
  // y, nada más posarse, pasa por la misma función absorber() -- despega,
  // acelera girando hacia el pecho y se encoge dentro. Nada atraviesa al
  // robot ni se queda fuera de él.
  refs.papelesFlujo.forEach(function (papel, i) {
    var entrada = 7.2 + i * 0.13;      // cadencia de 130 ms
    var CAIDA = 0.35;
    var destino = {
      x: 1.9 + (i % 3) * 0.55,
      y: 2.05,
      z: -0.5 + (i % 2) * 0.5
    };

    t.set(papel, { visible: true }, entrada);
    t.set(papel.scale, { x: 1, y: 1, z: 1 }, entrada);
    t.set(papel.rotation, { x: 0, y: (Math.random() - 0.5) * 0.6, z: 0 }, entrada);
    t.fromTo(papel.position,
      { x: destino.x, y: 7, z: destino.z },
      { y: destino.y, duration: CAIDA, ease: 'power2.in' },
      entrada
    );

    absorber(papel, entrada + CAIDA, 0.6);
  });

  /* ----------------------------------------------------------------------
     ESTADO 07 — Liberado (8,9 -> 10)
     Un solo movimiento lento de enderezarse. Sin celebración: la contención
     es lo que lo mantiene premium.
     ---------------------------------------------------------------------- */

  t.addLabel('liberado', 8.9);

  t.to(trabajador.torso.scale, { y: 1, duration: 1.2, ease: 'power2.out' }, 8.9);
  t.to(trabajador.torso.rotation, { z: 0, y: 0, duration: 1.2, ease: 'power2.out' }, 8.9);

  // Se estira: la espalda se arquea un poco hacia atrás, como quien suelta
  // tensión, y vuelve a recta.
  // Va a la vez que el estiramiento de brazos de más abajo.
  t.to(trabajador.pecho.rotation, { x: -10 * GRADOS, duration: 0.75, ease: 'power2.out' }, 8.9);
  t.to(trabajador.pecho.rotation, { x: 0, duration: 0.9, ease: 'power2.inOut' }, 9.85);

  // Estiramiento: los dos brazos arriba, por encima de la cabeza, con los
  // codos abiertos hacia fuera; la mirada sube con ellos. Los hombros
  // quedan a y≈3,17, así que y=4,35 es un brazo casi extendido.
  var ARRIBA_Y = 4.35;
  var SUBIDA = 0.75;
  var BAJADA_EN = 9.85;

  t.to(estado.manoIzq, {
    x: X_TRABAJADOR_DESPLAZADO - 0.5, y: ARRIBA_Y, z: 0.62,
    duration: SUBIDA, ease: 'power2.out'
  }, 8.9);
  t.to(estado.manoDer, {
    x: X_TRABAJADOR_DESPLAZADO + 0.5, y: ARRIBA_Y, z: 0.62,
    duration: SUBIDA, ease: 'power2.out'
  }, 8.9);
  // Con los brazos arriba el codo tiene que salir hacia los lados; con el
  // polo de "brazos colgando" (hacia delante) se doblarían hacia la cara.
  t.to(estado.poloIzq, { x: -1, y: 0, z: 0.2, duration: SUBIDA, ease: 'power2.out' }, 8.9);
  t.to(estado.poloDer, { x: 1, y: 0, z: 0.2, duration: SUBIDA, ease: 'power2.out' }, 8.9);

  t.to(trabajador.cabeza.rotation, {
    x: -12 * GRADOS, y: 0, z: 0, duration: SUBIDA, ease: 'power2.out'
  }, 8.9);

  // Baja los brazos relajado, a los lados, y mira al robot.
  t.to(estado.manoIzq, {
    x: X_TRABAJADOR_DESPLAZADO - 0.74, y: 2.02, z: 0.6,
    duration: 0.9, ease: 'power2.inOut'
  }, BAJADA_EN);
  t.to(estado.manoDer, {
    x: X_TRABAJADOR_DESPLAZADO + 0.74, y: 2.02, z: 0.6,
    duration: 0.9, ease: 'power2.inOut'
  }, BAJADA_EN);
  t.to(estado.poloIzq, { x: -0.35, y: -0.25, z: 1, duration: 0.9, ease: 'power2.inOut' }, BAJADA_EN);
  t.to(estado.poloDer, { x: 0.35, y: -0.25, z: 1, duration: 0.9, ease: 'power2.inOut' }, BAJADA_EN);

  t.to(trabajador.cabeza.rotation, {
    x: 0, y: 20 * GRADOS, duration: 0.9, ease: 'power2.inOut'
  }, BAJADA_EN);
  // Un pequeño asentimiento hacia el robot: "gracias", sin celebrarlo.
  t.to(trabajador.cabeza.rotation, {
    x: 7 * GRADOS, duration: 0.22, ease: 'sine.inOut', repeat: 1, yoyo: true
  }, BAJADA_EN + 0.95);

  // Ya relajado, pasa el peso de una pierna a otra.
  t.to(trabajador.torso.rotation, {
    z: 2.5 * GRADOS, duration: 0.5, ease: 'sine.inOut', repeat: 1, yoyo: true
  }, 10.2);
  t.to(trabajador.piernaDer.rodilla.rotation, {
    x: 8 * GRADOS, duration: 0.5, ease: 'sine.inOut', repeat: 1, yoyo: true
  }, 10.2);

  // Cejas: de la preocupación a la calma.
  trabajador.cejas.forEach(function (ceja) {
    t.to(ceja.rotation, { z: 0, duration: 0.8, ease: 'power2.out' }, 8.9);
    t.to(ceja.position, { y: CEJA_Y, duration: 0.8, ease: 'power2.out' }, 8.9);
  });

  // El testigo se queda encendido, más tenue: sigue trabajando.
  t.to(estado, { brilloTestigo: 0.9, duration: 1.0 }, 8.9);

  // El robot también descansa: brazos a su pose de reposo y cabeza al
  // frente. Antes se quedaba con los brazos abiertos hasta el corte.
  t.to(robot.brazoIzq.hombro.rotation, { z: 7 * GRADOS, x: 0, duration: 1.1, ease: 'power2.inOut' }, 8.9);
  t.to(robot.brazoDer.hombro.rotation, { z: -7 * GRADOS, x: 0, duration: 1.1, ease: 'power2.inOut' }, 8.9);
  t.to(robot.brazoIzq.codo.rotation, { x: 26 * GRADOS, duration: 1.1, ease: 'power2.inOut' }, 8.9);
  t.to(robot.brazoDer.codo.rotation, { x: 26 * GRADOS, duration: 1.1, ease: 'power2.inOut' }, 8.9);
  t.to(robot.cabeza.rotation, { x: 0, y: -4 * GRADOS, duration: 1.1, ease: 'power2.inOut' }, 8.9);

  // La cámara vuelve al plano general.
  t.to(estado, { zoom: 1, duration: 1.6, ease: 'power2.inOut' }, 8.9);

  // Se sostiene el estado final y funde a negro. onRepeat reinicia todo
  // ya con la escena invisible, y la vuelta siguiente entra desde negro.
  t.to(estado, { fundido: 0, duration: 0.55, ease: 'power2.in' }, 10.95);

  return t;
}
