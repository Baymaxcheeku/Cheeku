import React from 'react';
import { OffthreadVideo, Sequence, staticFile, interpolate, useCurrentFrame } from 'remotion';
import { clamp, easeOut, FONT } from './theme';
import colors from './colors.json';
import events from './events.json';

/*
 * iPhone 15 Pro at true proportions: a 393 x 852 pt screen, the app recorded at
 * 393 x 778 and placed under a 54 pt status bar, with a 20 pt home-indicator
 * strip below it. Nothing is stretched: the recording keeps its own aspect.
 */
export const SCR = { w: 393, h: 852, top: 54, app: 778, bottom: 20, radius: 55 };
const BEZEL = 13;
export const BODY = { w: SCR.w + BEZEL * 2, h: SCR.h + BEZEL * 2, radius: SCR.radius + BEZEL };

type Pose = { x: number; y: number; s: number; rot?: number; tilt?: number; opacity?: number };

export const IPhone: React.FC<Pose & { children: React.ReactNode; bar: [number, number, number]; foot: [number, number, number]; dark?: boolean }> = ({ x, y, s, rot = 0, tilt = 0, opacity = 1, children, bar, foot }) => {
  const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const lum = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const ink = lum(bar) < 110 ? '#fff' : '#0b0b14';
  return (
    <div style={{ position: 'absolute', left: x - BODY.w / 2, top: y - BODY.h / 2, width: BODY.w, height: BODY.h, opacity,
      transform: `perspective(2200px) rotateY(${tilt}deg) rotate(${rot}deg) scale(${s})`, transformOrigin: '50% 50%' }}>
      {/* side buttons */}
      {[[-3, 170, 30], [-3, 228, 58], [-3, 298, 58]].map(([l, t, h], i) => (
        <div key={i} style={{ position: 'absolute', left: l, top: t, width: 4, height: h, borderRadius: 2, background: 'linear-gradient(90deg,#5d5e66,#2a2b31)' }} />
      ))}
      <div style={{ position: 'absolute', right: -3, top: 250, width: 4, height: 92, borderRadius: 2, background: 'linear-gradient(90deg,#2a2b31,#5d5e66)' }} />
      {/* titanium frame */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: BODY.radius,
        background: 'linear-gradient(135deg,#8d8e96 0%,#3b3c43 18%,#1d1e23 50%,#3b3c43 82%,#9a9ba3 100%)',
        boxShadow: '0 70px 140px rgba(40,30,120,.30), 0 24px 50px rgba(20,20,60,.22)' }} />
      <div style={{ position: 'absolute', inset: 2.5, borderRadius: BODY.radius - 2.5, background: '#07070a' }} />
      {/* screen */}
      <div style={{ position: 'absolute', left: BEZEL, top: BEZEL, width: SCR.w, height: SCR.h, borderRadius: SCR.radius, overflow: 'hidden', isolation: 'isolate',
        clipPath: `inset(0 round ${SCR.radius}px)`, background: rgb(bar) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: SCR.w, height: SCR.top, background: rgb(bar) }} />
        <div style={{ position: 'absolute', left: 0, top: SCR.top + SCR.app, width: SCR.w, height: SCR.bottom, background: rgb(foot) }} />
        <div style={{ position: 'absolute', left: 0, top: SCR.top, width: SCR.w, height: SCR.app, overflow: 'hidden' }}>{children}</div>
        <StatusBar ink={ink} />
        <div style={{ position: 'absolute', left: (SCR.w - 134) / 2, bottom: 7, width: 134, height: 5, borderRadius: 3, background: lum(foot) < 110 ? '#fff' : '#0b0b14' }} />
        {/* glass sheen */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 32%)', pointerEvents: 'none' }} />
      </div>
      {/* dynamic island */}
      <div style={{ position: 'absolute', left: BEZEL + (SCR.w - 124) / 2, top: BEZEL + 11, width: 124, height: 36, borderRadius: 20, background: '#000' }}>
        <div style={{ position: 'absolute', right: 22, top: 12, width: 12, height: 12, borderRadius: 6, background: 'radial-gradient(circle at 35% 35%, #2b3550, #05060a 70%)' }} />
      </div>
    </div>
  );
};

const StatusBar: React.FC<{ ink: string }> = ({ ink }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: SCR.w, height: SCR.top, fontFamily: FONT, color: ink }}>
    <div style={{ position: 'absolute', left: 52, top: 17, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>9:41</div>
    <div style={{ position: 'absolute', right: 34, top: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="19" height="12" viewBox="0 0 19 12">{[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5} y={9 - i * 3} width="3.4" height={3 + i * 3} rx="1" fill={ink} />)}</svg>
      <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.2c2.5 0 4.7 1 6.4 2.6l1.1-1.2C14 1.7 11.4.6 8.5.6S3 1.7 1 3.6l1.1 1.2C3.8 3.2 6 2.2 8.5 2.2zm0 3.4c1.5 0 2.9.6 4 1.6l1.1-1.2C12.2 4.7 10.4 4 8.5 4S4.8 4.7 3.4 6l1.1 1.2c1.1-1 2.5-1.6 4-1.6zm0 3.4c.6 0 1.2.2 1.6.6L8.5 11.4 6.9 9.6c.4-.4 1-.6 1.6-.6z" fill={ink} /></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.6" stroke={ink} strokeOpacity=".4" fill="none" /><rect x="2" y="2" width="20" height="9" rx="2.2" fill={ink} /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill={ink} fillOpacity=".45" /></svg>
    </div>
  </div>
);

/* ---------------- clip segments ---------------- */
export type Seg = { clip: string; from: number; to: number; rate?: number };
const FPS = 30;
export const segLen = (s: Seg) => Math.round(((s.to - s.from) / (s.rate ?? 1)) * FPS);
type Ev = { duration: number; events: { type: string; x?: number; y?: number; t: number; name?: string }[] };
const EV = events as Record<string, Ev>;
const COL = colors as Record<string, { t: number; top: number[]; bot: number[] }[]>;

/** Which segment and source time a local frame lands on. */
export function locate(segs: Seg[], f: number) {
  let start = 0;
  for (let i = 0; i < segs.length; i++) {
    const L = segLen(segs[i]);
    if (f < start + L || i === segs.length - 1) {
      const s = segs[i]; const t = Math.min(s.to, s.from + ((f - start) / FPS) * (s.rate ?? 1));
      return { i, start, t, seg: s };
    }
    start += L;
  }
  return { i: 0, start: 0, t: segs[0].from, seg: segs[0] };
}
export function barColors(segs: Seg[], f: number): { top: [number, number, number]; bot: [number, number, number] } {
  const { seg, t } = locate(segs, Math.max(0, f));
  const arr = COL[seg.clip] ?? [];
  let best = arr[0];
  for (const c of arr) if (Math.abs(c.t - t) < Math.abs((best?.t ?? 1e9) - t)) best = c;
  return { top: (best?.top ?? [240, 238, 254]) as [number, number, number], bot: (best?.bot ?? [250, 250, 254]) as [number, number, number] };
}

const XF = 6; // crossfade frames between cuts inside a scene
/** Plays a scene's segments back to back inside the screen, with soft cuts and tap ripples. */
export const ClipPlayer: React.FC<{ segs: Seg[]; total: number }> = ({ segs, total }) => {
  const f = useCurrentFrame();
  let start = 0;
  const parts: React.ReactNode[] = [];
  segs.forEach((s, i) => {
    const L = segLen(s); const last = i === segs.length - 1;
    const len = last ? Math.max(L, total - start) + 12 : L + XF;
    const lf = f - start;
    const fadeIn = i === 0 ? 1 : interpolate(lf, [0, XF], [0, 1], { ...clamp, easing: easeOut });
    const blur = i === 0 ? 0 : (1 - fadeIn) * 6;
    const srcEnd = Math.min(EV[s.clip]?.duration ?? s.to + 1, s.to + (len - L) / FPS * (s.rate ?? 1));
    parts.push(
      <Sequence key={i} from={start} durationInFrames={len} layout="none">
        <div style={{ position: 'absolute', inset: 0, opacity: fadeIn, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
          <OffthreadVideo src={staticFile(`clips/${s.clip}.mp4`)} startFrom={Math.round(s.from * FPS)} endAt={Math.max(Math.round(s.from * FPS) + 2, Math.round(srcEnd * FPS))} playbackRate={s.rate ?? 1} muted
            style={{ width: SCR.w, height: SCR.app, display: 'block' }} />
          <Taps clip={s.clip} from={s.from} to={s.to} rate={s.rate ?? 1} />
        </div>
      </Sequence>,
    );
    start += L;
  });
  return <>{parts}</>;
};

const Taps: React.FC<{ clip: string; from: number; to: number; rate: number }> = ({ clip, from, to, rate }) => {
  const f = useCurrentFrame();
  const taps = (EV[clip]?.events ?? []).filter((e) => e.type === 'tap' && e.t >= from - 0.05 && e.t <= to);
  return (
    <>
      {taps.map((e, i) => {
        const at = ((e.t - from) / rate) * FPS; const t = f - at;
        if (t < -5 || t > 20) return null;
        const pre = interpolate(t, [-5, 0], [0, 1], clamp); const k = interpolate(t, [0, 20], [0, 1], clamp);
        const x = (e.x ?? 0) * SCR.w, y = (e.y ?? 0) * SCR.app;
        return <div key={i} style={{ position: 'absolute', left: x - 24, top: y - 24, width: 48, height: 48, borderRadius: 30, pointerEvents: 'none',
          background: `rgba(30,24,90,${0.16 * pre * (1 - k)})`, transform: `scale(${t < 0 ? 0.75 + 0.25 * pre : 1 + k * 0.9})`,
          boxShadow: `0 0 0 ${2 + 5 * k}px rgba(255,255,255,${0.7 * (1 - k)}), 0 0 0 ${3 + 7 * k}px rgba(91,78,240,${0.35 * (1 - k)})` }} />;
      })}
    </>
  );
};
