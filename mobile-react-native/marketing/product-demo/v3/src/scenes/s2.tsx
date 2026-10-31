import React from 'react';
import { interpolate, Img, staticFile } from 'remotion';
import { Check, Camera, X, Video, Baby, Syringe, LineChart, Phone as PhoneI, ShieldAlert, Clock, MapPin, FileText, Stethoscope, HeartPulse } from 'lucide-react';
import { C, FONT, SERIF, sp, ramp, clamp, typed, easeInOut, easeOut, mix } from '../theme';
import { Copy, Float, Avatar, Mascot, Still, Tap, Pill } from '../kit';
import { Status, Tabs, ChatTop, Me, Bot, Dots, Composer, Card, Btn, Label, Serif, Dot, Screen, Face, Bar, Push } from '../app';
import { Scene, SceneProps, wt, outro } from './common';

/* ============ POSITIVE ============ */
const Ring: React.FC<{ k: number; size: number; week: number; total?: number; label?: string }> = ({ k, size, week, total = 40, label }) => {
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} stroke={C.brand100} strokeWidth={12} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.brand} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (week / total) * k)} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div><div style={{ fontSize: size * 0.28, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1 }}>{Math.round(week * k)}</div><div style={{ fontSize: size * 0.08, color: C.ink5 }}>{label ?? `of ${total} weeks`}</div></div>
      </div>
    </div>
  );
};
const PositiveScreen: React.FC<SceneProps> = ({ f }) => (
  <Screen>
    <Status />
    <Bar title="Meera" sub="Expecting" />
    <div style={{ padding: '10px 20px', textAlign: 'center' }}>
      <div style={{ display: 'grid', placeItems: 'center', marginTop: 16 }}><Ring k={ramp(f, 14, 50)} size={210} week={6} /></div>
      <div style={{ fontSize: 26, fontWeight: 500, marginTop: 18, letterSpacing: '-0.02em' }}>Congratulations, Meera.</div>
      <Serif size={30}>Week 6 of your pregnancy.</Serif>
      <Card style={{ marginTop: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[['Due date', '2 Jul 2027'], ['First scan', 'Book for weeks 7 to 9'], ['Today', 'Folic acid, keep going']].map(([a, b]) => (
          <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span style={{ color: C.ink5 }}>{a}</span><span style={{ fontWeight: 600 }}>{b}</span></div>))}
      </Card>
    </div>
  </Screen>
);
const PositiveFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur, 12); const t = vo[0].from;
  const k = sp(f, t + 10, { damping: 12, stiffness: 120 });
  const conf = Array.from({ length: 34 }).map((_, i) => {
    const a = (i / 34) * Math.PI * 2, d = ramp(f, t + 12, t + 60) * (220 + (i % 5) * 50);
    return <div key={i} style={{ position: 'absolute', left: 520 + Math.cos(a) * d, top: 520 + Math.sin(a) * d * 0.7 + ramp(f, t + 30, t + 90) * 60, width: 10, height: i % 3 ? 10 : 18, borderRadius: i % 2 ? 5 : 2,
      background: [C.brand, C.lime, '#f4a7c8', C.brand300][i % 4], opacity: (1 - ramp(f, t + 60, t + 100)) * ramp(f, t + 12, t + 16), transform: `rotate(${i * 40 + f * 4}deg)` }} />;
  });
  return (
    <>
      {conf}
      <div style={{ position: 'absolute', left: 140, top: 300, fontFamily: FONT, opacity: out }}>
        <div style={{ opacity: sp(f, t), fontSize: 28, fontWeight: 600, color: C.ink5, letterSpacing: '.02em' }}>SIX WEEKS LATER</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 170, lineHeight: 1, color: C.brand, opacity: k, transform: `scale(${0.85 + 0.15 * k})`, transformOrigin: '0 50%', marginTop: 14, whiteSpace: 'nowrap' }}>It's positive.</div>
      </div>
      <div style={{ position: 'absolute', left: 560, top: 640, opacity: sp(f, t + 16) * out }}><Mascot pose="celebrate" w={300} /></div>
    </>
  );
};
export const positive: Scene = { front: PositiveFront, screen: PositiveScreen };

/* ============ PREGNANCY: week by week, food, product check ============ */
const Tracker: React.FC<{ f: number }> = ({ f }) => (
  <Screen>
    <Status />
    <Bar title="Pregnancy" sub="Meera · second trimester next week" />
    <div style={{ padding: '6px 18px' }}>
      <Card style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Ring k={ramp(f, 0, 30)} size={120} week={12} />
        <div><div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Week 12</div><div style={{ fontSize: 13.5, color: C.ink5, lineHeight: 1.4, marginTop: 4 }}>Due 2 Jul 2027<br />Scan dating, from her first scan</div></div>
      </Card>
      <Label style={{ margin: '18px 0 10px' }}>This week</Label>
      {[[C.brand, 'NT scan', 'Book between weeks 11 and 13'], [C.safe, 'Folic acid', 'Taken today'], [C.brand400, 'Iron and calcium', 'Start after week 12, per her doctor']].map(([c, a, b], i) => (
        <Card key={i} style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', opacity: sp(f, 8 + i * 5) }}>
          <Dot c={c} s={10} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14.5 }}>{a}</div><div style={{ fontSize: 12.5, color: C.ink5 }}>{b}</div></div>
          {i === 1 && <Check size={18} color={C.safe} strokeWidth={3} />}
        </Card>))}
    </div>
    <Tabs on="home" />
  </Screen>
);
const FoodChat: React.FC<{ f: number }> = ({ f }) => (
  <Screen>
    <Status />
    <ChatTop who="meera" name="Meera" />
    <Me f={f} at={4}>What should Meera eat now, and what should she avoid?</Me>
    <Dots f={f} from={14} to={26} />
    <Bot f={f} at={26}>For week 12, from her file (vegetarian, low iron last month):</Bot>
    <div style={{ margin: '0 16px 0 50px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[[C.safe, C.safeBg, 'Eat more', 'Dal, curd, paneer, leafy greens. Iron with lemon, not with tea.'],
        [C.caution, C.cautionBg, 'Go easy', 'Tea and coffee: under 200 mg caffeine a day.'],
        [C.danger, C.dangerBg, 'Skip for now', 'Raw or semi-ripe papaya, unpasteurised milk, raw eggs.']].map(([c, bg, h, t], i) => {
        const k = sp(f, 34 + i * 10); if (f < 34 + i * 10) return null;
        return <div key={i} style={{ background: bg, borderRadius: 16, padding: 12, opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: c === C.safe ? C.safeText : c === C.caution ? C.cautionText : C.dangerText }}>{h}</div>
          <div style={{ fontSize: 13.5, color: C.ink7, marginTop: 3, lineHeight: 1.4 }}>{t}</div></div>;
      })}
    </div>
    <Composer />
  </Screen>
);
const Check2: React.FC<{ f: number }> = ({ f }) => {
  const scan = ramp(f, 4, 34); const res = sp(f, 38, { damping: 18 });
  return (
    <Screen bg="#111">
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, #3b3b4f, #111 70%)' }} />
      <Status dark />
      <div style={{ position: 'absolute', top: 60, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 15, fontWeight: 600 }}><X size={20} />Check a product<span style={{ width: 20 }} /></div>
      {/* can */}
      <div style={{ position: 'absolute', left: 135, top: 150, width: 120, height: 230, borderRadius: 18, background: 'linear-gradient(90deg,#0f7a4e,#22c37a 45%,#0e6b44)', boxShadow: 'inset 0 10px 0 #bfc3c9, inset 0 -10px 0 #9ea3a9',
        display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '.04em', transform: 'rotate(-6deg)' }}>
        <div style={{ textAlign: 'center', lineHeight: 1.05 }}>VOLT<br /><span style={{ fontSize: 12, fontWeight: 600 }}>ENERGY DRINK</span></div></div>
      <div style={{ position: 'absolute', left: 90, top: 130, width: 210, height: 270, borderRadius: 22, border: '3px solid rgba(255,255,255,.85)' }} />
      <div style={{ position: 'absolute', left: 96, width: 198, top: 140 + scan * 250, height: 3, background: C.lime, boxShadow: `0 0 18px ${C.lime}`, opacity: scan < 1 ? 1 : 0 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderRadius: '28px 28px 0 0', padding: 20, transform: `translateY(${(1 - res) * 100}%)` }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar who="meera" size={28} /><span style={{ fontSize: 13, color: C.ink5 }}>Checked for Meera · week 12</span></div>
        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 10 }}>Volt Energy Drink</div>
        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 10, padding: '6px 12px', borderRadius: 999, background: C.dangerBg, color: C.dangerText, fontWeight: 700, fontSize: 14 }}><X size={15} strokeWidth={3} />Avoid for her</div>
        <div style={{ fontSize: 14, color: C.ink7, marginTop: 10, lineHeight: 1.45 }}>160 mg caffeine a can, close to her daily limit in pregnancy, plus taurine. Coconut water or nimbu pani instead.</div>
      </div>
    </Screen>
  );
};
const PregScreen: React.FC<SceneProps> = ({ f, vo }) => {
  const p1 = wt(vo[1], 'What to eat') - 6, p2 = wt(vo[1], 'quick check') - 4;
  return <Push f={f} pages={[[0, <Tracker f={f} />], [p1, <FoodChat f={f - p1} />], [p2, <Check2 f={f - p2} />]]} />;
};
const PregFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur); const t1 = wt(vo[1], 'eat'), t2 = wt(vo[1], 'skip'), t3 = wt(vo[1], 'quick check') + 30;
  return (
    <>
      <Copy f={f} tag="Pregnancy" a="Week by week," b="for her." body="Meals, scans and medicines follow her pregnancy, from her own file, with a doctor's word where it matters." out={out} />
      <Float f={f} d={t1} x={1300} y={300} w={380} out={out}><div style={{ fontSize: 15, fontWeight: 700, color: C.safeText }}>EAT MORE</div><div style={{ fontSize: 19, marginTop: 4 }}>Dal, curd, paneer, leafy greens</div></Float>
      <Float f={f} d={t1 + 8} x={1340} y={420} w={380} out={out}><div style={{ fontSize: 15, fontWeight: 700, color: C.cautionText }}>GO EASY</div><div style={{ fontSize: 19, marginTop: 4 }}>Tea and coffee, under 200 mg a day</div></Float>
      <Float f={f} d={t2} x={1300} y={540} w={380} out={out}><div style={{ fontSize: 15, fontWeight: 700, color: C.dangerText }}>SKIP FOR NOW</div><div style={{ fontSize: 19, marginTop: 4 }}>Raw papaya, unpasteurised milk</div></Float>
      <Float f={f} d={t3} x={1330} y={690} w={360} out={out} rot={-2}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Camera size={24} color={C.brand} /><div><div style={{ fontSize: 14, color: C.ink5 }}>Product check</div><div style={{ fontSize: 19, fontWeight: 600 }}>Energy drink · <span style={{ color: C.dangerText }}>Avoid for Meera</span></div></div></div>
      </Float>
    </>
  );
};
export const pregnancy: Scene = { front: PregFront, screen: PregScreen };

/* ============ DOCTOR: scan read, doctor briefed ============ */
const ScanRecord: React.FC<{ f: number }> = ({ f }) => (
  <Screen>
    <Status />
    <Bar title="NT scan" sub="Meera · 12 weeks 3 days" right={<Pill bg={C.safeBg} fg={C.safeText}>Read and filed</Pill>} />
    <div style={{ padding: '6px 16px' }}>
      <Card>
        <div style={{ height: 150, borderRadius: 14, background: 'radial-gradient(ellipse at 50% 60%, #6b6b6b 0%, #222 55%, #050505 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 120, top: 46, width: 130, height: 70, borderRadius: '60% 50% 50% 60%', background: 'radial-gradient(circle at 40% 40%, #d8d8d8, #7a7a7a 70%)', opacity: .8, filter: 'blur(1px)' }} />
          <div style={{ position: 'absolute', left: 10, top: 8, color: '#ddd', fontSize: 10, fontFamily: 'monospace' }}>CRL 62 mm · NT 1.4 mm</div>
        </div>
        <Label style={{ margin: '14px 0 8px' }}>What it says</Label>
        {[['Nuchal translucency', '1.4 mm', 'In the usual range'], ['Crown-rump length', '62 mm', 'Matches 12w 3d'], ['Heart rate', '158 bpm', 'In the usual range']].map(([a, b, c], i) => (
          <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: i ? `1px solid ${C.line}` : 'none', opacity: sp(f, 6 + i * 6) }}>
            <span style={{ flex: 1, fontSize: 14 }}>{a}</span><span style={{ fontWeight: 600, fontSize: 14 }}>{b}</span><Pill bg={C.safeBg} fg={C.safeText}>{c}</Pill></div>))}
      </Card>
      <Card style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}><Face size={28} /><span style={{ fontSize: 13.5, color: C.ink7 }}>Added to Meera's pregnancy timeline. Her doctor will see it.</span></Card>
    </div>
  </Screen>
);
const DoctorBook: React.FC<{ f: number }> = ({ f }) => (
  <Screen>
    <Status />
    <Bar title="Book a doctor" sub="Obstetrics" />
    <div style={{ padding: '4px 16px' }}>
      <Card style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Img src={staticFile('img/v08.png')} style={{ width: 56, height: 56, borderRadius: 28 }} />
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16 }}>Dr. Kavya Rao</div><div style={{ fontSize: 12.5, color: C.ink5 }}>Obstetrician · 14 years · 4.9</div></div>
        <Pill>Video</Pill>
      </Card>
      <Label style={{ margin: '16px 0 8px' }}>Thursday</Label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{['5:30 pm', '6:00 pm', '6:30 pm', '7:00 pm'].map((t, i) => (
        <div key={t} style={{ padding: '9px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: i === 2 && f > 18 ? C.brand : '#fff', color: i === 2 && f > 18 ? '#fff' : C.ink7, boxShadow: `0 0 0 1px ${C.line}` }}>{t}</div>))}</div>
      <Card style={{ marginTop: 14, background: C.tint }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}><FileText size={16} color={C.brand} />Pre-consultation note</div>
        {[['For', 'Meera, 29, week 12'], ['Asking about', 'Mild nausea, iron'], ['Reports', 'NT scan normal · TSH 2.4'], ['Taking', 'Folic acid 400 mcg']].map(([a, b], i) => (
          <div key={a} style={{ display: 'flex', fontSize: 13, marginTop: 7, opacity: sp(f, 24 + i * 5) }}><span style={{ width: 100, color: C.ink5 }}>{a}</span><span style={{ fontWeight: 500 }}>{b}</span></div>))}
      </Card>
      <Btn style={{ marginTop: 14 }} done={ramp(f, 66, 72)}>{f > 68 ? <><Check size={17} strokeWidth={3} /> Booked · Thu 6:30 pm</> : 'Book video call · ₹700'}</Btn>
    </div>
    <Tap f={f} at={16} x={230} y={248} /><Tap f={f} at={62} x={195} y={500} />
  </Screen>
);
const DoctorScreen: React.FC<SceneProps> = ({ f, vo }) => {
  const p1 = wt(vo[0], 'her doctor') - 8;
  return <Push f={f} pages={[[-20, <ScanRecord f={f + 20} />], [p1, <DoctorBook f={f - p1} />]]} />;
};
const DoctorFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur); const t = wt(vo[0], 'her doctor');
  return (
    <>
      <Copy f={f} tag="Records and doctors" a="Read, filed," b="and briefed." body="Snap a scan or a report. Cheeku reads it, files it, and writes the doctor a note before the call." out={out} />
      <Float f={f} d={8} x={1320} y={300} w={330} out={out}><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><FileText size={24} color={C.brand} /><div><div style={{ fontSize: 19, fontWeight: 600 }}>NT scan · 12w 3d</div><div style={{ fontSize: 15, color: C.safeText, fontWeight: 600 }}>Read · in the usual range</div></div></div></Float>
      <Float f={f} d={t + 10} x={1320} y={430} w={380} out={out}>
        <div style={{ fontSize: 15, color: C.ink5 }}>Pre-consultation note</div><div style={{ fontSize: 19, fontWeight: 600, marginTop: 4 }}>Shared with Dr. Kavya Rao</div>
        <div style={{ fontSize: 15, color: C.ink7, marginTop: 6 }}>Week 12 · nausea · scan normal · on folic acid</div></Float>
    </>
  );
};
export const doctor: Scene = { front: DoctorFront, screen: DoctorScreen };

/* ============ BABY: Tara arrives ============ */
const BabyForm: React.FC<{ f: number }> = ({ f }) => {
  const field = (label: string, val: string, at: number) => (
    <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12.5, color: C.ink5, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ padding: '12px 14px', borderRadius: 14, background: '#fff', boxShadow: `0 0 0 ${f > at && f < at + 14 ? 2 : 1}px ${f > at && f < at + 14 ? C.brand : C.line}`, fontSize: 15.5, minHeight: 20 }}>{typed(val, f, at, 22)}</div></div>
  );
  return (
    <Screen>
      <Status />
      <Bar title="Pregnancy" sub="Meera · week 39" />
      <div style={{ padding: '6px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Baby size={26} color={C.brand} /><span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>The baby has arrived</span></div>
        <div style={{ fontSize: 13.5, color: C.ink5, margin: '6px 0 18px' }}>We'll set up the baby's own health memory.</div>
        {field('Name or nickname', 'Tara', 6)}{field('Date of birth', '2 Jul 2027', 16)}
        <div style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1 }}>{field('Birth weight (kg)', '3.1', 30)}</div><div style={{ flex: 1 }}>{field('Weeks at birth', '39', 36)}</div></div>
        <div style={{ fontSize: 12, color: C.ink5, marginBottom: 14 }}>Decides whether newborn limits use the term or preterm chart.</div>
        <Btn done={ramp(f, 52, 58)}>{f > 54 ? <><Check size={17} strokeWidth={3} /> Added to the family</> : 'Add the baby to the family'}</Btn>
      </div>
      <Tap f={f} at={48} x={195} y={480} />
    </Screen>
  );
};
const FamilyNow: React.FC<{ f: number }> = ({ f }) => (
  <Screen>
    <Status />
    <div style={{ padding: '4px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em' }}>Your family</div><Serif size={32}>now three of you.</Serif>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        {([['arjun', 'Arjun', '32 · You'], ['meera', 'Meera', '29 · postpartum, week 1'], ['tara', 'Tara', 'New · born 2 Jul, 3.1 kg']] as const).map(([w, n, s], i) => {
          const k = i < 2 ? 1 : sp(f, 8, { damping: 11, stiffness: 150 });
          return <Card key={w} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: k, transform: `scale(${0.8 + 0.2 * k})`, boxShadow: i === 2 ? `0 0 0 2px ${C.brand300}, 0 10px 24px rgba(91,78,240,.15)` : undefined }}>
            <Avatar who={w} size={48} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16 }}>{n}</div><div style={{ fontSize: 12.5, color: C.ink5 }}>{s}</div></div>
            {i === 2 && <Pill bg={C.lime} fg={C.limeInk}>New</Pill>}</Card>;
        })}
      </div>
      <Label style={{ margin: '20px 0 10px' }}>Set up for Tara</Label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[[Syringe, 'Vaccine card'], [LineChart, 'Growth chart'], [Clock, 'Reminders']].map(([I, t], i) => {
          const Icon = I as typeof Syringe; const k = sp(f, 22 + i * 6);
          return <div key={t as string} style={{ flex: 1, background: '#fff', borderRadius: 16, boxShadow: `0 0 0 1px ${C.line}`, padding: '12px 6px', textAlign: 'center', fontSize: 12, fontWeight: 600, opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}>
            <Icon size={22} color={C.brand} style={{ margin: '0 auto 6px', display: 'block' }} />{t as string}</div>;
        })}
      </div>
    </div>
    <Tabs on="me" />
  </Screen>
);
const BabyScreen: React.FC<SceneProps> = ({ f, vo }) => {
  const p1 = wt(vo[0], 'One tap') + 12;
  return <Push f={f} pages={[[0, <BabyForm f={f - 6} />], [p1, <FamilyNow f={f - p1} />]]} />;
};
const BabyFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur); const tv = wt(vo[0], 'vaccine'), tg = wt(vo[0], 'growth');
  return (
    <>
      <Copy f={f} tag="Family" a="Then there were" b="three." body="Tara gets her own memory from day one: vaccines, growth, fevers and medicines, kept by age." out={out} />
      <Float f={f} d={tv} x={1310} y={300} w={380} out={out}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar who="tara" size={46} /><div><div style={{ fontSize: 19, fontWeight: 600 }}>Tara's vaccine card</div><div style={{ fontSize: 15, color: C.ink5 }}>BCG · OPV · Hep B, given at birth</div></div></div>
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 12, background: C.brand50, color: C.brand700, fontWeight: 600, fontSize: 15 }}>Next: 6-week vaccines · 13 Aug</div></Float>
      <Float f={f} d={tg} x={1350} y={500} w={340} out={out}>
        <div style={{ fontSize: 15, color: C.ink5 }}>Growth chart · term</div>
        <svg width={300} height={80} style={{ marginTop: 6 }}><path d="M0 70 C 80 60, 160 36, 300 12" stroke={C.brand100} strokeWidth={22} fill="none" /><path d="M0 70 C 80 60, 160 36, 300 12" stroke={C.brand300} strokeWidth={2} fill="none" strokeDasharray="4 5" />
          <circle cx={10} cy={68} r={6} fill={C.brand} /></svg>
        <div style={{ fontSize: 15, fontWeight: 600 }}>3.1 kg at birth · 50th percentile</div></Float>
      <div style={{ position: 'absolute', left: 1180, top: 760, opacity: sp(f, wt(vo[0], 'One tap') + 14) * out }}><Mascot pose="cheer" w={210} /></div>
    </>
  );
};
export const baby: Scene = { front: BabyFront, screen: BabyScreen };

/* ============ HOME CARE ============ */
const HomeCareList: React.FC<{ f: number }> = ({ f }) => (
  <Screen>
    <Status />
    <Bar title="Home care" sub="Nurses and caregivers, at home" />
    <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[['Nurse visit', 'Injections, dressings, IV, catheter care'], ['Elder care at home', 'Daily help, by the shift'], ['After a hospital stay', 'Care and checks at home'], ['New mother and baby care', 'Feeding, bathing, recovery']].map(([a, b], i) => (
        <Card key={a} style={{ display: 'flex', alignItems: 'center', gap: 12, boxShadow: i === 3 && f > 22 ? `0 0 0 2px ${C.brand}` : undefined }}>
          <Img src={staticFile(`img/${['doctor', 'specialist', 'lab', 'therapy'][i]}.png`)} style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14.5 }}>{a}</div><div style={{ fontSize: 12.5, color: C.ink5 }}>{b}</div></div>
        </Card>))}
    </div>
    <Tap f={f} at={20} x={195} y={330} />
  </Screen>
);
const Booking: React.FC<{ f: number; title: string; sub: string; rows: [string, string][]; cta: string; done: string; who: 'meera' | 'tara' }> = ({ f, title, sub, rows, cta, done, who }) => (
  <Screen>
    <Status />
    <Bar title={title} sub={sub} />
    <div style={{ padding: '4px 16px' }}>
      <Card>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}><Avatar who={who} size={26} /><Avatar who="tara" size={26} style={{ marginLeft: -8, display: who === 'meera' && title.includes('mother') ? 'block' : 'none' }} /><span style={{ fontSize: 13, color: C.ink5 }}>For {who === 'meera' && title.includes('mother') ? 'Meera and Tara' : 'Meera'}</span></div>
        {rows.map(([a, b], i) => <div key={a} style={{ display: 'flex', fontSize: 14, padding: '9px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}><span style={{ width: 110, color: C.ink5 }}>{a}</span><span style={{ fontWeight: 600 }}>{b}</span></div>)}
      </Card>
      <Btn style={{ marginTop: 14 }} done={ramp(f, 34, 40)}>{f > 36 ? <><Check size={17} strokeWidth={3} /> {done}</> : cta}</Btn>
    </div>
    <Tap f={f} at={30} x={195} y={360} />
  </Screen>
);
const HomeCareScreen: React.FC<SceneProps> = ({ f, vo }) => {
  const p1 = 34, p2 = wt(vo[0], 'physio') - 4;
  return <Push f={f} pages={[[0, <HomeCareList f={f} />],
    [p1, <Booking f={f - p1} title="New mother and baby care" sub="Home care" who="meera" rows={[['When', 'Daily, 8 am to 12 pm'], ['For', '14 days, from tomorrow'], ['Carer', 'Trained in newborn care'], ['Where', 'Home, Indiranagar']]} cta="Book · ₹1,400 a day" done="Booked · starts tomorrow" />],
    [p2, <Booking f={f - p2} title="Physiotherapy" sub="After a baby · core and pelvic floor" who="meera" rows={[['When', 'Tue, 5 pm'], ['Where', 'At home'], ['Sessions', '6, once a week'], ['Physio', 'Women’s health specialist']]} cta="Book · ₹900 a session" done="Booked · Tue 5 pm" />]]} />;
};
const HomeCareFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur); const t1 = wt(vo[0], 'nurse') + 20, t2 = wt(vo[0], 'physio') + 24;
  const step = (at: number) => Math.min(3, Math.floor(Math.max(0, f - at) / 14));
  return (
    <>
      <Copy f={f} tag="Care at home" a="Care that" b="comes home." body="Nurses, caregivers and physios, booked for the right person, with notes from their file." out={out} />
      <Float f={f} d={t1} x={1310} y={320} w={380} out={out}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Img src={staticFile('img/v09.png')} style={{ width: 46, height: 46, borderRadius: 23 }} /><div><div style={{ fontSize: 19, fontWeight: 600 }}>Nurse Sunita K.</div><div style={{ fontSize: 15, color: C.ink5 }}>Mother and baby care · 8:00 am</div></div></div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>{['Booked', 'Confirmed', 'On the way'].map((s, i) => <div key={s} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: i <= step(t1) ? C.brand : C.brand50, color: i <= step(t1) ? '#fff' : C.brand700 }}>{s}</div>)}</div>
      </Float>
      <Float f={f} d={t2} x={1350} y={510} w={340} out={out}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><HeartPulse size={26} color={C.brand} /><div><div style={{ fontSize: 19, fontWeight: 600 }}>Postnatal physio</div><div style={{ fontSize: 15, color: C.ink5 }}>Tue 5 pm · at home · 6 sessions</div></div></div></Float>
    </>
  );
};
export const homecare: Scene = { front: HomeCareFront, screen: HomeCareScreen };

/* ============ FEVER at midnight ============ */
const FeverScreen: React.FC<SceneProps> = ({ f, vo }) => {
  const msg = 'Tara feels hot. 100.6°F. Should I give her something?';
  const tType = 8, tSend = tType + Math.ceil((msg.length / 34) * 30) + 4, tAns = Math.max(tSend + 18, wt(vo[0], 'Cheeku knows') - 6);
  const tCall = wt(vo[0], 'see a doctor') + 30;
  const dk = '#0f0f2e';
  return (
    <Screen bg={dk}>
      <div style={{ color: '#fff' }}><Status dark time="12:14" /></div>
      <div style={{ padding: '4px 16px 10px', borderBottom: '1px solid rgba(255,255,255,.1)', display: 'flex', gap: 10, alignItems: 'center', color: '#fff' }}>
        <Face size={34} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Cheeku</div><div style={{ fontSize: 12, opacity: .6 }}>Tara's health memory</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 999, background: 'rgba(255,255,255,.1)', fontSize: 12.5, fontWeight: 600 }}><Avatar who="tara" size={22} />Tara · 7 weeks</div>
      </div>
      <div style={{ color: '#fff' }}>
        {f >= tSend - 1 && (() => { const k = sp(f, tSend); return <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '12px 16px', opacity: k }}><div style={{ maxWidth: 280, background: C.brand, padding: '10px 14px', borderRadius: '20px 20px 6px 20px', fontSize: 14.5 }}>{msg}</div></div>; })()}
        {f >= tSend + 6 && f < tAns && <div style={{ margin: '10px 16px', display: 'flex', gap: 5 }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: '#b9b2ff', opacity: 0.3 + 0.7 * Math.max(0, Math.sin((f - tSend) / 4 - i)) }} />)}</div>}
      </div>
      {f >= tAns && (() => { const k = sp(f, tAns, { damping: 16 }); return (
        <div style={{ margin: '6px 14px', background: '#fff', borderRadius: 22, overflow: 'hidden', opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
          <div style={{ background: C.dangerBg, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center', color: C.dangerText, fontWeight: 700 }}><ShieldAlert size={19} />See a doctor tonight</div>
          <div style={{ padding: 14, fontSize: 14, lineHeight: 1.45, color: C.ink7 }}>
            Tara is <b style={{ color: C.ink }}>7 weeks old</b>. Under 3 months, any fever of 100.4°F or more needs a doctor the same night.
            <div style={{ marginTop: 8, color: C.ink5, fontSize: 13 }}>Don't give any medicine until a doctor says so.</div>
            <Btn style={{ marginTop: 12 }} done={ramp(f, tCall + 4, tCall + 10)}>{f > tCall + 6 ? <><Video size={17} /> Dr. Neha Iyer joins in 4 min</> : <><Video size={17} /> Video call a paediatrician now</>}</Btn>
            <div style={{ marginTop: 8, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 13.5, color: C.dangerText, boxShadow: `0 0 0 1px ${C.danger}` }}><PhoneI size={15} />Call 108 if she's hard to wake</div>
          </div>
        </div>); })()}
      <Composer dark text={f < tSend ? typed(msg, f, tType, 34) : ''} caret={f >= tType && f < tSend} />
      <Tap f={f} at={tCall} x={195} y={548} />
    </Screen>
  );
};
const FeverFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur); const t = wt(vo[0], 'Cheeku knows');
  return (
    <>
      <Copy f={f} dark tag="12:14 am" a="It knows she's" b="seven weeks old." body="Every answer starts from who it's for. For a newborn, that means the safe call, fast." out={out} />
      <Float f={f} d={t} x={1310} y={330} w={360} out={out} dark>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar who="tara" size={46} /><div><div style={{ fontSize: 19, fontWeight: 600 }}>Tara · 7 weeks · 4.6 kg</div><div style={{ fontSize: 15, opacity: .7 }}>Fever rule for babies under 3 months</div></div></div></Float>
      <Float f={f} d={wt(vo[0], 'see a doctor') + 46} x={1350} y={470} w={330} out={out} dark>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Stethoscope size={24} color="#b9b2ff" /><div><div style={{ fontSize: 19, fontWeight: 600 }}>Advice saved</div><div style={{ fontSize: 15, opacity: .7 }}>to Tara's file, for her next visit</div></div></div></Float>
    </>
  );
};
export const fever: Scene = { front: FeverFront, screen: FeverScreen, night: true, darkScreen: true };
