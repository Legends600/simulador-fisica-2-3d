/** A visual clock per unit. Physical particle time is integrated separately in SI. */
export class Playback {
  constructor(units, playing = true) {
    this.units = Object.fromEntries(units.map((id) => [id, { time: 0, speed: 1, playing }]));
  }
  get(id) {
    return { ...this.units[id] };
  }
  play(id, playing) {
    this.units[id].playing = playing;
  }
  speed(id, speed) {
    if (![0.25, 0.5, 1, 2].includes(speed)) throw new RangeError('Velocidad no admitida.');
    this.units[id].speed = speed;
  }
  advance(id, seconds, force = false) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Intervalo inválido.');
    const u = this.units[id];
    const delta = u.playing || force ? seconds * u.speed : 0;
    u.time += delta;
    return delta;
  }
  reset(id) {
    this.units[id].time = 0;
  }
}
