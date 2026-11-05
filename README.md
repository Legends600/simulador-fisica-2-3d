# Física II · Laboratorio interactivo UPeU

Proyecto grupal de la **Universidad Peruana Unión**, Ingeniería Sistemas e Informática, **4to ciclo**.

**Integrantes:** Omar Tineo, Anthuanet Reynoso y Moises Morales.

**Docente:** Ramiro Manrique Rua.

![Laboratorio de Física II](assets/screenshots/campo-electrico.png)

**[Abrir simulador](https://legends600.github.io/simulador-fisica-2-3d/)** · **[Manual detallado](https://legends600.github.io/simulador-fisica-2-3d/docs/manual.html)** · **[Presentación](https://legends600.github.io/simulador-fisica-2-3d/docs/presentacion.html)**

## Cuatro unidades con escenas 3D

| Unidad                   | Experimentos e interacción                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Electricidad y potencial | Hasta 10 cargas. Arrastre directo, líneas con trazadores animados, vectores, equipotenciales 2D/3D, sonda y trayectorias eléctricas.                               |
| Capacitores              | Placas y dipolos dieléctricos, área y distancia configurables, energía y carga RC con resistencia ajustable.                                                       |
| Circuitos                | Placa 3D de redes serie/paralelo/mixtas. Corriente convencional animada, selección de resistencias y fuente conmutable. Esquema, tabla y gráfica del mismo modelo. |
| Magnetismo               | Imán, conductor y espira con trazadores de B. Fuerza de Lorentz, hélices y selector de velocidades con E y B cruzados.                                             |

Todas las unidades tienen pausa, reproducción, velocidad y avance por pasos. Los marcadores de campo y corriente usan un tiempo visual; las trayectorias y la carga RC muestran sus magnitudes físicas en SI. El manual explica esta distinción.

## Entregables

| Archivo                 | Acceso                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manual de uso           | [Manual web](https://legends600.github.io/simulador-fisica-2-3d/docs/manual.html) con controles, experimentos, animaciones y solución de problemas                                            |
| Informe técnico         | [Fundamentos, arquitectura, algoritmos y validación](https://legends600.github.io/simulador-fisica-2-3d/docs/informe.html)                                                                    |
| Presentación para clase | [14 diapositivas web](https://legends600.github.io/simulador-fisica-2-3d/docs/presentacion.html) y [PowerPoint editable](docs/presentacion-fisica-ii-upeu.pptx), con notas y gráficas nativas |
| Apoyo de exposición     | [Guía de defensa](docs/defensa.md)                                                                                                                                                            |
| Registro de pruebas     | [Validación](docs/validacion.json)                                                                                                                                                            |

El logo institucional es el original proporcionado por el equipo. Los datos académicos se mantienen en `src/config/project.js`. La presentación usa las flechas del teclado, **N** para las notas y **F** para pantalla completa. El manual y el informe permiten imprimir o guardar como PDF desde el navegador.

## Ejecutar en el equipo

Se requiere **Node.js 22 o posterior** y un navegador con WebGL 2.

```sh
npm ci
npm run dev
```

Abre **http://127.0.0.1:4173**. Se utiliza un servidor HTTP para cargar módulos JavaScript. Después de instalar las dependencias, el simulador no necesita CDN ni servicios externos.

```sh
npm run build
npm start
```

**[Descargar paquete independiente](https://github.com/Legends600/simulador-fisica-2-3d/releases/download/v2.0.0/fisica-ii-upeu-v2.0.0.zip)**. Descomprime y ejecuta `node server.mjs` dentro de la carpeta. Incluye Three.js, el manual, el informe y la presentación.

## Estructura del proyecto

```text
src/
  app.js                    Coordinación del estado y navegación
  config/                   Parámetros iniciales y datos del equipo
  core/
    physics.js              Ecuaciones y algoritmos independientes del navegador
    experiments.js          Validación de archivos de experimentos
    playback.js             Reloj por unidad, pausa, velocidad y pasos
  modules/
    electric/controls.js    Unidad 1
    capacitor/controls.js   Unidad 2
    circuit/controls.js     Unidad 3
    magnetic/controls.js    Unidad 4
  rendering/
    world.js                Cámara, recursos WebGL y utilidades de escena
    motion.js               Trazadores e interacción con objetos
    units/                  Escenas 3D de las cuatro unidades
  ui/                       Componentes, controles y gráficas SVG
assets/brand/               Logo institucional original
docs/                       Manual, informe, presentación y defensa
tests/                      Soluciones analíticas y reloj de reproducción
scripts/                    Build, servidor, documentación y QA
```

Three.js es la dependencia de ejecución. Playwright se usa para verificación y Prettier para mantener formato consistente. El build parte de una carpeta limpia e incorpora las bibliotecas gráficas localmente.

## Validación

```sh
npm test
```

Se contrastan Coulomb, potencial, capacitores, circuitos RC, Kirchhoff, hilo y espira con soluciones conocidas. También se verifican conservación de rapidez, convergencia de Boris, geometría equipotencial y comportamiento del reloj.

Con `npm run dev` abierto en otra terminal:

```sh
npx playwright install chromium
npm run test:ui
npm run test:animations
npm run test:delivery
```

Las pruebas comprueban cambio real de posiciones en las cuatro animaciones, pausa, avance por pasos, arrastre de cargas, selección de resistencias, apagado de fuente, carga RC, archivos JSON/CSV y vistas de 390/768 px. Chrome o Edge pueden usarse en Windows mediante un perfil temporal aislado. `BROWSER_PATH` y `BASE_URL` permiten configurar el entorno de pruebas.

## Modelos y límites

El motor utiliza SI. Las cargas son fuentes fijas y las partículas, pruebas clásicas sin retroacción. El capacitor ideal desprecia efectos de borde. El circuito admite hasta cuatro etapas serie con cuatro ramas paralelas cada una, CC y un capacitor en RC. El imán se aproxima por un dipolo y las corrientes por filamentos ideales. Los trazadores ilustran dirección y corriente convencional; su rapidez no representa propagación electromagnética ni deriva electrónica. Consulta el informe para las exclusiones, el integrador y los dominios de cálculo.

Los experimentos se guardan en JSON; las trayectorias se exportan a CSV y las escenas a PNG. El equipo prepara la exposición con la presentación y la guía de defensa.

## Regenerar documentos

```sh
node scripts/docs.mjs
node scripts/slides-web.mjs
npm run format
```

El PowerPoint final ya está incluido. Su generador opcional requiere el runtime Artifact Tool de Codex y las variables `CODEX_ARTIFACT_RUNTIME` y `PRESENTATION_SKILL_DIR`. El funcionamiento y el build de la aplicación son independientes de ese runtime.
