import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { Lottie } from '@remotion/lottie';
import { C, FONT, SERIF, sp, ramp, clamp, mix } from './theme';
import idle from './lottie/idle.json';
import cheer from './lottie/cheer.json';
import joy from './lottie/joy.json';
import celebrate from './lottie/celebrate.json';
import present from './lottie/present-loop.json';

/* ---------------- background ---------------- */
export const Background: React.FC<{ night: number }> = ({ night }) => {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, r: number, color: string, ph: number) => (
    <div style={{ position: 'absolute', left: x + Math.sin(f / 90 + ph) * 60, top: y + Math.cos(f / 110 + ph) * 40, width: r, height: r,
      borderRadius: '50%', background: color, filter: 'blur(120px)', opacity: 0.9 }} />
  );
  return (
    <AbsoluteFill style={{ background: '#f7f6ff', overflow: 'hidden' }}>
      {blob(-200, -260, 900, '#dcd8ff', 0)}
      {blob(1250, -320, 760, '#f1ffc2', 2)}
      {blob(700, 640, 820, '#fbe3f3', 4)}
      {blob(-120, 620, 640, '#e7e4ff', 1)}
      <AbsoluteFill style={{ background: 'radial-gradient(1200px 800px at 50% 40%, rgba(255,255,255,.55), rgba(255,255,255,0))' }} />
      <AbsoluteFill style={{ opacity: night, background: 'radial-gradient(1400px 900px at 60% 30%, #2a2580 0%, #14136b 45%, #0a0a3c 100%)' }}>
        {Array.from({ length: 46 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: (i * 397) % 1920, top: (i * 233) % 1080, width: 2 + (i % 3), height: 2 + (i % 3),
            borderRadius: 9, background: '#fff', opacity: 0.25 + 0.35 * Math.abs(Math.sin(f / 25 + i)) }} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- phone ---------------- */
export const PHONE = { w: 468, h: 966, bezel: 11, scale: 446 / 390 };
export const SCREEN_H = Math.round((PHONE.h - PHONE.bezel * 2) / PHONE.scale); // logical px
export const Phone: React.FC<{ x: number; y: number; s: number; rot?: number; tilt?: number; opacity?: number; children: React.ReactNode; dark?: boolean }> =
  ({ x, y, s, rot = 0, tilt = 0, opacity = 1, children, dark }) => (
  <div style={{ position: 'absolute', left: x - PHONE.w / 2, top: y - PHONE.h / 2, width: PHONE.w, height: PHONE.h, opacity,
    transform: `perspective(1800px) rotateY(${tilt}deg) rotate(${rot}deg) scale(${s})`, transformOrigin: '50% 50%' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: 74, background: 'linear-gradient(145deg,#2c2c3a,#0d0d14 40%,#1c1c26)',
      boxShadow: '0 60px 120px rgba(40,30,120,.28), 0 18px 40px rgba(20,20,60,.22), inset 0 0 0 2px #3c3c4c' }} />
    <div style={{ position: 'absolute', left: PHONE.bezel, top: PHONE.bezel, right: PHONE.bezel, bottom: PHONE.bezel, borderRadius: 63, overflow: 'hidden', clipPath: 'inset(0 round 63px)', isolation: 'isolate',
      background: dark ? '#0b0b1f' : C.canvas }}>
      <div style={{ width: 390, height: SCREEN_H, transform: `scale(${PHONE.scale})`, transformOrigin: '0 0', position: 'relative', fontFamily: FONT, color: C.ink }}>
        {children}
      </div>
    </div>
    <div style={{ position: 'absolute', left: '50%', top: 24, width: 122, height: 34, marginLeft: -61, borderRadius: 20, background: '#000' }} />
  </div>
);

/* ---------------- copy block (left) ---------------- */
export const Copy: React.FC<{ f: number; tag: string; a: string; b: string; body?: string; x?: number; y?: number; out?: number; dark?: boolean; size?: number }> =
  ({ f, tag, a, b, body, x = 120, y = 340, out = 1, dark, size = 66 }) => {
  const k = (d: number) => sp(f, d);
  const line = (d: number, children: React.ReactNode, extra: React.CSSProperties = {}) => (
    <div style={{ opacity: k(d) * out, transform: `translateY(${(1 - k(d)) * 26 + (1 - out) * -16}px)`, filter: `blur(${(1 - k(d)) * 6}px)`, ...extra }}>{children}</div>
  );
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 600, fontFamily: FONT, color: dark ? '#fff' : C.ink }}>
      {line(0, <Tag dark={dark}>{tag}</Tag>, { marginBottom: 26 })}
      {line(4, <div style={{ fontSize: size, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1.04 }}>{a}</div>)}
      {line(9, <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: size * 1.12, color: dark ? '#b9b2ff' : C.brand, lineHeight: 1.08, letterSpacing: '-0.01em' }}>{b}</div>)}
      {body && line(15, <div style={{ fontSize: 23, lineHeight: 1.45, color: dark ? 'rgba(255,255,255,.72)' : C.ink5, marginTop: 24, maxWidth: 470 }}>{body}</div>)}
    </div>
  );
};
export const Tag: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 18px 9px 10px', borderRadius: 999,
    background: dark ? 'rgba(255,255,255,.12)' : '#fff', boxShadow: dark ? 'none' : '0 1px 0 rgba(20,20,60,.04), 0 6px 18px rgba(60,50,160,.08)',
    fontSize: 18, fontWeight: 600, color: dark ? '#e6e3ff' : C.ink7, letterSpacing: '-0.005em' }}>
    <span style={{ width: 26, height: 26, borderRadius: 13, background: C.brand, display: 'grid', placeItems: 'center' }}>
      <span style={{ width: 9, height: 9, borderRadius: 5, background: '#fff' }} />
    </span>{children}
  </span>
);

/* ---------------- floating card ---------------- */
export const Float: React.FC<{ f: number; d: number; x: number; y: number; w?: number; out?: number; children: React.ReactNode; rot?: number; dark?: boolean; pad?: number }> =
  ({ f, d, x, y, w = 380, out = 1, children, rot = 0, dark, pad = 20 }) => {
  const k = sp(f, d, { damping: 16, stiffness: 140 });
  const bob = Math.sin((f + d * 7) / 38) * 4;
  return (
    <div style={{ position: 'absolute', left: x, top: y + bob, width: w, opacity: Math.min(1, k * 1.4) * out,
      transform: `translateY(${(1 - k) * 40}px) scale(${0.92 + 0.08 * k}) rotate(${rot * k}deg)`, transformOrigin: '0% 50%',
      background: dark ? 'rgba(255,255,255,.08)' : '#fff', borderRadius: 22, padding: pad, fontFamily: FONT, color: dark ? '#fff' : C.ink,
      boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,.12)' : '0 1px 0 rgba(20,20,60,.04), 0 24px 60px rgba(60,50,160,.14), 0 4px 14px rgba(60,50,160,.06)' }}>
      {children}
    </div>
  );
};

/* ---------------- people and mascot ---------------- */
export const AV = { arjun: 'v14', meera: 'v13', tara: 'v16', dadi: 'v07', dadu: 'v10' } as const;
export const Avatar: React.FC<{ who: keyof typeof AV; size?: number; ring?: string; style?: React.CSSProperties }> = ({ who, size = 40, ring, style }) => (
  <Img src={staticFile(`img/${AV[who]}.png`)} style={{ width: size, height: size, borderRadius: size, objectFit: 'cover', boxShadow: ring ? `0 0 0 3px ${ring}` : undefined, ...style }} />
);
const LOT = { idle, cheer, joy, celebrate, present } as const;
export const Mascot: React.FC<{ pose: keyof typeof LOT; w: number; style?: React.CSSProperties; rate?: number; loop?: boolean }> = ({ pose, w, style, rate = 1, loop = true }) => {
  const a = LOT[pose] as unknown as { w: number; h: number };
  return (
    <div style={{ width: w, height: (w * a.h) / a.w, ...style }}>
      <Lottie animationData={LOT[pose] as any} loop={loop} playbackRate={rate} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
export const Still: React.FC<{ name: string; w: number; style?: React.CSSProperties }> = ({ name, w, style }) => (
  <Img src={staticFile(`img/${name}.png`)} style={{ width: w, ...style }} />
);

/* ---------------- tap ripple (screen coords, logical px) ---------------- */
export const Tap: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  const t = f - at; if (t < -6 || t > 22) return null;
  const pre = interpolate(t, [-6, 0], [0, 1], clamp);
  const k = interpolate(t, [0, 22], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 30, pointerEvents: 'none', zIndex: 50,
      background: `rgba(91,78,240,${0.28 * pre * (1 - k)})`, transform: `scale(${t < 0 ? 0.8 + 0.2 * pre : 1 + k * 1.1})`,
      boxShadow: `0 0 0 ${2 + 6 * k}px rgba(91,78,240,${0.35 * (1 - k)})` }} />
  );
};

/* ---------------- chapter rail ---------------- */
export const CHAPTERS = ['Planning', 'Pregnancy', 'Baby', 'Every care', 'Longer lives'];
export const ChapterRail: React.FC<{ at: number; vis: number; dark?: boolean }> = ({ at, vis, dark }) => (
  <div style={{ position: 'absolute', top: 44, left: '50%', transform: `translateX(-50%) translateY(${(1 - vis) * -30}px)`, opacity: vis,
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, fontFamily: FONT,
    background: dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.72)', backdropFilter: 'blur(12px)',
    boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,.12)' : '0 8px 30px rgba(60,50,160,.10)' }}>
    {CHAPTERS.map((c, i) => {
      const on = mix(0, 1, Math.max(0, Math.min(1, at - i + 1)));
      const cur = Math.max(0, 1 - Math.abs(at - i));
      return (
        <React.Fragment key={c}>
          {i > 0 && <div style={{ width: 34, height: 2, borderRadius: 2, background: dark ? 'rgba(255,255,255,.18)' : C.line, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(1, at - i + 1)) * 100}%`, height: '100%', background: dark ? '#b9b2ff' : C.brand }} /></div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999,
            background: `rgba(91,78,240,${0.12 * cur})`, color: on > 0.5 ? (dark ? '#fff' : C.ink) : (dark ? 'rgba(255,255,255,.5)' : C.ink3),
            fontSize: 16, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 6, background: on > 0.5 ? (dark ? '#b9b2ff' : C.brand) : (dark ? 'rgba(255,255,255,.25)' : C.brand200),
              boxShadow: cur > 0.5 ? `0 0 0 ${3 + 2 * Math.sin(at * 6)}px rgba(91,78,240,.18)` : 'none' }} />
            {c}
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; bg?: string; fg?: string; style?: React.CSSProperties }> = ({ children, bg = C.brand50, fg = C.brand700, style }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 600, ...style }}>{children}</span>
);
