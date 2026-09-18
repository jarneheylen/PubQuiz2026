/**
 * Het drankrad.
 *
 * De server beslist waar het rad stopt en wanneer het begint te draaien; dit
 * component tekent en animeert enkel. Daardoor zien alle schermen (laptop van
 * de quizmaster en alle gsm's) hetzelfde rad op hetzelfde moment stoppen.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Drink, WheelState } from '../../shared/types';
import { playWheelResult, playWheelTicks, stopSounds } from '../lib/sound';

interface WheelProps {
  drinks: Drink[];
  wheel: WheelState;
  /** Verschil tussen server- en eigen klok (voor wie later binnenkomt). */
  serverOffset: number;
  /** Geluid aan? Staat normaal enkel aan bij de quizmaster. */
  sound?: boolean;
  size?: number;
}

const RADIUS = 50;

function polar(radius: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [50 + radius * Math.cos(rad), 50 + radius * Math.sin(rad)];
}

function segmentPath(index: number, total: number): string {
  const seg = 360 / total;
  const [x1, y1] = polar(RADIUS, index * seg);
  const [x2, y2] = polar(RADIUS, (index + 1) * seg);
  const largeArc = seg > 180 ? 1 : 0;
  return `M 50 50 L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
}

/** Zwarte of witte tekst, afhankelijk van hoe donker het vak is. */
function textColor(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#241a12' : '#fdf6e8';
}

/** Zelfde afwijking op elk toestel: hangt enkel af van het draainummer. */
function jitter(spinId: number): number {
  const value = Math.sin(spinId * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function computeTarget(
  current: number,
  resultIndex: number,
  total: number,
  turns: number,
  spinId: number,
): number {
  const seg = 360 / total;
  const center = (resultIndex + 0.5) * seg + (jitter(spinId) - 0.5) * seg * 0.55;
  const base = current + turns * 360;
  const delta = (((-center - base) % 360) + 360) % 360;
  return base + delta;
}

export function Wheel({ drinks, wheel, serverOffset, sound = false, size = 380 }: WheelProps) {
  const [rotation, setRotation] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const rotationRef = useRef(0);
  const lastSpin = useRef(0);
  const lastResultSound = useRef(0);

  const total = drinks.length;

  // Nieuwe draai? Bereken de eindstand en animeer ernaartoe.
  useEffect(() => {
    if (total === 0) return;
    if (wheel.resultIndex === null || wheel.spinId === 0) return;
    if (wheel.spinId === lastSpin.current) return;
    lastSpin.current = wheel.spinId;

    const target = computeTarget(
      rotationRef.current,
      wheel.resultIndex,
      total,
      wheel.turns,
      wheel.spinId,
    );
    rotationRef.current = target;

    const elapsed = Date.now() + serverOffset - (wheel.startedAt ?? 0);
    const remaining = wheel.durationMs - elapsed;

    if (wheel.status !== 'spinning' || remaining < 600) {
      // Resultaat is al bekend (bv. iemand komt later binnen): meteen tonen.
      setDurationMs(0);
      setRotation(target);
      return;
    }

    setDurationMs(remaining);
    setRotation(target);
    if (sound) playWheelTicks(remaining, total, wheel.turns);
  }, [wheel.spinId, wheel.status, wheel.resultIndex, wheel.startedAt, wheel.durationMs, wheel.turns, total, serverOffset, sound]);

  // Jingle op het moment dat de drank officieel is.
  useEffect(() => {
    if (wheel.status !== 'result') return;
    if (lastResultSound.current === wheel.spinId) return;
    lastResultSound.current = wheel.spinId;
    if (sound) playWheelResult();
  }, [wheel.status, wheel.spinId, sound]);

  useEffect(() => () => stopSounds(), []);

  const spinning = wheel.status === 'spinning';

  return (
    <div
      className={`wheel neon-ring neon-ring--on${spinning ? ' wheel--spinning' : ''}`}
      style={{ '--wheel-size': `${size}px` } as CSSProperties}
    >
      <div className="wheel__glow" aria-hidden="true" />
      <div className="wheel__pointer" aria-hidden="true" />
      <div
        className="wheel__disc"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: `${durationMs}ms`,
        }}
      >
        <svg viewBox="0 0 100 100" role="img" aria-label="Drankrad">
          <circle cx="50" cy="50" r="49.5" className="wheel__rim" />
          {drinks.map((drink, index) => {
            const seg = 360 / total;
            const center = (index + 0.5) * seg;
            return (
              <g key={drink.id}>
                <path d={segmentPath(index, total)} fill={drink.color} className="wheel__segment" />
                <g transform={`rotate(${center} 50 50)`}>
                  <text
                    x="50"
                    y="12"
                    className="wheel__emoji"
                    textAnchor="middle"
                    fill={textColor(drink.color)}
                  >
                    {drink.emoji}
                  </text>
                  <text
                    x="50"
                    y="21"
                    className="wheel__label"
                    textAnchor="middle"
                    fill={textColor(drink.color)}
                  >
                    {drink.name}
                  </text>
                </g>
              </g>
            );
          })}
          <circle cx="50" cy="50" r="49" className="wheel__ring" />
        </svg>
      </div>
      <div className="wheel__hub" aria-hidden="true">
        <span>🍻</span>
      </div>
    </div>
  );
}
