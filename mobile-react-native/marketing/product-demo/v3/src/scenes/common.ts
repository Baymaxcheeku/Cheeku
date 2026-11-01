import React from 'react';
export type VO = { from: number; dur: number; text: string };
export type SceneProps = { f: number; dur: number; vo: VO[] };
export type Scene = {
  back?: React.FC<SceneProps>;   // under the phone
  front?: React.FC<SceneProps>;  // over the phone
  screen?: React.FC<SceneProps>; // inside the phone
  night?: boolean;
  darkScreen?: boolean;
};
/** Local frame at which `word` starts inside a VO line, estimated from its character position. */
export const wt = (v: VO | undefined, word: string, fallback = 0) => {
  if (!v) return fallback;
  const i = v.text.toLowerCase().indexOf(word.toLowerCase());
  return i < 0 ? v.from : Math.round(v.from + (v.dur * i) / v.text.length);
};
/** Fade-out factor for the last `n` frames of a scene. */
export const outro = (f: number, dur: number, n = 10) => Math.max(0, Math.min(1, (dur + 4 - f) / n));
