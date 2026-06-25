// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx
// Reusable animation starter: Stage, Timeline, Sprite, easing helpers.
// Exports (to window): Stage, Sprite, PlaybackBar, TextSprite, ImageSprite, RectSprite,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
// Usage (in an HTML file that loads React + Babel):
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <MyScene />
//   </Stage>
//
// <Stage> auto-scales to the viewport and provides the scrubber, play/pause,
// â†/â†’ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Easing functions (hand-rolled, Popmotion-style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// All easings take t âˆˆ [0,1] and return eased t âˆˆ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// â”€â”€ Core interpolation helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) â€” simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// â”€â”€ Timeline context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// â”€â”€ Sprite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper â€” children can call useSprite() themselves.

const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration)
    ? clamp(localTime / duration, 0, 1)
    : 0;

  const value = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// â”€â”€ Sample sprite components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0, y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0, y = 0,
  width = 400, height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null, // {label: string} for striped placeholder
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
  );

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity',
    }}>
      {content}
    </div>
  );
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive â€” takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0, y = 0,
  width = 100, height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render, // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const { localTime, duration } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  const overrides = render ? render(spriteCtx) : {};

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides,
    }} />
  );
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children,
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ':t', String(time)); } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 0; // playback bar removed â€” runs like an autoplay loop
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, â† â†’ = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area â€” vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div
          ref={canvasRef}
          style={{
            width, height,
            background,
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

    </div>
  );
}

// â”€â”€ Playback bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Sprite, SpriteContext, useSprite,
  TextSprite, ImageSprite, RectSprite,
  Stage, PlaybackBar,
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  RIGHT STOCK â€” Demand Forecasting & Inventory explainer
//  Told from the customer's seat: a retail ops manager working inside the
//  real Right stock app. Five scenes on a 1600Ã—1010 design box, centered +
//  scaled to fit whichever aspect ratio (16:9 or 1:1) the Stage renders at.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const FONT = '"DM Sans", system-ui, -apple-system, sans-serif';
const MONO = '"DM Mono", ui-monospace, monospace';
const SHADOW    = '0 28px 60px rgba(15,23,42,0.13), 0 8px 20px rgba(15,23,42,0.06)';
const SHADOW_SM = '0 10px 24px rgba(15,23,42,0.08)';

function makePalette(primary) {
  const teal = primary || '#0d9488';
  return {
    bg: '#e9efee',
    panel: '#ffffff',
    ink: '#0f172a', sub: '#52617a', mut: '#94a3b8',
    teal, tealDk: '#0f766e', tealMid: '#5eead4', tealTint: '#d7f2ed', tealSoft: '#ecfaf6',
    red: '#ef4444', redDk: '#e11d48', redTint: '#fde7ea', redLine: '#f6c6cd',
    green: '#16a34a', greenDk: '#15803d', greenTint: '#dcfce7', greenMid: '#86efac', greenSoft: '#f1faf4',
    amber: '#d97706', amberTint: '#fdf0dd',
    line: '#e7edec',
  };
}

// â”€â”€ tiny helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ez(localTime, start, dur, fn) {
  return (fn || Easing.easeOutCubic)(clamp((localTime - start) / (dur || 0.6), 0, 1));
}
function rise(localTime, start, dur, dy) {
  const e = ez(localTime, start, dur || 0.6);
  return { opacity: e, transform: `translateY(${(1 - e) * (dy == null ? 20 : dy)}px)` };
}
function fadeUp(localTime, start, dur, dy) {
  const e = clamp((localTime - start) / (dur || 0.5), 0, 1);
  return { opacity: e, transform: `translateY(${(1 - e) * (dy == null ? 16 : dy)}px)` };
}

function SceneBox({ W, H, children }) {
  const fit = Math.min(W / 1600, H / 1010);
  return (
    <div style={{
      position: 'absolute', left: W / 2, top: H / 2,
      width: 1600, height: 1010, marginLeft: -800, marginTop: -505,
      transform: `scale(${fit})`, transformOrigin: 'center',
    }}>{children}</div>
  );
}

function SceneFade({ fin = 0.55, fout = 0.55, children }) {
  const { localTime, duration } = useSprite();
  let o = 1;
  if (localTime < fin) o = Easing.easeOutCubic(clamp(localTime / fin, 0, 1));
  else if (localTime > duration - fout) o = 1 - Easing.easeInCubic(clamp((localTime - (duration - fout)) / fout, 0, 1));
  return <div style={{ position: 'absolute', inset: 0, opacity: o }}>{children}</div>;
}

function CenterWindow({ scale = 1, opacity = 1, y = 505, children }) {
  return (
    <div style={{ position: 'absolute', left: 800, top: y, transform: `translate(-50%,-50%) scale(${scale})`, opacity, transformOrigin: 'center' }}>
      {children}
    </div>
  );
}

function Check({ p = 1, color = '#fff', size = 30, sw = 3.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.2 4.3L19 7.5" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - clamp(p, 0, 1)} />
    </svg>
  );
}
function DownArrow({ size = 22, color = '#16a34a' }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 4v14M12 18l-6-6M12 18l6-6" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
function UpArrow({ size = 22, color = '#0d9488' }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 20V6M12 6l-6 6M12 6l6 6" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
function Chevron({ size = 16, color = '#94a3b8' }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
function Placeholder({ w, h, label, radius = 14 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg,#eef1f4 0 10px,#e4e8ed 10px 20px)',
      color: '#9aa7b8', fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>{label}</div>
  );
}

// â”€â”€ app chrome â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NavIcon({ type, color }) {
  const c = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const W = (ch) => <svg width="22" height="22" viewBox="0 0 24 24">{ch}</svg>;
  if (type === 'grid') return W(<g {...c}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></g>);
  if (type === 'chart') return W(<g {...c}><path d="M4 19V5" /><path d="M4 19h16" /><path d="M7.5 15l3.5-4.5 3 2.8 4-5.3" /></g>);
  if (type === 'box') return W(<g {...c}><path d="M3.5 7.5l8.5-4 8.5 4v9l-8.5 4-8.5-4v-9z" /><path d="M3.5 7.5l8.5 4 8.5-4" /><path d="M12 11.5V20" /></g>);
  if (type === 'bell') return W(<g {...c}><path d="M6.5 9a5.5 5.5 0 0111 0c0 4.5 2 5.5 2 5.5h-15s2-1 2-5.5z" /><path d="M10 19a2 2 0 004 0" /></g>);
  return null;
}

function DateChip({ C, text, tone }) {
  const t = tone === 'green' ? { bg: C.greenTint, fg: C.greenDk } : { bg: '#fff', fg: C.sub };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: t.bg, border: `1.5px solid ${tone === 'green' ? C.greenMid : C.line}`, borderRadius: 10, padding: '9px 16px', fontSize: 16, fontWeight: 600, color: t.fg }}>
      {tone === 'green' && <span style={{ width: 9, height: 9, borderRadius: 5, background: C.green }} />}{text}{!tone && <Chevron size={14} color={C.mut} />}
    </div>
  );
}

function AppShell({ C, active, title, headerRight, children }) {
  const nav = [
    { label: 'Dashboard', icon: 'grid' },
    { label: 'Forecast', icon: 'chart' },
    { label: 'Inventory', icon: 'box' },
    { label: 'Alerts', icon: 'bell' },
  ];
  const dot = (col) => <span style={{ width: 13, height: 13, borderRadius: 7, background: col }} />;
  return (
    <div style={{ width: 1360, height: 812, borderRadius: 22, background: '#fff', boxShadow: SHADOW, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: FONT, border: `1px solid ${C.line}` }}>
      {/* title bar */}
      <div style={{ height: 52, background: '#f3f6f6', borderBottom: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 9, flexShrink: 0 }}>
        {dot('#ff5f57')}{dot('#febc2e')}{dot('#28c840')}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 8, padding: '6px 22px', fontSize: 15, color: C.mut, fontFamily: MONO }}>app.rightstock.io</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* sidebar */}
        <div style={{ width: 230, background: '#fbfcfc', borderRight: `1.5px solid ${C.line}`, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 10px 22px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 15l5 5M9 20l11-13" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>Right stock</span>
          </div>
          {nav.map((n, i) => {
            const on = i === active;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderRadius: 11, background: on ? C.tealSoft : 'transparent', color: on ? C.tealDk : C.sub, fontWeight: on ? 700 : 600, fontSize: 18 }}>
                <NavIcon type={n.icon} color={on ? C.teal : C.mut} />{n.label}
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 10px 2px', borderTop: `1.5px solid ${C.line}` }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#dfe7e6,#c7d4d2)' }} />
            <div><div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Maya Chen</div><div style={{ fontSize: 13, color: C.mut }}>Ops manager</div></div>
          </div>
        </div>
        {/* main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f7f9f9' }}>
          <div style={{ height: 76, borderBottom: `1.5px solid ${C.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 }}>
            <div style={{ fontSize: 27, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>{title}</div>
            <div>{headerRight}</div>
          </div>
          <div style={{ flex: 1, padding: 30, position: 'relative', minHeight: 0 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ C, label, value, sub, accent, icon, style }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 16, padding: '20px 24px', ...style }}>
      <div style={{ fontSize: 17, color: C.sub, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 46, fontWeight: 800, color: accent || C.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
        {icon}
      </div>
      <div style={{ fontSize: 15, color: C.mut, marginTop: 8 }}>{sub}</div>
    </div>
  );
}

function Cursor({ x, y, pressed }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${pressed ? 0.86 : 1})`, transformOrigin: 'top left', zIndex: 60, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.28))' }}>
      {pressed && <div style={{ position: 'absolute', left: 2, top: 2, width: 44, height: 44, marginLeft: -22, marginTop: -22, borderRadius: '50%', border: `3px solid rgba(13,148,136,0.45)` }} />}
      <svg width="36" height="36" viewBox="0 0 24 24"><path d="M5 2l13 8-5.6 1.3 3.3 6.5-2.8 1.4-3.3-6.5L5 17V2z" fill="#fff" stroke="#0f172a" strokeWidth="1.4" strokeLinejoin="round" /></svg>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 1 â€” THE PAIN â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// The customer's "before": a hand-maintained spreadsheet full of guesswork.
function SheetWindow({ C, t }) {
  const rows = [
    { n: 1, p: 'Aurora Runner',  sku: '48201', on: '0',     st: 'Out of stock',      k: 'red' },
    { n: 2, p: 'Trail Glove 4',  sku: '48207', on: '1,240', st: 'Overstock Â· $42k', k: 'amber' },
    { n: 3, p: 'Cloud Tee',      sku: '50114', on: '8',     st: 'Low',               k: 'amber' },
    { n: 4, p: 'Summit Jacket',  sku: '51002', on: '612',   st: 'Overstock',         k: 'amber' },
    { n: 5, p: 'Drift Sandal',   sku: '49980', on: '0',     st: 'Out of stock',      k: 'red' },
    { n: 6, p: 'Pace Sock 3pk',  sku: '47710', on: '96',    st: 'OK',                k: 'ok' },
  ];
  const tone = (k) => k === 'red' ? { bg: C.redTint, fg: C.redDk } : k === 'amber' ? { bg: C.amberTint, fg: C.amber } : { bg: C.greenTint, fg: C.greenDk };
  const cols = '54px 1fr 150px 150px 230px';
  const Cell = ({ children, style }) => <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', ...style }}>{children}</div>;

  return (
    <div style={{ width: 1180, height: 760, borderRadius: 14, background: '#fff', boxShadow: SHADOW, overflow: 'hidden', fontFamily: FONT, border: `1px solid ${C.line}` }}>
      {/* sheet titlebar */}
      <div style={{ height: 56, background: '#1f7a4d', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 13 }}>
        <div style={{ width: 26, height: 26, borderRadius: 5, background: '#fff', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 5, border: `2px solid #1f7a4d`, borderRadius: 2 }} />
        </div>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 19 }}>inventory_plan_v7_FINAL.xlsx</span>
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>â€” updated by hand, weekly</span>
      </div>
      {/* toolbar */}
      <div style={{ height: 42, borderBottom: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 22, padding: '0 22px', color: C.mut, fontSize: 15, background: '#fafbfb' }}>
        <span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Data</span>
      </div>
      {/* column header */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, height: 50, background: '#f4f6f6', borderBottom: `1.5px solid ${C.line}`, fontSize: 16, fontWeight: 700, color: C.sub }}>
        <Cell style={{ justifyContent: 'center', color: C.mut }} />
        <Cell>Product</Cell>
        <Cell>On hand</Cell>
        <Cell>Reorder qty?</Cell>
        <Cell>Status</Cell>
      </div>
      {/* rows */}
      {rows.map((r, i) => {
        const tn = tone(r.k);
        const o = clamp((t - 0.3 - i * 0.08) / 0.4, 0, 1);
        return (
          <div key={r.n} style={{ display: 'grid', gridTemplateColumns: cols, height: 102, borderBottom: `1px solid ${C.line}`, opacity: o, background: i % 2 ? '#fcfdfd' : '#fff' }}>
            <Cell style={{ justifyContent: 'center', color: C.mut, fontFamily: MONO, fontSize: 15, background: '#f4f6f6', borderRight: `1px solid ${C.line}` }}>{r.n}</Cell>
            <Cell>
              <Placeholder w={52} h={52} label="" radius={10} />
              <div style={{ marginLeft: 16 }}>
                <div style={{ fontSize: 21, fontWeight: 700, color: C.ink }}>{r.p}</div>
                <div style={{ fontSize: 14, color: C.mut, fontFamily: MONO, marginTop: 3 }}>SKU {r.sku}</div>
              </div>
            </Cell>
            <Cell style={{ fontSize: 22, fontWeight: 700, color: r.on === '0' ? C.redDk : C.ink, fontFamily: MONO }}>{r.on}</Cell>
            <Cell style={{ fontSize: 30, fontWeight: 800, color: C.redDk, fontFamily: MONO }}>??</Cell>
            <Cell>
              <span style={{ background: tn.bg, color: tn.fg, fontWeight: 700, fontSize: 16, padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap' }}>{r.st}</span>
            </Cell>
          </div>
        );
      })}
    </div>
  );
}

function Scene1({ C }) {
  const { localTime: t } = useSprite();
  const Sticky = ({ start, x, y, rot, text }) => {
    const e = ez(t, start, 0.5, Easing.easeOutBack);
    const o = clamp((t - start) / 0.3, 0, 1);
    const wob = Math.sin((t - start) * 2.1) * (e > 0.2 ? 2.6 : 0);
    return (
      <div style={{
        position: 'absolute', left: x, top: y,
        transform: `translate(-50%,-50%) rotate(${rot}deg) translateY(${wob}px) scale(${0.6 + 0.4 * e})`, opacity: o,
        background: C.red, color: '#fff', fontWeight: 700, fontSize: 27, padding: '15px 26px', borderRadius: 13,
        boxShadow: '0 14px 30px rgba(225,29,72,0.4)', whiteSpace: 'nowrap', zIndex: 10, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ width: 11, height: 11, borderRadius: 6, background: '#fff' }} />{text}
      </div>
    );
  };
  return (
    <React.Fragment>
      <CenterWindow scale={0.96 + 0.04 * ez(t, 0.15, 0.6)} opacity={clamp(t / 0.4, 0, 1)}>
        <SheetWindow C={C} t={t} />
      </CenterWindow>
      <Sticky start={1.5} x={392} y={250} rot={-5} text="Lost sales" />
      <Sticky start={2.1} x={1150} y={300} rot={4} text="Cash stuck in dead stock" />
      <Sticky start={2.7} x={840} y={158} rot={-2} text="Guesswork â€” no real forecast" />
    </React.Fragment>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 2 â€” THE TURN â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Scene2Body({ C, t }) {
  const movers = [
    ['Aurora Runner', '48201', 'Rising', C.teal],
    ['Cloud Tee', '50114', 'Steady', C.sub],
    ['Trail Glove 4', '48207', 'Cooling', C.amber],
  ];
  const bars = [54, 70, 62, 88, 104, 96, 120, 138];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div style={{ display: 'flex', gap: 20 }}>
        <Stat C={C} label="Forecast accuracy" value="94%" sub="+6 pts vs last quarter" accent={C.teal} style={fadeUp(t, 2.3, 0.5)} />
        <Stat C={C} label="SKUs at risk" value="3" sub="down from 14" accent={C.ink} style={fadeUp(t, 2.45, 0.5)} />
        <Stat C={C} label="Inventory value" value="$1.24M" sub="âˆ’18% tied up" accent={C.ink} style={fadeUp(t, 2.6, 0.5)} />
      </div>
      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1.5, background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', ...fadeUp(t, 2.7, 0.5) }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>Demand outlook</div>
          <div style={{ fontSize: 14, color: C.mut, marginTop: 4 }}>Next 8 weeks Â· all SKUs</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 18 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * ez(t, 2.9 + i * 0.04, 0.5)}%`, maxHeight: h * 1.4, background: i > 5 ? C.teal : C.tealMid, borderRadius: '8px 8px 4px 4px', minHeight: 6 }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 16, padding: 24, ...fadeUp(t, 2.85, 0.5) }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Top movers</div>
          {movers.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <Placeholder w={42} h={42} label="" radius={9} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{m[0]}</div>
                <div style={{ fontSize: 13, color: C.mut, fontFamily: MONO }}>SKU {m[1]}</div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: m[3] }}>{m[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Scene2({ C }) {
  const { localTime: t } = useSprite();
  const head = clamp((t - 0.3) / 0.7, 0, 1);
  const headOut = clamp((t - 2.0) / 0.6, 0, 1);
  const headO = head * (1 - headOut);
  const win = ez(t, 1.9, 0.8, Easing.easeOutCubic);
  const Word = ({ children, start, color }) => <span style={{ display: 'inline-block', ...rise(t, start, 0.55, 22), color }}>{children}</span>;
  return (
    <React.Fragment>
      <div style={{
        position: 'absolute', left: 800, top: 430, transform: `translate(-50%,-50%) translateY(${-headOut * 44}px)`,
        textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 70, lineHeight: 1.16, color: C.ink,
        letterSpacing: '-0.02em', width: 1500, whiteSpace: 'nowrap', opacity: headO,
      }}>
        <div><Word start={0.4} color={C.ink}>Know what you'll sell</Word></div>
        <div style={{ marginTop: 6 }}><Word start={0.75} color={C.teal}>â€” before you sell it.</Word></div>
      </div>
      <CenterWindow scale={0.93 + 0.07 * win} opacity={win}>
        <AppShell C={C} active={0} title="Dashboard" headerRight={<DateChip C={C} text="This week" />}>
          <Scene2Body C={C} t={t} />
        </AppShell>
      </CenterWindow>
    </React.Fragment>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 3 â€” THE FORESIGHT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ForecastChart({ C, t, w, h, t0 }) {
  t0 = t0 == null ? 0.5 : t0;
  const PL = 64, PR = w - 30, PT = 26, PB = h - 50;
  const X = (wk) => PL + (wk / 13) * (PR - PL);
  const vmin = 90, vmax = 300;
  const Y = (v) => PB - ((v - vmin) / (vmax - vmin)) * (PB - PT);
  const pastW = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const pastV = [128, 140, 132, 156, 168, 160, 182, 196, 205];
  const futW = [8, 9, 10, 11, 12, 13];
  const futV = [205, 218, 230, 242, 252, 262];
  const band = [0, 11, 19, 27, 35, 44];
  const pts = (ws, vs) => ws.map((wk, i) => `${X(wk).toFixed(1)},${Y(vs[i]).toFixed(1)}`).join(' ');
  const upper = futW.map((wk, i) => `${X(wk).toFixed(1)},${Y(futV[i] + band[i]).toFixed(1)}`);
  const lower = futW.map((wk, i) => `${X(wk).toFixed(1)},${Y(futV[i] - band[i]).toFixed(1)}`).reverse();
  const Xnow = X(8), Xend = X(13);
  const pastReveal = (Xnow - PL) * ez(t, t0, 1.6, Easing.easeInOutCubic);
  const futReveal = (Xend - Xnow) * ez(t, t0 + 1.8, 1.6, Easing.easeInOutCubic);
  const bandOp = ez(t, t0 + 2.7, 0.9) * 0.5;
  const tipX = X(12), tipY = Y(futV[4]);
  const tip = ez(t, t0 + 3.9, 0.5, Easing.easeOutBack);
  const tipO = clamp((t - (t0 + 3.9)) / 0.3, 0, 1);
  const dotPulse = 1 + Math.sin(t * 4) * 0.12 * clamp(t - (t0 + 3.7), 0, 1);

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <clipPath id="rsPast"><rect x={PL} y="0" width={Math.max(0, pastReveal)} height={h} /></clipPath>
          <clipPath id="rsFut"><rect x={Xnow} y="0" width={Math.max(0, futReveal)} height={h} /></clipPath>
        </defs>
        {[0, 1, 2, 3].map(i => {
          const gy = PT + (i / 3) * (PB - PT);
          return <g key={i}><line x1={PL} y1={gy} x2={PR} y2={gy} stroke={C.line} strokeWidth="1.5" opacity={ez(t, 0.1 + i * 0.05, 0.4)} /><text x={PL - 12} y={gy + 5} textAnchor="end" fontFamily={MONO} fontSize="14" fill={C.mut} opacity={ez(t, 0.1, 0.4)}>{Math.round(vmax - (i / 3) * (vmax - vmin))}</text></g>;
        })}
        <line x1={Xnow} y1={PT - 8} x2={Xnow} y2={PB} stroke={C.mut} strokeWidth="2" strokeDasharray="3 7" opacity={ez(t, 0.4, 0.4) * 0.7} />
        <text x={Xnow} y={PT - 14} textAnchor="middle" fontFamily={MONO} fontSize="15" fill={C.mut} opacity={ez(t, 0.5, 0.4)}>now</text>
        <g clipPath="url(#rsFut)"><polygon points={`${upper.join(' ')} ${lower.join(' ')}`} fill={C.teal} opacity={bandOp} /></g>
        <g clipPath="url(#rsPast)"><polyline points={pts(pastW, pastV)} fill="none" stroke={C.teal} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></g>
        <g clipPath="url(#rsFut)"><polyline points={pts(futW, futV)} fill="none" stroke={C.teal} strokeWidth="5" strokeDasharray="11 9" strokeLinecap="round" strokeLinejoin="round" /></g>
        {t > t0 + 3.5 && (
          <g transform={`translate(${tipX},${tipY}) scale(${dotPulse})`}>
            <circle r="13" fill={C.teal} opacity="0.18" /><circle r="7" fill={C.teal} stroke="#fff" strokeWidth="3" />
          </g>
        )}
      </svg>
      <div style={{ position: 'absolute', left: tipX, top: tipY - 124, transform: `translate(-50%,0) scale(${0.7 + 0.3 * tip})`, transformOrigin: 'bottom center', opacity: tipO }}>
        <div style={{ background: C.ink, color: '#fff', padding: '14px 20px', borderRadius: 14, boxShadow: SHADOW, textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 16, color: C.tealMid, fontWeight: 600 }}>Next 4 weeks</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 3 }}>Demand rising&nbsp;<span style={{ color: C.tealMid }}>+18%</span></div>
        </div>
        <div style={{ width: 16, height: 16, background: C.ink, transform: 'rotate(45deg)', margin: '-8px auto 0', borderRadius: 3 }} />
      </div>
    </div>
  );
}

function Scene3({ C }) {
  const { localTime: t } = useSprite();
  const chips = [['4 weeks', true], ['8 weeks', false], ['12 weeks', false]];
  const right = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', background: '#f1f5f5', borderRadius: 10, padding: 4 }}>
        {chips.map(([lab, on], i) => (
          <div key={i} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', color: on ? C.tealDk : C.mut, background: on ? '#fff' : 'transparent', boxShadow: on ? SHADOW_SM : 'none' }}>{lab}</div>
        ))}
      </div>
      <DateChip C={C} text="Aurora Runner" />
    </div>
  );
  const Leg = ({ color, label, dashed, swatch }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: C.sub, fontWeight: 600 }}>
      {swatch ? <span style={{ width: 20, height: 12, borderRadius: 4, background: color, opacity: 0.45 }} /> : <span style={{ width: 24, borderTop: `4px ${dashed ? 'dashed' : 'solid'} ${color}` }} />}{label}
    </div>
  );
  return (
    <CenterWindow>
      <AppShell C={C} active={1} title="Forecast" headerRight={right}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
          <div style={{ flex: 1, background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 21, fontWeight: 700, color: C.ink }}>Demand â€” Aurora Runner</div>
                <div style={{ fontSize: 14, color: C.mut, marginTop: 4 }}>units / week</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <Leg color={C.teal} label="Actual" /><Leg color={C.teal} dashed label="Forecast" /><Leg color={C.teal} swatch label="Confidence" />
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>
              <ForecastChart C={C} t={t} w={1000} h={420} t0={0.6} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
            <Stat C={C} label="Forecast accuracy" value="94%" sub="model confidence" accent={C.teal} style={fadeUp(t, 0.5, 0.5)} />
            <Stat C={C} label="Next 4 weeks" value="+18%" sub="projected demand" accent={C.teal} icon={<UpArrow size={26} color={C.teal} />} style={fadeUp(t, 0.65, 0.5)} />
            <Stat C={C} label="Confidence band" value="Â±8%" sub="tight & reliable" accent={C.ink} style={fadeUp(t, 0.8, 0.5)} />
          </div>
        </div>
      </AppShell>
    </CenterWindow>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 4 â€” THE ALERT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Scene4({ C }) {
  const { localTime: t } = useSprite();
  // cursor travels to the Reorder button and clicks
  const cx = interpolate([0, 1], [0, 1]); // placeholder unused
  const cursorX = animate({ from: 1040, to: 1338, start: 2.3, end: 3.4, ease: Easing.easeInOutCubic })(t);
  const cursorY = animate({ from: 740, to: 338, start: 2.3, end: 3.4, ease: Easing.easeInOutCubic })(t);
  const pressed = t > 3.45 && t < 3.7;
  const ordered = t > 3.6;                         // row 1 resolves
  const flip = clamp((t - 3.6) / 0.55, 0, 1);
  const flipE = Easing.easeOutBack(flip);
  const toast = ez(t, 3.7, 0.5, Easing.easeOutBack);
  const toastO = clamp((t - 3.7) / 0.3, 0, 1) * (1 - clamp((t - 7.0) / 0.5, 0, 1));
  const ring = ((t * 0.8) % 1.3) / 1.3;
  const freed = clamp((t - 5.2) / 0.55, 0, 1);     // row 2 resolves
  const freedE = Easing.easeOutBack(freed);

  const headerRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: ordered ? C.greenTint : C.redTint, border: `1.5px solid ${ordered ? C.greenMid : C.redLine}`, borderRadius: 10, padding: '9px 16px', fontSize: 16, fontWeight: 700, color: ordered ? C.greenDk : C.redDk }}>
      <span style={{ width: 9, height: 9, borderRadius: 5, background: ordered ? C.green : C.red }} />{ordered ? '1 active' : '2 active'}
    </div>
  );

  const Row = ({ y, name, sku, kind, children, tint, ringOn, appearAt }) => (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: y, height: 156,
      background: tint || '#fff', border: `1.5px solid ${kind === 'red' && !ordered ? C.redLine : kind === 'amber' && !freed ? '#f3dcae' : C.line}`,
      borderRadius: 16, padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 22,
      ...fadeUp(t, appearAt, 0.5), boxShadow: tint ? 'none' : SHADOW_SM,
    }}>
      <div style={{ position: 'relative' }}>
        <Placeholder w={108} h={108} label="shot" radius={14} />
        {ringOn && !ordered && <div style={{ position: 'absolute', inset: -6, borderRadius: 18, border: `2px solid ${C.red}`, transform: `scale(${1 + ring * 0.12})`, opacity: (1 - ring) * 0.7 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 25, fontWeight: 700, color: C.ink }}>{name}</div>
        <div style={{ fontSize: 15, color: C.mut, fontFamily: MONO, marginTop: 4 }}>SKU {sku} Â· 12 on hand</div>
      </div>
      {children}
    </div>
  );

  return (
    <React.Fragment>
      <CenterWindow>
        <AppShell C={C} active={3} title="Alerts" headerRight={headerRight}>
          <div style={{ position: 'relative', height: '100%' }}>
            {/* Row 1 â€” stockout risk â†’ covered */}
            <Row y={0} name="Aurora Runner" sku="48201" kind="red" appearAt={0.3} ringOn tint={ordered ? C.greenSoft : null}>
              <div style={{ textAlign: 'right', marginRight: 4 }}>
                {!ordered ? (
                  <React.Fragment>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: C.red, color: '#fff', fontWeight: 700, fontSize: 19, padding: '10px 18px', borderRadius: 999, opacity: 1 - flip }}>
                      <span style={{ width: 9, height: 9, borderRadius: 5, background: '#fff' }} />Stockout risk Â· 87%
                    </div>
                    <div style={{ fontSize: 15, color: C.redDk, fontWeight: 600, marginTop: 8 }}>in 9 days</div>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.green, color: '#fff', fontWeight: 700, fontSize: 19, padding: '10px 18px', borderRadius: 999, transform: `scale(${0.7 + 0.3 * flipE})` }}>
                      <Check p={flip} size={18} sw={3.2} />Covered
                    </div>
                    <div style={{ fontSize: 15, color: C.green, fontWeight: 600, marginTop: 8 }}>risk cleared</div>
                  </React.Fragment>
                )}
              </div>
              <div style={{ width: 220, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: C.tealDk, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>RECOMMENDED</div>
                <div style={{
                  background: ordered ? C.green : C.teal, color: '#fff', fontWeight: 700, fontSize: 20, padding: '15px 22px', borderRadius: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: `0 10px 22px ${ordered ? 'rgba(22,163,74,0.35)' : 'rgba(13,148,136,0.35)'}`,
                }}>
                  {ordered ? <Check p={flip} size={20} sw={3} /> : null}{ordered ? 'Ordered' : 'Reorder 320 units'}
                </div>
              </div>
            </Row>

            {/* Row 2 â€” overstock â†’ free up cash */}
            <Row y={176} name="Trail Glove 4" sku="48207" kind="amber" appearAt={0.5} tint={freed > 0.1 ? C.greenSoft : null}>
              <div style={{ textAlign: 'right', marginRight: 4 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: freed > 0.1 ? C.green : C.amber, fontFamily: MONO }}>$42k</div>
                <div style={{ fontSize: 15, color: C.mut, fontWeight: 600, marginTop: 4 }}>excess inventory</div>
              </div>
              <div style={{ width: 220, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: C.amber, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>OVERSTOCK</div>
                {freed < 0.1 ? (
                  <div style={{ background: '#fff', border: `1.5px solid ${C.line}`, color: C.sub, fontWeight: 700, fontSize: 20, padding: '15px 22px', borderRadius: 13 }}>Rebalance</div>
                ) : (
                  <div style={{ background: C.greenTint, color: C.greenDk, fontWeight: 700, fontSize: 19, padding: '15px 18px', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transform: `scale(${0.8 + 0.2 * freedE})` }}>
                    <DownArrow size={20} color={C.greenDk} />Free up $42k
                  </div>
                )}
              </div>
            </Row>

            {/* Row 3 â€” minor, stays (realism) */}
            <Row y={352} name="Cloud Tee" sku="50114" kind="amber" appearAt={0.7}>
              <div style={{ textAlign: 'right', marginRight: 4 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: C.amberTint, color: C.amber, fontWeight: 700, fontSize: 18, padding: '10px 18px', borderRadius: 999 }}>Low stock Â· watch</div>
                <div style={{ fontSize: 15, color: C.mut, fontWeight: 600, marginTop: 8 }}>reorder in ~3 wks</div>
              </div>
              <div style={{ width: 220, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: C.mut, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>MONITORING</div>
                <div style={{ background: '#fff', border: `1.5px solid ${C.line}`, color: C.sub, fontWeight: 700, fontSize: 20, padding: '15px 22px', borderRadius: 13 }}>Review</div>
              </div>
            </Row>

            {/* toast */}
            <div style={{ position: 'absolute', right: 6, top: -2, transform: `translateY(${(1 - toast) * -20}px) scale(${0.85 + 0.15 * toast})`, opacity: toastO, transformOrigin: 'top right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.ink, color: '#fff', padding: '15px 22px', borderRadius: 14, boxShadow: SHADOW, whiteSpace: 'nowrap' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check p={toastO} size={16} sw={3.4} /></span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>Reorder placed Â· 320 units</span>
              </div>
            </div>
          </div>
        </AppShell>
      </CenterWindow>
      {t > 2.2 && t < 4.2 && <Cursor x={cursorX} y={cursorY} pressed={pressed} />}
    </React.Fragment>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 5 â€” THE OUTCOME â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Scene5({ C }) {
  const { localTime: t } = useSprite();
  const winExit = clamp((t - 4.4) / 0.6, 0, 1);
  const end = clamp((t - 4.6) / 0.7, 0, 1);
  const endE = Easing.easeOutCubic(end);

  const Kpi = ({ start, label, target, prefix, suffix, sub, color, dir }) => {
    const v = target * ez(t, start, 1.7, Easing.easeOutCubic);
    const shown = (dir === 'down' ? 'âˆ’' : (prefix || '')) + Math.round(v) + (suffix || '');
    return (
      <div style={{ flex: 1, background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 18, padding: '28px 30px', ...fadeUp(t, start, 0.5) }}>
        <div style={{ fontSize: 20, color: C.sub, fontWeight: 600 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <span style={{ fontSize: 74, fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{shown}</span>
          {dir === 'down' ? <DownArrow size={34} color={color} /> : <UpArrow size={34} color={color} />}
        </div>
        <div style={{ fontSize: 17, color: C.mut, marginTop: 14 }}>{sub}</div>
      </div>
    );
  };

  return (
    <React.Fragment>
      <CenterWindow scale={1 - winExit * 0.05} opacity={1 - winExit}>
        <AppShell C={C} active={0} title="Dashboard" headerRight={<DateChip C={C} text="All clear" tone="green" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.greenSoft, border: `1.5px solid ${C.greenMid}`, borderRadius: 16, padding: '20px 26px', ...fadeUp(t, 0.2, 0.5) }}>
              <span style={{ width: 38, height: 38, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check p={ez(t, 0.4, 0.5)} size={22} sw={3.4} /></span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.greenDk }}>Inventory optimized this quarter</div>
                <div style={{ fontSize: 16, color: C.sub, marginTop: 3 }}>Right stock kept every best-seller in stock and freed up tied-up cash.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 22, flex: 1 }}>
              <Kpi start={0.5} label="Stockouts" target={64} dir="down" suffix="%" sub="fewer stockouts" color={C.green} />
              <Kpi start={0.7} label="Inventory cost" target={23} dir="down" suffix="%" sub="lower carrying cost" color={C.green} />
              <Kpi start={0.9} label="Customer satisfaction" target={96} dir="up" suffix="%" sub="CSAT this quarter" color={C.teal} />
            </div>
          </div>
        </AppShell>
      </CenterWindow>

      {/* end card */}
      <div style={{ position: 'absolute', inset: 0, opacity: end, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: 800, top: 505, transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <div style={{
            width: 108, height: 108, borderRadius: 27, background: C.teal, margin: '0 auto 34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${0.6 + 0.4 * endE}) rotate(${(1 - endE) * -12}deg)`, boxShadow: '0 18px 44px rgba(13,148,136,0.32)',
          }}>
            <svg width="58" height="58" viewBox="0 0 24 24" fill="none"><path d="M4 15l5 5M9 20l11-13" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ fontSize: 94, fontWeight: 700, color: C.ink, letterSpacing: '-0.03em', transform: `translateY(${(1 - endE) * 16}px)` }}>
            Right<span style={{ color: C.teal }}> stock</span>
          </div>
          <div style={{ marginTop: 22, fontSize: 38, color: C.sub, fontWeight: 500, opacity: clamp((t - 5.1) / 0.6, 0, 1), transform: `translateY(${(1 - clamp((t - 5.1) / 0.6, 0, 1)) * 14}px)` }}>
            Right stock. Right time. Every time.
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// â”€â”€ timeline ticker â†’ writes timestamp onto the video root for commenting â”€â”€
function Ticker() {
  const tt = useTime();
  React.useEffect(() => {
    const el = document.getElementById('rs-video-root');
    if (el) el.setAttribute('data-screen-label', `t=${Math.floor(tt)}s`);
  }, [Math.floor(tt)]);
  return null;
}

function RightStockVideo(props) {
  const aspect = props.aspect || '16:9';
  const W = aspect === '1:1' ? 1080 : 1920;
  const H = 1080;
  const C = makePalette(props.primary);
  const DUR = 36;
  return (
    <Stage width={W} height={H} duration={DUR} background={C.bg} persistKey={`rightstock:${aspect}`}>
      <Ticker />
      <Sprite start={0}     end={6.8}>  <SceneFade fin={0.45}><SceneBox W={W} H={H}><Scene1 C={C} /></SceneBox></SceneFade></Sprite>
      <Sprite start={6.3}   end={11.4}> <SceneFade><SceneBox W={W} H={H}><Scene2 C={C} /></SceneBox></SceneFade></Sprite>
      <Sprite start={10.9}  end={19.8}> <SceneFade><SceneBox W={W} H={H}><Scene3 C={C} /></SceneBox></SceneFade></Sprite>
      <Sprite start={19.3}  end={28.4}> <SceneFade><SceneBox W={W} H={H}><Scene4 C={C} /></SceneBox></SceneFade></Sprite>
      <Sprite start={27.9}  end={36.01}><SceneFade fout={0.6}><SceneBox W={W} H={H}><Scene5 C={C} /></SceneBox></SceneFade></Sprite>
    </Stage>
  );
}

Object.assign(window, { RightStockVideo });
if (typeof module !== 'undefined') module.exports = { RightStockVideo };
