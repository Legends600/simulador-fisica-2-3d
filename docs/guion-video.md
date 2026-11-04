# Guion del video demostrativo

Duración del recorrido: 6 minutos. Grabación de la aplicación real; subtítulos integrados en español, sin pista de audio.

## 00:00 — FLUX · Laboratorio de Física II

Cuatro unidades para experimentar con electricidad y magnetismo. Los controles cambian el modelo y los resultados se calculan en tiempo real.

## 00:20 — 01 · Una carga puntual

Una carga de +1 nC situada en el origen genera 8.99 N/C y un potencial de 8.99 V a un metro. La sonda P permite evaluar cualquier punto dentro del dominio.

## 00:35 — 01 · Dependencia con la distancia

Al duplicar la distancia a dos metros, el campo cae a la cuarta parte y el potencial a la mitad: E ∝ 1/r² y V ∝ 1/r.

## 00:50 — 01 · Superposición de campos

En el centro de un dipolo el potencial puede ser cero aunque el campo no lo sea. El potencial suma escalares; el campo suma vectores.

## 01:05 — 01 · Equipotenciales en 2D

Las curvas representan V = −15, 0 y +15 V en el plano z = 0. El campo eléctrico es perpendicular a las equipotenciales.

## 01:20 — 01 · Superficies equipotenciales 3D

La misma distribución produce superficies en tres dimensiones. Puedes rotar la escena, cambiar la posición de las cargas y usar hasta diez fuentes.

## 01:35 — 01 · Trayectoria eléctrica

Una partícula de prueba responde a F = qE. Su trayectoria se integra numéricamente; cerca de una carga o al salir del dominio se detiene. Los datos pueden exportarse a CSV.

## 01:55 — 02 · Capacitor de placas paralelas

Con 200 cm² de área, 3 mm de separación y 12 V: C ≈ 59 pF. La batería mantiene el voltaje constante. El dibujo amplía las dimensiones para hacerlas visibles.

## 02:15 — 02 · Geometría del capacitor

Duplicar el área a 400 cm² duplica la capacitancia a 118 pF. En cambio, aumentar la separación reduce la capacitancia: C = ε₀ εr A/d.

## 02:30 — 02 · Dieléctrico y energía almacenada

Con εr = 4, la capacitancia aumenta a 472 pF. Al subir el voltaje de 12 a 24 V, la energía crece de 34 a 136 nJ: U = ½CV².

## 02:50 — 03 · Circuito mixto

Una resistencia de 100 Ω en serie con 220 Ω y 330 Ω en paralelo equivale a 232 Ω. A 12 V circulan 51.7 mA. Cada rama muestra su voltaje, corriente y potencia.

## 03:10 — 03 · Serie, paralelo y ley de Ohm

Las configuraciones se construyen con etapas en serie y ramas en paralelo. La gráfica I–V muestra una recta cuya pendiente es 1/R equivalente.

## 03:25 — 03 · Carga y descarga RC

Con un capacitor aparece una respuesta transitoria. En t = τ, la carga alcanza el 63.2 % del valor final. Durante la descarga la fuente se desconecta y la corriente cambia de signo.

## 03:45 — 04 · Campo de un imán

El imán se aproxima mediante un dipolo magnético ideal. Las líneas exteriores salen del norte y regresan al sur. La sonda muestra las tres componentes de B.

## 04:05 — 04 · Campo de una corriente rectilínea

Un conductor infinito con 5 A genera aproximadamente 1 µT a un metro. Invertir la corriente invierte el campo: es la regla de la mano derecha.

## 04:20 — 04 · Campo de una espira

Una espira de radio 1 m con 5 A produce 3.14 µT en el centro. El programa integra la ley de Biot–Savart con 128 segmentos.

## 04:40 — 04 · Fuerza de Lorentz

Con E = 0, Bz = 1 T, q = 1 C y m = 1 kg, el movimiento tiene radio 2 m. La componente vz forma una hélice; la energía cinética se mantiene en 2.08 J.

## 05:05 — 04 · Selector de velocidades

Cuando Ey = 2 N/C, Bz = 1 T y vx = 2 m/s, la fuerza eléctrica cancela a la magnética. La partícula avanza sin desviarse porque v = E/B.

## 05:25 — 04 · Campos cruzados sin equilibrio

Al bajar Ey a 0.5 N/C se rompe la compensación. La trayectoria se curva y la energía puede cambiar: el campo eléctrico sí realiza trabajo.

## 05:45 — Experimentos reproducibles y documentación

Guarda un experimento en JSON y exporta su trayectoria a CSV. El repositorio incluye código, pruebas, manual, informe técnico y presentación para la defensa.
