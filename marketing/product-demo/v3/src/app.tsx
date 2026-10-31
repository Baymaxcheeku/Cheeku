// Cheeku app UI, rebuilt from the app's tokens (390pt logical width). Shapes and copy follow mobile-react-native.
import React from 'react';
import { Img, staticFile, interpolate } from 'remotion';
import { Home, FileText, Plus, MessageCircle, User, ChevronLeft, Mic, ArrowUp, Signal, Wifi, BatteryFull, ChevronDown } from 'lucide-react';
import { C, FONT, SERIF, clamp, easeOut, sp } from './theme';
import { SCREEN_H, Avatar, AV } from './kit';

export const Status: React.FC<{ dark?: boolean; time?: string }> = ({ dark, time = '9:41' }) => (
  <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 30px 0 34px', fontSize: 15, fontWeight: 600, color: dark ? '#fff' : C.ink }}>
    <span>{time}</span>
    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Signal size={15} strokeWidth={2.6} /><Wifi size={15} strokeWidth={2.6} /><BatteryFull size={20} strokeWidth={2} /></span>
  </div>
);

export const Tabs: React.FC<{ on?: 'home' | 'records' | 'ask' | 'me' }> = ({ on = 'home' }) => {
  const it = (k: string, label: string, Icon: React.ComponentType<any>) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 64, color: on === k ? C.brand : C.ink3, fontSize: 10.5, fontWeight: 600 }}>
      <Icon size={21} strokeWidth={on === k ? 2.4 : 2} />{label}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: 'rgba(255,255,255,.92)', borderTop: `1px solid ${C.line}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 10 }}>
      {it('home', 'Home', Home)}{it('records', 'Records', FileText)}
      <div style={{ width: 46, height: 46, borderRadius: 23, background: C.ink, color: '#fff', display: 'grid', placeItems: 'center', marginTop: -4 }}><Plus size={22} strokeWidth={2.6} /></div>
      {it('ask', 'Ask Cheeku', MessageCircle)}{it('me', 'Profile', User)}
    </div>
  );
};

export const Bar: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 10px' }}>
    <div style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', boxShadow: `0 0 0 1px ${C.line}`, display: 'grid', placeItems: 'center' }}><ChevronLeft size={20} /></div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.ink5 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

export const Face: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <div style={{ width: size, height: size, borderRadius: size, background: C.brand50, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
    <Img src={staticFile('img/face.png')} style={{ width: size * 0.92, marginTop: size * 0.18 }} />
  </div>
);

export const ChatTop: React.FC<{ who: keyof typeof AV; name: string; f?: number; switchAt?: number; from?: keyof typeof AV; fromName?: string }> = ({ who, name, f = 0, switchAt, from, fromName }) => {
  const k = switchAt == null ? 1 : interpolate(f, [switchAt, switchAt + 10], [0, 1], { ...clamp, easing: easeOut });
  const cur = k < 0.5 && from ? from : who; const curName = k < 0.5 && fromName ? fromName : name;
  return (
    <div style={{ padding: '4px 16px 10px', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Face size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Cheeku</div>
          <div style={{ fontSize: 12, color: C.ink5 }}>{curName}'s health memory</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', borderRadius: 999, background: C.brand50, fontSize: 13, fontWeight: 600, color: C.brand700,
          transform: `scale(${1 + 0.08 * Math.sin(Math.PI * k)})` }}>
          <Avatar who={cur} size={24} /> Asking for {curName} <ChevronDown size={14} />
        </div>
        <div style={{ padding: '5px 10px', borderRadius: 999, background: '#fff', boxShadow: `0 0 0 1px ${C.line}`, fontSize: 12.5, color: C.ink5, fontWeight: 500 }}>Memory on</div>
      </div>
    </div>
  );
};

export const Me: React.FC<{ children: React.ReactNode; f: number; at: number }> = ({ children, f, at }) => {
  const k = sp(f, at, { damping: 18, stiffness: 160 });
  if (f < at - 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 16px', opacity: k, transform: `translateY(${(1 - k) * 14}px) scale(${0.96 + 0.04 * k})`, transformOrigin: '100% 100%' }}>
      <div style={{ maxWidth: 290, background: C.brand, color: '#fff', padding: '10px 14px', borderRadius: '20px 20px 6px 20px', fontSize: 14.5, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
};

export const Bot: React.FC<{ children: React.ReactNode; f: number; at: number; style?: React.CSSProperties }> = ({ children, f, at, style }) => {
  const k = sp(f, at, { damping: 20, stiffness: 140 });
  if (f < at - 1) return null;
  return (
    <div style={{ display: 'flex', gap: 8, margin: '10px 16px', opacity: k, transform: `translateY(${(1 - k) * 12}px)`, ...style }}>
      <Face size={26} />
      <div style={{ flex: 1, fontSize: 14.5, lineHeight: 1.45, color: C.ink }}>{children}</div>
    </div>
  );
};

/** Thinking dots, shown from `from` to `to`. */
export const Dots: React.FC<{ f: number; from: number; to: number }> = ({ f, from, to }) => {
  if (f < from || f >= to) return null;
  return (
    <div style={{ display: 'flex', gap: 8, margin: '10px 16px', alignItems: 'center' }}>
      <Face size={26} />
      <div style={{ display: 'flex', gap: 5, padding: '10px 12px', background: '#fff', borderRadius: 14, boxShadow: `0 0 0 1px ${C.line}` }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: C.brand400, opacity: 0.35 + 0.65 * Math.max(0, Math.sin((f - from) / 4 - i * 0.9)) }} />)}
      </div>
    </div>
  );
};

/** Reveal children one by one (stream feel). */
export const Stream: React.FC<{ f: number; at: number; gap?: number; items: React.ReactNode[] }> = ({ f, at, gap = 9, items }) => (
  <>{items.map((it, i) => {
    const k = sp(f, at + i * gap, { damping: 22, stiffness: 150 });
    if (f < at + i * gap - 1) return null;
    return <div key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 8}px)` }}>{it}</div>;
  })}</>
);

export const Composer: React.FC<{ text?: string; caret?: boolean; dark?: boolean }> = ({ text = '', caret, dark }) => (
  <div style={{ position: 'absolute', left: 12, right: 12, bottom: 18, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 8px 16px', borderRadius: 26,
    background: dark ? '#1b1b44' : '#fff', boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,.12)' : `0 0 0 1px ${C.line}, 0 8px 22px rgba(60,50,160,.08)` }}>
    <div style={{ flex: 1, fontSize: 14.5, color: text ? (dark ? '#fff' : C.ink) : C.ink3, minHeight: 20, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {text || 'Ask, or tell me what’s going on'}{caret && <span style={{ display: 'inline-block', width: 2, height: 17, background: C.brand, marginLeft: 1, verticalAlign: -3 }} />}
    </div>
    <Mic size={19} color={C.ink5} />
    <div style={{ width: 34, height: 34, borderRadius: 17, background: text ? C.brand : C.ink, color: '#fff', display: 'grid', placeItems: 'center' }}><ArrowUp size={18} strokeWidth={2.6} /></div>
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 20, padding: 14, boxShadow: `0 0 0 1px ${C.line}, 0 6px 18px rgba(60,50,160,.05)`, ...style }}>{children}</div>
);
export const Btn: React.FC<{ children: React.ReactNode; dark?: boolean; ghost?: boolean; style?: React.CSSProperties; done?: number }> = ({ children, dark, ghost, style, done = 0 }) => (
  <div style={{ height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14.5, fontWeight: 600,
    background: ghost ? '#fff' : done > 0.5 ? C.safe : dark ? C.ink : C.brand, color: ghost ? C.ink : '#fff', boxShadow: ghost ? `0 0 0 1px ${C.line}` : 'none', ...style }}>{children}</div>
);
export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ink5, ...style }}>{children}</div>
);
export const Serif: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 30, color = C.brand }) => (
  <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: size, color, letterSpacing: '-0.01em' }}>{children}</span>
);
export const Dot: React.FC<{ c: string; s?: number }> = ({ c, s = 8 }) => <span style={{ display: 'inline-block', width: s, height: s, borderRadius: s, background: c, flex: 'none' }} />;

/** iOS-style push between screens inside the phone. `pages` = [startFrame, element][] */
export const Push: React.FC<{ f: number; pages: [number, React.ReactNode][]; dur?: number }> = ({ f, pages, dur = 16 }) => {
  let cur = 0; pages.forEach(([s], i) => { if (f >= s) cur = i; });
  const [s] = pages[cur];
  const k = cur === 0 ? 1 : interpolate(f, [s, s + dur], [0, 1], { ...clamp, easing: easeOut });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {cur > 0 && k < 1 && <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-30 * k}%)`, filter: `brightness(${1 - 0.06 * k})` }}>{pages[cur - 1][1]}</div>}
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - k) * 100}%)`, boxShadow: k < 1 ? '-20px 0 40px rgba(20,20,60,.12)' : 'none', background: C.canvas }}>{pages[cur][1]}</div>
    </div>
  );
};

export const Screen: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.canvas }) => (
  <div style={{ position: 'absolute', inset: 0, height: SCREEN_H, background: bg, fontFamily: FONT, overflow: 'hidden' }}>{children}</div>
);
