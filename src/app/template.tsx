/**
 * Wraps every route so navigations animate.
 *
 * A `template.tsx` differs from a layout in exactly the way this needs: React
 * remounts it on every navigation rather than reusing it, so the enter
 * animation replays each time instead of running once for the session.
 *
 * This is a real box rather than `display: contents`, which cannot be animated
 * — an element with no box has nothing to animate. It stays transparent to
 * layout anyway because every screen sizes itself against `min-h-app`, a fixed
 * value, rather than inheriting a height from this wrapper.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="screen-enter">{children}</div>;
}
