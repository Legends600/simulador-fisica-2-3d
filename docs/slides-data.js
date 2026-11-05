import { project } from '../src/config/project.js';
const openstax =
  'Fuente: OpenStax, University Physics Volume 2. https://openstax.org/books/university-physics-volume-2/pages/5-4-electric-field';
export const slides = [
  {
    layout: 'cover',
    title: 'Electricidad y\nmagnetismo en 3D',
    subtitle: 'Laboratorio interactivo de Física II',
    image: 'campo-electrico',
    notes: `Proyecto de ${project.members.join(', ')}. ${project.degree}, ${project.cycle}, ${project.university}. Presentar cuatro unidades con cálculo y experimentación. Los modelos son ideales.`,
  },
  {
    layout: 'overview',
    title: 'Cuatro unidades de Física II',
    items: [
      ['01', 'Electricidad y potencial', 'Cargas, campo y equipotenciales'],
      ['02', 'Capacitores', 'Geometría, dieléctrico y energía'],
      ['03', 'Circuitos eléctricos', 'Redes mixtas y respuesta RC'],
      ['04', 'Magnetismo', 'Fuentes de B y fuerza de Lorentz'],
    ],
    notes:
      'Los nueve requisitos funcionales se agrupan en cuatro unidades. Cada unidad tiene una escena 3D, controles y resultados. Explicar el recorrido de la exposición.',
  },
  {
    layout: 'experiment',
    unit: 'UNIDAD 01',
    title: 'Campo eléctrico y potencial',
    image: 'vista-2d',
    body: [
      'Una carga de 1 nC a 1 m:',
      'E = 8.99 N/C    V = 8.99 V',
      'A 2 m: E = 2.25 N/C y V = 4.49 V',
    ],
    formula: 'E ∝ 1/r²     V ∝ 1/r',
    notes:
      'Elegir una carga aislada y mover la sonda de 1 a 2 m. La imagen muestra una distribución dipolar, que también puede explorarse. Arrastrar una carga recalcula el campo. ' +
      openstax +
      ' Potencial: https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential',
  },
  {
    layout: 'hero',
    unit: 'UNIDAD 01',
    title: 'El potencial también tiene geometría',
    image: 'equipotenciales',
    caption: 'Superficies V = ±15 V de un dipolo. El campo es perpendicular a las equipotenciales.',
    formula: 'V(r) = Σ kqᵢ/rᵢ',
    notes:
      'Activar superficies y alternar 2D/3D. En el centro del dipolo V=0, pero E no es cero. La sonda usa la fórmula directa y la superficie una malla aproximada. Fuente: OpenStax, sección 7.3.',
  },
  {
    layout: 'experiment',
    unit: 'UNIDAD 02',
    title: 'Capacitancia y energía almacenada',
    image: 'capacitor',
    body: [
      'Más área o permitividad: mayor C.',
      'Más separación: menor C.',
      'Duplicar V multiplica U por cuatro.',
    ],
    formula: 'C = ε₀εᵣA/d\nU = ½CV²',
    notes:
      'Usar 200 cm², 3 mm, εr=1 y 12 V: C≈59 pF. Cambiar geometría y dieléctrico. El dibujo amplía la separación. Fuentes: https://openstax.org/books/university-physics-volume-2/pages/8-1-capacitors-and-capacitance y https://openstax.org/books/university-physics-volume-2/pages/8-3-energy-stored-in-a-capacitor',
  },
  {
    layout: 'chart',
    unit: 'UNIDAD 02',
    title: 'Carga del capacitor',
    stat: '63.2 %',
    body: [
      'del voltaje final en t = τ',
      'τ = RC',
      'El avance por pasos permite inspeccionar cada instante.',
    ],
    chart: {
      title: 'Carga normalizada del capacitor',
      xTitle: 'Tiempo / τ',
      yTitle: 'Vc / V₀',
      categories: Array.from({ length: 11 }, (_, i) => String(i * 0.5)),
      values: Array.from({ length: 11 }, (_, i) => Number((1 - Math.exp(-i * 0.5)).toFixed(6))),
      max: 1,
    },
    notes:
      'Iniciar la carga RC del capacitor. La resistencia se expresa en MΩ y C se calcula desde la geometría. El reloj visual recorre 0–5τ; el rótulo muestra segundos físicos. La gráfica redondea a seis decimales. Fuente: https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits',
  },
  {
    layout: 'hero',
    unit: 'UNIDAD 03',
    title: 'Un circuito que se puede explorar',
    image: 'circuitos',
    caption: 'Placa 3D, selección de resistencias y corriente convencional animada.',
    formula: '100 + (220 || 330) = 232 Ω',
    notes:
      'Pulsar una resistencia para editarla y la fuente para apagarla. Las etapas se conectan en serie y las ramas, en paralelo. Placa, esquema y tabla comparten los cálculos. La rapidez de los puntos es visual. Fuente: https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules',
  },
  {
    layout: 'chart',
    unit: 'UNIDAD 03',
    title: 'Ley de Ohm y punto de operación',
    stat: '51.7 mA',
    body: ['con 12 V y R = 232 Ω', 'I = V/R', 'Potencia total: P ≈ 0.621 W'],
    chart: {
      title: 'Corriente para R equivalente = 232 Ω',
      xTitle: 'Voltaje de la fuente (V)',
      yTitle: 'Corriente (mA)',
      categories: ['0', '4', '8', '12', '16', '20', '24'],
      values: [0, 4, 8, 12, 16, 20, 24].map((v) => Number(((v / 232) * 1000).toFixed(6))),
      max: 110,
    },
    notes:
      'La pendiente de I frente a V es 1/R. Comprobar corrientes de ramas y suma de potencias. Las gráficas de esta presentación son editables en PowerPoint, con datos redondeados a seis decimales. Fuente: OpenStax, reglas de Kirchhoff.',
  },
  {
    layout: 'comparison',
    unit: 'UNIDAD 04',
    title: 'Campos producidos por corrientes',
    images: ['conductor', 'espira'],
    headings: ['Conductor rectilíneo', 'Espira circular'],
    captions: ['B = µ₀I / (2πr)', 'Biot–Savart con 128 segmentos'],
    notes:
      'Invertir la corriente y observar el sentido de B. Con I=5 A y R=1 m, la espira genera 3.14 µT en el centro. Fuente: https://openstax.org/books/university-physics-volume-2/pages/12-1-the-biot-savart-law',
  },
  {
    layout: 'hero',
    unit: 'UNIDAD 04',
    title: 'La fuerza magnética curva la trayectoria',
    image: 'lorentz-orbita',
    caption:
      'Con E = 0, la energía cinética permanece constante. Una velocidad paralela a B produce la hélice.',
    formula: 'F = q(E + v × B)',
    notes:
      'Usar q=1 C, m=1 kg, Bz=1 T y v=(2,0,0.4) m/s. El radio es 2 m y K=2.08 J. La fuerza magnética es perpendicular a v. Boris preserva la rapidez en este caso, pero tiene error de fase. Fuente: https://openstax.org/books/university-physics-volume-2/pages/11-3-motion-of-a-charged-particle-in-a-magnetic-field',
  },
  {
    layout: 'experiment',
    unit: 'UNIDAD 04',
    title: 'Un selector de velocidades',
    image: 'selector',
    body: [
      'Ey = 2 N/C    Bz = 1 T',
      'v = (2, 0, 0) m/s',
      'La fuerza eléctrica cancela a la magnética.',
    ],
    formula: 'vx = Ey / Bz',
    notes:
      'Lanzar la partícula con los valores indicados: la trayectoria es recta. Cambiar Ey para romper el equilibrio. Son parámetros didácticos clásicos, no un electrón real. Fuente: OpenStax, movimiento de partículas cargadas.',
  },
  {
    layout: 'architecture',
    title: 'Estructura del proyecto',
    items: [
      ['core/', 'Cálculo físico y validación'],
      ['modules/', 'Controles de las cuatro unidades'],
      ['rendering/', 'Escenas 3D y animaciones'],
      ['ui/', 'Componentes y gráficas'],
      ['config/', 'Parámetros y datos del equipo'],
    ],
    notes:
      'El cálculo se prueba sin DOM. Cada unidad mantiene controles y escena propios. El reloj visual es independiente del integrador físico. Código con nombres explícitos y formato consistente. Fuente: código del repositorio.',
  },
  {
    layout: 'validation',
    title: 'Cómo comprobamos los resultados',
    items: [
      ['Coulomb', 'Ley inversa del cuadrado y superposición'],
      ['Circuitos', 'Kirchhoff y balance de potencia'],
      ['Trayectorias', 'Rapidez conservada y convergencia'],
      ['Interacción', 'Animación, pausa, arrastre y archivos'],
    ],
    notes:
      'Mostrar el registro de validación y explicar el contraste con soluciones analíticas. La prueba de navegador comprueba movimiento real, pausa, paso, arrastre y archivos. Límites: modelos ideales, redes serie/paralelo y régimen clásico.',
  },
  {
    layout: 'team',
    title: 'Equipo del proyecto',
    notes: `Integrantes: ${project.members.join(', ')}. Docente: ${project.teacher}. ${project.degree}, ${project.cycle}. Finalizar con una demostración y usar la guía de defensa para las preguntas.`,
  },
];
