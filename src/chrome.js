// Site-wide pieces: smooth scroll, preloader, menu, sound toggle, cursor.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { splitChars, shuffle } from './split.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

export function initLenis() {
  ScrollTrigger.config({ ignoreMobileResize: true })
  if (reduced) return null
  const lenis = new Lenis({ duration: 1.8 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(t => lenis.raf(t * 1000))
  return lenis
}

/* ---------- preloader ---------- */
const PANEL_COLORS = ['rgb(255,123,95)', 'rgb(250,128,5)', 'rgb(247,208,0)', 'rgb(182,254,0)', 'rgb(80,203,255)', 'rgb(46,62,172)']
const COLS = 64

// Resolves when the page is uncovered (hero intro starts then).
export function runPreloader(lenis) {
  const root = document.querySelector('.site-preloader')
  const sheet = root.querySelector('.preloader-sheet')
  const layers = [...root.querySelectorAll('.preloader-layer')]
  layers.forEach((l, i) => { l.style.background = PANEL_COLORS[i]; l.style.zIndex = 6 - i })
  sheet.style.zIndex = 7
  const panels = [sheet, ...layers]

  history.scrollRestoration = 'manual'
  scrollTo(0, 0)
  document.documentElement.dataset.loading = ''
  lenis?.stop()
  gsap.ticker.lagSmoothing(250, 120)

  const sticker = buildSticker(root.querySelector('.preloader-mark'))
  const w = Math.max(4.37 - Math.max(performance.now() / 1000 - 1.2, 0), 2.9)

  return new Promise(resolve => {
    const tl = gsap.timeline({ delay: 0 })
    let start = w
    panels.forEach((p, i) => {
      if (i) start += 0.09 * (1 + (((0.618034 * i) % 1) * 2 - 1) * 0.4)
      tl.to(p, { yPercent: -100, duration: 1.05 * (1 + 0.018 * i), ease: 'power3.inOut' }, start)
    })
    const D = 1.05 * (1 + 0.018 * 6)
    tl.call(() => dispatchEvent(new Event('sweettape:sweeping')), null, start + 0.33 * D)
    tl.call(() => {
      delete document.documentElement.dataset.loading
      lenis?.start()
      setTimeout(() => gsap.ticker.lagSmoothing(0), 2000)
      resolve()
    }, null, start + 0.55 * D)
    tl.call(() => { root.style.visibility = 'hidden'; sticker.destroy() }, null, start + D)
  })
}

// The logo sticker is sliced into 64 vertical strips that fold in 3D like a
// sheet being laid flat; per-frame we lay the strips end to end along θ.
function buildSticker(mark) {
  const W = mark.offsetWidth, H = W * 118 / 191, cw = W / COLS
  const svg = 'url(/assets/preloader-image.svg)'
  mark.style.perspective = `${6.6 * W}px`
  const st = document.createElement('div')
  st.className = 'preloader-sticker'
  const cols = []
  for (let i = 0; i < COLS; i++) {
    const col = document.createElement('div')
    col.className = 'preloader-col'
    Object.assign(col.style, { left: `${i * cw}px`, width: `${cw + 1.3}px`, height: `${H}px` })
    const pos = `${-i * cw}px 0`
    const ink = layer(col, 'preloader-ink', { backgroundImage: svg, backgroundSize: `${W}px ${H}px`, backgroundPosition: pos })
    const sheen = layer(col, 'preloader-sheen', {
      backgroundImage: 'linear-gradient(118deg, transparent 20%, rgba(255,255,255,.16) 50%, transparent 80%)',
      backgroundSize: `${W}px ${H}px`, maskImage: svg, maskSize: `${W}px ${H}px`, maskPosition: pos, mixBlendMode: 'screen',
    })
    const back = layer(col, 'preloader-back', { background: '#60a000', maskImage: svg, maskSize: `${W}px ${H}px`, maskPosition: pos, display: 'none' })
    st.append(col)
    cols.push({ col, ink, sheen, back })
  }
  mark.append(st)

  const s = { alpha: 0, scale: 0.62, rotX: -78, y: 0.064 * W, phase: 0, sheen: 0, fold: 1, bend: 1.85, wave: 0.35 }
  const tl = gsap.timeline({ delay: 1, onStart: () => { mark.style.visibility = 'visible' } })
    .to(s, { alpha: 1, duration: 0.2576, ease: 'none' }, 0)
    .to(s, { scale: 1, duration: 0.92, ease: 'back.out(2.8)' }, 0)
    .to(s, { rotX: 0, duration: 0.92, ease: 'back.out(2.24)' }, 0)
    .to(s, { y: 0, duration: 0.92, ease: 'power3.out' }, 0)
    .to(s, { phase: 0.6, duration: 2, ease: 'none' }, 0)
    .to(s, { sheen: 1, duration: 1.06, ease: 'power1.inOut' }, 0)
    .to(s, { fold: 0, duration: 0.74, ease: 'sine.inOut' }, 0.2392)
    .to(s, { bend: -1.332, duration: 0.74, ease: 'sine.inOut' }, 0.2392)
    .to(s, { bend: 0, duration: 0.4, ease: 'sine.inOut' }, 0.9792)
    .to(s, { wave: 0, duration: 2, ease: 'elastic.out(1,0.42)' }, 0.2392)

  const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t) }
  const draw = () => {
    let x = 0, z = 0
    const pts = cols.map((_, i) => {
      const r = (i + 0.5) / COLS
      const th = s.bend * (r - 0.5) + s.fold * smooth((r - 0.22) / 0.18) + s.wave * Math.sin(2 * Math.PI * (1.95 * r - s.phase))
      const hx = Math.cos(th) * cw / 2, hz = Math.sin(th) * cw / 2
      x += hx; z += hz
      const mid = { x, z, th }
      x += hx; z += hz
      return mid
    })
    const cx = x / 2, z0 = pts[COLS / 2].z
    pts.forEach((p, i) => {
      const c = cols[i], cos = Math.cos(p.th)
      c.col.style.transform = `translate3d(${p.x - cx - (i + 0.5) * cw + W / 2}px,0,${p.z - z0}px) rotateY(${-p.th}rad)`
      const front = cos >= 0
      c.ink.style.display = c.sheen.style.display = front ? '' : 'none'
      c.back.style.display = front ? 'none' : ''
      c.col.style.filter = `brightness(${front ? Math.max(0.2, 1 - 0.48 * (1 - cos)) : Math.max(0.2, -cos)})`
      c.sheen.style.backgroundPositionX = `${-i * cw + (2 * s.sheen - 1) * W}px`
    })
    st.style.transform = `translate3d(0,${s.y}px,0) rotateX(${s.rotX}deg) scale(${s.scale})`
    st.style.opacity = s.alpha
  }
  gsap.ticker.add(draw)
  tl.call(() => gsap.ticker.remove(draw), null, 2.239)
  return { destroy() { gsap.ticker.remove(draw); tl.kill(); st.remove() } }
}

function layer(parent, cls, style) {
  const el = document.createElement('div')
  el.className = cls
  Object.assign(el.style, style)
  parent.append(el)
  return el
}

/* ---------- sound ---------- */
const sound = (() => {
  let ctx, master, bgm, on = false
  const buffers = {}
  const load = async name => {
    if (!buffers[name]) buffers[name] = fetch(`/assets/sounds/${name}`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b))
    return buffers[name]
  }
  const ensure = () => {
    if (ctx) return
    ctx = new AudioContext()
    master = ctx.createGain()
    master.connect(ctx.destination)
  }
  const play = async (name, gain = 1, loop = false) => {
    if (!on) return null
    const src = ctx.createBufferSource()
    src.buffer = await load(name).catch(() => null)
    if (!src.buffer) return null
    src.loop = loop
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(g).connect(master)
    src.start()
    return src
  }
  return {
    play,
    get on() { return on },
    async toggle() {
      ensure()
      on = !on
      if (on) {
        await ctx.resume()
        play('sound-toggle.mp3')
        bgm ??= await play('bgm.m4a', 0.1, true)
      } else ctx.suspend()
      return on
    },
  }
})()

export function initSound() {
  const btn = document.querySelector('.menu-sound')
  btn.addEventListener('click', async () => btn.classList.toggle('is-on', await sound.toggle()))
  addEventListener('click', e => {
    if (!e.target.closest('.menu-tab, .menu-sound, .pl-hit')) sound.play('cursor-click.mp3')
  })
  addEventListener('sweettape:revealed', () => btn.classList.add('is-in'), { once: true })
}

/* ---------- menu ---------- */
export function initMenu() {
  const nav = document.querySelector('.site-menu')
  const tab = nav.querySelector('.menu-tab')
  const panel = nav.querySelector('.menu-panel')
  const sheet = nav.querySelector('.menu-sheet')
  const items = [...nav.querySelectorAll('.menu-item')]
  items[0].hidden = true // HOME is hidden on the home page
  const rows = items.slice(1).map(li => ({
    rule: li.querySelector('.menu-rule'),
    chars: splitChars(li.querySelector('.menu-label')),
    arrow: li.querySelector('.menu-arrow'),
  }))

  gsap.set(tab, { yPercent: -115 })
  addEventListener('sweettape:revealed', () => gsap.to(tab, { yPercent: 0, duration: 0.75, delay: 0.7, ease: 'back.out(1.9)' }), { once: true })

  const reset = () => rows.forEach(r => {
    gsap.set(r.rule, { clipPath: 'inset(0 100% 0 0)' })
    gsap.set(r.chars, { yPercent: 130 })
    gsap.set(r.arrow, { scale: 0 })
  })
  reset()
  let open = false, drop, contents
  const show = () => {
    open = true
    tab.setAttribute('aria-expanded', 'true')
    sound.play('menu-pull.mp3')
    drop = gsap.timeline()
      .fromTo(panel, { height: 0 }, { height: 'auto', duration: 0.7, ease: 'back.out(1.9)' }, 0)
      .fromTo(sheet, { yPercent: -100 }, { yPercent: 0, duration: 0.7, ease: 'back.out(1.9)' }, 0)
    contents = gsap.timeline()
    rows.forEach((r, i) => {
      const t = 0.28 + 0.16 * i
      contents.to(r.rule, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'power2.out' }, t)
        .to(shuffle(r.chars), { yPercent: 0, duration: 0.6, stagger: 0.025, ease: 'power3.out' }, t + 0.1)
        .to(r.arrow, { scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, t + 0.26)
    })
  }
  const hide = () => {
    if (!open) return
    open = false
    tab.setAttribute('aria-expanded', 'false')
    contents.pause()
    drop.tweenTo(0, { duration: 0.85, ease: 'power2.inOut', onComplete: reset })
  }
  let clickPt = { x: -1e4, y: -1e4 }
  tab.addEventListener('click', e => { clickPt = { x: e.clientX, y: e.clientY }; open ? hide() : show() })
  addEventListener('keydown', e => e.key === 'Escape' && hide())
  addEventListener('pointerdown', e => { if (open && !nav.contains(e.target)) hide() })
  nav.querySelectorAll('.menu-link').forEach(a => a.addEventListener('pointerenter', e => {
    if (Math.hypot(e.clientX - clickPt.x, e.clientY - clickPt.y) > 12) sound.play('menu-hover.mp3')
  }))
}

/* ---------- cursor ---------- */
const CURSORS = {
  arrow: ['/assets/new-cursor.svg', 48, 52, 11.2, 12],
  pointer: ['/assets/cursor-pointer.svg', 46.4, 49.6, 13.3, 6.3],
  type: ['/assets/cursor-type.svg', 25.6, 40.8, 12.8, 20.4],
}
export function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return
  const el = document.querySelector('.cursor-arrow')
  document.documentElement.classList.add('has-cursor')
  let state = '', hover = false, down = false
  const setState = next => {
    if (next === state) return
    state = next
    const [src, w, h, hx, hy] = CURSORS[next]
    Object.assign(el.style, { backgroundImage: `url(${src})`, width: `${w}px`, height: `${h}px`, translate: `${-hx}px ${-hy}px`, transformOrigin: `${hx}px ${hy}px` })
  }
  setState('arrow')
  const pose = () => gsap.to(el, { rotation: hover ? -1 : 7, scale: down ? 0.86 : hover ? 1.18 : 1, duration: 0.28, ease: 'power3.out' })
  gsap.set(el, { rotation: 7 })
  addEventListener('pointermove', e => {
    gsap.set(el, { x: e.clientX, y: e.clientY, autoAlpha: 1 })
    const t = e.target.closest?.('input, textarea, [contenteditable]') ? 'type'
      : e.target.closest?.('a, button, label, [data-cursor]') ? 'pointer' : 'arrow'
    setState(t)
    if (hover !== (t !== 'arrow')) { hover = t !== 'arrow'; pose() }
  })
  addEventListener('pointerdown', () => { down = true; pose() })
  addEventListener('pointerup', () => { down = false; pose() })
  document.addEventListener('pointerleave', () => gsap.to(el, { autoAlpha: 0, duration: 0.2 }))
  addEventListener('blur', () => gsap.to(el, { autoAlpha: 0, duration: 0.2 }))
}
