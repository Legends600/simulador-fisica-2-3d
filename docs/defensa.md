# Guía para la defensa del proyecto

Duración sugerida: 10–12 minutos, más preguntas. La presentación web incluye notas por diapositiva y también se entrega como PowerPoint editable.

## Recorrido propuesto

1. **Objetivo (1 min).** Mostrar cómo un modelo físico se convierte en cálculo y visualización, con cuatro unidades y nueve módulos.
2. **Electrostática (2 min).** Elegir una carga de 1 nC en el origen. Medir a 1 m y 2 m. Explicar por qué E se divide entre cuatro y V entre dos. Mostrar dipolo y superficies equipotenciales.
3. **Capacitores (1 min).** Usar 200 cm², 3 mm y 12 V. Duplicar área y después voltaje. Distinguir capacitancia, carga y energía.
4. **Circuitos (2 min).** Explicar 100 + (220 || 330) = 232 Ω. Comprobar suma de corrientes de ramas y potencia. Mostrar carga RC al 63.2 % en t = τ.
5. **Magnetismo (2 min).** Mostrar hilo, invertir corriente y pasar a Lorentz. Con E = 0 comprobar energía constante. Después establecer Ey = 2, Bz = 1 y vx = 2 para anular la desviación.
6. **Arquitectura y validación (2 min).** Separar motor físico, estado y renderer. Explicar integrador Boris, pruebas analíticas y límites. Cerrar con las exportaciones JSON y CSV.

## Preguntas previsibles

**¿Por qué V puede ser cero mientras E no lo es?**

V es una suma escalar y puede cancelarse por signos. E es una suma vectorial: en el centro de un dipolo, ambos campos apuntan en el mismo sentido.

**¿Las partículas siempre siguen las líneas de campo?**

No. La línea describe la dirección instantánea del campo; la partícula tiene inercia y velocidad inicial. Su aceleración, no necesariamente su velocidad, se alinea con E cuando B = 0.

**¿Por qué usar Boris?**

Separa el impulso eléctrico de la rotación magnética y preserva la rapidez para un campo magnético uniforme sin E, salvo redondeo. También tiene error de fase: conservar energía no significa que la posición sea exacta. La prueba de convergencia comprueba el orden dos.

**¿Por qué el imán es un dipolo ideal?**

Es una aproximación educativa del campo exterior. No se modelan dominios ferromagnéticos ni la geometría real completa. La sonda excluye una región alrededor del centro.

**¿Qué pasa en una carga puntual?**

La idealización tiene una singularidad. La sonda devuelve “No definido”; la trayectoria se detiene antes de tocar la fuente. No se afirma que un valor limitado represente la física exacta del centro.

**¿Se pueden construir todos los circuitos?**

Se pueden construir redes serie/paralelo y mixtas dentro de la topología por etapas. No se resuelven puentes no reducibles ni circuitos de CA. Para ello se podría incorporar análisis nodal y matrices.

**¿Qué se conserva cuando actúa solo B?**

La energía cinética y la rapidez, porque v · (v × B) = 0. La dirección de la velocidad cambia. Un campo eléctrico sí puede realizar trabajo.

**¿Qué tiene de Ingeniería de Sistemas?**

Modelamiento, funciones puras comprobables, validación de entradas, separación de responsabilidades, renderizado 3D, gestión de memoria, persistencia portable e integración de pruebas y publicación.

## Preparación antes de clase

- Abrir el simulador y comprobar WebGL en el equipo de exposición.
- Descargar el video para tener una demostración disponible sin depender de Internet.
- Guardar los experimentos clave en JSON y familiarizarse con la interpretación de cada resultado.
- Ensayar la exposición con las notas; adaptar los datos institucionales o integrantes si el curso los exige.
- La presentación es material de apoyo. La defensa presencial corresponde al estudiante.
