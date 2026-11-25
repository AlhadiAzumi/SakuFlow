import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, EyeOff, Monitor, Smartphone, Download,
  Table2, Receipt, BellOff, CheckCheck, MessageCircle, ArrowUpRight, Coffee, ShoppingCart,
} from 'lucide-react';
import { initAudio, getAudioStream, setMuted, playSfx, type SfxName } from './soundEngine';

const DUR = 20;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (x: number) => {
    if (x <= 0 || x >= 1) return clamp(x);
    let u = x;
    for (let i = 0; i < 8; i++) {
      const cx = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
      const d = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
      if (Math.abs(d) < 1e-6) break;
      u = clamp(u - (cx - x) / d);
    }
    return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
  };
}

const ease = bezier(0.22, 1, 0.36, 1);
const e = (t: number, a: number, b: number) => ease(prog(t, a, b));
const spring = (t: number, a: number, b: number) => {
  const x = prog(t, a, b);
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
const rp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

type Pt = { x: number; y: number };
type Cubic = { p0: Pt; p1: Pt; p2: Pt; p3: Pt; c: string; id: string };

function evalCubic(b: Cubic, u: number) {
  const m = 1 - u;
  const x = m ** 3 * b.p0.x + 3 * m * m * u * b.p1.x + 3 * m * u * u * b.p2.x + u ** 3 * b.p3.x;
  const y = m ** 3 * b.p0.y + 3 * m * m * u * b.p1.y + 3 * m * u * u * b.p2.y + u ** 3 * b.p3.y;
  const dx = 3 * m * m * (b.p1.x - b.p0.x) + 6 * m * u * (b.p2.x - b.p1.x) + 3 * u * u * (b.p3.x - b.p2.x);
  const dy = 3 * m * m * (b.p1.y - b.p0.y) + 6 * m * u * (b.p2.y - b.p1.y) + 3 * u * u * (b.p3.y - b.p2.y);
  return { x, y, deg: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const CUES: { t: number; s: SfxName }[] = [
  { t: 1.15, s: 'pop' }, { t: 1.45, s: 'pop' }, { t: 1.75, s: 'pop' }, { t: 2.35, s: 'whoosh' },
  { t: 3.0, s: 'whoosh' }, { t: 3.15, s: 'pop' }, { t: 6.4, s: 'whoosh' },
  { t: 7.2, s: 'pop' }, { t: 7.85, s: 'chime' }, { t: 9.15, s: 'pop' }, { t: 9.75, s: 'chime' }, { t: 10.05, s: 'chime' },
  { t: 11.85, s: 'whoosh' }, { t: 12.2, s: 'pop' }, { t: 12.5, s: 'pop' }, { t: 12.8, s: 'pop' }, { t: 13.05, s: 'pop' },
  ...Array.from({ length: 20 }, (_, i) => ({ t: +(13.4 + i * 0.1).toFixed(2), s: 'tick' as SfxName })),
  { t: 17.0, s: 'whoosh' }, { t: 17.05, s: 'chord' },
];

const C = {
  bg: '#F8FAFC',
  grid: '#E2E8F0',
  ink: '#0F172A',
  mute: '#475569',
  blue: '#2563EB',
  green: '#10B981',
  coral: '#F43F5E',
};
const FONT = "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, -apple-system, sans-serif";

function Logo({ size }: { size: number; id?: string }) {
  return <img src="/iconsakunode.svg" width={size} height={size} alt="Sakunode" style={{ display: 'block', objectFit: 'contain' }} />;
}

const fill: CSSProperties = { position: 'absolute', inset: 0 };
const center: CSSProperties = { ...fill, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const card: CSSProperties = { background: '#fff', border: `1px solid ${C.grid}`, borderRadius: 24, boxShadow: '0 14px 36px rgba(15,23,42,.08)' };

function Stage({ t, land }: { t: number; land: boolean }) {
  const W = land ? 1280 : 720;
  const H = land ? 720 : 1280;
  const k = land ? 1 : 0.78;

  const words = ['Catat', 'keuangan', 'harian', 'masih', 'ribet?'];
  const problems = [
    { icon: <Table2 size={28} />, text: 'Tabel rumit' },
    { icon: <Receipt size={28} />, text: 'Struk menumpuk' },
    { icon: <BellOff size={28} />, text: 'Lupa catat' },
  ];
  const cam1 = 1 + 0.03 * prog(t, 0, 3);
  const cam2 = 0.98 + 0.04 * prog(t, 3, 6.5);

  const phoneH = land ? 590 : 770;
  const phoneW = 435;
  const p3in = e(t, 6.5, 7.15);
  const p3out = prog(t, 11.75, 12.15);
  const tiltY = (1 - e(t, 6.5, 8.2)) * -14;
  const tiltX = (1 - e(t, 6.5, 8.2)) * 6;
  const isTyping = (t >= 7.45 && t < 7.85) || (t >= 9.4 && t < 9.75);

  const bubbles = [
    { at: 7.2, user: true, text: 'gaji bulanan 8.5jt', read: 7.85 },
    { at: 7.85, user: false, text: '✅ Pemasukan Rp8.500.000 tercatat' },
    { at: 9.15, user: true, text: 'kopi kenangan 28rb', read: 9.75 },
    { at: 9.75, user: false, text: '✅ Pengeluaran Jajan & Kopi Rp28.000 tercatat' },
  ];

  const N = land
    ? {
        inc: { x: 75, y: 285, w: 305, h: 150 },
        bal: { x: 475, y: 205, w: 330, h: 310 },
        e1: { x: 900, y: 170, w: 305, h: 140 },
        e2: { x: 900, y: 410, w: 305, h: 140 },
      }
    : {
        inc: { x: 100, y: 185, w: 520, h: 170 },
        bal: { x: 100, y: 495, w: 520, h: 285 },
        e1: { x: 48, y: 925, w: 300, h: 155 },
        e2: { x: 372, y: 925, w: 300, h: 155 },
      };

  type R = { x: number; y: number; w: number; h: number };
  const makeCubic = (id: string, a: R, b: R, c: string): Cubic => {
    if (land) {
      const p0 = { x: a.x + a.w, y: a.y + a.h / 2 };
      const p3 = { x: b.x, y: b.y + b.h / 2 };
      const mx = (p0.x + p3.x) / 2;
      return { id, p0, p1: { x: mx, y: p0.y }, p2: { x: mx, y: p3.y }, p3, c };
    }
    const p0 = { x: a.x + a.w / 2, y: a.y + a.h };
    const p3 = { x: b.x + b.w / 2, y: b.y };
    const my = (p0.y + p3.y) / 2;
    return { id, p0, p1: { x: p0.x, y: my }, p2: { x: p3.x, y: my }, p3, c };
  };

  const curves: Cubic[] = [
    makeCubic('pf1', N.inc, N.bal, C.green),
    makeCubic('pf2', N.bal, N.e1, C.coral),
    makeCubic('pf3', N.bal, N.e2, C.coral),
  ];

  const counter = 8450000 * (1 - (1 - prog(t, 13.4, 15.4)) ** 3);
  const s4 = (0.9 + 0.1 * e(t, 12, 12.7)) * (1 + 0.025 * prog(t, 12.7, 17)) * (1 - 0.35 * prog(t, 17, 17.7));
  const o4 = e(t, 12, 12.5) * (1 - prog(t, 17.1, 17.7));

  const nodeStyle = (r: R, at: number, borderCol: string, bgTint: string, extra?: CSSProperties): CSSProperties => ({
    position: 'absolute',
    left: r.x,
    top: r.y,
    width: r.w,
    height: r.h,
    background: bgTint,
    border: `${extra ? 2.5 : 2}px solid ${borderCol}`,
    borderRadius: 24,
    boxShadow: '0 12px 32px rgba(15,23,42,.07)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 26px',
    opacity: e(t, at, at + 0.4),
    transform: `scale(${0.82 + 0.18 * spring(t, at, at + 0.6)})`,
    ...extra,
  });

  const lbl: CSSProperties = { fontSize: 19 * (land ? 1 : 1.05), color: C.mute, fontWeight: 600 };
  const val = (c: string, s = 38): CSSProperties => ({ fontSize: s, fontWeight: 800, color: c, letterSpacing: '-0.025em', marginTop: 4 });
  const shimmerPos = -1 + 2 * ((Math.max(0, t - 18.5) * 0.75) % 1);

  return (
    <div
      style={{
        width: W,
        height: H,
        position: 'relative',
        overflow: 'hidden',
        background: C.bg,
        fontFamily: FONT,
        color: C.ink,
        backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    >
      {[0, 1, 2, 3, 4, 5].map((idx) => {
        const px = ((idx * 211 + 90) % (W - 120)) + 60 + Math.sin(t * 0.9 + idx) * 28;
        const py = ((idx * 173 + 80) % (H - 120)) + 60 + Math.cos(t * 0.8 + idx * 1.4) * 28;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              width: 10 + (idx % 3) * 5,
              height: 10 + (idx % 3) * 5,
              borderRadius: '50%',
              background: idx % 2 === 0 ? 'rgba(59,130,246,0.18)' : 'rgba(16,185,129,0.16)',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* SCENE 1 */}
      {t < 3.1 && (
        <div style={{ ...fill, opacity: 1 - prog(t, 2.8, 3.1), transform: `scale(${cam1})` }}>
          <div style={{ position: 'absolute', left: 70, right: 70, top: land ? 115 : 200, textAlign: 'center', fontSize: 82 * k, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.035em' }}>
            {words.map((w, i) => (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', margin: '0 .13em', paddingBottom: '.12em' }}>
                <span style={{ display: 'inline-block', color: i >= 3 ? C.blue : C.ink, transform: `translateY(${(1 - e(t, 0.15 + i * 0.11, 0.75 + i * 0.11)) * 115}%)` }}>{w}</span>
              </span>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: land ? 105 : 180, display: 'flex', flexDirection: land ? 'row' : 'column', gap: 24, justifyContent: 'center', alignItems: 'center' }}>
            {problems.map((p, i) => {
              const at = 1.15 + i * 0.28;
              const inn = e(t, at, at + 0.5);
              const out = e(t, 2.35 + i * 0.08, 2.95 + i * 0.08);
              return (
                <div
                  key={i}
                  style={{
                    ...card,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '22px 30px',
                    fontSize: 27,
                    fontWeight: 700,
                    opacity: inn,
                    transform: `translate(${-out * (W + 520)}px, ${(1 - inn) * 40 + Math.sin(t * 3 + i) * 6 * inn}px) rotate(${(i - 1) * 2.2}deg)`,
                  }}
                >
                  <span style={{ color: C.coral, display: 'flex', background: '#FFF1F2', padding: 10, borderRadius: 14 }}>{p.icon}</span>
                  {p.text}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCENE 2 */}
      {t >= 3 && t < 6.6 && (
        <div style={{ ...center, opacity: 1 - prog(t, 6.2, 6.5), transform: `scale(${cam2})`, textAlign: 'center', padding: 60 }}>
          <div style={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.32), transparent 65%)', opacity: e(t, 3, 3.8) * (0.75 + 0.25 * Math.sin(t * 2.4)) }} />
          <div style={{ position: 'absolute', width: 240 + prog(t, 3.1, 5.2) * 380, height: 240 + prog(t, 3.1, 5.2) * 380, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.28)', opacity: (1 - prog(t, 3.1, 5.2)) * 0.8 }} />
          <div style={{ transform: `scale(${spring(t, 3, 3.8)})`, opacity: prog(t, 3, 3.2), position: 'relative' }}><Logo size={150 * k + 12} id="lg2" /></div>
          <div style={{ fontSize: 122 * k, fontWeight: 800, letterSpacing: '-0.045em', marginTop: 26, opacity: e(t, 3.55, 4.25), transform: `translateY(${(1 - e(t, 3.55, 4.25)) * 38}px)`, position: 'relative' }}>Sakunode</div>
          <div style={{ fontSize: 35 * k, color: C.mute, fontWeight: 500, maxWidth: 780, marginTop: 8, opacity: e(t, 4.25, 4.95), transform: `translateY(${(1 - e(t, 4.25, 4.95)) * 28}px)`, position: 'relative' }}>
            Catat aliran uang semudah kirim chat WhatsApp.
          </div>
        </div>
      )}

      {/* SCENE 3 */}
      {t >= 6.5 && t < 12.2 && (
        <div style={{ ...center, opacity: p3in * (1 - p3out), transform: `perspective(1200px) rotateY(${tiltY}deg) rotateX(${tiltX}deg) translateY(${(1 - p3in) * 60}px) scale(${1 - 0.35 * p3out})` }}>
          <div style={{ width: phoneW, height: phoneH, ...card, borderRadius: 44, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '8px solid #0F172A' }}>
            <div style={{ background: '#0B6B5D', color: '#fff', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Logo size={44} id="lg3" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>Sakunode Bot</div>
                <div style={{ fontSize: 14, opacity: 0.85 }}>{isTyping ? 'sedang mengetik...' : 'online'}</div>
              </div>
            </div>
            <div style={{ flex: 1, background: '#EFEAE2', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bubbles.filter((b) => t >= b.at).map((b, i) => {
                const s = spring(t, b.at, b.at + 0.45);
                return (
                  <div
                    key={i}
                    style={{
                      alignSelf: b.user ? 'flex-end' : 'flex-start',
                      maxWidth: '84%',
                      padding: '12px 16px',
                      borderRadius: 18,
                      fontSize: 20.5,
                      fontWeight: 500,
                      lineHeight: 1.35,
                      background: b.user ? '#D9FDD3' : '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,.1)',
                      opacity: clamp(s * 2),
                      transform: `scale(${0.86 + 0.14 * s}) translateY(${(1 - s) * 14}px)`,
                      transformOrigin: b.user ? 'right bottom' : 'left bottom',
                    }}
                  >
                    {b.text}
                    {b.user && <CheckCheck size={18} style={{ marginLeft: 8, verticalAlign: 'middle', color: t >= (b.read ?? 99) ? '#34B7F1' : '#94A3B8' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {t >= 10 && t < 12.4 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: land ? 48 : 115,
            whiteSpace: 'nowrap',
            background: '#020617',
            color: '#fff',
            border: '1px solid #1E293B',
            boxShadow: '0 16px 38px rgba(2,6,23,.32)',
            borderRadius: 999,
            padding: '15px 28px',
            fontSize: 21 * (land ? 1 : 0.9),
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: e(t, 10, 10.4) * (1 - prog(t, 12, 12.4)),
            transform: `translate(-50%, ${(1 - e(t, 10, 10.5)) * 38}px)`,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22D3EE', opacity: 0.45 + 0.55 * Math.abs(Math.sin(t * 5)), boxShadow: '0 0 12px #22D3EE' }} />
          Sinkron terakhir: Baru saja • Keluar Rp28.000
        </div>
      )}

      {/* SCENE 4 */}
      {t >= 12 && t < 17.8 && (
        <div style={{ ...fill, opacity: o4, transform: `scale(${s4})` }}>
          <svg width={W} height={H} style={fill} fill="none">
            {curves.map((cv, i) => {
              const d = `M${cv.p0.x} ${cv.p0.y} C${cv.p1.x} ${cv.p1.y} ${cv.p2.x} ${cv.p2.y} ${cv.p3.x} ${cv.p3.y}`;
              const arrowOpacity = prog(t, 14.1, 14.5);
              return (
                <g key={cv.id}>
                  <path d={d} stroke={cv.c} strokeWidth={4.5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - e(t, 13.15 + i * 0.15, 14.15 + i * 0.15)} opacity={0.85} />
                  {[0, 1, 2].map((j) => {
                    const u = (t * 0.24 + j / 3) % 1;
                    const pt = evalCubic(cv, u);
                    return (
                      <g key={j} transform={`translate(${pt.x}, ${pt.y}) rotate(${pt.deg})`} opacity={arrowOpacity}>
                        <path d="M-6 -8 L4 0 L-6 8" stroke={cv.c} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>

          <div style={{ position: 'absolute', left: N.inc.x, top: N.inc.y - 58, opacity: e(t, 12.2, 12.6), background: '#fff', border: `1px solid ${C.grid}`, boxShadow: '0 4px 12px rgba(15,23,42,.06)', borderRadius: 999, padding: '8px 18px', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0B6B5D' }}>
            <MessageCircle size={19} /> via WhatsApp Bot
          </div>

          <div style={nodeStyle(N.inc, 12.2, '#6EE7B7', '#ECFDF5')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={lbl}>Pemasukan</div>
                <div style={val(C.green, 36)}>Rp12.300.000</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#D1FAE5', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={24} />
              </div>
            </div>
          </div>

          <div style={nodeStyle(N.bal, 12.5, C.blue, '#FFFFFF', { alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 50px rgba(37,99,235,.22)' })}>
            <Logo size={54} id="lg4" />
            <div style={{ ...lbl, marginTop: 14 }}>Saldo Utama &amp; Arus Kas</div>
            <div style={val(C.ink, land ? 46 : 52)}>{rp(counter)}</div>
            <div style={{ marginTop: 8, fontSize: 17, fontWeight: 700, color: C.green }}>+ Rp2.100.000 bulan ini</div>
          </div>

          <div style={nodeStyle(N.e1, 12.8, '#FDA4AF', '#FFF1F2')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFE4E6', color: C.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Coffee size={22} /></div>
              <div>
                <div style={lbl}>Jajan &amp; Kopi</div>
                <div style={val(C.coral, 32)}>Rp650.000</div>
              </div>
            </div>
          </div>

          <div style={nodeStyle(N.e2, 13.05, '#FDA4AF', '#FFF1F2')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFE4E6', color: C.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShoppingCart size={22} /></div>
              <div>
                <div style={lbl}>Kebutuhan Bulanan</div>
                <div style={val(C.coral, 32)}>Rp3.200.000</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCENE 5 */}
      {t >= 17 && (
        <div style={{ ...center, opacity: e(t, 17.2, 17.9), textAlign: 'center', padding: 50 }}>
          <div style={{ transform: `scale(${0.7 + 0.3 * spring(t, 17.3, 18)})` }}><Logo size={132 * k + 10} id="lg5" /></div>
          <div style={{ fontSize: 42 * k + 4, fontWeight: 800, marginTop: 34, letterSpacing: '-0.03em', opacity: e(t, 17.7, 18.3), transform: `translateY(${(1 - e(t, 17.7, 18.3)) * 24}px)` }}>
            Pantau Aliran Uangmu Secara Real-Time
          </div>
          <div style={{ position: 'relative', overflow: 'hidden', marginTop: 38, background: C.blue, color: '#fff', boxShadow: '0 14px 34px rgba(37,99,235,.32)', borderRadius: 999, padding: '18px 46px', fontSize: 36 * k + 4, fontWeight: 700, opacity: e(t, 18.2, 18.7), transform: `scale(${0.85 + 0.15 * spring(t, 18.2, 18.8)})` }}>
            sakunode.web.id
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,.55) 50%, transparent 75%)', transform: `translateX(${shimmerPos * 100}%)` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromoPage() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [land, setLand] = useState(true);
  const [mute, setMute] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [box, setBox] = useState({ w: 1280, h: 720 });

  const tRef = useRef(0);
  const area = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fire = (a: number, b: number) => CUES.forEach((c) => { if (c.t > a && c.t <= b) playSfx(c.s); });

  const finishExport = () => {
    setPlaying(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setExporting(false);
    setHidden(false);
  };

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const prev = tRef.current;
      const nt = Math.min(DUR, prev + (now - last) / 1000);
      last = now;
      tRef.current = nt;
      fire(prev, nt);
      setT(nt);
      if (nt >= DUR) {
        setPlaying(false);
        window.setTimeout(() => finishExport(), 350);
        return;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const seek = (v: number) => {
    tRef.current = v;
    setT(v);
  };

  const play = () => {
    initAudio();
    setMuted(mute);
    if (tRef.current >= DUR) seek(0);
    setPlaying(true);
  };

  const toggle = () => (playing ? setPlaying(false) : play());

  /* Export langsung: pilih tab ini di dialog browser, lalu file otomatis terunduh. */
  const handleDirectExport = async () => {
    let displayStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Browser ini belum mendukung export langsung. Coba Chrome atau Edge terbaru.');
      }

      initAudio();
      setMuted(false);
      setMute(false);
      setExportError('');

      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: false,
        preferCurrentTab: true,
      } as DisplayMediaStreamOptions);

      const audioStream = getAudioStream();
      const combinedTracks = [
        ...displayStream.getVideoTracks(),
        ...(audioStream ? audioStream.getAudioTracks() : []),
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const candidates = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm',
      ];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sakunode-promo-${land ? '16x9' : '9x16'}.${ext}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExporting(false);
        setHidden(false);
      };

      recorderRef.current = recorder;
      streamRef.current = displayStream;

      // Jika user menekan "Stop sharing" dari bar browser, export tetap selesai.
      displayStream.getVideoTracks()[0].onended = () => finishExport();

      setHidden(true);
      setExporting(true);
      seek(0);

      // Jeda 400ms agar dialog browser benar-benar hilang sebelum frame 0 direkam.
      window.setTimeout(() => {
        if (recorderRef.current !== recorder) return;
        recorder.start(200);
        setPlaying(true);
      }, 400);
    } catch (error) {
      displayStream?.getTracks().forEach((tr) => tr.stop());
      recorderRef.current = null;
      streamRef.current = null;
      setExporting(false);
      setHidden(false);
      setExportError(error instanceof Error ? error.message : 'Export gagal. Coba lagi, ya.');
    }
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !exporting) setHidden((h) => !h);
      if (ev.key === ' ' && !exporting && (ev.target as HTMLElement).tagName !== 'BUTTON') {
        ev.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const W = land ? 1280 : 720;
  const H = land ? 720 : 1280;
  const scale = Math.min((box.w - 32) / W, (box.h - 32) / H);
  const ended = t >= DUR;

  const btn: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#1E293B',
    color: '#E2E8F0',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: FONT,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#090D16', display: 'flex', flexDirection: 'column', cursor: hidden ? 'none' : 'default' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');`}</style>

      <div ref={area} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: W * scale, height: H * scale, overflow: 'hidden', borderRadius: 10, boxShadow: '0 30px 80px rgba(0,0,0,.55)', flexShrink: 0 }}>
          <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Stage t={t} land={land} />
          </div>
        </div>
      </div>

      {!hidden && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid #1E293B', background: '#0F172A', flexWrap: 'wrap', fontFamily: FONT }}>
          <button style={btn} onClick={toggle}>
            {playing ? <Pause size={18} /> : ended ? <RotateCcw size={18} /> : <Play size={18} />}
            {playing ? 'Pause' : ended ? 'Replay' : 'Play'}
          </button>

          <button
            style={{ ...btn, background: C.blue, borderColor: '#3B82F6', color: '#fff' }}
            onClick={handleDirectExport}
            disabled={exporting}
            title="Pilih tab ini di dialog browser. File langsung terunduh setelah animasi selesai."
          >
            <Download size={18} /> {exporting ? 'Mengekspor…' : 'Unduh Video'}
          </button>

          <span style={{ color: '#64748B', fontSize: 12, maxWidth: 260, lineHeight: 1.35 }}>
            Saat dialog browser muncul, pilih tab ini. Jangan tekan Stop sharing sebelum animasi selesai. MP4 otomatis terunduh, atau WebM bila browser tidak mendukung MP4.
          </span>

          {exportError && (
            <span style={{ color: '#FCA5A5', fontSize: 12, maxWidth: 260, lineHeight: 1.35 }}>
              {exportError}
            </span>
          )}

          <span style={{ color: '#94A3B8', fontSize: 14, fontVariantNumeric: 'tabular-nums', minWidth: 92 }}>
            {t.toFixed(1)}s / {DUR}s
          </span>

          <input
            type="range"
            min={0}
            max={DUR}
            step={0.01}
            value={t}
            onChange={(ev) => seek(parseFloat(ev.target.value))}
            aria-label="Timeline"
            style={{ flex: 1, minWidth: 160, accentColor: C.blue }}
          />

          <div style={{ display: 'inline-flex', overflow: 'hidden', border: '1px solid #334155', borderRadius: 12 }}>
            <button
              style={{ ...btn, border: 0, borderRadius: 0, background: land ? '#334155' : '#1E293B', color: land ? '#fff' : '#E2E8F0' }}
              onClick={() => setLand(true)}
              title="Rasio 16:9 untuk video landscape"
            >
              <Monitor size={18} /> 16:9
            </button>
            <button
              style={{ ...btn, border: 0, borderRadius: 0, background: land ? '#1E293B' : '#334155', color: land ? '#E2E8F0' : '#fff', borderLeft: '1px solid #334155' }}
              onClick={() => setLand(false)}
              title="Rasio 9:16 untuk video vertikal"
            >
              <Smartphone size={18} /> 9:16
            </button>
          </div>

          <button
            style={btn}
            onClick={() => {
              setMute((m) => {
                setMuted(!m);
                return !m;
              });
            }}
          >
            {mute ? <VolumeX size={18} /> : <Volume2 size={18} />}
            {mute ? 'Unmute' : 'Mute'}
          </button>

          <button style={btn} onClick={() => setHidden(true)} title="Tekan Esc untuk memunculkan lagi">
            <EyeOff size={18} /> Hide
          </button>
        </div>
      )}
    </div>
  );
}