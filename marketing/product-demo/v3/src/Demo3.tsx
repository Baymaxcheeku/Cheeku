import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Audio, staticFile, continueRender, delayRender } from 'remotion';
import timeline from './timeline.json';
import segments from './segments.json';
import { C, clamp, easeInOut, easeOut, loadFonts } from './theme';
import { Background, ChapterRail } from './kit';
import { VO } from './scenes/common';
import { hook, meet } from './scenes/s1';
import { close } from './scenes/s3';
import { StoryFront, STORIES } from './story';
import { IPhone, ClipPlayer, Seg, barColors } from './device';

type TS = { id: string; from: number; dur: number; vo: { file: string; from: number; dur: number; text: string }[] };
const TL = timeline as { fps: number; total: number; scenes: TS[] };
const S: Record<string, TS> = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
const SEGS = segments as Record<string, Seg[]>;
const localVO = (s: TS): VO[] => s.vo.map((v) => ({ from: v.from - s.from, dur: v.dur, text: v.text }));
const CHAPTER: Record<string, number> = { plan: 0, labs: 0, preg: 1, gyne: 1, medcheck: 1, baby: 2, fever: 2, after: 2, care: 3, fit: 3, engine: 4 };
const ORDER = TL.scenes.map((s) => s.id);

type Pose = { x: number; y: number; s: number; rot: number; tilt: number };
const P = (x: number, y: number, s = 1, rot = 0, tilt = 0): Pose => ({ x, y, s, rot, tilt });
const HID = P(960, 1700, 0.9);
const CEN = P(960, 546, 0.98);
const closeEnd = S.close.vo[1].from - S.close.from - 14;
const KEYS: [number, Pose][] = [
  [0, HID], [S.meet.from + 84, HID], [S.meet.from + 108, CEN],
  [S.close.from + 4, CEN], [S.close.from + 24, P(960, 1700, 0.9)],
  [S.close.from + closeEnd - 4, P(1500, 1700, 0.84, 7, -14)], [S.close.from + closeEnd + 22, P(1500, 560, 0.84, 7, -14)],
];
const pose = (f: number): Pose => {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= f) i++;
  const [a, pa] = KEYS[i]; const nx = KEYS[i + 1]; if (!nx) return pa;
  const [b, pb] = nx; const t = interpolate(f, [a, b], [0, 1], { ...clamp, easing: easeInOut });
  const m = (k: keyof Pose) => pa[k] + (pb[k] - pa[k]) * t;
  return { x: m('x'), y: m('y'), s: m('s'), rot: m('rot'), tilt: m('tilt') };
};

/* which scene owns the screen at frame f (meet and close have their own segments) */
const screenScene = (f: number) => {
  let cur = ORDER[0];
  for (const id of ORDER) if (SEGS[id] && S[id].from <= f) cur = id;
  return cur;
};
const PUSH = 16;

const PhoneLayer: React.FC = () => {
  const f = useCurrentFrame();
  const p = pose(f);
  if (p.y > 1600) return null;
  const cur = screenScene(f);
  const lf = f - S[cur].from;
  const { top, bot } = barColors(SEGS[cur], lf);
  const ids = ORDER.filter((id) => SEGS[id]);
  return (
    <IPhone x={p.x} y={p.y} s={p.s} rot={p.rot} tilt={p.tilt} bar={top} foot={bot}>
      {ids.map((id) => {
        const s = S[id]; const from = id === 'close' ? s.from + closeEnd - 10 : s.from;
        const next = ids[ids.indexOf(id) + 1];
        const until = next ? S[next].from + PUSH : s.from + s.dur;
        if (f < from - 1 || f > until + 1) return null;
        const k = interpolate(f - from, [0, PUSH], [0, 1], { ...clamp, easing: easeOut });
        const leaving = next ? interpolate(f - S[next].from, [0, PUSH], [0, 1], { ...clamp, easing: easeOut }) : 0;
        const first = id === ids[0];
        return (
          <Sequence key={id} from={from} durationInFrames={until - from + 2} layout="none">
            <div style={{ position: 'absolute', inset: 0, background: C.canvas,
              transform: `translateX(${first ? 0 : (1 - k) * 100 - leaving * 28}%)`, boxShadow: k < 1 && !first ? '-24px 0 40px rgba(20,20,60,.18)' : 'none',
              filter: leaving > 0 ? `brightness(${1 - 0.12 * leaving})` : undefined }}>
              <ClipPlayer segs={SEGS[id]} total={until - from} />
            </div>
          </Sequence>
        );
      })}
    </IPhone>
  );
};

const Fronts: React.FC = () => (
  <>
    {TL.scenes.map((s) => {
      const OV = 12; const from = Math.max(0, s.from - OV);
      const Comp: React.FC<{ f: number }> = ({ f }) => {
        if (s.id === 'hook') return hook.front ? <hook.front f={f} dur={s.dur} vo={localVO(s)} /> : null;
        if (s.id === 'meet') return meet.front ? <meet.front f={f} dur={s.dur} vo={localVO(s)} /> : null;
        if (s.id === 'close') return close.front ? <close.front f={f} dur={s.dur} vo={localVO(s)} /> : null;
        if (STORIES[s.id]) return <StoryFront id={s.id} f={f} dur={s.dur} vo={localVO(s)} />;
        return null;
      };
      return (
        <Sequence key={s.id} from={from} durationInFrames={s.dur + OV + (s.from - from)} layout="none">
          <Local off={s.from - from} C2={Comp} />
        </Sequence>
      );
    })}
  </>
);
const Local: React.FC<{ off: number; C2: React.FC<{ f: number }> }> = ({ off, C2 }) => {
  const f = useCurrentFrame() - off;
  return <C2 f={f} />;
};

export const Demo: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const [h] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => { loadFonts().then(() => continueRender(h)); }, [h]);
  const f = useCurrentFrame();
  const fv = S.fever;
  const night = interpolate(f, [fv.from - 6, fv.from + 14, fv.from + fv.dur - 12, fv.from + fv.dur + 8], [0, 1, 1, 0], clamp);
  const cur = ORDER.filter((id) => S[id].from <= f).pop()!;
  const chap = CHAPTER[cur];
  const prevIds = ORDER.slice(0, ORDER.indexOf(cur));
  const prevChap = [...prevIds].reverse().map((id) => CHAPTER[id]).find((c) => c !== undefined);
  const at = chap === undefined ? (cur === 'close' ? 4 : 0) : interpolate(f - S[cur].from, [0, 20], [prevChap ?? chap, chap], { ...clamp, easing: easeInOut });
  const railVis = interpolate(f, [S.plan.from - 6, S.plan.from + 14, S.close.from, S.close.from + 16], [0, 1, 1, 0], clamp);
  const drift = 1 + 0.01 * Math.sin(f / 140);
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <Background night={night} />
      <AbsoluteFill style={{ transform: `scale(${drift}) translate(${Math.sin(f / 170) * 5}px, ${Math.cos(f / 200) * 3}px)` }}>
        <PhoneLayer />
        <Fronts />
      </AbsoluteFill>
      <ChapterRail at={at} vis={railVis} dark={night > 0.5} />
      {audio && <Audio src={staticFile('mix.wav')} />}
    </AbsoluteFill>
  );
};
