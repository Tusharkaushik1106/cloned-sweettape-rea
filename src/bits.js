// Small reusable effects: peeling tape, handwritten notes, letter "poke".
import gsap from 'gsap'

/* ---------- peel ----------
 * A tape strip folded back on itself along an axis at `dir` degrees.
 * The image is drawn twice: the face keeps everything past the cut line; the
 * flap is the same image mirrored about the cut and tinted with the backing
 * colour, so it reads as the sticky side folded over. progress 0 = folded by
 * `from` (fraction of strip length), 1 = folded by `to`.
 */
const BACKS = { kraft: '#dbac80', black: '#2f2f2f', default: '#d7d2c7', masking: '#d3c393', tissue: '#e3e3e3', clear: '#6a6a6a', mark: '#60a000' }

function ensureBackFilters() {
  if (document.getElementById('peel-filters')) return
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.id = 'peel-filters'
  svg.setAttribute('width', 0)
  svg.setAttribute('height', 0)
  svg.style.position = 'absolute'
  svg.innerHTML = Object.entries(BACKS).map(([k, c]) =>
    `<filter id="peel-back-${k}" color-interpolation-filters="sRGB"><feFlood flood-color="${c}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`).join('')
  document.body.prepend(svg)
}

export function makePeel(el, { img = el.dataset.img, dir = 90, from = 0.4, to = 0, back = 'kraft' } = {}) {
  ensureBackFilters()
  el.classList.add('peel')
  el.innerHTML = ''
  const axis = div('peel-axis')
  const face = div('peel-face'), flap = div('peel-flap')
  for (const part of [face, flap]) {
    const turn = div('peel-turn')
    const i = new Image()
    i.src = img
    i.alt = ''
    i.draggable = false
    turn.append(i)
    part.append(turn)
    axis.append(part)
  }
  flap.querySelector('img').style.filter = `url(#peel-back-${back})`
  el.append(axis)

  const rad = dir * Math.PI / 180
  let w = 0, h = 0, span = 0, A = 0
  const layout = () => {
    w = el.offsetWidth
    h = el.offsetHeight
    span = w * Math.abs(Math.sin(rad)) + h * Math.abs(Math.cos(rad))
    A = Math.hypot(w, h) * 2
    Object.assign(axis.style, { width: `${A}px`, height: `${span}px`, left: `${(w - A) / 2}px`, top: `${(h - span) / 2}px`, rotate: `${dir}deg` })
    for (const t of el.querySelectorAll('.peel-turn')) {
      Object.assign(t.style, { width: `${w}px`, height: `${h}px`, left: `${(A - w) / 2}px`, top: `${(span - h) / 2}px`, rotate: `${-dir}deg` })
    }
    draw()
  }
  const state = { progress: 0 }
  const draw = () => {
    const cut = (from + state.progress * (to - from)) * span
    const big = 1e4
    // face keeps what's past the cut; flap keeps what's before it, then mirrors it over the cut
    face.style.clipPath = `polygon(${-big}px ${cut}px, ${big}px ${cut}px, ${big}px ${big}px, ${-big}px ${big}px)`
    flap.style.clipPath = `polygon(${-big}px ${-big}px, ${big}px ${-big}px, ${big}px ${cut}px, ${-big}px ${cut}px)`
    flap.style.transform = `translateY(${2 * cut}px) scaleY(-1)`
    flap.style.filter = `brightness(${1 + 0.22 * state.progress})`
  }
  new ResizeObserver(layout).observe(el)
  layout()
  return new Proxy(state, { set(t, k, v) { t[k] = v; draw(); return true } })
}

const div = cls => { const d = document.createElement('div'); d.className = cls; return d }

// Scroll-scrubbed peel: 0 when the strip's top is `inK` screens below the
// fold, 1 when its centre reaches `outK` of the screen.
export function scrollPeel(el, peel, { inK = 0.92, outK = 0.46 } = {}) {
  const ease = gsap.parseEase('power1.inOut')
  const tick = () => {
    // in viewport coords the start/end scroll positions reduce to distances from the current scroll
    const r = el.getBoundingClientRect(), H = innerHeight
    const toStart = r.top - H * inK, toEnd = r.top + r.height / 2 - H * outK
    const t = gsap.utils.clamp(0, 1, -toStart / (toEnd - toStart))
    peel.progress = Math.round(ease(t) * 1000) / 1000
  }
  watchVisible(el, tick, '15%')
}

/* ---------- hand-written note ----------
 * An L-shaped pair of pen strokes draws in, then the note "writes" itself one
 * character at a time. Replays whenever it scrolls back into view.
 */
export function initHandNote(note, { draw = 1, ink } = {}) {
  const lines = [...note.querySelectorAll('.hand-line')]
  const chars = lines.map(l => {
    const t = l.textContent
    l.textContent = ''
    return [...t].map(ch => { const s = document.createElement('span'); s.textContent = ch; s.style.opacity = 0; l.append(s); return s })
  })
  note.insertAdjacentHTML('afterbegin',
    `<svg class="hand-rule hand-rule--x" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M 0 3 C 30 8 65 8 100 1"/></svg>` +
    `<svg class="hand-rule hand-rule--y" viewBox="0 0 10 100" preserveAspectRatio="none"><path d="M 6 0 C 2 33 3 70 6 100"/></svg>`)
  if (ink) note.style.color = ink
  const rx = note.querySelector('.hand-rule--x'), ry = note.querySelector('.hand-rule--y')
  const total = 0.75 * draw
  const tl = gsap.timeline({ paused: true })
    .fromTo(rx, { scaleX: 0 }, { scaleX: 1, duration: total * 0.6, ease: 'none', transformOrigin: '0 50%' })
    .fromTo(ry, { scaleY: 0 }, { scaleY: 1, duration: total * 0.4, ease: 'none', transformOrigin: '50% 0' })
  let t = tl.duration() + 0.14 * draw
  chars.forEach((line, li) => {
    if (li) t += 0.18 * draw
    line.forEach(c => { tl.set(c, { opacity: 1 }, t); t += 0.06 * draw })
  })
  new IntersectionObserver(([e]) => e.isIntersecting ? tl.restart() : tl.pause(0), { rootMargin: '0px 0px -22% 0px' }).observe(note)
}

/* ---------- poke ----------
 * Letters near the cursor lift and lean away from it; they spring back on leave.
 */
export function initPoke(container, chars) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
  container.addEventListener('pointermove', e => {
    const fs = parseFloat(getComputedStyle(container).fontSize)
    for (const c of chars) {
      const r = c.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
      const t = gsap.utils.clamp(0, 1, 1 - Math.hypot(dx, dy) / (0.8 * fs))
      const a = t * t * (3 - 2 * t)
      gsap.to(c, {
        y: -0.08 * fs * a, rotation: -11 * a * gsap.utils.clamp(-1, 1, dx / (0.4 * fs)), scale: 1 + 0.08 * a,
        transformOrigin: '50% 100%', duration: 0.45, ease: 'power3.out', overwrite: 'auto',
      })
    }
  })
  container.addEventListener('pointerleave', () => gsap.to(chars, {
    y: 0, rotation: 0, scale: 1, duration: 0.9, ease: 'elastic.out(1,0.45)', stagger: { each: 0.014, from: 'center' }, overwrite: 'auto',
  }))
}

// Runs `fn` on every ticker frame while `el` is near the viewport.
export function watchVisible(el, fn, margin = '0px') {
  let on = false
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; gsap.ticker.add(fn) }
    else if (!e.isIntersecting && on) { on = false; gsap.ticker.remove(fn) }
  }, { rootMargin: margin }).observe(el)
  fn()
}

// Exponential smoothing that's frame-rate independent.
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt))
