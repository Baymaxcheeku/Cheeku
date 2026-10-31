import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Audio, staticFile, continueRender, delayRender } from 'remotion';
import timeline from './timeline.json';
import { C, clamp, easeInOut, easeOut, loadFonts } from './theme';
import { Background, Phone, ChapterRail } from './kit';
import { Scene, VO } from './scenes/common';
import { hook, meet, family, plan } from './scenes/s1';
import { positive, pregnancy, doctor, baby, homecare, fever } from './scenes/s2';
import { care, engine, close } from './scenes/s3';

const SCENES: Record<string, Scene> = { hook, meet, family, plan, positive, pregnancy, doctor, baby, homecare, fever, care, engine, close };
type TS = { id: string; from: number; dur: number; vo: { file: string; from: number; dur: number; text: string }[] };
const TL = timeline as { fps: number; total: number; scenes: TS[] };
const S: Record<string, TS> = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const localVO = (s: TS): VO[] => s.vo.map(v => ({ from: v.from - s.from, dur: v.dur, text: v.text }));
const OV = 12;
const CHAPTER: Record<string, number> = { family: 0, plan: 0, positive: 1, pregnancy: 1, doctor: 1, baby: 2, homecare: 2, fever: 2, care: 3, engine: 4 };

type Pose = { x: number; y: number; s: number; rot: number; tilt: number };
const P = (x: number, y: number, s = 1, rot = 0, tilt = 0): Pose => ({ x, y, s, rot, tilt });
const HID = P(1010, 1750, 0.9);
const CEN = P(920, 582, 0.93);
const closeEnd = S.close.vo[1].from - S.close.from - 14;
const KEYS: [number, Pose][] = [
  [0, HID], [S.meet.from + 84, HID], [S.meet.from + 106, P(1010, 548)],
  [S.family.from, P(1010, 548)], [S.family.from + 18, CEN],
  [S.positive.from + 2, CEN], [S.positive.from + 24, P(1340, 585, 0.86, 5, -12)],
  [S.pregnancy.from, P(1340, 585, 0.86, 5, -12)], [S.pregnancy.from + 20, CEN],
  [S.care.from + 40, CEN], [S.care.from + 62, P(830, 585, 0.86)],
  [S.engine.from, P(830, 585, 0.86)], [S.engine.from + 18, P(830, 1750, 0.85)],
  [S.close.from + closeEnd - 6, P(1560, 1750, 0.78, 7, -14)], [S.close.from + closeEnd + 20, P(1560, 575, 0.8, 7, -14)],
];
const pose = (f: number): Pose => {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= f) i++;
  const [a, pa] = KEYS[i]; const nx = KEYS[i + 1]; if (!nx) return pa;
  const [b, pb] = nx; const t = interpolate(f, [a, b], [0, 1], { ...clamp, easing: easeInOut });
  const m = (k: keyof Pose) => pa[k] + (pb[k] - pa[k]) * t;
  return { x: m('x'), y: m('y'), s: m('s'), rot: m('rot'), tilt: m('tilt') };
};
const ORDER = TL.scenes.map(s => s.id);
const withScreen = (f: number) => {
  let cur: string | null = null; let prev: string | null = null;
  for (const id of ORDER) { if (SCENES[id].screen && S[id].from <= f) { prev = cur; cur = id; } }
  return { cur, prev };
};

const PhoneLayer: React.FC = () => {
  const f = useCurrentFrame();
  const p = pose(f);
  if (p.y > 1600) return null;
  const { cur, prev } = withScreen(f);
  if (!cur) return null;
  const s = S[cur]; const Scr = SCENES[cur].screen!;
  const lf = f - s.from;
  const k = interpolate(lf, [0, 16], [0, 1], { ...clamp, easing: easeOut });
  const Prev = prev ? SCENES[prev].screen! : null;
  return (
    <Phone x={p.x} y={p.y} s={p.s} rot={p.rot} tilt={p.tilt} dark={SCENES[cur].darkScreen}>
      {Prev && k < 1 && <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-30 * k}%)` }}><Prev f={f - S[prev!].from} dur={S[prev!].dur} vo={localVO(S[prev!])} /></div>}
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${Prev ? (1 - k) * 100 : 0}%)`, boxShadow: Prev && k < 1 ? '-20px 0 40px rgba(20,20,60,.15)' : 'none' }}>
        <Scr f={lf} dur={s.dur} vo={localVO(s)} />
      </div>
    </Phone>
  );
};

const Layer: React.FC<{ which: 'back' | 'front' }> = ({ which }) => (
  <>{TL.scenes.map(s => {
    const C2 = SCENES[s.id][which]; if (!C2) return null;
    const from = Math.max(0, s.from - OV);
    return (
      <Sequence key={s.id + which} from={from} durationInFrames={s.dur + OV + (s.from - from)} layout="none">
        <Inner C2={C2} s={s} off={s.from - from} />
      </Sequence>
    );
  })}</>
);
const Inner: React.FC<{ C2: NonNullable<Scene['front']>; s: TS; off: number }> = ({ C2, s, off }) => {
  const f = useCurrentFrame() - off;
  return <C2 f={f} dur={s.dur} vo={localVO(s)} />;
};

export const Demo: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const [h] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => { loadFonts().then(() => continueRender(h)); }, [h]);
  const f = useCurrentFrame();
  const fv = S.fever;
  const night = interpolate(f, [fv.from - 6, fv.from + 14, fv.from + fv.dur - 12, fv.from + fv.dur + 8], [0, 1, 1, 0], clamp);
  const cur = ORDER.filter(id => S[id].from <= f).pop()!;
  const chap = CHAPTER[cur];
  const prevIds = ORDER.slice(0, ORDER.indexOf(cur));
  const prevChap = [...prevIds].reverse().map(id => CHAPTER[id]).find(c => c !== undefined);
  const at = chap === undefined ? (cur === 'close' ? 4 : 0) : interpolate(f - S[cur].from, [0, 20], [prevChap ?? chap, chap], { ...clamp, easing: easeInOut });
  const railVis = interpolate(f, [S.family.from - 6, S.family.from + 14, S.close.from, S.close.from + 16], [0, 1, 1, 0], clamp);
  const drift = 1 + 0.012 * Math.sin(f / 140);
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <Background night={night} />
      <AbsoluteFill style={{ transform: `scale(${drift}) translate(${Math.sin(f / 170) * 6}px, ${Math.cos(f / 200) * 4}px)` }}>
        <Layer which="back" />
        <PhoneLayer />
        <Layer which="front" />
      </AbsoluteFill>
      <ChapterRail at={at} vis={railVis} dark={night > 0.5} />
      {audio && <Audio src={staticFile('mix.wav')} />}
    </AbsoluteFill>
  );
};
