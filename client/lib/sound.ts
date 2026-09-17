/**
 * Geluid voor het rad: tikjes tijdens het draaien en een jingle bij het resultaat.
 * Alles wordt live gegenereerd met de Web Audio API, dus er zijn geen
 * geluidsbestanden nodig. Werkt pas na een klik van de gebruiker (browserregel),
 * en dat is precies wanneer het rad gedraaid wordt.
 */

let ctx: AudioContext | null = null;
let scheduled: number[] = [];

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(at: number, frequency: number, duration: number, gain: number, type: OscillatorType = 'square') {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  vol.gain.setValueAtTime(0, at);
  vol.gain.linearRampToValueAtTime(gain, at + 0.005);
  vol.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** Stopt alle geplande geluiden (bv. bij opnieuw draaien). */
export function stopSounds(): void {
  for (const id of scheduled) window.clearTimeout(id);
  scheduled = [];
}

/**
 * Tikjes die meelopen met het rad: snel in het begin, traag op het einde.
 * @param durationMs hoe lang het rad draait
 * @param segments   aantal vakken op het rad
 * @param turns      aantal volledige omwentelingen
 */
export function playWheelTicks(durationMs: number, segments: number, turns: number): void {
  const ac = audio();
  if (!ac) return;
  stopSounds();

  const totalTicks = Math.min(Math.round(segments * (turns + 0.5)), 90);
  const seconds = durationMs / 1000;
  const start = ac.currentTime + 0.02;

  for (let k = 1; k <= totalTicks; k += 1) {
    // Omgekeerde van de ease-out-animatie: geeft realistisch uitbollende tikken.
    const progress = k / totalTicks;
    const t = (1 - Math.pow(1 - progress, 1 / 3)) * seconds;
    blip(start + t, 1250 - 350 * progress, 0.045, 0.06);
  }
}

/** Korte fanfare wanneer de drank bekend is. */
export function playWheelResult(): void {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + 0.03;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, index) => {
    blip(start + index * 0.11, frequency, 0.3, 0.09, 'triangle');
  });
}

/** Klein signaal bij de start van een ronde. */
export function playRoundStart(): void {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + 0.02;
  blip(start, 392, 0.16, 0.07, 'triangle');
  blip(start + 0.16, 587.33, 0.26, 0.07, 'triangle');
}
