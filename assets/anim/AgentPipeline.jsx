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
// ←/→ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
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

// ── Core interpolation helpers ──────────────────────────────────────────────

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

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

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

// ── Sample sprite components ────────────────────────────────────────────────

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
// Useful demo primitive — takes a `render` fn for per-frame customization.
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
  controls = true,
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
      const barH = 44; // playback bar height
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

  // Keyboard: space = play/pause, ← → = seek
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
        background,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
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

      {/* Playback bar — stacked below canvas, never overlapping.
          Hidden in embedded/portfolio use via controls={false}. */}
      {controls && <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />}
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
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



/* ============================================================
   Agent Pipeline — scene composition
   Uses the engine declared above (Stage, useTime, interpolate,
   Easing, clamp) — same file, so all are in lexical scope.
   ============================================================ */

const GREEN = {
  g950:'#0B2A19', g900:'#0E3320', g800:'#15452A', g700:'#1B5E34', g600:'#257A43',
  g500:'#2F9655', g400:'#5FB97E', g300:'#97D4AC', g200:'#C3E5CD', g100:'#E0F0E5',
  sage50:'#F2F5F0', sage100:'#E8ECE4', sage200:'#DEE3D9', sage300:'#CDD4C7',
  ink900:'#16201A', ink700:'#2C352E', ink500:'#545B51', ink400:'#7C8278', ink300:'#A7ACA2',
  amber:'#C9821F', white:'#FFFFFF'
};
const FONT = 'Inter, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeFn = (p, fn) => (fn || Easing.easeOutCubic)(clamp01(p));
// reveal: 0 before `delay`, eased 0..1 across `dur`, holds at 1
const rev = (t, delay, dur, fn) => easeFn((t - delay) / (dur || 0.0001), fn);
const typed = (str, t, delay, cps) => {
  const n = Math.max(0, Math.floor((t - delay) * (cps || 30)));
  return str.slice(0, Math.min(str.length, n));
};
const caretOn = (str, t, delay, cps) => {
  const n = Math.max(0, Math.floor((t - delay) * (cps || 30)));
  return t > delay && n < str.length;
};
const commas = (n) => Math.floor(n).toLocaleString('en-US');

/* ---- world layout ---- */
const WIN_W = 860, WIN_H = 660, WIN_TOP = 210, GAP = 380;
const PITCH = WIN_W + GAP;             // 1240
const cX = (i) => 600 + i * PITCH;     // window centre x
const winLeft = (i) => cX(i) - WIN_W / 2;

const STATIONS = [
  { name:'Orchestrator', role:'Plans & delegates', initial:'O', app:'orchestrator · console', dark:false },
  { name:'Researcher',   role:'Analyzes the data', initial:'R', app:'analytics.ipynb',        dark:false },
  { name:'Architect',    role:'Designs the system',initial:'A', app:'system-design · canvas', dark:false },
  { name:'Engineer',     role:'Writes the code',   initial:'E', app:'triage.py — Editor',     dark:true  },
  { name:'Designer',     role:'Builds the UI',     initial:'D', app:'support-widget.fig',     dark:false },
  { name:'QA Agent',     role:'Tests everything',  initial:'Q', app:'ci · test runner',       dark:false },
  { name:'Deployer',     role:'Ships to prod',     initial:'S', app:'deploy · terminal',      dark:true  },
  { name:'Monitor',      role:'Watches production',initial:'M', app:'observability · live',   dark:true  },
];
const IN  = [0.0, 2.8, 5.6, 8.4, 11.2, 14.0, 16.8, 19.6];
const OUT = [2.2, 5.0, 7.8, 10.6, 13.4, 16.2, 19.0, 21.8];
const localT = (i, t) => t - IN[i];
const statusOf = (i, t) => (t < IN[i] ? 'idle' : (t < OUT[i] ? 'work' : 'done'));

/* ===================== small primitives ===================== */

function Eyebrow({ children, color, style }) {
  return <div style={{
    fontFamily:FONT, fontSize:13, fontWeight:600, letterSpacing:'0.16em',
    textTransform:'uppercase', color: color || GREEN.ink400, ...style
  }}>{children}</div>;
}

function Caret({ show, color }) {
  return <span style={{
    display:'inline-block', width:2, height:'1em', marginLeft:1, transform:'translateY(2px)',
    background: color || GREEN.g500, opacity: show ? 1 : 0,
    animation:'apBlink 0.9s steps(1,end) infinite'
  }} />;
}

function Spinner({ size, color }) {
  const s = size || 16;
  return <div style={{
    width:s, height:s, borderRadius:'50%',
    border:`2px solid ${color ? 'rgba(255,255,255,0.18)' : 'rgba(21,69,42,0.16)'}`,
    borderTopColor: color || GREEN.g600, animation:'apSpin 0.7s linear infinite'
  }} />;
}

function Check({ size, color, bg }) {
  const s = size || 18;
  return <div style={{
    width:s, height:s, borderRadius:'50%', background: bg || GREEN.g600,
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
  }}>
    <svg width={s*0.62} height={s*0.62} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7" stroke={color || '#fff'} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>;
}

function StatusPill({ st }) {
  let dot = GREEN.ink300, text = 'Queued', col = GREEN.ink400, bg = 'rgba(124,130,120,0.12)', pulse = false, check = false;
  if (st === 'work') { dot = GREEN.amber; text = 'Working'; col = '#9A6314'; bg = 'rgba(201,130,31,0.14)'; pulse = true; }
  else if (st === 'done') { dot = GREEN.g600; text = 'Done'; col = GREEN.g700; bg = 'rgba(37,122,67,0.14)'; check = true; }
  return <div style={{
    display:'flex', alignItems:'center', gap:7, padding:'6px 13px 6px 11px',
    background:bg, borderRadius:999, fontFamily:FONT, fontSize:13, fontWeight:600, color:col
  }}>
    {check
      ? <Check size={15} />
      : <span style={{ width:8, height:8, borderRadius:'50%', background:dot,
          animation: pulse ? 'apPulse 1.1s ease-in-out infinite' : 'none' }} />}
    {text}
  </div>;
}

/* ===================== agent window ===================== */

function AgentWindow({ i, t }) {
  const s = STATIONS[i], st = statusOf(i, t), dark = s.dark;
  const surface = dark ? GREEN.g950 : GREEN.white;
  const headBg  = dark ? GREEN.g900 : '#FBFCF9';
  const barBg   = dark ? '#08210F' : '#EFF3EB';
  const textStrong = dark ? '#EAF2EC' : GREEN.g800;
  const sub = dark ? '#9FC0AE' : GREEN.ink400;
  const border = dark ? 'rgba(255,255,255,0.09)' : 'rgba(21,69,42,0.12)';
  const ring = (st === 'work') ? '0 0 0 3px rgba(47,150,85,0.30), ' : '';
  return <div style={{
    position:'absolute', left:winLeft(i), top:WIN_TOP, width:WIN_W, height:WIN_H,
    background:surface, borderRadius:26, border:`1px solid ${border}`,
    boxShadow:`${ring}0 30px 70px rgba(11,42,25,0.18)`, overflow:'hidden', fontFamily:FONT
  }}>
    {/* OS title bar */}
    <div style={{
      height:38, display:'flex', alignItems:'center', gap:9, padding:'0 16px',
      background:barBg, borderBottom:`1px solid ${border}`
    }}>
      <span style={{ width:12, height:12, borderRadius:'50%', background:'#ED6A5E' }} />
      <span style={{ width:12, height:12, borderRadius:'50%', background:'#F4BF4F' }} />
      <span style={{ width:12, height:12, borderRadius:'50%', background:'#61C554' }} />
      <span style={{ flex:1, textAlign:'center', fontFamily:MONO, fontSize:13, fontWeight:500,
        color: dark ? 'rgba(159,192,174,0.85)' : GREEN.ink400, letterSpacing:'0.01em',
        marginRight:38, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.app}</span>
    </div>
    {/* header */}
    <div style={{
      height:64, display:'flex', alignItems:'center', gap:14, padding:'0 22px',
      background:headBg, borderBottom:`1px solid ${border}`
    }}>
      <div style={{
        width:40, height:40, borderRadius:12, background: dark ? GREEN.g700 : GREEN.g800,
        color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:800, fontSize:18, letterSpacing:'-0.02em',
        boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.08)'
      }}>{s.initial}</div>
      <div style={{ display:'flex', flexDirection:'column', lineHeight:1.18 }}>
        <div style={{ fontSize:18, fontWeight:700, color:textStrong, letterSpacing:'-0.01em' }}>{s.name}</div>
        <div style={{ fontSize:13, color:sub, fontWeight:500 }}>{s.role}</div>
      </div>
      <div style={{ marginLeft:'auto' }}><StatusPill st={st} /></div>
    </div>
    {/* body */}
    <div style={{ padding:'22px 24px', height:WIN_H-102, boxSizing:'border-box', position:'relative' }}>
      <StationBody i={i} t={t} />
    </div>
  </div>;
}

/* ===================== bodies ===================== */

function StationBody({ i, t }) {
  const B = [Body0, Body1, BodyArch, Body2, Body3, Body4, Body5, BodyMon][i];
  return <B la={Math.max(0, localT(i, t))} t={t} />;
}

/* --- 0 · Orchestrator --- */
function Body0({ la }) {
  const req = 'Our support team is drowning. Can we cut reply time?';
  const tasks = [
    { n:'01', label:'Analyze 6 months of support tickets', to:'Researcher' },
    { n:'02', label:'Build an auto-triage + reply engine',  to:'Engineer' },
    { n:'03', label:'Design, test & ship the assistant',    to:'Designer +2' },
  ];
  return <div style={{ display:'flex', flexDirection:'column', gap:16, height:'100%' }}>
    <Eyebrow>Incoming request</Eyebrow>
    <div style={{ display:'flex', gap:13, alignItems:'flex-start' }}>
      <div style={{ width:38, height:38, borderRadius:'50%', background:GREEN.sage200, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:GREEN.g700, fontSize:15 }}>JM</div>
      <div style={{ background:GREEN.sage100, borderRadius:'4px 16px 16px 16px', padding:'13px 17px',
        fontSize:18, lineHeight:1.45, color:GREEN.ink900, fontWeight:500, maxWidth:580 }}>
        {typed(req, la, 0.15, 34)}<Caret show={caretOn(req, la, 0.15, 34)} />
      </div>
    </div>
    <div style={{ opacity:rev(la,1.0,0.4), display:'flex', alignItems:'center', gap:9, marginTop:2 }}>
      <span style={{ width:9, height:9, borderRadius:'50%', background:GREEN.g500 }} />
      <span style={{ fontSize:15, fontWeight:600, color:GREEN.g700 }}>Decomposing into a 6-agent pipeline…</span>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:11, marginTop:2 }}>
      {tasks.map((tk, k) => {
        const o = rev(la, 1.25 + k*0.28, 0.4, Easing.easeOutCubic);
        return <div key={k} style={{
          opacity:o, transform:`translateX(${(1-o)*-18}px)`,
          display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
          background:'#fff', border:`1px solid rgba(21,69,42,0.12)`, borderRadius:14,
          boxShadow:'0 2px 8px rgba(11,42,25,0.05)'
        }}>
          <span style={{ fontFamily:MONO, fontSize:13, fontWeight:600, color:GREEN.g400 }}>{tk.n}</span>
          <span style={{ fontSize:16.5, fontWeight:600, color:GREEN.ink900, flex:1 }}>{tk.label}</span>
          <span style={{ fontSize:13, fontWeight:600, color:GREEN.g600, background:GREEN.g100,
            padding:'5px 11px', borderRadius:999, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
            {tk.to}<span style={{ fontSize:15 }}>→</span></span>
        </div>;
      })}
    </div>
  </div>;
}

/* --- 1 · Researcher --- */
function Body1({ la }) {
  const q = 'SELECT month, avg(first_reply) FROM tickets GROUP BY 1;';
  const bars = [120, 150, 138, 176, 198, 214];
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  const count = commas(14932 * rev(la, 1.3, 0.8, Easing.easeOutCubic));
  return <div style={{ display:'flex', flexDirection:'column', gap:18, height:'100%' }}>
    <div style={{ fontFamily:MONO, fontSize:14.5, background:GREEN.sage50, border:`1px solid rgba(21,69,42,0.10)`,
      borderRadius:10, padding:'12px 14px', color:GREEN.g700, lineHeight:1.4 }}>
      <span style={{ color:GREEN.g400 }}>$ </span>{typed(q, la, 0.1, 40)}<Caret show={caretOn(q, la, 0.1, 40)} />
    </div>
    <Eyebrow style={{ marginTop:2 }}>Avg first-reply time by month (hours)</Eyebrow>
    <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:18, padding:'0 4px 0 4px', minHeight:0 }}>
      {bars.map((h, k) => {
        const gh = h * rev(la, 0.65 + k*0.1, 0.55, Easing.easeOutCubic);
        return <div key={k} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:9 }}>
          <div style={{ width:'100%', height:gh, background:`linear-gradient(180deg, ${GREEN.g500}, ${GREEN.g600})`,
            borderRadius:'8px 8px 3px 3px' }} />
          <div style={{ fontSize:13, fontWeight:600, color:GREEN.ink400 }}>{months[k]}</div>
        </div>;
      })}
    </div>
    <div style={{ display:'flex', gap:14, opacity:rev(la,1.25,0.5) }}>
      <div style={{ flex:1, background:GREEN.g100, borderRadius:14, padding:'14px 16px' }}>
        <div style={{ fontSize:30, fontWeight:800, color:GREEN.g800, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums' }}>{count}</div>
        <div style={{ fontSize:13.5, color:GREEN.ink500, fontWeight:500 }}>tickets analyzed</div>
      </div>
      <div style={{ flex:1.2, background:GREEN.g100, borderRadius:14, padding:'14px 16px' }}>
        <div style={{ fontSize:30, fontWeight:800, color:GREEN.g800, letterSpacing:'-0.02em' }}>
          7h 12m <span style={{ fontSize:18, color:GREEN.g500 }}>→ &lt; 5m</span></div>
        <div style={{ fontSize:13.5, color:GREEN.ink500, fontWeight:500 }}>avg wait, today vs. target</div>
      </div>
    </div>
  </div>;
}

/* --- 3 · Engineer (dark code editor, syntax highlighted) --- */
function TokenCodeLine({ tokens, la, start, cps, num }) {
  const cpsv = cps || 46;
  const full = tokens.reduce((a, tk) => a + tk.t.length, 0);
  const n = Math.max(0, Math.floor((la - start) * cpsv));
  const typing = la >= start && n < full;
  let used = 0;
  const segs = [];
  for (let k = 0; k < tokens.length; k++) {
    if (used >= n) break;
    const seg = tokens[k].t, take = Math.min(seg.length, n - used);
    segs.push(<span key={k} style={{ color: tokens[k].c }}>{seg.slice(0, take)}</span>);
    used += take;
  }
  return <div style={{ display:'flex', gap:16, borderRadius:6, padding:'1px 6px', margin:'0 -6px',
    background: typing ? 'rgba(95,185,126,0.09)' : 'transparent' }}>
    <span style={{ color:'rgba(159,192,174,0.38)', width:20, textAlign:'right', userSelect:'none', flexShrink:0 }}>{num}</span>
    <span style={{ whiteSpace:'pre', flex:1 }}>{la < start ? '' : segs}<Caret show={typing} color={GREEN.g400} /></span>
  </div>;
}

function Body2({ la }) {
  const kw='#C792EA', fn='#82AAFF', str='#C3E88D', num='#F78C6C', op='#89DDFF', txt='#D6E5DC', com='#5C7A68';
  const lines = [
    [{t:'# auto-triage every inbound ticket', c:com}],
    [{t:'def ',c:kw},{t:'route_ticket',c:fn},{t:'(ticket):',c:txt}],
    [{t:'    intent ',c:txt},{t:'= ',c:op},{t:'classify',c:fn},{t:'(ticket.text)',c:txt}],
    [{t:'    if ',c:kw},{t:'intent.urgency ',c:txt},{t:'> ',c:op},{t:'0.8',c:num},{t:':',c:txt}],
    [{t:'        return ',c:kw},{t:'escalate',c:fn},{t:'(ticket)',c:txt}],
    [{t:'    draft ',c:txt},{t:'= ',c:op},{t:'llm',c:fn},{t:'.reply(ticket, tone=',c:txt},{t:'"warm"',c:str},{t:')',c:txt}],
    [{t:'    return ',c:kw},{t:'send',c:fn},{t:'(draft)',c:txt}],
  ];
  const lineDelay = 0.17;
  return <div style={{ display:'flex', flexDirection:'column', gap:0, height:'100%' }}>
    {/* editor tab strip */}
    <div style={{ display:'flex', alignItems:'center', gap:2, marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:GREEN.g900, borderRadius:'8px 8px 0 0',
        padding:'8px 14px', borderBottom:`2px solid ${GREEN.g400}` }}>
        <span style={{ width:10, height:10, borderRadius:2, background:'#F78C6C' }} />
        <span style={{ fontFamily:MONO, fontSize:13.5, color:'#EAF2EC' }}>triage.py</span>
        <span style={{ width:7, height:7, borderRadius:'50%', background:'#9FC0AE', marginLeft:4 }} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', opacity:0.5 }}>
        <span style={{ width:10, height:10, borderRadius:2, background:'#82AAFF' }} />
        <span style={{ fontFamily:MONO, fontSize:13.5, color:'#9FC0AE' }}>agents.py</span>
      </div>
    </div>
    <div style={{ flex:1, fontFamily:MONO, fontSize:15.5, lineHeight:1.85 }}>
      {lines.map((ln, k) => <TokenCodeLine key={k} tokens={ln} la={la} start={0.15 + k*lineDelay} num={k+1} />)}
    </div>
    <div style={{ opacity:rev(la,1.5,0.4), borderTop:'1px solid rgba(255,255,255,0.09)', paddingTop:13,
      fontFamily:MONO, fontSize:14, display:'flex', alignItems:'center', gap:10, color:'#9FC0AE' }}>
      <span style={{ color:GREEN.g400 }}>›</span>
      <span style={{ color:'#D6E5DC' }}>pytest -q</span>
      <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, color:'#C3E88D' }}>
        <Check size={16} color={GREEN.g950} /> 6 passed in 0.42s</span>
    </div>
  </div>;
}

/* --- 3 · Designer --- */
function Body3({ la }) {
  const tools = 0;
  const head = rev(la, 0.2, 0.4, Easing.easeOutBack);
  const b1 = rev(la, 0.55, 0.45, Easing.easeOutBack);
  const b2 = rev(la, 0.95, 0.45, Easing.easeOutBack);
  const inp = rev(la, 1.35, 0.45, Easing.easeOutBack);
  return <div style={{ display:'flex', gap:18, height:'100%' }}>
    {/* tool rail */}
    <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:2 }}>
      {[0,1,2,3].map(k => <div key={k} style={{
        width:42, height:42, borderRadius:11, background: k===1 ? GREEN.g800 : GREEN.sage100,
        border:`1px solid rgba(21,69,42,0.10)`, display:'flex', alignItems:'center', justifyContent:'center',
        opacity:rev(la, 0.05+k*0.06, 0.3) }}>
        <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${k===1 ? '#fff' : GREEN.ink400}` }} />
      </div>)}
    </div>
    {/* canvas */}
    <div style={{ flex:1, background:GREEN.sage50, border:`1px dashed rgba(21,69,42,0.18)`, borderRadius:18,
      padding:24, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <Eyebrow style={{ position:'absolute', top:14, left:18, fontSize:11.5 }}>Support widget · preview</Eyebrow>
      {/* widget mock */}
      <div style={{ width:320, background:'#fff', borderRadius:20, overflow:'hidden',
        boxShadow:'0 18px 44px rgba(11,42,25,0.16)', border:'1px solid rgba(21,69,42,0.10)' }}>
        <div style={{ opacity:head, transform:`translateY(${(1-head)*-10}px)`,
          background:GREEN.g800, color:'#fff', padding:'15px 18px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:9, height:9, borderRadius:'50%', background:GREEN.g400 }} />
          <span style={{ fontWeight:700, fontSize:16 }}>Support</span>
          <span style={{ marginLeft:'auto', fontSize:12.5, color:GREEN.g300 }}>online</span>
        </div>
        <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', gap:12, minHeight:150 }}>
          <div style={{ opacity:b1, transform:`translateY(${(1-b1)*10}px)`, alignSelf:'flex-start',
            background:GREEN.g100, color:GREEN.ink900, padding:'10px 14px', borderRadius:'14px 14px 14px 4px',
            fontSize:14.5, maxWidth:220 }}>Hi! How can I help today?</div>
          <div style={{ opacity:b2, transform:`translateY(${(1-b2)*10}px)`, alignSelf:'flex-end',
            background:GREEN.g600, color:'#fff', padding:'10px 14px', borderRadius:'14px 14px 4px 14px',
            fontSize:14.5, maxWidth:220 }}>Where's my refund?</div>
        </div>
        <div style={{ opacity:inp, transform:`translateY(${(1-inp)*10}px)`,
          padding:'12px 14px', borderTop:'1px solid rgba(21,69,42,0.10)', display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ flex:1, height:38, borderRadius:999, background:GREEN.sage100, border:'1px solid rgba(21,69,42,0.10)',
            display:'flex', alignItems:'center', padding:'0 14px', color:GREEN.ink400, fontSize:14 }}>Message…</div>
          <div style={{ width:42, height:38, borderRadius:999, background:GREEN.g800, color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>→</div>
        </div>
      </div>
    </div>
  </div>;
}

/* --- 4 · QA --- */
function Body4({ la }) {
  const tests = [
    'classifies ticket urgency',
    'routes to the right agent',
    'drafts a warm reply',
    'handles an empty message',
    'redacts personal data',
    'logs every resolution',
  ];
  const passed = Math.min(6, Math.max(0, Math.floor(rev(la, 1.9, 0.6) * 6)));
  return <div style={{ display:'flex', flexDirection:'column', gap:12, height:'100%' }}>
    <Eyebrow>Test suite · triage.py</Eyebrow>
    <div style={{ display:'flex', flexDirection:'column', gap:9, flex:1 }}>
      {tests.map((name, k) => {
        const resolve = 0.45 + k*0.2;
        const isFlaky = (k === 3);
        let state = 'run';
        if (la > resolve) state = 'pass';
        let red = false;
        if (isFlaky) {
          if (la > resolve && la < resolve + 0.7) { state = 'fail'; red = true; }
          else if (la >= resolve + 0.7) state = 'pass';
          else state = 'run';
        }
        const o = rev(la, 0.1 + k*0.08, 0.3);
        return <div key={k} style={{ opacity:o, display:'flex', alignItems:'center', gap:13,
          padding:'12px 15px', borderRadius:12,
          background: red ? 'rgba(192,73,47,0.07)' : (state==='pass' ? 'rgba(37,122,67,0.06)' : GREEN.sage50),
          border:`1px solid ${red ? 'rgba(192,73,47,0.30)' : 'rgba(21,69,42,0.10)'}` }}>
          {state==='run' && <Spinner size={17} />}
          {state==='fail' && <div style={{ width:18, height:18, borderRadius:'50%', background:'#C0492F',
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>×</div>}
          {state==='pass' && <Check size={18} />}
          <span style={{ fontSize:16, fontWeight:600,
            color: state==='run' ? GREEN.ink400 : (red ? '#A23A24' : GREEN.ink900) }}>{name}</span>
          {red && <span style={{ marginLeft:'auto', fontSize:12.5, fontWeight:600, color:'#A23A24' }}>patching…</span>}
          {isFlaky && state==='pass' && la < resolve + 1.3 &&
            <span style={{ marginLeft:'auto', fontSize:12.5, fontWeight:600, color:GREEN.g600 }}>fixed ✓</span>}
        </div>;
      })}
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:14, paddingTop:4 }}>
      <div style={{ flex:1, height:8, borderRadius:999, background:GREEN.sage200, overflow:'hidden' }}>
        <div style={{ width:`${(passed/6)*100}%`, height:'100%', background:GREEN.g600, borderRadius:999 }} />
      </div>
      <div style={{ fontSize:16, fontWeight:800, color:GREEN.g800, fontVariantNumeric:'tabular-nums' }}>{passed} / 6 passed</div>
    </div>
  </div>;
}

/* --- 5 · Deployer (dark terminal → product) --- */
function Body5({ la }) {
  const steps = [
    'building container image',
    'running database migrations',
    'deploying to production',
  ];
  const prog = clamp01(rev(la, 0.2, 1.35, Easing.easeInOutCubic));
  const live = la > 1.5;
  const card = rev(la, 1.75, 0.55, Easing.easeOutCubic);
  return <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative' }}>
    <div style={{ fontFamily:MONO, fontSize:15.5, lineHeight:2.0, color:'#9FC0AE' }}>
      {steps.map((s, k) => {
        const d = 0.2 + k*0.42;
        if (la < d) return null;
        const done = la > d + 0.42 || (k === steps.length-1 && live);
        return <div key={k} style={{ display:'flex', alignItems:'center', gap:11 }}>
          {done ? <Check size={15} color={GREEN.g950} /> : <Spinner size={14} color="#fff" />}
          <span style={{ color: done ? '#EAF2EC' : '#9FC0AE' }}>{s}</span>
        </div>;
      })}
    </div>
    {/* progress */}
    <div style={{ marginTop:14, height:8, borderRadius:999, background:'rgba(255,255,255,0.10)', overflow:'hidden' }}>
      <div style={{ width:`${prog*100}%`, height:'100%', background:`linear-gradient(90deg,${GREEN.g500},${GREEN.g400})`, borderRadius:999 }} />
    </div>
    <div style={{ opacity:live?1:0, marginTop:14, display:'flex', alignItems:'center', gap:10,
      fontFamily:MONO, fontSize:15.5, color:'#9FE6B8' }}>
      <Check size={16} color={GREEN.g950} /> Live in production · v1.0
    </div>
    {/* product card */}
    <div style={{ marginTop:'auto', opacity:card, transform:`translateY(${(1-card)*24}px)`,
      background:'#fff', borderRadius:18, padding:'18px 20px',
      boxShadow:'0 18px 50px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:18 }}>
      <div style={{ width:52, height:52, borderRadius:14, background:GREEN.g800, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>✦</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:FONT, fontSize:19, fontWeight:800, color:GREEN.g800 }}>Support Assistant</div>
        <div style={{ fontFamily:FONT, fontSize:14, color:GREEN.ink500, fontWeight:500 }}>answering customers 24/7</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontFamily:FONT, fontSize:24, fontWeight:800, color:GREEN.g600, letterSpacing:'-0.02em' }}>1m 48s</div>
        <div style={{ fontFamily:FONT, fontSize:12.5, color:GREEN.ink400, fontWeight:600 }}>avg reply ↓ 96%</div>
      </div>
    </div>
  </div>;
}

/* --- 2 · Architect (system-design canvas) --- */
function BodyArch({ la }) {
  const nodes = [
    { t:'Intake', s:'webhook', ic:'⇥' },
    { t:'Classifier', s:'intent + urgency', ic:'◑' },
    { t:'LLM Reply', s:'tone: warm', ic:'✦' },
    { t:'CRM Sync', s:'resolve + log', ic:'⇲' },
  ];
  const tables = [
    { name:'tickets', fields:['id','text','status'] },
    { name:'replies', fields:['id','draft','sent_at'] },
    { name:'customers', fields:['id','name','tier'] },
  ];
  return <div style={{ display:'flex', flexDirection:'column', gap:18, height:'100%' }}>
    <Eyebrow>Architecture · request flow</Eyebrow>
    <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
      {nodes.map((nd, k) => {
        const o = rev(la, 0.2 + k*0.26, 0.42, Easing.easeOutBack);
        const arrowO = rev(la, 0.42 + k*0.26, 0.3);
        return <React.Fragment key={k}>
          <div style={{ flex:1, opacity:o, transform:`translateY(${(1-o)*14}px)`,
            background:'#fff', border:`1px solid rgba(21,69,42,0.14)`, borderRadius:14, padding:'14px 12px',
            boxShadow:'0 3px 10px rgba(11,42,25,0.06)', display:'flex', flexDirection:'column', gap:7, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:9, background:GREEN.g100, color:GREEN.g700,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700 }}>{nd.ic}</div>
            <div style={{ fontSize:15, fontWeight:700, color:GREEN.g800, letterSpacing:'-0.01em' }}>{nd.t}</div>
            <div style={{ fontFamily:MONO, fontSize:11.5, color:GREEN.ink400 }}>{nd.s}</div>
          </div>
          {k < nodes.length-1 && <div style={{ width:26, display:'flex', alignItems:'center', justifyContent:'center',
            color:GREEN.g500, fontSize:18, fontWeight:700, opacity:arrowO }}>→</div>}
        </React.Fragment>;
      })}
    </div>
    <Eyebrow style={{ marginTop:2 }}>Data model</Eyebrow>
    <div style={{ display:'flex', gap:14, flex:1, minHeight:0 }}>
      {tables.map((tb, k) => {
        const o = rev(la, 1.0 + k*0.22, 0.4, Easing.easeOutCubic);
        return <div key={k} style={{ flex:1, opacity:o, transform:`translateY(${(1-o)*12}px)`,
          background:GREEN.sage50, border:`1px solid rgba(21,69,42,0.12)`, borderRadius:13, overflow:'hidden',
          display:'flex', flexDirection:'column' }}>
          <div style={{ background:GREEN.g800, color:'#fff', padding:'9px 13px', fontFamily:MONO,
            fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ width:7, height:7, borderRadius:2, background:GREEN.g400 }} />{tb.name}</div>
          {tb.fields.map((f, j) => <div key={j} style={{ padding:'8px 13px', fontFamily:MONO, fontSize:12.5,
            color:GREEN.ink500, borderBottom:`1px solid rgba(21,69,42,0.07)`, display:'flex', justifyContent:'space-between' }}>
            <span>{f}</span><span style={{ color:GREEN.g400 }}>{j===0?'pk':'·'}</span></div>)}
        </div>;
      })}
    </div>
  </div>;
}

/* --- 7 · Monitor (live ops dashboard, dark) --- */
function BodyMon({ la }) {
  const resolved = commas(2847 * rev(la, 0.4, 1.1, Easing.easeOutCubic));
  const pts = [38,42,40,48,52,49,58,63,60,68,72,70,79,84];
  const W = 1, H = 1; // unit, scaled by viewBox
  const maxV = 90;
  const path = pts.map((v,i) => `${(i/(pts.length-1))*100},${100-(v/maxV)*100}`).join(' ');
  const draw = clamp01(rev(la, 0.5, 1.3, Easing.easeInOutCubic));
  const logs = [
    { id:'#4821', txt:'refund query resolved', ms:'38s' },
    { id:'#4822', txt:'escalated to human', ms:'1m' },
    { id:'#4823', txt:'shipping ETA answered', ms:'12s' },
    { id:'#4824', txt:'password reset sent', ms:'9s' },
  ];
  return <div style={{ display:'flex', flexDirection:'column', gap:16, height:'100%' }}>
    {/* stat row */}
    <div style={{ display:'flex', gap:12 }}>
      {[
        { v:'99.98%', l:'uptime', c:'#C3E88D' },
        { v:resolved, l:'resolved today', c:'#EAF2EC' },
        { v:'420ms', l:'avg latency', c:'#82AAFF' },
      ].map((s, k) => <div key={k} style={{ flex:1, opacity:rev(la,0.15+k*0.12,0.4),
        background:GREEN.g900, border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px' }}>
        <div style={{ fontFamily:FONT, fontSize:25, fontWeight:800, color:s.c, letterSpacing:'-0.02em',
          fontVariantNumeric:'tabular-nums' }}>{s.v}</div>
        <div style={{ fontFamily:MONO, fontSize:11.5, color:'#7FA78E', marginTop:2 }}>{s.l}</div>
      </div>)}
    </div>
    {/* area chart */}
    <div style={{ position:'relative', height:120, background:GREEN.g900, borderRadius:12,
      border:'1px solid rgba(255,255,255,0.07)', padding:'12px 14px 8px', overflow:'hidden' }}>
      <div style={{ fontFamily:MONO, fontSize:11.5, color:'#7FA78E', marginBottom:4 }}>resolutions / hour</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', left:0, bottom:0,
        width:'100%', height:78, clipPath:`inset(0 ${(1-draw)*100}% 0 0)` }}>
        <defs><linearGradient id="monfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5FB97E" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#5FB97E" stopOpacity="0" />
        </linearGradient></defs>
        <polygon points={`0,100 ${path} 100,100`} fill="url(#monfill)" />
        <polyline points={path} fill="none" stroke="#5FB97E" strokeWidth="2"
          vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div style={{ position:'absolute', bottom:8, width:9, height:9, borderRadius:'50%', background:'#C3E88D',
        boxShadow:'0 0 0 5px rgba(195,232,141,0.20)', left:`calc(${draw*100}% - 18px)`,
        opacity: draw>0.05 && draw<0.99 ? 1 : 0, transform:`translateY(${-(pts[Math.min(pts.length-1,Math.round(draw*(pts.length-1)))]/maxV)*78+78}px)` }} />
    </div>
    {/* live log feed */}
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7, minHeight:0 }}>
      {logs.map((lg, k) => {
        const o = rev(la, 0.9 + k*0.24, 0.35, Easing.easeOutCubic);
        return <div key={k} style={{ opacity:o, transform:`translateX(${(1-o)*-12}px)`,
          display:'flex', alignItems:'center', gap:11, fontFamily:MONO, fontSize:13,
          padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:9,
          borderLeft:'2px solid #5FB97E' }}>
          <span style={{ color:'#5FB97E', fontWeight:600 }}>{lg.id}</span>
          <span style={{ color:'#C7D8CC' }}>{lg.txt}</span>
          <span style={{ marginLeft:'auto', color:'#7FA78E' }}>{lg.ms}</span>
        </div>;
      })}
    </div>
  </div>;
}

/* ===================== connectors + packet ===================== */

function Connectors({ t, p }) {
  const items = [];
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const left = cX(i) + WIN_W/2;
    const fill = clamp01(p - i) * GAP;
    const dash = -((t * 60) % 22);
    items.push(<div key={i} style={{ position:'absolute', left, top:534, width:GAP, height:12 }}>
      <div style={{ position:'absolute', top:4, left:0, width:'100%', height:4, borderRadius:999,
        background:GREEN.sage300 }} />
      <div style={{ position:'absolute', top:4, left:0, width:fill, height:4, borderRadius:999,
        background:`repeating-linear-gradient(90deg, ${GREEN.g500} 0 8px, ${GREEN.g400} 8px 16px)`,
        backgroundPosition:`${dash}px 0` }} />
      {/* arrow head */}
      <div style={{ position:'absolute', top:0, left:GAP-10, width:12, height:12,
        borderRight:`3px solid ${ (p-i) >= 0.98 ? GREEN.g500 : GREEN.sage300}`,
        borderBottom:`3px solid ${ (p-i) >= 0.98 ? GREEN.g500 : GREEN.sage300}`,
        transform:'rotate(-45deg)' }} />
    </div>);
  }
  return <>{items}</>;
}

function Packet({ p }) {
  const fr = p - Math.floor(p);
  const tri = fr <= 0.5 ? fr*2 : (1-fr)*2;       // 0 at stations, 1 mid-pan
  const op = easeFn(tri, Easing.easeInOutCubic);
  if (op < 0.02) return null;
  const x = 600 + p * PITCH;
  return <div style={{ position:'absolute', left:x-44, top:540-21, width:88, height:42,
    opacity:op, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
    background:`linear-gradient(180deg, ${GREEN.g500}, ${GREEN.g600})`, borderRadius:999,
    boxShadow:`0 0 0 6px rgba(47,150,85,0.16), 0 8px 22px rgba(47,150,85,0.45)`,
    fontFamily:FONT, fontWeight:800, fontSize:13, color:'#fff', letterSpacing:'0.04em' }}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M14 3v5h5" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
    TASK
  </div>;
}

/* ===================== world layer ===================== */

function WorldLayer({ t, opacity, W }) {
  const cx = (W || 1080) / 2;
  const pK = [[0,0],[2.2,0],[2.8,1],[5.0,1],[5.6,2],[7.8,2],[8.4,3],[10.6,3],[11.2,4],[13.4,4],
    [14.0,5],[16.2,5],[16.8,6],[19.0,6],[19.6,7],[30,7]];
  const sK = [[0,1.02],[2.2,1.04],[2.5,0.9],[2.8,1.02],[5.0,1.04],[5.3,0.9],[5.6,1.02],
    [7.8,1.04],[8.1,0.9],[8.4,1.02],[10.6,1.04],[10.9,0.9],[11.2,1.02],[13.4,1.04],[13.7,0.9],[14.0,1.02],
    [16.2,1.04],[16.5,0.9],[16.8,1.02],[19.0,1.04],[19.3,0.9],[19.6,1.02],[21.8,1.05],[30,1.06]];
  const p = interpolate(pK.map(k=>k[0]), pK.map(k=>k[1]), Easing.easeInOutCubic)(t);
  const scale = interpolate(sK.map(k=>k[0]), sK.map(k=>k[1]), Easing.easeInOutCubic)(t);
  const focusX = 600 + p * PITCH;
  return <div style={{ position:'absolute', inset:0, opacity, overflow:'hidden' }}>
    <div style={{ position:'absolute', inset:0,
      transform:`translate(${cx}px,540px) scale(${scale}) translate(${-focusX}px,-540px)`,
      transformOrigin:'0 0', willChange:'transform' }}>
      {/* ambient blobs for depth */}
      <img src="assets/blob.svg" style={{ position:'absolute', left:cX(1)-200, top:-120, width:520, opacity:0.06 }} />
      <img src="assets/blob.svg" style={{ position:'absolute', left:cX(4)-260, top:760, width:560, opacity:0.06 }} />
      <Connectors t={t} p={p} />
      {STATIONS.map((s, i) => <AgentWindow key={i} i={i} t={t} />)}
      <Packet p={p} />
    </div>
  </div>;
}

/* ===================== overview scene ===================== */

function OverviewScene({ t, opacity, W }) {
  const la = t - 22.5;
  if (opacity < 0.01) return null;
  const N = STATIONS.length;
  const gapX = 140;
  const totalW = (N-1) * gapX;
  const startX = (W || 1080)/2 - totalW/2;
  const rowY = 560;
  const flow = clamp01(rev(la, 0.6, 2.0, Easing.easeInOutCubic));
  return <div style={{ position:'absolute', inset:0, opacity, background:GREEN.sage100, overflow:'hidden' }}>
    <img src="assets/blob.svg" style={{ position:'absolute', right:-130, top:-150, width:480, opacity:0.10 }} />
    <div style={{ position:'absolute', left:0, right:0, top:150, textAlign:'center' }}>
      <Eyebrow style={{ marginBottom:16 }}>The system</Eyebrow>
      <div style={{ fontFamily:FONT, fontWeight:800, fontSize:60, color:GREEN.g800, letterSpacing:'-0.03em',
        opacity:rev(la,0.1,0.5), transform:`translateY(${(1-rev(la,0.1,0.5))*14}px)` }}>
        Eight agents. One pipeline.</div>
    </div>
    {/* connecting line */}
    <div style={{ position:'absolute', left:startX, top:rowY-2, width:totalW, height:4, background:GREEN.sage300, borderRadius:999 }} />
    <div style={{ position:'absolute', left:startX, top:rowY-2, width:totalW*flow, height:4,
      background:`linear-gradient(90deg,${GREEN.g600},${GREEN.g400})`, borderRadius:999 }} />
    {/* nodes */}
    {STATIONS.map((s, i) => {
      const x = startX + i*gapX;
      const o = rev(la, 0.2 + i*0.12, 0.45, Easing.easeOutBack);
      const reached = flow >= (i/(N-1)) - 0.001;
      return <div key={i} style={{ position:'absolute', left:x-34, top:rowY-34, width:68,
        opacity:o, transform:`scale(${0.6+0.4*clamp01(o)})`, transformOrigin:'center 34px', textAlign:'center' }}>
        <div style={{ width:68, height:68, borderRadius:18, margin:'0 auto',
          background: reached ? GREEN.g800 : '#fff', color: reached ? '#fff':GREEN.g800,
          border:`1px solid ${reached?GREEN.g800:'rgba(21,69,42,0.18)'}`,
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:26,
          boxShadow: reached ? '0 10px 26px rgba(21,69,42,0.30)' : '0 4px 12px rgba(11,42,25,0.08)',
          transition:'none' }}>{s.initial}</div>
        <div style={{ fontFamily:FONT, fontSize:13, fontWeight:600, color:GREEN.g700, marginTop:10, whiteSpace:'nowrap' }}>{s.name}</div>
      </div>;
    })}
    {/* traveling pulse */}
    <div style={{ position:'absolute', left:startX + totalW*flow - 7, top:rowY-7, width:14, height:14, borderRadius:'50%',
      background:GREEN.g500, boxShadow:`0 0 0 6px rgba(47,150,85,0.20)`, opacity: flow>0 && flow<1 ? 1:0 }} />
    {/* endpoints labels */}
    <div style={{ position:'absolute', left:0, right:0, top:rowY+92, textAlign:'center',
      opacity:rev(la,1.4,0.6) }}>
      <span style={{ fontFamily:FONT, fontSize:21, color:GREEN.ink500, fontWeight:500 }}>
        A request goes in. <span style={{ color:GREEN.g700, fontWeight:700 }}>A finished product comes out.</span></span>
    </div>
  </div>;
}

/* ===================== end card ===================== */

function EndCard({ t, opacity }) {
  if (opacity < 0.01) return null;
  const la = t - 27.0;
  const head = rev(la, 0.25, 0.6, Easing.easeOutCubic);
  const underline = clamp01(rev(la, 0.7, 0.6, Easing.easeInOutCubic));
  return <div style={{ position:'absolute', inset:0, opacity, background:GREEN.sage100, overflow:'hidden',
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0 }}>
    <div style={{ position:'absolute', left:'50%', top:'50%', width:760, height:620,
      transform:'translate(-50%,-46%)', borderRadius:48, background:GREEN.g500, opacity:0.08 }} />
    <div style={{ position:'relative', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:76, height:76, borderRadius:20, background:GREEN.g800, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:32,
        letterSpacing:'-0.02em', opacity:rev(la,0.05,0.4), transform:`scale(${0.7+0.3*rev(la,0.05,0.4)})`,
        boxShadow:'0 14px 34px rgba(21,69,42,0.28)' }}>CJ<span style={{ color:GREEN.g400 }}>.</span></div>
      <Eyebrow style={{ marginTop:30, opacity:rev(la,0.15,0.4) }}>What I do</Eyebrow>
      <div style={{ fontFamily:FONT, fontWeight:800, fontSize:74, color:GREEN.g800, letterSpacing:'-0.03em',
        marginTop:16, opacity:head, transform:`translateY(${(1-head)*18}px)`, lineHeight:1.04 }}>
        Agent-ifying<br/>businesses.</div>
      <div style={{ width:200*underline, height:4, background:GREEN.g500, borderRadius:999, marginTop:26 }} />
      <div style={{ fontFamily:FONT, fontSize:19, color:GREEN.ink500, fontWeight:500, marginTop:26,
        opacity:rev(la,1.0,0.5) }}>
        Chandrasekhar Jinendran · AI Specialist</div>
    </div>
  </div>;
}

/* ===================== scene + root ===================== */

function Scene({ W }) {
  const t = useTime();
  const worldOp   = interpolate([0,22.4,23.1],[1,1,0], Easing.easeInOutCubic)(t);
  const overviewOp= interpolate([22.4,23.1,26.6,27.2],[0,1,1,0], Easing.easeInOutCubic)(t);
  const endOp     = interpolate([26.7,27.4],[0,1], Easing.easeInOutCubic)(t);
  const dipOp     = interpolate([0,0.55,29.2,30],[1,0,0,1], Easing.easeInOutQuad)(t);
  return <div style={{ position:'absolute', inset:0, overflow:'hidden', background:GREEN.sage100, fontFamily:FONT }}>
    {worldOp > 0.01 && <WorldLayer t={t} opacity={worldOp} W={W} />}
    <OverviewScene t={t} opacity={overviewOp} W={W} />
    <EndCard t={t} opacity={endOp} />
    {/* loop dip */}
    <div style={{ position:'absolute', inset:0, background:GREEN.sage100, opacity:dipOp, pointerEvents:'none' }} />
  </div>;
}

function SceneRoot({ W, persistKey }) {
  return <Stage width={W} height={1080} duration={30} background={GREEN.sage100} loop controls={false} persistKey={persistKey}>
    <Scene W={W} />
  </Stage>;
}

function Root()    { return <SceneRoot W={1080} persistKey="agentpipe" />; }
function Root169() { return <SceneRoot W={1920} persistKey="agentpipe169" />; }

window.Root = Root;
window.Root169 = Root169;
