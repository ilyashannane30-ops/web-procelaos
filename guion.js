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
  var t = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: 1.4,
    onRepeat: refs.reiniciar
  });

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

  /* ----------------------------------------------------------------------
     ESTADO 02 — La carga crece (2,2 -> 3,6)
     La figura no se mueve de sitio: la presión sube, él no. Se encoge, y
     los papeles caen con la cadencia acelerando (0,5s -> 0,15s), que es lo
     que hace el trabajo, no la cantidad.
     ---------------------------------------------------------------------- */

  t.addLabel('carga', 2.2);

  // Encogerse: hombros arriba, torso más bajo, brazos más rápidos.
  t.to(trabajador.torso.scale, { y: 0.9, duration: 1.2, ease: 'power2.in' }, 2.2);
  t.to(trabajador.torso.rotation, { z: 11 * GRADOS, duration: 1.2, ease: 'power2.in' }, 2.2);
  t.to(trabajador.cabeza.rotation, { z: 24 * GRADOS, duration: 1.2, ease: 'power2.in' }, 2.2);

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
  t.add(function () { refs.reparentarMovil(); }, 5.15);

  t.to(refs.movil.position, {
    x: ABSORCION.x, y: ABSORCION.y, z: ABSORCION.z,
    duration: 0.85, ease: 'power3.in'      // acelera al acercarse
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
  t.to(trabajador.cabeza.rotation, { y: -6 * GRADOS, duration: 0.9, ease: 'power2.inOut' }, 5.15);

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
     8-12 objetos reales, reciclados. El volumen lo fabrican la cadencia
     (90ms), las estelas y los tres carriles a distinta profundidad. El
     robot casi no se mueve: contraste exacto con el 01.
     ---------------------------------------------------------------------- */

  t.addLabel('proceso', 7.2);

  // El testigo pulsa mientras procesa: sin esto, el brillo del arranque se
  // queda plano durante todo el estado y el robot se lee como "encendido",
  // no como "trabajando". 8 repeticiones de 180ms cubren la ventana entera.
  t.to(estado, {
    brilloTestigo: 1.5, duration: 0.18, ease: 'sine.inOut',
    repeat: 8, yoyo: true
  }, 7.2);

  // Alturas calibradas al cuerpo del robot (pecho entre 1,2 y 2,6): el
  // flujo tiene que pasar POR él, no por encima de la escena.
  var CARRILES = [
    { y: 2.55, z: 0.35 },
    { y: 2.0, z: -0.25 },
    { y: 1.45, z: -0.85 }
  ];

  refs.papelesFlujo.forEach(function (papel, i) {
    var carril = CARRILES[i % CARRILES.length];
    var cuando = 7.2 + i * 0.09;   // cadencia de 90ms
    var estela = refs.estelasFlujo[i];

    // Dos pasadas por objeto: reciclar es lo que da cantidad infinita
    // percibida sin sumar ni un objeto más.
    for (var pasada = 0; pasada < 2; pasada++) {
      var inicio = cuando + pasada * 0.85;
      if (inicio > 8.7) break;

      t.set(papel, { visible: true }, inicio);
      // Entran desde la zona de la mesa y salen pasado el robot: el
      // flujo ATRAVIESA al robot, que está fijo en 5,4.
      t.fromTo(papel.position,
        { x: 0.4, y: carril.y, z: carril.z },
        { x: 9.2, duration: 0.8, ease: 'none' },
        inicio
      );
      // Entra desordenado, sale alineado: caos -> orden atravesando el robot.
      t.fromTo(papel.rotation,
        { y: (Math.random() - 0.5) * 1.6, z: (Math.random() - 0.5) * 0.9 },
        { y: 0, z: 0, duration: 0.8, ease: 'power2.out' },
        inicio
      );

      // Estela: dos copias que recorren la MISMA trayectoria con un
      // pequeño retraso, así que siempre quedan un paso detrás del papel
      // real. El desvanecido al final de cada tramo es lo que evita que
      // la copia "aparezca" de golpe al reciclarse.
      [
        { malla: estela.cerca, retraso: 0.05, opacidadMax: 0.32 },
        { malla: estela.lejos, retraso: 0.11, opacidadMax: 0.14 }
      ].forEach(function (capa) {
        var ini = inicio + capa.retraso;
        var dur = 0.8 - capa.retraso;

        t.set(capa.malla, { visible: true }, ini);
        t.fromTo(capa.malla.position,
          { x: 0.4, y: carril.y, z: carril.z },
          { x: 9.2, duration: dur, ease: 'none' },
          ini
        );
        t.fromTo(capa.malla.material, { opacity: 0 }, {
          opacity: capa.opacidadMax, duration: 0.12, ease: 'none'
        }, ini);
        t.to(capa.malla.material, {
          opacity: 0, duration: 0.18, ease: 'none'
        }, ini + dur - 0.18);
        t.set(capa.malla, { visible: false }, ini + dur);
      });
    }
  });

  t.set(refs.papelesFlujo, { visible: false }, 8.85);

  /* ----------------------------------------------------------------------
     ESTADO 07 — Liberado (8,9 -> 10)
     Un solo movimiento lento de enderezarse. Sin celebración: la contención
     es lo que lo mantiene premium.
     ---------------------------------------------------------------------- */

  t.addLabel('liberado', 8.9);

  t.to(trabajador.torso.scale, { y: 1, duration: 1.2, ease: 'power2.out' }, 8.9);
  t.to(trabajador.torso.rotation, { z: 0, y: 0, duration: 1.2, ease: 'power2.out' }, 8.9);

  // Mira al frente por primera vez, no a un objeto.
  t.to(trabajador.cabeza.rotation, {
    x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.out'
  }, 8.9);

  // Brazos relajados a los lados.
  t.to(estado.manoIzq, {
    x: X_TRABAJADOR_DESPLAZADO - 0.74, y: 2.02, z: 0.6,
    duration: 1.2, ease: 'power2.out'
  }, 8.9);
  t.to(estado.manoDer, {
    x: X_TRABAJADOR_DESPLAZADO + 0.74, y: 2.02, z: 0.6,
    duration: 1.2, ease: 'power2.out'
  }, 8.9);

  // El flujo continúa al fondo, más tenue: el trabajo no ha desaparecido,
  // ha cambiado de manos.
  t.to(estado, { brilloTestigo: 0.9, duration: 1.0 }, 8.9);

  return t;
}
