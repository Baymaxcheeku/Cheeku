import React from 'react';
import { interpolate, Img, staticFile } from 'remotion';
import { Bell, Search, Check, FileText, Sparkles, CalendarCheck, Home as HomeI, FlaskConical } from 'lucide-react';
import { C, FONT, SERIF, sp, ramp, clamp, typed, easeInOut, mix } from '../theme';
import { Copy, Float, Avatar, Mascot, Still, Tap, Pill } from '../kit';
import { Status, Tabs, ChatTop, Me, Bot, Dots, Composer, Card, Btn, Label, Serif, Dot, Screen, Face } from '../app';
import { Scene, SceneProps, wt, outro } from './common';

/* ============ HOOK: health lives everywhere ============ */
const Bubble: React.FC<{ f: number; d: number; x: number; y: number; me?: boolean; text: string; t: string; collapse: number }> = ({ f, d, x, y, me, text, t, collapse }) => {
  const k = sp(f, d, { damping: 15, stiffness: 150 });
  return (
    <div style={{ position: 'absolute', left: mix(x, 900, collapse), top: mix(y, 470, collapse), opacity: k * (1 - collapse), transform: `scale(${(0.85 + 0.15 * k) * (1 - 0.6 * collapse)}) rotate(${(me ? 2 : -2) * (1 - k)}deg)`,
      transformOrigin: me ? '100% 100%' : '0 100%', maxWidth: 330, padding: '12px 16px 18px', borderRadius: me ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
      background: me ? '#dff5e6' : '#fff', boxShadow: '0 12px 30px rgba(40,40,90,.10)', fontFamily: FONT, fontSize: 21, color: C.ink, lineHeight: 1.35 }}>
      {text}<span style={{ position: 'absolute', right: 12, bottom: 4, fontSize: 12, color: C.ink3 }}>{t}</span>
    </div>
  );
};
const Paper: React.FC<{ f: number; d: number; x: number; y: number; rot: number; title: string; sub: string; collapse: number; hand?: boolean }> = ({ f, d, x, y, rot, title, sub, collapse, hand }) => {
  const k = sp(f, d, { damping: 14, stiffness: 120 });
  return (
    <div style={{ position: 'absolute', left: mix(x, 860, collapse), top: mix(y + (1 - k) * 160, 440, collapse), width: 270, height: 340, opacity: Math.min(1, k * 1.5) * (1 - collapse),
      transform: `rotate(${rot * k + (1 - k) * rot * 2}deg) scale(${1 - 0.6 * collapse})`, background: hand ? '#fffdf5' : '#fff', borderRadius: 6,
      boxShadow: '0 22px 50px rgba(40,40,90,.16)', padding: 22, fontFamily: FONT }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: hand ? '#3a5a8c' : C.brand700, letterSpacing: '.04em' }}>{title}</div>
      <div style={{ fontSize: 11, color: C.ink5, marginTop: 4 }}>{sub}</div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          hand ? <svg key={i} width={200 - (i % 3) * 40} height={10}><path d={`M2 6 Q 20 ${i % 2 ? 0 : 10} 40 5 T 80 6 T 120 4 T 160 7 T ${200 - (i % 3) * 40} 5`} stroke="#3a5a8c" strokeWidth="2" fill="none" opacity=".7" /></svg>
            : <div key={i} style={{ display: 'flex', gap: 10 }}><div style={{ height: 7, width: 90, background: '#e9e9f3', borderRadius: 3 }} /><div style={{ height: 7, width: 40, background: i === 3 ? '#f7c3c8' : '#e9e9f3', borderRadius: 3 }} /><div style={{ height: 7, width: 50, background: '#e9e9f3', borderRadius: 3 }} /></div>
        ))}
      </div>
    </div>
  );
};
const HookFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const v = vo[0];
  const tChats = wt(v, 'WhatsApp') - 8, tPaper = wt(v, 'paper') - 6, tSearch = wt(v, 'late-night') - 6;
  const collapse = interpolate(f, [dur - 26, dur - 4], [0, 1], { ...clamp, easing: easeInOut });
  const q = 'is papaya safe in pregnancy?';
  const head = sp(f, 4);
  return (
    <>
      <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontFamily: FONT, opacity: head * (1 - collapse), transform: `translateY(${(1 - head) * 20}px)` }}>
        <div style={{ fontSize: 30, color: C.ink5, fontWeight: 500 }}>In India, a family's health lives</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 84, color: C.brand, lineHeight: 1.1 }}>everywhere but one place.</div>
      </div>
      {/* chats */}
      <div style={{ position: 'absolute', left: 120, top: 300, fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.ink5, opacity: sp(f, tChats) * (1 - collapse) }}>Family group · 142 unread</div>
      <Bubble f={f} d={tChats} x={120} y={350} text="Send me Papa's last report?" t="10:42 pm" collapse={collapse} />
      <Bubble f={f} d={tChats + 7} x={210} y={450} me text="Which one, the PDF or the photo?" t="10:44 pm" collapse={collapse} />
      <Bubble f={f} d={tChats + 14} x={120} y={550} text="Can't find it. Check the blue file." t="10:51 pm" collapse={collapse} />
      <Bubble f={f} d={tChats + 21} x={190} y={650} me text="Doctor wants the old prescription too" t="11:03 pm" collapse={collapse} />
      {/* paper */}
      <Paper f={f} d={tPaper} x={700} y={380} rot={-8} title="CITYCARE LABS" sub="Thyroid profile · 2019" collapse={collapse} />
      <Paper f={f} d={tPaper + 6} x={840} y={430} rot={5} title="Dr. S. Mehta" sub="Rx · illegible" hand collapse={collapse} />
      <Paper f={f} d={tPaper + 12} x={760} y={520} rot={-2} title="DISCHARGE SUMMARY" sub="Page 3 of 7" collapse={collapse} />
      {/* searches */}
      {(() => {
        const k = sp(f, tSearch, { damping: 16 }); const c = collapse;
        const res = [['Papaya is a superfood for mothers', '#e7f7ee'], ['Avoid papaya completely when pregnant', '#fef1f3'], ['Only ripe papaya, in small amounts', '#fff4e0']];
        return (
          <div style={{ position: 'absolute', left: mix(1250, 940, c), top: mix(360, 470, c), width: 520, opacity: k * (1 - c), transform: `translateY(${(1 - k) * 30}px) scale(${1 - 0.6 * c})`, fontFamily: FONT }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.ink5, marginBottom: 12 }}>2:14 am</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 999, background: '#fff', boxShadow: '0 12px 30px rgba(40,40,90,.10)', fontSize: 22 }}>
              <Search size={22} color={C.ink5} />{typed(q, f, tSearch + 6, 30)}<span style={{ width: 2, height: 24, background: C.brand, opacity: Math.floor(f / 8) % 2 }} />
            </div>
            {res.map(([t, bg], i) => {
              const r = sp(f, tSearch + 30 + i * 8);
              return <div key={i} style={{ marginTop: 14, padding: '14px 18px', borderRadius: 16, background: '#fff', boxShadow: '0 8px 22px rgba(40,40,90,.08)', opacity: r, transform: `translateX(${(1 - r) * 30}px)`, fontSize: 19, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: bg, boxShadow: '0 0 0 2px rgba(0,0,0,.06)' }} />{t}</div>;
            })}
          </div>
        );
      })()}
      <div style={{ position: 'absolute', left: 1640, top: 760, opacity: sp(f, tSearch + 50) * (1 - collapse) }}><Still name="worried-still" w={170} /></div>
      {/* collapse bloom */}
      <div style={{ position: 'absolute', left: 960 - 300, top: 540 - 300, width: 600, height: 600, borderRadius: 300, background: 'radial-gradient(circle, rgba(255,255,255,1), rgba(255,255,255,0) 70%)',
        opacity: interpolate(f, [dur - 10, dur, dur + 8], [0, 1, 0], clamp), transform: `scale(${interpolate(f, [dur - 10, dur + 8], [0.4, 3], clamp)})` }} />
    </>
  );
};
export const hook: Scene = { front: HookFront };

/* ============ MEET: logo, then the phone ============ */
export const HomeScreen: React.FC<{ f: number; who?: 'arjun'; family?: boolean }> = ({ f, family }) => (
  <Screen>
    <Status />
    <div style={{ padding: '6px 18px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex' }}>
        <Avatar who="arjun" size={34} ring="#fff" />
        {family && <><Avatar who="meera" size={34} ring="#fff" style={{ marginLeft: -10 }} /><Avatar who="tara" size={34} ring="#fff" style={{ marginLeft: -10 }} /></>}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: C.ink5 }}>{family ? 'Family plan · 3 of 4' : 'Arjun'}</div>
      <div style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', boxShadow: `0 0 0 1px ${C.line}`, display: 'grid', placeItems: 'center' }}><Bell size={18} /></div>
    </div>
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Hi Arjun,</div>
      <Serif size={36}>what's on your mind?</Serif>
    </div>
    <div style={{ margin: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 18, background: '#fff', boxShadow: `0 0 0 1px ${C.line}` }}>
      <Face size={26} /><span style={{ color: C.ink3, fontSize: 14 }}>Ask about anyone in the family</span>
    </div>
    <div style={{ margin: '4px 16px', padding: 16, borderRadius: 24, background: `linear-gradient(135deg, ${C.brand}, ${C.brand700})`, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 13, opacity: .8, fontWeight: 600 }}>TODAY</span><Pill bg="rgba(255,255,255,.18)" fg="#fff">{family ? '3 people' : 'Day 12'}</Pill></div>
      <div style={{ fontSize: 19, fontWeight: 600, marginTop: 8 }}>{family ? 'Small steps for all three of you' : 'A plan for every day'}</div>
      {(family ? [['arjun', '10-minute walk after dinner'], ['meera', 'Pelvic floor, 5 minutes'], ['tara', 'Tummy time, 3 short sessions']] : [['arjun', 'Walk 7,000 steps'], ['arjun', 'Lights out by 11']]).map(([w, t], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, background: 'rgba(255,255,255,.12)', padding: '8px 10px', borderRadius: 14, fontSize: 14 }}>
          <Avatar who={w as 'arjun'} size={24} /> {t}
        </div>
      ))}
    </div>
    <div style={{ margin: '16px 16px 6px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600 }}>Book services</span><span style={{ color: C.brand, fontSize: 13, fontWeight: 600 }}>See all</span></div>
    <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
      {[['Doctors', 'doctor'], ['Lab tests', 'lab'], ['Medicines', 'medicines'], ['Therapy', 'therapy']].map(([t, img]) => (
        <div key={t} style={{ flex: 1, background: '#fff', borderRadius: 16, boxShadow: `0 0 0 1px ${C.line}`, padding: '10px 4px', textAlign: 'center', fontSize: 11.5, fontWeight: 600 }}>
          <Img src={staticFile(`img/${img}.png`)} style={{ width: 40, height: 40, objectFit: 'contain' }} /><div>{t}</div>
        </div>
      ))}
    </div>
    <Tabs on="home" />
  </Screen>
);
const MeetFront: React.FC<SceneProps> = ({ f, dur }) => {
  const move = interpolate(f, [72, 96], [0, 1], { ...clamp, easing: easeInOut });
  const k = sp(f, 0, { damping: 13, stiffness: 110 });
  const out = outro(f, dur);
  const lx = mix(960, 360, move), ly = mix(520, 470, move), s = mix(1, 0.62, move);
  return (
    <>
      <div style={{ position: 'absolute', left: lx, top: ly, transform: `translate(-50%,-50%) scale(${s * (0.8 + 0.2 * k)})`, opacity: k * out, display: 'flex', alignItems: 'baseline', gap: 14, whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 190, color: C.brand, letterSpacing: '-0.02em' }}>Cheeku</span>
        <span style={{ fontFamily: FONT, fontSize: 120, fontWeight: 500, color: C.ink, letterSpacing: '-0.04em' }}>AI</span>
      </div>
      <div style={{ position: 'absolute', left: 960, top: 660, transform: 'translateX(-50%)', fontFamily: FONT, fontSize: 32, color: C.ink5, opacity: sp(f, 18) * (1 - move), whiteSpace: 'nowrap' }}>
        One app. One memory. <span style={{ color: C.ink, fontWeight: 600 }}>The whole family.</span>
      </div>
      <div style={{ position: 'absolute', left: mix(560, 260, move), top: mix(170, 760, move), opacity: sp(f, 4) * out, transform: `scale(${mix(1, 0.7, move) * (0.7 + 0.3 * sp(f, 4))})`, transformOrigin: '0 0' }}>
        <Mascot pose="cheer" w={260} />
      </div>
      <div style={{ position: 'absolute', left: 140, top: 560, width: 480, fontFamily: FONT, fontSize: 23, lineHeight: 1.45, color: C.ink5, opacity: ramp(f, 92, 110) * out }}>
        Your family's health memory. Ask anything, book every kind of care, and live longer, in one app.
      </div>
      {['Remembers every report', 'Answers for each person', 'Books every kind of care', 'Plans for longer lives'].map((t, i) => (
        <Float key={t} f={f} d={110 + i * 6} x={1330} y={330 + i * 92} w={330} out={out} pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 19, fontWeight: 600 }}><Dot c={[C.brand, '#e8590c', C.safe, '#c8417f'][i]} s={11} />{t}</div>
        </Float>
      ))}
    </>
  );
};
export const meet: Scene = { front: MeetFront, screen: ({ f }) => <HomeScreen f={f} /> };

/* ============ FAMILY: onboarding ============ */
const FamilyScreen: React.FC<SceneProps> = ({ f, vo }) => {
  const tapAt = 34, addAt = wt(vo[0], 'Meera') + 2;
  const chips = ['Trying to conceive', 'Expecting a baby', 'Managing a condition', 'Live longer', 'Caring for parents'];
  return (
    <Screen>
      <Status />
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 6, margin: '6px 0 18px' }}>{[1, 1, 0, 0].map((on, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: on ? C.brand : C.line }} />)}</div>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1 }}>What brings you</div>
        <Serif size={34}>to Cheeku?</Serif>
        <div style={{ fontSize: 14, color: C.ink5, margin: '8px 0 16px' }}>Pick whatever fits. Or skip it, no pressure.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {chips.map((c, i) => {
            const on = i === 0 && f > tapAt; const k = i === 0 ? ramp(f, tapAt, tapAt + 8) : 0;
            return <div key={c} style={{ padding: '10px 14px', borderRadius: 999, fontSize: 14.5, fontWeight: 600, background: on ? C.brand : '#fff', color: on ? '#fff' : C.ink7,
              boxShadow: on ? 'none' : `0 0 0 1px ${C.line}`, transform: `scale(${1 + 0.06 * Math.sin(Math.PI * k)})` }}>{on && '✓ '}{c}</div>;
          })}
        </div>
        <Label style={{ margin: '28px 0 12px' }}>Who's in your family</Label>
        <div style={{ display: 'flex', gap: 14 }}>
          {(['arjun', 'meera'] as const).map((w, i) => {
            const k = i === 0 ? 1 : sp(f, addAt, { damping: 12, stiffness: 160 });
            return <div key={w} style={{ textAlign: 'center', opacity: k, transform: `scale(${0.6 + 0.4 * k})` }}>
              <Avatar who={w} size={64} ring={i === 0 ? C.brand : '#fff'} /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{i === 0 ? 'You' : 'Meera'}</div></div>;
          })}
          <div style={{ textAlign: 'center' }}><div style={{ width: 64, height: 64, borderRadius: 32, border: `2px dashed ${C.brand300}`, display: 'grid', placeItems: 'center', color: C.brand, fontSize: 28 }}>+</div><div style={{ fontSize: 13, color: C.ink5, marginTop: 6 }}>Add</div></div>
        </div>
        <Card style={{ marginTop: 22, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Sparkles size={18} color={C.brand} /><div style={{ fontSize: 13.5, color: C.ink7 }}>Each person gets their own health memory. Private by default.</div>
        </Card>
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 40 }}><Btn>Continue</Btn></div>
      <Tap f={f} at={tapAt} x={95} y={238} />
      <Tap f={f} at={addAt - 4} x={192} y={378} />
    </Screen>
  );
};
const FamilyFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur); const t = wt(vo[0], 'Arjun');
  return (
    <>
      <Copy f={f} tag="Onboarding" a="Two of them." b="Planning for three." body="Arjun sets up Cheeku for himself and adds Meera. Each of them gets their own memory." out={out} />
      <Float f={f} d={t} x={1300} y={360} w={300} out={out}><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><Avatar who="arjun" size={56} /><div><div style={{ fontSize: 22, fontWeight: 600 }}>Arjun</div><div style={{ color: C.ink5, fontSize: 16 }}>32 · the one asking</div></div></div></Float>
      <Float f={f} d={wt(vo[0], 'Meera')} x={1360} y={480} w={300} out={out}><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><Avatar who="meera" size={56} /><div><div style={{ fontSize: 22, fontWeight: 600 }}>Meera</div><div style={{ color: C.ink5, fontSize: 16 }}>29 · trying to conceive</div></div></div></Float>
    </>
  );
};
export const family: Scene = { front: FamilyFront, screen: FamilyScreen };

/* ============ PLAN: guardian asks for Meera ============ */
const PlanScreen: React.FC<SceneProps> = ({ f, vo }) => {
  const msg = "We're trying for a baby. What should Meera and I do first?";
  const tType = 22, tSend = tType + Math.ceil((msg.length / 30) * 30) + 6;
  const tAns = Math.max(tSend + 22, vo[0].from + Math.round(vo[0].dur * 0.55));
  const tList = vo[1].from - 4, tBook = vo[2].from - 6, tTap = vo[2].from + 34;
  const booked = ramp(f, tTap + 4, tTap + 12);
  const scroll = interpolate(f, [tList + 10, tList + 50, tBook, tBook + 24], [0, 120, 120, 330], { ...clamp, easing: easeInOut });
  return (
    <Screen>
      <Status />
      <ChatTop who="meera" name="Meera" from="arjun" fromName="Arjun" f={f} switchAt={10} />
      <div style={{ position: 'absolute', top: 132, left: 0, right: 0, bottom: 80, overflow: 'hidden' }}>
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          <Me f={f} at={tSend}>{msg}</Me>
          <Dots f={f} from={tSend + 6} to={tAns} />
          <Bot f={f} at={tAns}>From Meera's reports, three things to do first:</Bot>
          <div style={{ margin: '4px 16px 0 50px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              [C.caution, 'Recheck her thyroid', 'TSH was 3.8 in June 2026. Worth a recheck before you try.', tList],
              [C.safe, 'Folic acid, from today', '400 mcg a day. Added to her Today plan.', tList + 14],
              [C.attention, 'For Arjun: vitamin D', 'It was 14 in March, which is low. A supplement, then a retest.', tList + 28],
            ].map(([c, h, t, at], i) => {
              const k = sp(f, at as number); if (f < (at as number)) return null;
              return <Card key={i} style={{ padding: 12, opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14.5 }}><Dot c={c as string} />{h}</div>
                <div style={{ fontSize: 13, color: C.ink5, marginTop: 4, lineHeight: 1.4 }}>{t}</div></Card>;
            })}
          </div>
          <Bot f={f} at={tBook}>
            <Card style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical size={18} color={C.brand} /><span style={{ fontWeight: 600 }}>Preconception tests for two</span></div>
              <div style={{ fontSize: 13, color: C.ink7, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Avatar who="meera" size={20} />Thyroid, CBC, rubella immunity</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Avatar who="arjun" size={20} />Vitamin D, CBC</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><HomeI size={16} color={C.ink5} />Home collection · Sat, 8 am</div>
              </div>
              <Btn style={{ marginTop: 12 }} done={booked}>{booked > 0.5 ? <><Check size={17} strokeWidth={3} /> Booked for both</> : 'Book for both · ₹1,850'}</Btn>
            </Card>
          </Bot>
        </div>
      </div>
      <Composer text={f < tSend ? typed(msg, f, tType, 30) : ''} caret={f >= tType && f < tSend} />
      <Tap f={f} at={6} x={120} y={110} />
      <Tap f={f} at={tSend - 2} x={354} y={SCREEN_TAP_Y} />
      <Tap f={f} at={tTap} x={195} y={Math.round(132 + 0 - 330 + 560)} />
    </Screen>
  );
};
const SCREEN_TAP_Y = 785;
const PlanFront: React.FC<SceneProps> = ({ f, dur, vo }) => {
  const out = outro(f, dur);
  const tMem = wt(vo[0], 'answers'), tTsh = wt(vo[1], 'thyroid'), tFol = wt(vo[1], 'folic'), tBook = vo[2].from + 40;
  return (
    <>
      <Copy f={f} tag="Ask Cheeku" a="Ask for her." b="Answered from her file." body="Switch who you're asking about. Cheeku reads that person's own reports before it answers." out={out} />
      <Float f={f} d={tMem} x={1310} y={250} w={300} out={out} dark pad={14}>
        <div style={{ background: C.ink, margin: -14, padding: '12px 16px', borderRadius: 22, display: 'flex', gap: 10, alignItems: 'center', fontSize: 18, fontWeight: 600 }}><Avatar who="meera" size={28} />Now in Meera's memory</div>
      </Float>
      <Float f={f} d={tTsh} x={1310} y={350} w={360} out={out}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontSize: 17, fontWeight: 600 }}>Meera · TSH</div><div style={{ fontSize: 14, color: C.ink5 }}>From her lab reports</div></div>
        <svg width={320} height={90} style={{ marginTop: 8 }}>
          <rect x={0} y={44} width={320} height={26} fill={C.safeBg} rx={6} />
          {(() => { const pts = [[10, 62], [120, 54], [230, 40], [310, 22]]; const k = ramp(f, tTsh + 6, tTsh + 26);
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
            return <><path d={d} fill="none" stroke={C.brand} strokeWidth={3} strokeDasharray={400} strokeDashoffset={400 * (1 - k)} />{pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={5} fill={i === 3 ? C.caution : C.brand} opacity={k > i / 3 ? 1 : 0} />)}</>; })()}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.ink5 }}><span>2.1 · 2023</span><span style={{ color: C.cautionText, fontWeight: 600 }}>3.8 · Jun 2026</span></div>
      </Float>
      <Float f={f} d={tFol} x={1360} y={560} w={340} out={out}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 40, height: 40, borderRadius: 12, background: C.safeBg, display: 'grid', placeItems: 'center' }}><Check size={20} color={C.safe} strokeWidth={3} /></div>
          <div><div style={{ fontSize: 14, color: C.ink5 }}>Added to Meera's Today</div><div style={{ fontSize: 18, fontWeight: 600 }}>Folic acid · 400 mcg daily</div></div></div>
      </Float>
      <Float f={f} d={tBook} x={1310} y={680} w={380} out={out}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><CalendarCheck size={26} color={C.brand} />
          <div><div style={{ fontSize: 18, fontWeight: 600 }}>Booked for two</div><div style={{ fontSize: 14, color: C.ink5 }}>Home collection · Sat 8 am · results to each file</div></div></div>
      </Float>
    </>
  );
};
export const plan: Scene = { front: PlanFront, screen: PlanScreen };
