import { useLayoutEffect, useRef, useState } from 'react'
import { formatRupiah } from '../lib/format'
import LogoMark from './LogoMark'
import PixelIcon from './PixelIcon'

const INFLOW = 12_300_000
const GROWTH = 2_100_000

const CATEGORIES = [
  {
    id: 'kopi',
    label: 'Jajan & Kopi',
    amount: 650_000,
    transactions: 14,
    icon: 'coffee',
  },
  {
    id: 'bulanan',
    label: 'Kebutuhan Bulanan',
    amount: 3_200_000,
    transactions: 9,
    icon: 'bag',
  },
]

const TOTAL_EXPENSE = CATEGORIES.reduce((sum, item) => sum + item.amount, 0)
const BALANCE = INFLOW - TOTAL_EXPENSE

const COLORS = {
  inflow: '#10B981',
  kopi: '#F43F5E',
  bulanan: '#F43F5E',
}

const round = (value) => Math.round(value * 10) / 10

const offsetBox = (element, root) => {
  let x = 0
  let y = 0
  let node = element
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent
  }
  return {
    left: x,
    top: y,
    right: x + element.offsetWidth,
    bottom: y + element.offsetHeight,
    cx: x + element.offsetWidth / 2,
    cy: y + element.offsetHeight / 2,
    width: element.offsetWidth,
    height: element.offsetHeight,
  }
}

const bezierPoint = (p0, p1, p2, p3) => ({
  x: round(0.125 * p0.x + 0.375 * p1.x + 0.375 * p2.x + 0.125 * p3.x),
  y: round(0.125 * p0.y + 0.375 * p1.y + 0.375 * p2.y + 0.125 * p3.y),
})

const horizontalCurve = (from, to) => {
  const gap = to.left - from.right
  const p0 = { x: round(from.right), y: round(from.cy) }
  const p1 = { x: round(from.right + gap * 0.45), y: round(from.cy) }
  const p2 = { x: round(to.left - gap * 0.45), y: round(to.cy) }
  const p3 = { x: round(to.left), y: round(to.cy) }
  return {
    d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
    arrow: bezierPoint(p0, p1, p2, p3),
  }
}

const DEFAULT_PATHS = {
  inflow: {
    d: 'M 320 245 C 390 245, 410 245, 470 245',
    arrow: { x: 398, y: 245 },
    color: COLORS.inflow,
  },
  kopi: {
    d: 'M 730 245 C 820 245, 820 150, 880 150',
    arrow: { x: 806, y: 197 },
    color: COLORS.kopi,
  },
  bulanan: {
    d: 'M 730 245 C 820 245, 820 390, 880 390',
    arrow: { x: 806, y: 293 },
    color: COLORS.bulanan,
  },
}

const shareText = (amount) => {
  const value = Math.floor((amount / TOTAL_EXPENSE) * 1000) / 10
  return `${value.toFixed(1).replace('.', ',')}%`
}

function FlowPath({ id, path, activeKey }) {
  const isActive = activeKey === id
  const dimmed = Boolean(activeKey) && !isActive

  return (
    <g style={{ opacity: dimmed ? 0.16 : 1, transition: 'opacity 0.25s ease' }}>
      <path
        d={path.d}
        fill="none"
        stroke={path.color}
        strokeWidth={isActive ? 8 : 6}
        opacity={isActive ? 0.14 : 0.08}
        strokeLinecap="round"
      />
      <path
        d={path.d}
        fill="none"
        stroke={path.color}
        strokeWidth={isActive ? 3.5 : 2.4}
        strokeLinecap="round"
      />
      <path
        d={path.d}
        fill="none"
        stroke={path.color}
        strokeWidth={isActive ? 4 : 2.6}
        strokeDasharray="10 12"
        strokeLinecap="round"
        className="fund-flow-dash"
      />
      <text
        x={path.arrow.x}
        y={path.arrow.y}
        fill={path.color}
        fontSize="14"
        fontWeight="700"
        letterSpacing="1"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontFamily: 'var(--font-pixel)' }}
        className="fund-flow-arrow"
      >
        {'>>>'}
      </text>
      <circle
        r={isActive ? 5 : 4}
        fill="#fff"
        stroke={path.color}
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 6px ${path.color})` }}
      >
        <animateMotion dur={isActive ? '1.9s' : '2.8s'} repeatCount="indefinite" path={path.d} />
      </circle>
    </g>
  )
}

function InflowCard({ innerRef }) {
  return (
    <div ref={innerRef} className="w-full rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 shadow-[0_12px_30px_rgba(16,185,129,0.12)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg font-extrabold text-emerald-600">↗</span>
        <span className="min-w-0">
          <span className="block text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">Pemasukan</span>
          <span className="preview-value mt-1 block text-[19px] font-extrabold tracking-tight text-slate-900">
            {formatRupiah(INFLOW)}
          </span>
          <span className="mt-1 block text-[10.5px] font-semibold text-emerald-700/80">Masuk dari chat WhatsApp</span>
        </span>
      </div>
    </div>
  )
}

function HubCard({ active, innerRef }) {
  return (
    <div ref={innerRef} className={`relative w-full rounded-2xl border-2 border-blue-500/80 bg-white p-6 text-center shadow-[0_12px_40px_-10px_rgba(37,99,235,0.22)] transition ${active ? 'ring-4 ring-blue-100' : ''}`}>
      <LogoMark className="mx-auto mb-3 h-11 w-11 rounded-2xl shadow-lg" />
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Saldo Utama &amp; Arus Kas</p>
      <p className="preview-value mt-2 text-[30px] font-extrabold leading-none tracking-tight text-slate-900 sm:text-[34px]">
        {formatRupiah(BALANCE)}
      </p>
      <p className="mt-3 text-[11.5px] font-extrabold text-emerald-600">+ {formatRupiah(GROWTH)} bulan ini</p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">
        <PixelIcon name="zap" size={12} /> Diperbarui real-time
      </span>
    </div>
  )
}

function CategoryCard({ item, active, innerRef, onEnter, onLeave, onClick }) {
  return (
    <button
      ref={innerRef}
      type="button"
      aria-pressed={active}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      className={`relative w-full rounded-2xl border bg-rose-50/70 p-4 text-left shadow-[0_10px_28px_rgba(244,63,94,0.08)] outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-rose-100 ${
        active
          ? 'border-rose-300 ring-4 ring-rose-100 shadow-[0_18px_40px_rgba(244,63,94,0.18)]'
          : 'border-rose-200 hover:-translate-y-1 hover:border-rose-300'
      }`}
    >
      <span className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600">
          <PixelIcon name={item.icon} size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-[12.5px] font-extrabold text-slate-900">{item.label}</span>
          <span className="preview-value block text-[16px] font-extrabold tracking-tight text-rose-600">
            {formatRupiah(item.amount)}
          </span>
        </span>
      </span>
      <span className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-rose-500">
        <PixelIcon name="arrow-right" size={11} /> Lihat detail alur
      </span>
      {active && (
        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-[260px] -translate-x-1/2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[10.5px] font-extrabold text-rose-600 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
          {shareText(item.amount)} dari pengeluaran • {item.transactions} transaksi via WhatsApp
        </span>
      )}
    </button>
  )
}

function VerticalConnector({ color }) {
  return (
    <div className="flex flex-col items-center" style={{ color }}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      <span className="fund-flow-vertical-line" aria-hidden="true" />
      <span className="fund-flow-arrow -mt-2 text-[11px] font-extrabold">{'vvv'}</span>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    </div>
  )
}

function HintPill() {
  return (
    <div className="mt-6 flex justify-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 shadow-sm">
        💡 Geser atau hover kategori untuk detail alur
      </span>
    </div>
  )
}

export default function FundFlowDiagram() {
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned] = useState(null)
  const [geometry, setGeometry] = useState({ width: 1200, height: 520, paths: DEFAULT_PATHS })

  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const inflowRef = useRef(null)
  const hubRef = useRef(null)
  const categoryRefs = useRef({})

  const activeKey = hovered || pinned

  useLayoutEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return undefined

    const measure = () => {
      const width = svg.clientWidth
      const height = svg.clientHeight
      if (!width || !height) return
      if (
        !inflowRef.current || !hubRef.current
        || !categoryRefs.current.kopi || !categoryRefs.current.bulanan
      ) return

      const inflow = offsetBox(inflowRef.current, container)
      const hub = offsetBox(hubRef.current, container)
      const kopi = offsetBox(categoryRefs.current.kopi, container)
      const bulanan = offsetBox(categoryRefs.current.bulanan, container)
      if (!inflow.width || !hub.width || !kopi.width || !bulanan.width) return

      const next = {
        width: round(width),
        height: round(height),
        paths: {
          inflow: { ...horizontalCurve(inflow, hub), color: COLORS.inflow },
          kopi: { ...horizontalCurve(hub, kopi), color: COLORS.kopi },
          bulanan: { ...horizontalCurve(hub, bulanan), color: COLORS.bulanan },
        },
      }

      setGeometry((previous) => {
        if (
          previous.width === next.width
          && previous.height === next.height
          && previous.paths.inflow.d === next.paths.inflow.d
          && previous.paths.kopi.d === next.paths.kopi.d
          && previous.paths.bulanan.d === next.paths.bulanan.d
        ) return previous
        return next
      })
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(svg)
    if (document.fonts?.ready) document.fonts.ready.then(measure)
    return () => observer.disconnect()
  }, [])

  const cardProps = (item) => ({
    item,
    active: activeKey === item.id,
    innerRef: (element) => { categoryRefs.current[item.id] = element },
    onEnter: () => setHovered(item.id),
    onLeave: () => setHovered(null),
    onClick: () => setPinned((current) => (current === item.id ? null : item.id)),
  })

  return (
    <>
      <div ref={containerRef} className="fund-flow-grid relative hidden overflow-hidden rounded-3xl border border-slate-200 p-6 shadow-[0_24px_60px_rgba(37,99,235,0.09)] md:block lg:p-8">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <FlowPath id="inflow" path={geometry.paths.inflow} activeKey={activeKey} />
          <FlowPath id="kopi" path={geometry.paths.kopi} activeKey={activeKey} />
          <FlowPath id="bulanan" path={geometry.paths.bulanan} activeKey={activeKey} />
        </svg>

        <div className="relative z-10 grid min-h-[470px] grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)_minmax(0,1fr)] items-center gap-6 lg:gap-10">
          <div className="flex flex-col items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-xs">
              📱 via WhatsApp Bot
            </span>
            <InflowCard innerRef={inflowRef} />
          </div>

          <HubCard active={Boolean(activeKey)} innerRef={hubRef} />

          <div className="flex flex-col gap-4">
            {CATEGORIES.map((item) => <CategoryCard key={item.id} {...cardProps(item)} />)}
          </div>
        </div>

        <div className="relative z-10">
          <HintPill />
        </div>
      </div>

      <div className="fund-flow-grid relative rounded-3xl border border-slate-200 p-5 shadow-[0_20px_50px_rgba(37,99,235,0.08)] md:hidden">
        <div className="flex flex-col items-center">
          <span className="mb-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-xs">
            📱 via WhatsApp Bot
          </span>
          <InflowCard />
          <VerticalConnector color="#10B981" />
          <HubCard active={Boolean(activeKey)} />
          <VerticalConnector color="#F43F5E" />
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {CATEGORIES.map((item) => <CategoryCard key={item.id} {...cardProps(item)} innerRef={undefined} />)}
          </div>
        </div>
        <HintPill />
      </div>
    </>
  )
}
