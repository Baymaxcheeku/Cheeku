import React from 'react';
import { interpolate } from 'remotion';
import { Baby, CalendarCheck, CheckCircle2, FileHeart, FlaskConical, HeartPulse, Pill as PillI, ShieldCheck, Sparkles, Stethoscope, Dumbbell, Moon, Truck, TrendingUp, Footprints, Brain, Home as HomeI, BadgeIndianRupee } from 'lucide-react';
import { C, FONT, SERIF, sp, clamp, easeOut } from './theme';
import { Copy, Float, Avatar, Mascot, AV } from './kit';
import { SceneProps, outro } from './scenes/common';

/* A small fact card for the right-hand column. */
const Fact: React.FC<{ icon: React.ComponentType<any>; tone?: string; bg?: string; k: string; v: React.ReactNode; who?: keyof typeof AV; dark?: boolean }> = ({ icon: I, tone = C.brand, bg = C.brand50, k, v, who, dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    {who ? <Avatar who={who} size={46} /> : <div style={{ width: 46, height: 46, borderRadius: 15, background: dark ? 'rgba(255,255,255,.12)' : bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><I size={22} color={dark ? '#cfc9ff' : tone} /></div>}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: dark ? 'rgba(255,255,255,.6)' : C.ink5, letterSpacing: '.01em' }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: dark ? '#fff' : C.ink, letterSpacing: '-0.015em', lineHeight: 1.25, marginTop: 2 }}>{v}</div>
    </div>
  </div>
);

type Story = {
  tag: string; a: string; b: string; body?: string; size?: number;
  facts: { at: number; icon: React.ComponentType<any>; k: string; v: React.ReactNode; tone?: string; bg?: string; who?: keyof typeof AV }[];
  mascot?: { pose: 'idle' | 'cheer' | 'joy' | 'celebrate' | 'present'; x: number; y: number; w: number; at: number };
  dark?: boolean; confetti?: number;
};

/* Every story scene: the same grammar as v1. Copy on the left, the phone, facts on the right. */
export const STORIES: Record<string, Story> = {
  plan: { tag: 'Planning a baby', a: 'He asks for her.', b: 'Cheeku answers from her reports.',
    facts: [
      { at: 0.38, icon: HeartPulse, k: "Priya's thyroid", v: 'TSH 5.8, aim under 2.5', tone: C.attention, bg: C.attentionBg },
      { at: 0.52, icon: PillI, k: 'Start today', v: 'Folic acid, 400 mcg' },
      { at: 0.66, icon: FileHeart, k: 'Cited', v: 'Her thyroid panel, 26 Sep' },
    ], mascot: { pose: 'present', x: 120, y: 760, w: 210, at: 0.2 } },
  labs: { tag: 'Lab tests at home', a: 'Booked in a tap.', b: 'Filed by itself.',
    facts: [
      { at: 0.22, icon: FlaskConical, k: '5 labs compared', v: 'Thyroid profile · ₹380' },
      { at: 0.4, icon: CalendarCheck, k: 'Home collection', v: 'Today, 8 to 10 am' },
      { at: 0.7, icon: TrendingUp, k: 'Tracked over time', v: 'TSH 4.9 → 5.8', tone: C.attention, bg: C.attentionBg },
    ] },
  preg: { tag: 'Pregnancy', a: "It's positive.", b: 'Week 12, remembered.', confetti: 0.1,
    facts: [
      { at: 0.35, icon: Baby, k: 'Due', v: '13 May 2027' },
      { at: 0.5, icon: ShieldCheck, k: 'Every value', v: 'Read in pregnancy ranges', tone: C.safeText, bg: C.safeBg },
    ], mascot: { pose: 'joy', x: 150, y: 740, w: 220, at: 0.1 } },
  gyne: { tag: 'A gynaecologist for her', a: 'The right doctor,', b: 'with her whole story.',
    facts: [
      { at: 0.25, icon: FileHeart, k: 'Pre-consultation note', v: 'Sent before the call' },
      { at: 0.55, icon: Stethoscope, k: 'Dr. Kavya Rao', v: 'Video, today 10:30 am' },
    ] },
  medcheck: { tag: 'Medicine check', a: 'Salt level, 10 standards,', b: 'against her history.', size: 60,
    facts: [
      { at: 0.2, icon: ShieldCheck, k: 'Orofer XT', v: 'Fits Priya', tone: C.safeText, bg: C.safeBg },
      { at: 0.4, icon: PillI, k: 'Same salt she already takes', v: 'Stop the old iron', tone: C.attention, bg: C.attentionBg },
      { at: 0.62, icon: BadgeIndianRupee, k: 'Same salt, for less', v: '₹38 instead of ₹179', tone: '#0e8478', bg: '#e4f5f2' },
    ] },
  baby: { tag: 'Baby', a: 'Tara arrives.', b: 'Her own file, day one.', confetti: 0.3,
    facts: [
      { at: 0.45, icon: Baby, k: 'Tara', v: 'Joins the family', who: 'tara' },
      { at: 0.6, icon: ShieldCheck, k: 'Newborn limits', v: 'Apply from today', tone: C.safeText, bg: C.safeBg },
    ], mascot: { pose: 'celebrate', x: 110, y: 720, w: 240, at: 0.25 } },
  fever: { tag: 'A paediatrician for Tara', a: 'Midnight fever.', b: 'A doctor, tonight.', dark: true,
    facts: [
      { at: 0.3, icon: Moon, k: '7 weeks old', v: '100.6°F at 11:40 pm' },
      { at: 0.48, icon: HeartPulse, k: 'Under 3 months', v: 'See a doctor tonight' },
      { at: 0.66, icon: Stethoscope, k: 'Written for the doctor', v: 'Her age, her temperature' },
    ] },
  after: { tag: 'After the consultation', a: 'Nothing gets lost', b: 'after the call.',
    facts: [
      { at: 0.2, icon: FileHeart, k: 'Prescription', v: 'Read and filed' },
      { at: 0.4, icon: PillI, k: 'Doses', v: 'Only if 100.4°F or more' },
      { at: 0.62, icon: CalendarCheck, k: 'Still open', v: 'Follow-up tomorrow' },
    ] },
  care: { tag: 'Every kind of care', a: 'One place', b: 'for all of it.',
    facts: [
      { at: 0.12, icon: Stethoscope, k: 'GP for Arjun', v: 'Video, 11:00 am', who: 'arjun' },
      { at: 0.32, icon: Brain, k: 'Mind and body', v: 'Therapy · Physio · Dental · Eyes' },
      { at: 0.5, icon: HomeI, k: 'At home', v: 'Nurses · Newborn care' },
      { at: 0.66, icon: Truck, k: 'Medicines', v: 'Refills delivered' },
      { at: 0.8, icon: ShieldCheck, k: 'Health insurance', v: 'Coming soon', tone: C.ink5, bg: '#efeff5' },
    ] },
  fit: { tag: 'Fitness', a: 'A class picked', b: 'for his numbers.',
    facts: [
      { at: 0.2, icon: Dumbbell, k: 'Gym for beginners', v: '900 m away · ₹170' },
      { at: 0.4, icon: Sparkles, k: 'Why this one', v: 'Steady movement for sugar' },
    ] },
  engine: { tag: 'Longevity engine', a: 'Small steps,', b: 'longer lives.',
    facts: [
      { at: 0.28, icon: Footprints, k: 'Arjun', v: 'Oats or isabgol at breakfast', who: 'arjun' },
      { at: 0.42, icon: PillI, k: 'Priya', v: 'Thyroid tablet before chai', who: 'meera' },
      { at: 0.56, icon: Baby, k: 'Tara', v: 'Vaccines due in 3 weeks', who: 'tara' },
    ] },
};

export const StoryFront: React.FC<SceneProps & { id: string }> = ({ id, f, dur }) => {
  const s = STORIES[id]; const out = outro(f, dur, 12);
  return (
    <>
      <Copy f={f} tag={s.tag} a={s.a} b={s.b} out={out} dark={s.dark} size={s.size ?? 66} y={s.mascot ? 300 : 340} />
      {s.mascot && <div style={{ position: 'absolute', left: s.mascot.x, top: s.mascot.y, opacity: sp(f, s.mascot.at * dur) * out,
        transform: `translateY(${(1 - sp(f, s.mascot.at * dur)) * 40}px)` }}><Mascot pose={s.mascot.pose} w={s.mascot.w} /></div>}
      {s.facts.map((x, i) => (
        <Float key={i} f={f} d={Math.round(x.at * dur)} x={1250} y={s.facts.length > 3 ? 230 + i * 118 : 300 + i * 128} w={420} out={out} dark={s.dark} pad={18}>
          <Fact icon={x.icon} k={x.k} v={x.v} tone={x.tone} bg={x.bg} who={x.who} dark={s.dark} />
        </Float>
      ))}
      {s.confetti !== undefined && <Confetti f={f - Math.round(s.confetti * dur)} />}
    </>
  );
};

/* A short burst in brand colours, for the two happy moments. */
const Confetti: React.FC<{ f: number }> = ({ f }) => {
  if (f < 0 || f > 75) return null;
  const cols = [C.brand, C.lime, '#ffb3d1', '#8a82f5', '#ffd27a'];
  return (
    <>
      {Array.from({ length: 70 }).map((_, i) => {
        const a = (i * 137.5 * Math.PI) / 180; const v = 9 + (i % 7) * 2.2;
        const x = 960 + Math.cos(a) * v * f * 1.4; const y = 470 + Math.sin(a) * v * f * 0.9 + 0.32 * f * f;
        const o = interpolate(f, [0, 6, 55, 75], [0, 1, 1, 0], clamp);
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 10 + (i % 3) * 4, height: 6 + (i % 2) * 6, borderRadius: i % 4 === 0 ? 8 : 2,
          background: cols[i % cols.length], opacity: o, transform: `rotate(${i * 40 + f * (8 + (i % 5))}deg)` }} />;
      })}
    </>
  );
};

export const sceneIntro = (f: number) => interpolate(f, [0, 14], [0, 1], { ...clamp, easing: easeOut });
export { FONT, SERIF };
