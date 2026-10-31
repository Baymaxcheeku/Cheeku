import React from 'react';
import { Composition } from 'remotion';
import { Demo } from './Demo';
import timeline from './timeline.json';
export const Root: React.FC = () => (
  <>
    <Composition id="Demo" component={Demo} durationInFrames={timeline.total} fps={30} width={1920} height={1080} defaultProps={{ audio: true }} />
    <Composition id="Silent" component={Demo} durationInFrames={timeline.total} fps={30} width={1920} height={1080} defaultProps={{ audio: false }} />
  </>
);
