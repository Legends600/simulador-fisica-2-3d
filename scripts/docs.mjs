import { project } from '../src/config/project.js';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('docs', { recursive: true });
const table = (headers, rows) =>
  `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const figure = (name, caption) =>
  `<figure><img src="../assets/screenshots/${name}.png" alt="${caption}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
const eq = (text) => `<div class="equation">${text}</div>`;
const code = (text) => `<pre><code>${text}</code></pre>`;
function page(title, subtitle, sections) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Física II UPeU</title><link rel="icon" href="../assets/brand/upeu.png"><link rel="stylesheet" href="docs.css"></head><body><header><a href="../">← Volver al laboratorio</a><div class="doc-identity"><img src="../assets/brand/upeu.png" alt="Universidad Peruana Unión"><div><div class="eyebrow">FÍSICA II · ${project.cycle.toUpperCase()}</div><div>${project.degree}</div></div></div><h1>${title}</h1><p>${subtitle}</p><div class="toolbar"><button onclick="window.print()">Imprimir / guardar PDF</button><a href="manual.html">Manual</a><a href="informe.html">Informe</a><a href="presentacion.html">Presentación</a></div></header><main><nav aria-label="Contenido"><strong>CONTENIDO</strong>${sections.map((s) => `<a href="#${s.id}">${s.title}</a>`).join('')}</nav><article>${sections.map((s) => `<section id="${s.id}"><h2>${s.title}</h2>${s.body}</section>`).join('')}</article></main><footer><span>Proyecto de Física II · versión 2.0 · 4 de noviembre de 2026</span><a href="../">Abrir el simulador →</a></footer></body></html>`;
}

const manual = [
  {
    id: 'inicio',
    title: '1. Primeros pasos',
    body: `<p>FLUX es un laboratorio web para observar campos, calcular magnitudes y contrastar predicciones. Abre la versión publicada o ejecútala en tu equipo. No necesita cuenta, servidor de datos ni conexión a servicios externos durante el uso.</p><h3>Ejecución desde el código fuente</h3><p>Instala Node.js 22 o posterior. Dentro de la carpeta del proyecto:</p>${code('npm ci\nnpm run dev')}<p>Abre <code>http://127.0.0.1:4173</code>. Para comprobar la versión distribuible:</p>${code('npm run build\nnpm start')}<p>Si utilizas el paquete descargable de la entrega, descomprímelo, abre una terminal en esa carpeta y ejecuta <code>node server.mjs</code>. No abras <code>index.html</code> con doble clic: los módulos JavaScript necesitan HTTP.</p><p>Recomendado: navegador con WebGL 2 y aceleración gráfica. Se verificaron Chromium de escritorio y vistas de 390 y 768 píxeles. La vista móvil coloca la escena antes de los controles.</p>`,
  },
  {
    id: 'interfaz',
    title: '2. Controles comunes',
    body: `<ul><li><strong>Menú lateral:</strong> selecciona una de las cuatro unidades. Cada unidad conserva sus parámetros mientras navegas.</li><li><strong>Controles:</strong> usa el deslizador o escribe un número dentro del rango. Un valor inválido no reemplaza el último valor válido.</li><li><strong>3D:</strong> arrastra con el botón principal para orbitar; rueda para acercar; botón secundario para desplazar. En pantalla táctil, un dedo orbita y dos dedos acercan o desplazan.</li><li><strong>2D:</strong> bloquea la cámara en la dirección z y presenta la vista XY. Las cargas con z distinto de cero se proyectan en esa vista. Las curvas equipotenciales se calculan específicamente en z = 0.</li><li><strong>⌖:</strong> centra la cámara. <strong>↓</strong> en la escena guarda una captura PNG de la visualización.</li><li><strong>Reiniciar unidad:</strong> restaura sus valores iniciales y borra su trayectoria; las demás unidades conservan su estado.</li></ul><p>Las tarjetas bajo la escena muestran resultados en SI, con prefijos como m, µ, n y p. Las flechas de los ejes indican orientación; las figuras no sustituyen la lectura numérica de la sonda.</p>`,
  },
  {
    id: 'electricidad',
    title: '3. Cargas, potencial y trayectoria',
    body: `<ol><li>Selecciona <strong>Campo eléctrico</strong> y una configuración: carga aislada, dipolo, dos cargas positivas o cuadrupolo.</li><li>Edita cada carga en nC y su posición x, y, z en metros. Añade o elimina fuentes hasta un máximo de diez. Una carga de 0 nC no genera campo.</li><li>Activa líneas de campo, vectores o equipotenciales. El nivel define las superficies de potencial positivo y negativo. En 2D también aparece V = 0 cuando existe una frontera entre signos.</li><li>Introduce las coordenadas de P para calcular V y las componentes de E. En una carga puntual no existe un resultado finito: cambia la posición de P.</li><li>Abre <strong>Trayectoria de una partícula</strong>. Configura carga en µC, masa en mg, posición y velocidad. Pulsa <strong>Lanzar</strong>, <strong>Pausar</strong> o <strong>Borrar</strong>.</li><li>Exporta el CSV para analizar tiempo, posición y velocidad. Las columnas incluyen unidades en sus nombres.</li></ol><div class="callout">Las líneas indican dirección, no una densidad de flujo cuantitativa. Una trayectoria de partícula puede diferir de una línea de campo porque depende de la velocidad inicial y de la inercia.</div>${figure('equipotenciales', 'Dipolo eléctrico con superficies equipotenciales numéricas.')}<h3>Experimento verificable</h3><p>Selecciona una carga, fija q = 1 nC y P = (1, 0, 0) m. Obtendrás V ≈ 8.99 V y |E| ≈ 8.99 N/C. Al mover P a (2, 0, 0) m, V ≈ 4.49 V y |E| ≈ 2.25 N/C.</p>`,
  },
  {
    id: 'capacitores',
    title: '4. Capacitores y energía',
    body: `<p>Modifica área en cm², separación en mm, permitividad relativa y diferencia de potencial en V. El modelo supone placas paralelas, campo uniforme y batería conectada; V permanece constante al cambiar el material.</p>${eq('C = ε₀ εᵣ A/d &nbsp; · &nbsp; Q = CV &nbsp; · &nbsp; U = ½CV²')}<p>Con A = 200 cm², d = 3 mm, εr = 1 y V = 12 V: C ≈ 59.0 pF, Q ≈ 708 pC, U ≈ 4.25 nJ y E = 4 kV/m. Duplicar A duplica C. Duplicar d divide C entre dos. Duplicar V multiplica U por cuatro.</p><p>Los valores de los materiales son aproximaciones didácticas. La separación visual está ampliada; las fórmulas utilizan las dimensiones físicas que introduces.</p>${figure('capacitor', 'Capacitor con dieléctrico: geometría, carga y energía calculadas en tiempo real.')}`,
  },
  {
    id: 'circuitos',
    title: '5. Circuitos y ley de Ohm',
    body: `<p>El constructor admite hasta cuatro etapas en serie. Cada etapa contiene hasta cuatro resistencias en paralelo. Con una rama por etapa obtienes un circuito en serie; con una sola etapa y varias ramas obtienes uno en paralelo. La combinación produce circuitos mixtos.</p><ol><li>Selecciona un ejemplo o usa <strong>Añadir etapa</strong> y <strong>Rama en paralelo</strong>.</li><li>Introduce resistencias positivas en Ω y el voltaje de la fuente.</li><li>Lee R equivalente, corriente total, potencia y la tabla por resistencia.</li><li>Observa la gráfica I–V; el punto destaca el voltaje seleccionado y su corriente.</li></ol>${eq('Rserie = ΣRᵢ &nbsp; · &nbsp; 1/Rparalelo = Σ(1/Rᵢ) &nbsp; · &nbsp; I = V/R')}<p>Para el ejemplo mixto: 220 Ω || 330 Ω = 132 Ω; con 100 Ω en serie, R = 232 Ω. A 12 V, I ≈ 51.7 mA y P ≈ 0.621 W.</p><h3>Circuito RC</h3><p>Selecciona <strong>Resistencias + capacitor</strong>. El capacitor se conecta en serie con toda la red resistiva equivalente. Ajusta C en µF y el tiempo en unidades de τ = RC. En carga, Vc(0) = 0. En descarga, Vc(0) es el voltaje inicial elegido y la fuente se desconecta. La corriente negativa indica descarga respecto al sentido de carga.</p><p>Usa <strong>Animar proceso RC</strong> o el deslizador. En t = τ, Vc alcanza el 63.2 % durante la carga y conserva el 36.8 % durante la descarga. El gráfico, las tarjetas y la tabla muestran el mismo instante.</p>${figure('circuitos', 'Red mixta y gráfica de la ley de Ohm.')}`,
  },
  {
    id: 'magnetismo',
    title: '6. Campo magnético y Lorentz',
    body: `<h3>Fuentes de campo</h3><ul><li><strong>Imán:</strong> dipolo ideal orientado sobre y. La intensidad se expresa como momento magnético, A·m². Al invertir el signo cambian los polos.</li><li><strong>Conductor:</strong> hilo infinito sobre z, corriente en A. Las líneas forman circunferencias alrededor del conductor.</li><li><strong>Espira:</strong> radio 1 m en el plano XY. El campo se calcula con Biot–Savart. Una corriente positiva circula en sentido antihorario vista desde +z.</li></ul><p>La sonda permite evaluar |B| y sus componentes. Dentro de la fuente ideal o cerca del filamento se indica una zona excluida.</p><h3>Fuerza de Lorentz</h3><p>Cambia al modo <strong>Fuerza de Lorentz</strong>. Ey se expresa en N/C y Bz en teslas. Las unidades de la partícula en este modo son C y kg para mantener trayectorias visibles a escala de metros; no representan un electrón real.</p>${eq('F = q(E + v × B) &nbsp; · &nbsp; r = mv⊥ / |qB| cuando E = 0')}<p>Con E = 0, q = 1 C, m = 1 kg, Bz = 1 T y velocidad (2, 0, 0.4) m/s, aparece una hélice con radio 2 m y energía 2.08 J. Con vz = 0 se obtiene una circunferencia. Para verificar un selector de velocidades, usa Ey = 2 N/C, Bz = 1 T y v = (2, 0, 0) m/s: la fuerza neta es nula.</p>${figure('lorentz', 'Integración de la trayectoria de una partícula en un campo magnético uniforme.')}`,
  },
  {
    id: 'archivos',
    title: '7. Guardar y compartir',
    body: `<p><strong>Guardar experimento</strong> descarga un JSON con las cuatro unidades y la vista activa. <strong>Abrir</strong> restituye esos parámetros. El archivo no almacena una simulación en curso: vuelve a lanzar la partícula si necesitas regenerar la trayectoria.</p><p>Los experimentos no se envían a un servidor. Al cerrar o recargar, se restablecen los valores iniciales salvo que abras un JSON guardado. El importador verifica versión, tipos, cantidades y límites; rechaza archivos mayores de 200 kB.</p><p>El CSV incluye t_s, x_m, y_m, z_m, vx_m_s, vy_m_s y vz_m_s. Se toma una muestra cada tres pasos internos; el tiempo exacto de cada fila permite comparar trayectorias aunque el paso varíe.</p><p>Desde los enlaces laterales puedes abrir este manual, el informe y la presentación. En la presentación usa las flechas del teclado, los botones o F para pantalla completa; N alterna las notas del expositor.</p>`,
  },
  {
    id: 'problemas',
    title: '8. Límites y solución de problemas',
    body: table(
      ['Situación', 'Acción o interpretación'],
      [
        [
          'No aparece la escena 3D',
          'Activa WebGL 2 y aceleración gráfica. Prueba un navegador actualizado. Las calculadoras y circuitos pueden seguir funcionando.',
        ],
        [
          'La aplicación no carga al abrir index.html',
          'Ejecuta el servidor HTTP con npm run dev o node server.mjs en el paquete de entrega.',
        ],
        [
          'El campo o potencial indica «No definido»',
          'La sonda está sobre una carga o dentro de una fuente excluida. Mueve P.',
        ],
        [
          'No veo una superficie equipotencial',
          'Puede quedar fuera de la caja de muestreo de ±4 m, no existir para ese signo o corresponder a cargas demasiado pequeñas. Cambia el nivel.',
        ],
        [
          'La partícula se detiene',
          'Alcanza una carga, sale del radio de 8 m, supera 30 s o llega al límite de muestras. Borra la trayectoria y cambia el experimento.',
        ],
        [
          'Las líneas cambian de densidad al rotar',
          'Son una selección de curvas ilustrativas; su cantidad no mide flujo. Consulta los valores numéricos.',
        ],
        [
          'Quiero un puente de Wheatstone o un circuito de CA',
          'El constructor resuelve redes reducibles mediante etapas serie/paralelo, CC y un capacitor equivalente en RC. No implementa circuitos arbitrarios ni CA.',
        ],
        [
          'Quiero entregar el manual como PDF',
          'Usa Imprimir / guardar PDF. El estilo de impresión elimina los controles y conserva contenido y referencias.',
        ],
      ],
    ),
  },
];

const traceRows = [
  [
    'U1 · Cargas puntuales',
    'Hasta 10 cargas con x, y, z; líneas de campo; vistas 2D/3D; equipotenciales',
    'Campo eléctrico',
  ],
  [
    'U1 · Calculadora de potencial',
    'Sonda con V, |E| y vector E; singularidad explícita',
    'Sonda de potencial',
  ],
  [
    'U1 · Trayectoria eléctrica',
    'Partícula de prueba, lanzamiento, pausa y CSV',
    'Trayectoria de una partícula',
  ],
  ['U2 · Capacitores', 'Geometría 3D, área, distancia y dieléctrico', 'Capacitores'],
  ['U2 · Energía almacenada', 'C, Q, U y campo entre placas', 'Tarjetas de resultados'],
  [
    'U3 · Circuitos',
    'Fuente, resistencias serie/paralelo/mixtas; resultados por rama',
    'Constructor de circuitos',
  ],
  [
    'U3 · Ley de Ohm',
    'Gráfica I–V con resistencia fija y punto de operación',
    'Circuitos · modo CC',
  ],
  [
    'U4 · Campo magnético',
    'Dipolo, conductor infinito y espira; sonda vectorial',
    'Magnetismo · Campo magnético',
  ],
  ['U4 · Lorentz', 'Trayectorias en Ey y Bz; radio y energía', 'Magnetismo · Fuerza de Lorentz'],
];
const report = [
  {
    id: 'resumen',
    title: '1. Resumen y objetivos',
    body: `<p>Se desarrolló un laboratorio web interactivo de Física II organizada en cuatro unidades. Combina visualización tridimensional con cálculo numérico verificable. El objetivo es relacionar parámetros físicos, representaciones geométricas y resultados cuantitativos en experimentos reproducibles.</p><p>El alcance proviene del documento «producto final física 2_x8ntcazrsf.docx». Sus tecnologías se presentan como sugerencias; se eligió JavaScript con Three.js para ejecutar todos los módulos en un navegador. El proyecto no requiere backend ni servicios de pago.</p><p>Los entregables son: código fuente, manual web, este informe técnico y presentación para la defensa. El equipo solicitó retirar el video de la entrega. Se incorpora además análisis RC, exportación de trayectorias y persistencia mediante archivos JSON.</p>`,
  },
  {
    id: 'requisitos',
    title: '2. Cobertura de requisitos',
    body:
      table(['Requisito del documento', 'Implementación', 'Ubicación'], traceRows) +
      `<p>La presentación prepara la defensa; la exposición en clase debe realizarla el estudiante. Los experimentos son simulaciones de modelos ideales, no mediciones de laboratorio físico.</p>`,
  },
  {
    id: 'electrico',
    title: '3. Electricidad y potencial',
    body: `<p>Para cargas puntuales fijas, rᵢ = r − rᵢ,f y k = 1/(4πε₀). El campo y el potencial se obtienen por superposición; se adopta V = 0 en el infinito.</p>${eq('E(r) = Σᵢ k qᵢ rᵢ / |rᵢ|³<br>V(r) = Σᵢ k qᵢ / |rᵢ|')}<p>Se emplea ε₀ = 8.8541878128 × 10⁻¹² F/m. El vector E conserva el signo de cada fuente. V suma valores escalares: un potencial nulo no implica campo nulo. La partícula de prueba no altera las fuentes.</p><p>La sonda señala singularidad para distancias ≤ 10⁻⁹ m de una carga no nula. Los trazadores visuales utilizan exclusiones mayores para evitar líneas que atraviesen la geometría de las fuentes. No se reemplaza la singularidad de la sonda por un valor artificialmente finito. Fundamento: <a href="https://openstax.org/books/university-physics-volume-2/pages/5-4-electric-field">campo eléctrico</a> y <a href="https://openstax.org/books/university-physics-volume-2/pages/7-3-calculations-of-electric-potential">potencial eléctrico</a>, OpenStax.</p>`,
  },
  {
    id: 'capacitancia',
    title: '4. Capacitores y dieléctricos',
    body: `<p>El capacitor ideal tiene placas de área A, separación d y un dieléctrico homogéneo lineal. Se desprecian efectos de borde. La fuente mantiene la diferencia de potencial fija.</p>${eq('C = ε₀ εᵣ A/d<br>Q = CV &nbsp; · &nbsp; U = ½CV² &nbsp; · &nbsp; E = V/d')}<p>La interfaz convierte cm² a m² multiplicando por 10⁻⁴ y mm a m multiplicando por 10⁻³. Los materiales propuestos son valores representativos; su permitividad real depende de composición y frecuencia. El espaciado de las placas se amplía gráficamente sin modificar las magnitudes calculadas. Fundamento: <a href="https://openstax.org/books/university-physics-volume-2/pages/8-1-capacitors-and-capacitance">capacitancia</a> y <a href="https://openstax.org/books/university-physics-volume-2/pages/8-3-energy-stored-in-a-capacitor">energía almacenada</a>, OpenStax.</p>`,
  },
  {
    id: 'redes',
    title: '5. Circuitos resistivos y RC',
    body: `<p>La topología admitida es una serie de etapas, cada una formada por resistencias en paralelo. Esta representación permite redes serie, paralelo y mixtas, con hasta dieciséis resistencias. No es un solucionador nodal de topología arbitraria.</p>${eq('Rⱼ = (Σᵢ 1/Rⱼᵢ)⁻¹ &nbsp; · &nbsp; Rₑq = Σⱼ Rⱼ<br>I = V/Rₑq &nbsp; · &nbsp; Vⱼ = IRⱼ<br>Iⱼᵢ = Vⱼ/Rⱼᵢ &nbsp; · &nbsp; Pⱼᵢ = Vⱼ²/Rⱼᵢ')}<p>Se verifican conservación de corriente por nodo, suma de caídas de voltaje y balance de potencia. La gráfica I–V mantiene la red fija al recorrer el voltaje. Fundamento: <a href="https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules">reglas de Kirchhoff</a>, OpenStax.</p><p>Para RC, el capacitor se conecta en serie con R equivalente. La carga parte de Vc = 0; en descarga, la fuente se desconecta y V₀ es la tensión inicial.</p>${eq('τ = Rₑq C<br>Carga: Vc(t) = V₀(1 − e⁻ᵗ/ᵗᵃᵘ), I(t) = (V₀/Rₑq)e⁻ᵗ/ᵗᵃᵘ<br>Descarga: Vc(t) = V₀e⁻ᵗ/ᵗᵃᵘ, I(t) = −(V₀/Rₑq)e⁻ᵗ/ᵗᵃᵘ')}<p>La solución RC es analítica; su animación recorre t/τ entre 0 y 5. No requiere integración numérica. Fundamento: <a href="https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits">circuitos RC</a>, OpenStax.</p>`,
  },
  {
    id: 'magnetico',
    title: '6. Magnetismo y movimiento',
    body: `<p>Se usa µ₀ = 1.25663706212 × 10⁻⁶ H/m. El conductor infinito está alineado con z; la espira de radio 1 m se ubica en XY y el dipolo magnético apunta sobre y.</p>${eq('Hilo: B = µ₀I/(2πρ²) (−y, x, 0)<br>Espira: B ≈ (µ₀I/4π) Σ (Δℓ × r)/|r|³<br>Dipolo: B = µ₀/(4πr³) [3(m · r̂)r̂ − m]')}<p>La espira usa cuadratura de punto medio con 128 segmentos. El modelo dipolar describe el campo exterior del imán; se excluye una región central en la sonda. Los filamentos también tienen una región excluida. Fundamento: <a href="https://openstax.org/books/university-physics-volume-2/pages/12-1-the-biot-savart-law">ley de Biot–Savart</a>, OpenStax.</p>${eq('dr/dt = v &nbsp; · &nbsp; dv/dt = (q/m)(E + v × B)<br>K = ½m|v|² &nbsp; · &nbsp; rL = mv⊥/|qB| para E = 0')}<p>El simulador de Lorentz usa E = (0, Ey, 0) y B = (0, 0, Bz). La fuerza magnética es perpendicular a v; en ausencia de E conserva K. Una velocidad paralela a B produce una hélice. Con v = (Ey/Bz, 0, 0), las fuerzas se compensan. Se trabaja en régimen clásico, con valores didácticos de q y m. Fundamento: <a href="https://openstax.org/books/university-physics-volume-2/pages/11-3-motion-of-a-charged-particle-in-a-magnetic-field">movimiento de partículas cargadas</a>, OpenStax.</p>`,
  },
  {
    id: 'arquitectura',
    title: '7. Arquitectura del software',
    body: `<p>La interfaz, el motor físico y la representación gráfica están separados. El estado de cada unidad contiene únicamente parámetros serializables. El navegador procesa las interacciones y actualiza el cálculo sin solicitudes a un servidor.</p>${table(
      ['Archivo', 'Responsabilidad'],
      [
        [
          'src/core/physics.js',
          'Constantes, vectores, campos, capacitores, circuitos, integrador y geometría equipotencial. Funciones independientes del DOM.',
        ],
        [
          'src/rendering/world.js',
          'Escena Three.js, cámara, líneas, mallas, sondas y trayectoria; liberación de geometrías y materiales.',
        ],
        [
          'src/ui/charts.js',
          'Esquemas de circuitos y gráficas SVG generadas a partir del mismo estado calculado.',
        ],
        ['src/app.js', 'Estado, controles, validación, importación/exportación y temporización.'],
        [
          'src/styles.css',
          'Diseño adaptable, estados de foco y adaptación a preferencias de movimiento.',
        ],
        [
          'scripts/',
          'Servidor, build, pruebas de interfaz, documentación y empaquetado de la entrega.',
        ],
        ['tests/physics.test.mjs', 'Casos analíticos y propiedades físicas.'],
        ['docs/', 'Manual, informe, presentación, guía de defensa y referencias.'],
      ],
    )}${code('Entrada del usuario\n    ↓ validación y conversión de unidades\nEstado de la unidad → funciones físicas\n    ↓                         ↓\nEscena 3D / esquema SVG ← resultados numéricos\n    ↓\nCaptura PNG / experimento JSON / trayectoria CSV')}<p>Dependencia de ejecución: Three.js, fijada en el archivo de bloqueo. Playwright se utiliza solo para validación. El build copia los módulos de Three.js al paquete, sin CDN. <a href="https://threejs.org/manual/pages/installation.html">Documentación de instalación de Three.js</a>.</p>`,
  },
  {
    id: 'algoritmos',
    title: '8. Algoritmos y control numérico',
    body: `<h3>Líneas de campo</h3><p>Se integra dr/ds = ±E/|E| o ±B/|B| con Runge–Kutta de cuarto orden. s es longitud de arco, no tiempo. Las semillas eléctricas se distribuyen sobre un círculo en 2D o una esfera en 3D. Las líneas terminan por límite espacial, proximidad a una fuente, campo nulo o máximo de pasos. Se usa la misma cantidad de semillas por fuente: la densidad de líneas no codifica exactamente |q|.</p><h3>Equipotenciales</h3><p>En 3D se muestrea V en una caja de ±4 m con 22 celdas por eje. Cada cubo se descompone en seis tetraedros y las aristas que cruzan el nivel se interpolan linealmente. En 2D se triangula una cuadrícula de 72 celdas por eje para resolver las curvas de nivel en z = 0. Las superficies son aproximaciones geométricas; la sonda utiliza la fórmula directa.</p><h3>Integrador de Boris</h3><p>Se aplica una composición simétrica: media deriva espacial, impulso eléctrico, rotación magnética, segundo impulso eléctrico y media deriva espacial. Campo y velocidad se manejan en SI. El campo se evalúa en la posición intermedia.</p>${eq('v⁻ = v + (qΔt/2m)E<br>t = (qΔt/2m)B &nbsp; · &nbsp; s = 2t/(1 + |t|²)<br>v′ = v⁻ + v⁻ × t<br>v⁺ = v⁻ + v′ × s<br>vₙ₊₁ = v⁺ + (qΔt/2m)E')}<p>Se utiliza la rotación habitual Boris-B, no la variante de giro exacto Boris-C. La conservación de rapidez para E = 0 se comprueba por separado del error de fase. Referencia: <a href="https://arxiv.org/abs/1809.04378">Zenitani y Umeda, On the Boris solver in particle-in-cell simulation (2018)</a>.</p><p>Δt ≤ 0.005 s; se reduce según rapidez, aceleración eléctrica y frecuencia de giro. La adaptación es una heurística de estabilidad, no un estimador certificado del error. La simulación se detiene cerca de una carga (0.11 m), a radio mayor de 8 m, a los 30 s o al alcanzar 20 000 muestras. Se guarda una muestra cada tres pasos. El trazado visible conserva las últimas 4 500.</p><h3>Coste y rendimiento</h3><p>Una evaluación eléctrica cuesta O(N) para N ≤ 10 cargas. Una superficie cuesta O(M³N); una evaluación de la espira suma 128 contribuciones. Se reconstruye la geometría al cambiar parámetros y se liberan los recursos anteriores. El bucle de renderizado actualiza la cámara y las partículas, sin recalcular isosuperficies en cada cuadro.</p>`,
  },
  {
    id: 'validacion',
    title: '9. Pruebas y validación',
    body: `<p>La validación combina soluciones analíticas, propiedades de conservación e interacción real en navegador. Se ejecuta con <code>npm test</code> y, con el servidor abierto, <code>npm run test:ui</code>. El registro reproducible se conserva en <a href="validacion.json">validacion.json</a>.</p>${table(
      ['Caso', 'Resultado o criterio'],
      [
        ['Carga 1 nC, r = 1 m', 'E = 8.987551792… N/C; V = 8.987551792… V.'],
        ['Distancia duplicada', 'E se divide entre 4; V se divide entre 2.'],
        ['Dipolo simétrico', 'V nulo y campo no nulo en el punto medio.'],
        [
          'Relación campo–potencial',
          'Comparación E = −grad(V) mediante diferencias centrales; tolerancia relativa 10⁻⁷.',
        ],
        ['Capacitor 200 cm² / 3 mm', 'C = 59.027918752 pF.'],
        [
          'Circuito mixto',
          '100 + (220 || 330) = 232 Ω; conservación de corriente, voltaje y potencia.',
        ],
        ['RC en t = τ', 'Carga 63.212… %; descarga 36.788… %.'],
        ['Hilo y espira', 'Comparación con soluciones analíticas, incluyendo signo.'],
        ['Boris con E uniforme', 'Posición y velocidad coinciden con aceleración constante.'],
        [
          'Boris con B uniforme',
          'Rapidez conservada durante 10 000 pasos con tolerancia relativa 10⁻¹¹.',
        ],
        [
          'Convergencia',
          'Reducir Δt a la mitad reduce aproximadamente cuatro veces el error de velocidad.',
        ],
        [
          'Equipotencial de carga aislada',
          'Radio de 1 m, error geométrico &lt; 5 % para malla de 24 celdas en caja de ±2 m.',
        ],
        [
          'Interfaz',
          'Nueve módulos, entradas inválidas, límites, CSV, JSON, 390 y 768 px y recursos sin errores.',
        ],
      ],
    )}<p>Las tolerancias corresponden a casos concretos; no garantizan el mismo error en toda configuración. No se realizaron mediciones de rendimiento en una colección de dispositivos ni una auditoría completa de accesibilidad. La verificación móvil usa tamaños de viewport, no dispositivos físicos.</p>`,
  },
  {
    id: 'limites',
    title: '10. Supuestos, límites y mejoras',
    body: `<ul><li>Electrostática con fuentes fijas; no hay interacción mutua de cargas móviles, radiación ni relatividad.</li><li>Capacitor ideal, dieléctrico lineal y batería conectada; no hay pérdidas, ruptura dieléctrica ni efectos de borde.</li><li>Redes reducibles por serie/paralelo, una fuente ideal de CC y un capacitor en el modo RC; no hay CA, inductores ni puentes arbitrarios.</li><li>Campo de imán aproximado por dipolo, hilo infinito y espira de filamento ideal. Las zonas excluidas evitan interpretar la idealización sobre la fuente.</li><li>Líneas y flechas usan escalas gráficas. No permiten inferir magnitudes solo por longitud o densidad.</li><li>El usuario guarda experimentos en archivos; no hay base de datos, inicio de sesión ni sincronización entre equipos.</li></ul><p>Mejoras posibles: solver nodal para topologías arbitrarias, circuitos RLC, control adaptativo de error con estimación local, ecuaciones relativistas y un mallado equipotencial adaptativo. Estas mejoras no forman parte de la implementación entregada.</p>`,
  },
  {
    id: 'conclusiones',
    title: '11. Conclusiones y defensa',
    body: `<p>El producto implementa los nueve módulos solicitados y relaciona los cuatro bloques de Física II en una interfaz común. La separación entre cálculo, estado y visualización permite verificar las ecuaciones independientemente del navegador. Las exportaciones hacen posible repetir experimentos y contrastar resultados.</p><p>Para la defensa se recomienda mostrar tres comprobaciones: ley inversa del cuadrado, balance de potencia del circuito mixto y conservación de rapidez con campo magnético puro. La <a href="presentacion.html">presentación</a> incluye notas del expositor y la <a href="defensa.md">guía de defensa</a> propone respuestas a preguntas sobre límites e integración numérica.</p>`,
  },
  {
    id: 'referencias',
    title: '12. Referencias',
    body: `<ol class="references"><li>OpenStax. <em>University Physics, Volume 2</em>, secciones 5.4, 7.3, 8.1, 8.3, 10.3, 10.5, 11.3 y 12.1. Los enlaces directos se incluyen junto a cada modelo.</li><li>Zenitani, S. y Umeda, T. (2018). <em>On the Boris solver in particle-in-cell simulation</em>. Physics of Plasmas, 25, 112110. <a href="https://arxiv.org/abs/1809.04378">Artículo de los autores</a>.</li><li>Three.js. <a href="https://threejs.org/manual/pages/installation.html">Manual de instalación</a> y <a href="https://threejs.org/docs/pages/OrbitControls">OrbitControls</a>.</li><li>Documento de requisitos proporcionado por el usuario: <em>producto final física 2_x8ntcazrsf.docx</em>. Se usó como especificación académica; no se publica su archivo original.</li></ol><p>Consulta de fuentes web: 4 de noviembre de 2026. Las capturas corresponden a la aplicación desarrollada. No se presentan imágenes generadas como evidencia de experimentos físicos.</p>`,
  },
];

manual.splice(2, 0, {
  id: 'animaciones',
  title: 'Animaciones e interacción 3D',
  body: `<p>Las cuatro unidades disponen de una escena 3D animada. La barra bajo la escena permite pausar, reproducir, reiniciar y avanzar un paso de 0.05 segundos visuales. Puedes seleccionar velocidades 0.25×, 0.5×, 1× o 2×. Cada unidad conserva su propio reloj.</p><p><strong>Tiempo visual y tiempo físico:</strong> los puntos luminosos de las líneas indican orientación. No representan cargas que viajan por el vacío ni una velocidad de propagación. En las trayectorias, el tiempo físico aparece en la tarjeta de resultados. En la carga del capacitor, la escena informa t y τ en segundos físicos.</p><h3>Unidad 1 · Cargas y potencial</h3><p>Arrastra una esfera cargada directamente en la escena. Se mueve sobre el plano XY que pasa por su coordenada z, con límites de ±4 m. Las líneas, superficies y sonda se recalculan. Las coordenadas también pueden editarse en el panel. Los trazadores luminosos siguen el sentido del campo; pausar congela la animación sin bloquear los parámetros.</p><h3>Unidad 2 · Capacitores</h3><p>La geometría cambia al modificar área o distancia. Los pares de colores del dieléctrico ilustran la orientación de dipolos. En «Carga RC en 3D», ajusta la resistencia en MΩ y pulsa «Iniciar carga». El recorrido muestra 0–5 constantes de tiempo con τ = RC. La capacitancia depende de la geometría, mientras Q, U y E se calculan con el voltaje instantáneo Vc. «Estado estable» vuelve al capacitor conectado a la tensión final.</p><h3>Unidad 3 · Circuitos</h3><p>La placa 3D representa la misma red que el esquema y la tabla inferiores. Los puntos amarillos ilustran corriente convencional. Su rapidez es visual y no equivale a la velocidad de deriva de electrones. Pulsa una resistencia 3D para enfocar su valor en el panel. Pulsa la fuente para apagarla o encenderla. Con V = 0 no circulan trazadores. Puedes orbitar, acercar y cambiar a vista XY.</p><h3>Unidad 4 · Magnetismo</h3><p>Los puntos verdes recorren las líneas de B. Cambia la fuente o invierte la corriente para observar el sentido. En Lorentz, configura la partícula y pulsa «Lanzar». La barra común controla la reproducción y el avance por pasos de la trayectoria. La velocidad inicial y el signo de q determinan el movimiento.</p>`,
});
manual.push({
  id: 'equipo',
  title: 'Equipo y presentación',
  body: `<p><strong>Universidad Peruana Unión · Física II</strong><br>${project.degree} · ${project.cycle}</p><h3>Integrantes</h3><ul>${project.members.map((n) => '<li>' + n + '</li>').join('')}</ul><p><strong>Docente:</strong> ${project.teacher}</p><p>La presentación incluye ejemplos de las cuatro unidades, gráficas editables y notas para la exposición. Puedes abrirla desde el menú lateral o descargar el archivo PowerPoint.</p>`,
});
report.splice(1, 0, {
  id: 'equipo',
  title: 'Datos del proyecto grupal',
  body: `<p>${project.university}<br>${project.degree}<br>${project.cycle} · Curso: ${project.course}</p><p><strong>Integrantes:</strong> ${project.members.join(', ')}.<br><strong>Docente:</strong> ${project.teacher}.</p>`,
});
report.push({
  id: 'estructura-v2',
  title: 'Estructura y animaciones de la versión 2',
  body: `<p><code>src/modules/</code> separa los controles de las cuatro unidades. <code>src/core/</code> contiene las funciones físicas, la validación de experimentos y el reloj de reproducción. <code>src/rendering/units/</code> define cuatro escenas 3D. <code>src/ui/</code> reúne componentes de interfaz y gráficas; <code>src/config/</code> mantiene parámetros y datos académicos.</p><p>El reloj visual es independiente de las ecuaciones de movimiento. La interfaz identifica los marcadores de dirección y la corriente convencional como representaciones didácticas. Los cálculos usan SI y el tiempo físico de cada modelo. Pausa y avance por pasos permiten inspeccionar la evolución sin perder la interacción con los parámetros.</p><p>La carga del capacitor añade una resistencia didáctica configurable y utiliza la solución analítica RC con su capacitancia calculada. La placa de circuitos 3D y el esquema SVG comparten la misma red y los mismos resultados por rama.</p>`,
});

await writeFile(
  'docs/manual.html',
  page(
    'Manual de usuario',
    'Guía de uso, experimentos reproducibles y solución de problemas.',
    manual,
  ),
);
await writeFile(
  'docs/informe.html',
  page(
    'Informe técnico',
    'Simulador interactivo de campos eléctricos y magnéticos en 3D · fundamentos, arquitectura, algoritmos y validación.',
    report,
  ).replaceAll('e⁻ᵗ/ᵗᵃᵘ', 'e<sup>−t/τ</sup>'),
);

console.log('Manual detallado e informe actualizados: UPeU, equipo y animaciones.');
