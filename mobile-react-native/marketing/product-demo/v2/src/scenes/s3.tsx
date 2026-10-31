import React from 'react';
import { interpolate, Img, staticFile } from 'remotion';
import { Check, Dumbbell, Smile, Eye, Activity, Home as HomeI, Ambulance, ShieldCheck, Stethoscope, FlaskConical, Pill as PillI, Brain, FileText, CalendarCheck, Footprints, Moon, Utensils, Syringe, HeartHandshake, Sparkles, ArrowRight } from 'lucide-react';
import { C, FONT, SERIF, sp, ramp, clamp, easeInOut, easeOut, mix } from '../theme';
import { Copy, Float, Avatar, Mascot, Still, Tap, Pill, AV } from '../kit';
import { Status, Tabs, Card, Btn, Label, Serif, Dot, Screen, Face, Bar, Push } from '../app';
import { HomeScreen } from './s1';
import { Scene, SceneProps, wt, outro } from './common';

/* ============ EVERY CARE ============ */
type Svc = { t: string; img?: string; Icon?: React.ComponentType<any>; c: string; word: string; soon?: boolean };
const SVC: Svc[] = [
  { t: 'Doctors', img: 'doctor', c: '#5b4ef0', word: 'Doctors' },
  { t: 'Lab tests', img: 'lab', c: '#0a9396', word: 'labs' },
  { t: 'Medicines', img: 'medicines', c: '#2e8b57', word: 'medicines' },
  { t: 'Mental health', img: 'therapy', c: '#c8417f', word: 'therapy' },
  { t: 'Dental', Icon: Smile, c: '#2f6fde', word: 'dental' },
  { t: 'Eye care', Icon: Eye, c: '#0a9396', word: 'eyes' },
  { t: 'Physiotherapy', Icon: Activity, c: '#d9822b', word: 'physio' },
  { t: 'Home care', Icon: HomeI, c: '#5b4ef0', word: 'home care' },
  { t: 'Ambulance', Icon: Ambulance, c: '#ea2a36', word: 'ambulance' },
  { t: 'Fitness', Icon: Dumbbell, c: '#2e8b57', word: 'ambulance' },
  { t: 'Specialists', img: 'specialist', c: '#3b2bc9', word: 'ambulance' },
  { t: 'Health insurance', Icon: ShieldCheck, c: '#2b5fb8', word: 'ambulance', soon: true },
];
const Tile: React.FC<{ s: Svc; size?: number }> = ({ s, size = 34 }) => (
  <>{s.img ? <Img src={staticFile(`img/${s.img}.png`)} style={{ width: size + 8, height: size + 8, objectFit: 'contain' }} />
    : s.Icon ? <div style={{ width: size + 8, height: size + 8, borderRadius: 14, background: `${s.c}18`, display: 'grid', placeItems: 'center' }}><s.Icon size={size * 0.62} color={s.c} strokeWidth={2.2} /></div> : null}</>
);
const Hub: React.FC<{ f: number }> = ({ f }) => (
  <Screen>
    <Status />
    <div style={{ padding: '4px 18px 8px' }}><div style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.03em' }}>Book services</div><div style={{ fontSize: 13, color: C.ink5 }}>For anyone in the family, at home or nearby</div></div>
    {[['Everyday care', [0, 1, 2, 9]], ['Mind and body', [3, 4, 5, 6]], ['At home and on the way', [7, 8, 10, 11]]].map(([h, ids], j) => (
      <div key={h as string} style={{ padding: '6px 16px' }}>
        <Label style={{ margin: '8px 0 8px' }}>{h as string}</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {(ids as number[]).map((i, n) => { const k = sp(f, 4 + j * 6 + n * 2); return (
            <div key={i} style={{ background: '#fff', borderRadius: 16, boxShadow: `0 0 0 1px ${C.line}`, padding: '10px 2px', textAlign: 'center', fontSize: 10.5, fontWeight: 600, opacity: k, position: 'relative' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 4 }}><Tile s={SVC[i]} size={26} /></div>{SVC[i].t}
              {SVC[i].soon && <div style={{ position: 'absolute', top: -6, right: -2 }}><Pill bg={C.lime} fg={C.limeInk} style={{ fontSize: 8.5, padding: '2px 6px' }}>Soon</Pill></div>}
            </div>); })}
        </div>
      </div>))}
    <Tabs on="home" />
  </Screen>
);
const Bookings: React.FC<{ f: number }> = ({ f }) => {
  const rows: [keyof typeof AV, string, string, number][] = [['tara', '10-week vaccines', 'Home visit · Fri 10 am', 3], ['meera', 'Postnatal physio', 'Session 3 of 6 · Tue', 2], ['arjun', 'Vitamin D retest', 'Home collection · Sat', 1], ['meera', 'Talk to a psychologist', 'Online · Thu 8 pm', 1], ['tara', 'Paediatrician follow-up', 'Video · done', 4]];
  const st = ['Booked', 'Confirmed', 'On the way', 'Done', 'Filed'];
  return (
    <Screen>
      <Status />
      <div style={{ padding: '4px 18px 10px' }}><div style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.03em' }}>Care for the family</div><div style={{ fontSize: 13, color: C.ink5 }}>Every booking, every person, one list</div></div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(([w, a, b, s], i) => { const k = sp(f, 4 + i * 5); const live = Math.min(4, s + (f > 50 && i === 0 ? 1 : 0));
          return <Card key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, opacity: k, transform: `translateX(${(1 - k) * 20}px)` }}>
            <Avatar who={w} size={34} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{a}</div><div style={{ fontSize: 12, color: C.ink5 }}>{b}</div></div>
            <Pill bg={live >= 3 ? C.safeBg : C.brand50} fg={live >= 3 ? C.safeText : C.brand700}>{st[live]}</Pill></Card>; })}
      </div>
      <Tabs on="home" />
    </Screen>
  );
};
const CareScreen: React.FC<SceneProps> = ({ f, vo }) => <Push f={f} pages={[[0, <Hub f={f} />], [vo[1].from - 6, <Bookings f={f - vo[1].from + 6} />]]} />;
const CareFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur); const v = vo[0];
  const tail = wt(v, 'ambulance') + 14;
  const pipeAt = vo[1].from + 10;
  const steps = ['Booked', 'Confirmed', 'On the way', 'Done', 'Back in the memory'];
  const prog = interpolate(f, [pipeAt + 10, pipeAt + 110], [0, 4], clamp);
  return (
    <>
      <Copy f={f} tag="Every service" a="Every kind of care." b="One app." size={54} body="Book for anyone in the family. Every result and every note comes home to their file." out={out} />
      {SVC.map((s, i) => {
        const at = s.word === 'ambulance' && i > 8 ? tail + (i - 9) * 5 : wt(v, s.word) - 4;
        const k = sp(f, at, { damping: 14, stiffness: 150 });
        const col = i % 3, row = Math.floor(i / 3);
        const gx = 1190 + col * 196, gy = 190 + row * 150;
        const shrink = ramp(f, pipeAt - 6, pipeAt + 14);
        return (
          <div key={s.t} style={{ position: 'absolute', left: mix(900, gx, k), top: mix(540, gy, k) - shrink * 30, width: 176, height: 130, opacity: Math.min(1, k * 1.5) * out * (1 - 0.35 * shrink),
            transform: `scale(${(0.4 + 0.6 * k) * (1 - 0.12 * shrink)})`, background: '#fff', borderRadius: 22, boxShadow: '0 18px 40px rgba(60,50,160,.12)', fontFamily: FONT,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Tile s={s} size={40} /><div style={{ fontSize: 18, fontWeight: 600, color: C.ink }}>{s.t}</div>
            {s.soon && <div style={{ position: 'absolute', top: 10, right: 10 }}><Pill bg={C.lime} fg={C.limeInk}>Coming soon</Pill></div>}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 1190, top: 820, width: 580, opacity: sp(f, pipeAt) * out, transform: `translateY(${(1 - sp(f, pipeAt)) * 30}px)`, fontFamily: FONT,
        background: '#fff', borderRadius: 24, padding: '18px 22px', boxShadow: '0 24px 60px rgba(60,50,160,.16)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 600 }}><Avatar who="tara" size={28} />Tara · 10-week vaccines</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div style={{ flex: 1, height: 3, background: C.line, margin: '0 4px', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(1, prog - i + 1)) * 100}%`, height: '100%', background: C.brand }} /></div>}
              <div style={{ width: 26, height: 26, borderRadius: 13, display: 'grid', placeItems: 'center', background: prog >= i ? (i === 4 ? C.safe : C.brand) : C.brand50, transform: `scale(${1 + 0.25 * Math.max(0, 1 - Math.abs(prog - i) * 3)})` }}>
                {prog >= i && <Check size={15} color="#fff" strokeWidth={3} />}</div>
            </React.Fragment>))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5, color: C.ink5, fontWeight: 600 }}>{steps.map(s => <span key={s} style={{ width: 92, textAlign: 'center' }}>{s}</span>)}</div>
      </div>
    </>
  );
};
export const care: Scene = { front: CareFront, screen: CareScreen };

/* ============ LONGEVITY ENGINE ============ */
const INPUTS: [string, React.ComponentType<any>][] = [['Reports', FileText], ['Bookings', CalendarCheck], ['Medicines', PillI], ['Vaccines', Syringe], ['Meals', Utensils], ['Steps', Footprints], ['Sleep', Moon], ['Check-ins', HeartHandshake]];
const OUT: [keyof typeof AV, string, string, string][] = [
  ['arjun', 'Arjun', '10-minute walk after dinner', 'Vitamin D retest · booked for March'],
  ['meera', 'Meera', 'Pelvic floor, 5 minutes', 'Iron with lemon at lunch'],
  ['tara', 'Tara', 'Tummy time, 3 short sessions', '10-week vaccines · Fri, booked'],
];
const EngineFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur, 14); const tOut = vo[1].from, tBook = wt(vo[1], 'next check-up');
  const cx = 960, cy = 590, R = 170;
  const head = sp(f, 0);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out, fontFamily: FONT }}>
      <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', opacity: head, transform: `translateY(${(1 - head) * 20}px)` }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.brand, letterSpacing: '.08em' }}>THE LONGEVITY ENGINE</div>
        <div style={{ fontSize: 56, fontWeight: 500, letterSpacing: '-0.035em', marginTop: 6 }}>Everything they do <span style={{ fontFamily: SERIF, fontStyle: 'italic', color: C.brand, fontSize: 64 }}>makes tomorrow better.</span></div>
      </div>
      {/* wires */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {INPUTS.map((_, i) => {
          const y = 330 + i * 72, x0 = 520, d = `M${x0} ${y} C ${x0 + 200} ${y}, ${cx - 260} ${cy}, ${cx - R + 10} ${cy}`;
          const k = ramp(f, 8 + i * 3, 30 + i * 3);
          return <g key={i}><path d={d} stroke={C.brand200} strokeWidth={2} fill="none" strokeDasharray="900" strokeDashoffset={900 * (1 - k)} />
            {[0, 1, 2].map(p => { const t = ((f - 20 - i * 5 + p * 30) % 90) / 90; if (f < 24 + i * 3 || t < 0) return null;
              const bx = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * (x0 + 200) + 3 * (1 - t) * t * t * (cx - 260) + t ** 3 * (cx - R + 10);
              const by = (1 - t) ** 3 * y + 3 * (1 - t) ** 2 * t * y + 3 * (1 - t) * t * t * cy + t ** 3 * cy;
              return <circle key={p} cx={bx} cy={by} r={5} fill={C.brand} opacity={Math.sin(t * Math.PI)} />; })}</g>;
        })}
        {OUT.map((_, i) => {
          const y = 400 + i * 190, x1 = 1300, d = `M${cx + R - 10} ${cy} C ${cx + 220} ${cy}, ${x1 - 160} ${y}, ${x1} ${y}`;
          const k = ramp(f, tOut - 10 + i * 6, tOut + 14 + i * 6);
          return <path key={i} d={d} stroke={C.brand300} strokeWidth={2.5} fill="none" strokeDasharray="700" strokeDashoffset={700 * (1 - k)} />;
        })}
        {/* loop back to bookings */}
        {(() => { const k = ramp(f, tBook + 10, tBook + 50); const d = `M1560 ${400 + 2 * 190 + 70} C 1560 1060, 360 1060, 360 ${330 + 72 + 24}`;
          return <path d={d} stroke={C.lime} strokeWidth={4} fill="none" strokeDasharray="2600" strokeDashoffset={2600 * (1 - k)} strokeLinecap="round" />; })()}
      </svg>
      {/* inputs */}
      {INPUTS.map(([t, I], i) => { const k = sp(f, 4 + i * 3); return (
        <div key={t} style={{ position: 'absolute', left: 300, top: 330 + i * 72 - 26, width: 220, height: 52, borderRadius: 16, background: '#fff', boxShadow: '0 10px 26px rgba(60,50,160,.10)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', fontSize: 19, fontWeight: 600, opacity: k, transform: `translateX(${(1 - k) * -40}px)` }}>
          <I size={22} color={C.brand} />{t}</div>); })}
      {/* core */}
      {(() => { const k = sp(f, 6, { damping: 12, stiffness: 90 }); const pulse = 1 + 0.03 * Math.sin(f / 6);
        return <div style={{ position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2, transform: `scale(${k * pulse})` }}>
          {[0, 1, 2].map(r => <div key={r} style={{ position: 'absolute', inset: r * 22, borderRadius: '50%', border: `2px dashed ${[C.brand300, C.brand400, C.brand][r]}`, transform: `rotate(${(r % 2 ? -1 : 1) * f * (1.2 + r * 0.6)}deg)` }} />)}
          <div style={{ position: 'absolute', inset: 66, borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, ${C.brand400}, ${C.brand} 55%, ${C.brand700})`, boxShadow: `0 0 80px ${C.brand400}, 0 0 160px rgba(91,78,240,.35)`, display: 'grid', placeItems: 'center' }}>
            <Img src={staticFile('img/face.png')} style={{ width: 150, marginTop: 40 }} />
          </div>
        </div>; })()}
      {/* outputs */}
      {OUT.map(([w, n, a, b], i) => { const k = sp(f, tOut + i * 8, { damping: 16 }); const booked = f > tBook + 4 + i * 6;
        return <div key={w} style={{ position: 'absolute', left: 1300, top: 400 + i * 190 - 70, width: 520, padding: '16px 20px', borderRadius: 24, background: '#fff', boxShadow: '0 22px 50px rgba(60,50,160,.14)', opacity: k, transform: `translateX(${(1 - k) * 50}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar who={w} size={44} /><div style={{ fontSize: 20, fontWeight: 600 }}>{n} · today</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 18 }}><Sparkles size={18} color={C.brand} />{a}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 18, color: booked ? C.safeText : C.ink5, fontWeight: booked ? 600 : 400 }}>{booked ? <Check size={18} strokeWidth={3} /> : <CalendarCheck size={18} />}{b}</div>
        </div>; })}
    </div>
  );
};
export const engine: Scene = { front: EngineFront };

/* ============ CLOSE ============ */
const CloseFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const tCrowd = wt(vo[0], 'Built for') - 10, tEnd = vo[1].from - 14;
  const fam = sp(f, 4), crowd = ramp(f, tCrowd, tCrowd + 40), end = rampTo(f, tEnd);
  const ppl: (keyof typeof AV)[] = ['dadi', 'dadu', 'arjun', 'meera', 'tara'];
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {/* family row */}
      <div style={{ position: 'absolute', top: 300, width: '100%', textAlign: 'center', opacity: (1 - end) * (1 - crowd) }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
          {ppl.map((w, i) => { const k = sp(f, 4 + (i < 2 ? 26 + i * 6 : (i - 2) * 5), { damping: 12 }); return <div key={w} style={{ opacity: k, transform: `translateY(${(1 - k) * 30}px) scale(${0.7 + 0.3 * k})` }}><Avatar who={w} size={i === 4 ? 120 : 140} ring="#fff" /></div>; })}
        </div>
        <div style={{ marginTop: 40, fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', opacity: fam }}>Small steps, for <span style={{ fontFamily: SERIF, fontStyle: 'italic', color: C.brand, fontSize: 76 }}>longer, healthier lives.</span></div>
      </div>
      {/* crowd */}
      <div style={{ position: 'absolute', inset: 0, opacity: crowd * (1 - end) }}>
        {Array.from({ length: 150 }).map((_, i) => { const col = i % 15, row = Math.floor(i / 15); const k = ramp(f, tCrowd + ((col * 7 + row * 3) % 24), tCrowd + 20 + ((col * 7 + row * 3) % 24));
          return <Img key={i} src={staticFile(`img/v${String(1 + ((i * 7) % 20)).padStart(2, '0')}.png`)} style={{ position: 'absolute', left: 90 + col * 120 + (row % 2) * 60, top: 80 + row * 98, width: 72, height: 72, borderRadius: 36, opacity: 0.85 * k, transform: `scale(${0.5 + 0.5 * k})` }} />; })}
        <div style={{ position: 'absolute', left: 560, top: 400, width: 800, padding: '36px 40px', borderRadius: 32, background: 'rgba(255,255,255,.94)', textAlign: 'center', boxShadow: '0 30px 80px rgba(60,50,160,.2)', transform: `scale(${0.9 + 0.1 * crowd})` }}>
          <div style={{ fontSize: 30, color: C.ink5, fontWeight: 500 }}>Built for</div>
          <div style={{ fontSize: 92, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.05 }}>100 crore <span style={{ fontFamily: SERIF, fontStyle: 'italic', color: C.brand, fontWeight: 400 }}>Indians.</span></div>
          <div style={{ fontSize: 24, color: C.ink5, marginTop: 8 }}>Every family. Every age. Every kind of care.</div>
        </div>
      </div>
      {/* end card */}
      <div style={{ position: 'absolute', inset: 0, opacity: end }}>
        <div style={{ position: 'absolute', left: 170, top: 330 }}><Mascot pose="celebrate" w={360} /></div>
        <div style={{ position: 'absolute', left: 580, top: 380 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, transform: `translateY(${(1 - end) * 30}px)` }}>
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 170, color: C.brand, letterSpacing: '-0.02em', lineHeight: 1 }}>Cheeku</span>
            <span style={{ fontSize: 108, fontWeight: 500, letterSpacing: '-0.04em' }}>AI</span>
          </div>
          <div style={{ fontSize: 40, color: C.ink7, marginTop: 18, position: 'relative', display: 'inline-block' }}>Your family's health, <span style={{ fontFamily: SERIF, fontStyle: 'italic', color: C.brand, fontSize: 48, position: 'relative' }}>remembered.
            <svg width={250} height={18} style={{ position: 'absolute', left: 0, bottom: -12 }}><path d="M4 12 C 70 2, 170 4, 246 9" stroke={C.lime} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={260} strokeDashoffset={260 * (1 - ramp(f, tEnd + 18, tEnd + 40))} /></svg></span></div>
          <div style={{ display: 'flex', gap: 12, marginTop: 40, opacity: ramp(f, tEnd + 26, tEnd + 40) }}>
            <Pill bg="#fff" fg={C.ink7} style={{ fontSize: 20, padding: '10px 18px', boxShadow: '0 8px 24px rgba(60,50,160,.1)' }}>Free to start</Pill>
            <Pill bg={C.brand} fg="#fff" style={{ fontSize: 20, padding: '10px 18px' }}>Family plan · ₹249 a month</Pill>
          </div>
        </div>
      </div>
    </div>
  );
};
const rampTo = (f: number, at: number) => interpolate(f, [at, at + 22], [0, 1], { ...clamp, easing: easeInOut });
export const close: Scene = { front: CloseFront, screen: ({ f }) => <HomeScreen f={f} family /> };
