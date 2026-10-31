import { loadFont } from '@remotion/fonts';
import { staticFile, interpolate, spring, Easing } from 'remotion';

// Tokens mirror mobile-react-native/tailwind.config.js (sampled from the approved design frames).
export const C = {
  brand50: '#f1f0fe', brand100: '#dcdafb', brand200: '#c6c6f6', brand300: '#aeaeea', brand400: '#8a82f5',
  brand: '#5b4ef0', brand600: '#4a2ade', brand700: '#3b2bc9', brand900: '#14136b', brand950: '#0a0a3c',
  canvas: '#fafafe', surface: '#ffffff', tint: '#f6f6fe',
  ink: '#0f1030', ink7: '#3a3b57', ink5: '#6b6c8a', ink3: '#9696ae', line: '#e8e8f4',
  safe: '#23af5f', safeBg: '#e7f7ee', safeText: '#0f7538',
  caution: '#ffaf23', cautionBg: '#fff4e0', cautionText: '#8f5400',
  danger: '#ea2a36', dangerBg: '#fef1f3', dangerText: '#c00a1c',
  attention: '#e8590c', attentionBg: '#fff0e6',
  lime: '#e4ff7a', limeInk: '#2f3d00',
};
export const FONT = 'Inter';
export const SERIF = 'Instrument Serif';
export const FPS = 30;

let loaded: Promise<unknown> | null = null;
export const loadFonts = () => {
  if (loaded) return loaded;
  loaded = Promise.all([
    loadFont({ family: FONT, url: staticFile('fonts/Inter_400Regular.ttf'), weight: '400' }),
    loadFont({ family: FONT, url: staticFile('fonts/Inter_500Medium.ttf'), weight: '500' }),
    loadFont({ family: FONT, url: staticFile('fonts/Inter_600SemiBold.ttf'), weight: '600' }),
    loadFont({ family: FONT, url: staticFile('fonts/Inter_700Bold.ttf'), weight: '700' }),
    loadFont({ family: SERIF, url: staticFile('fonts/InstrumentSerif_400Regular.ttf'), weight: '400' }),
    loadFont({ family: SERIF, url: staticFile('fonts/InstrumentSerif_400Regular_Italic.ttf'), weight: '400', style: 'italic' }),
  ]);
  return loaded;
};

// ---- motion helpers ----
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
/** 0..1 spring that starts at `delay` frames. Soft, critically damped by default. */
export const sp = (frame: number, delay = 0, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - delay, fps: FPS, config: { damping: 20, stiffness: 120, mass: 0.9, ...cfg } });
/** linear-ish ramp with ease out */
export const ramp = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: easeOut });
export const rampIO = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: easeInOut });
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Text typed at `cps` characters a second from `start`. */
export const typed = (text: string, frame: number, start: number, cps = 26) =>
  text.slice(0, Math.max(0, Math.floor(((frame - start) / FPS) * cps)));
export const sec = (s: number) => Math.round(s * FPS);
