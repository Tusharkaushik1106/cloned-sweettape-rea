import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { splitChars, splitWords, shuffle } from './split.js'
import { makePeel, scrollPeel, initHandNote, initPoke, watchVisible } from './bits.js'

// Rows sit on one big canvas in a zig-zag; scrolling walks the camera along them.
const ROWS = [
  { cls: 'down-to-horizontal', gx: 1, gy: 48, word: 'CREATE', index: '/assets/index-1.svg',
    slot: { img: '/assets/create-masking-first.webp', tilt: 3.19, dy: -0.118, dx: 0, pp: 0.012, pe: 'sine.inOut', tape: ['/assets/opp-tape-x4.png', 'kraft', 0.34, 0.1961] },
    props: [
      { shot: '/assets/create-double-last.webp', px: 98, py: -15, pw: 15, pr: -8, pz: 2, pp: -0.03, pe: 'none', tape: ['/assets/opp-tape-x4.png', 'kraft', 0.34, 0.1961] },
      { tag: '/assets/slider/double/card.webp', px: 69, py: -24, pw: 22.71, pr: -6, pz: 1, pp: 0.03, pe: 'sine.inOut' },
      { tag: '/assets/slider/masking/card.webp', px: 53, py: 50, pw: 22.71, pr: 5, pz: 1, pp: 0.03, pe: 'power1.inOut' },
      { tag: '/assets/slider/opp-quiet/card.webp', px: 94, py: 46, pw: 22.71, pr: -14, pz: 1, pp: -0.02, pe: 'power2.inOut' },
    ],
    note: { px: 26, py: 78, lines: ['every masterpiece', 'starts held', 'in place.'] } },
  { cls: 'diagdown-to-horizontal', gx: 215, gy: 95, word: 'FIX', index: '/assets/index-2.svg',
    slot: { img: '/assets/cloth-tapex4.webp', tilt: 9.6, dy: -0.36, dx: 0.15, pp: 0.01, pe: 'none', tape: ['/assets/black-cloth-tape-x4.png', 'black', 0.28, 0.2105] },
    props: [
      { shot: '/assets/cloth-tapex4-bottomleft.webp', px: 32, py: 22, pw: 21, pr: -5, pz: 1, pp: -0.025, pe: 'power1.inOut', tape: ['/assets/black-cloth-tape-x4.png', 'black', 0.28, 0.2105] },
      { tag: '/assets/slider/cloth/card.webp', px: -5, py: 47, pw: 22.71, pr: 12, pz: 1, pp: 0.04, pe: 'sine.inOut' },
    ],
    note: { px: 19, py: -24, lines: ['the quick fix', 'that outlasts', 'the thing it fixed.'] } },
  { cls: 'diagup-to-horizontal', gx: 371, gy: 48, word: 'PROTECT', index: '/assets/index-3.svg',
    slot: { img: '/assets/protect-opp-tape-x4-square.webp', tilt: 4.8, dy: -0.1571, dx: 0.0785, pp: 0.014, pe: 'sine.inOut', tape: ['/assets/opp-tape-x4.png', 'kraft', 0.38, 0.1961] },
    props: [
      { shot: '/assets/opp-tape-last.webp', px: 98, py: 12, pw: 17, pr: 5, pz: 3, pp: 0.045, pe: 'none', tape: ['/assets/opp-tape-x4.png', 'kraft', 0.38, 0.1961] },
      { tag: '/assets/sibling-opp-normal.webp', px: 61, py: -32, pw: 22.71, pr: 6, pz: 1, pp: -0.02, pe: 'power2.inOut' },
      { tag: '/assets/sibling-opp-normal.webp', px: 43, py: 49, pw: 22.71, pr: 9, pz: 1, pp: 0.032, pe: 'power1.inOut' },
    ],
    note: { px: 25, py: 75, lines: ['from our hands', 'to theirs,', 'arriving whole.'] } },
]
const ARROWS = [
  { cls: 'diag-down-arrow', gx: 184, gy: 77, line: 'M4 8 C46 14 100 42 132 84', head: 'M111 80 L132 84 L123 65' },
  { cls: 'diag-up-arrow', gx: 338, gy: 80, line: 'M4 92 C46 86 100 58 132 16', head: 'M111 20 L132 16 L123 35' },
]

export function initGiant() {
  const sec = document.querySelector('.giant-pinning')
  const wrapper = sec.querySelector('.giant-wrapper')
  const canvas = sec.querySelector('.giant-canvas')
  const title = canvas.querySelector('.top-title')
  Object.assign(title.style, { left: '-3.5vw', top: '22vw' })

  const rows = ROWS.map(r => buildRow(canvas, r))
  const arrows = ARROWS.map(a => {
    const el = document.createElement('div')
    el.className = `giant-arrow ${a.cls}`
    Object.assign(el.style, { left: `${a.gx}vw`, top: `${a.gy}vw` })
    el.innerHTML = `<svg viewBox="0 0 150 100"><path d="${a.line}"/><path d="${a.head}"/></svg>`
    canvas.append(el)
    const [line, head] = el.querySelectorAll('path')
    for (const p of [line, head]) {
      const L = p.getTotalLength()
      Object.assign(p.style, { strokeDasharray: `${L} ${L + 2}`, strokeDashoffset: L + 1 })
    }
    return gsap.timeline({ paused: true })
      .to(line, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' })
      .to(head, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.inOut' }, 0.9)
  })

  // title reveal
  const tChars = [...title.querySelectorAll('.h2')].flatMap(h => {
    const lines = h.innerHTML.split(/<br\s*\/?>/i)
    h.innerHTML = lines.map(l => `<span class="line">${l}</span>`).join('')
    return [...h.querySelectorAll('.line')].flatMap(l => splitChars(l))
  })
  const sub = title.querySelector('.subhead')
  gsap.set(tChars, { yPercent: 130 })
  gsap.set(sub, { autoAlpha: 0, rotationY: -100, transformPerspective: 420 })
  ScrollTrigger.create({
    trigger: title, start: 'top 75%', once: true,
    onEnter: () => {
      gsap.to(shuffle(tChars), { yPercent: 0, duration: 0.6, stagger: 0.014, ease: 'power3.out' })
      gsap.to(sub, { autoAlpha: 1, rotationY: 0, duration: 0.85, delay: 0.32, ease: 'back.out(1.4)' })
    },
  })

  const revealRow = row => {
    if (row.revealed) return
    row.revealed = true
    gsap.to(shuffle(row.chars), { yPercent: 0, duration: 0.6, stagger: 0.055, ease: 'power3.out' })
    gsap.to(row.index, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' })
    row.peels.forEach(p => gsap.to(p, { progress: 1, duration: 0.75, delay: 0.3, ease: 'power2.inOut' }))
  }
  // ponytail: reveals a whole row when its first letter shows; the original batches per letter (5 at a time / .28s)
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return
    io.unobserve(e.target)
    revealRow(rows.find(r => r.el.contains(e.target)))
  }), { rootMargin: '20%' })
  rows.forEach(r => r.el.querySelectorAll('.giant .clip').forEach(c => io.observe(c)))

  // reduced motion: no pin, just show it all
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sec.classList.add('is-static')
    rows.forEach(revealRow)
    arrows.forEach(a => a.progress(1))
    return
  }

  /* camera path */
  let tl, st
  const parallaxEls = [...canvas.querySelectorAll('[data-pp]')]
  const build = () => {
    tl?.kill()
    st?.kill()
    gsap.set(canvas, { x: 0, y: 0 })
    const W = innerWidth, H = wrapper.offsetHeight, inset = 0.045 * W
    const cr = canvas.getBoundingClientRect()
    const box = el => { const r = el.getBoundingClientRect(); return { l: r.left - cr.left, t: r.top - cr.top, w: r.width, h: r.height } }

    const stops = []
    const rowStops = rows.map(row => {
      const b = box(row.el)
      let right = b.l + b.w
      row.el.querySelectorAll('.giant-prop').forEach(p => { const pb = box(p); right = Math.max(right, pb.l + pb.w) })
      const f = right - b.l
      const y = H / 2 - (b.t + b.h / 2)
      if (f <= W - 2 * inset) return [{ x: W / 2 - (b.l + f / 2), y }]
      const e = right > b.l + b.w ? 2 * inset : inset
      return [{ x: inset - b.l, y }, { x: W - e - (b.l + f), y }]
    })
    const tb = box(title)
    stops.push({ x: rowStops[0][0].x, y: 0.4 * H - (tb.t + tb.h / 2) })
    rowStops.forEach((rs, i) => rs.forEach(s => stops.push({ ...s, row: i })))
    // ponytail: straight segments; the original rounds turns >70° with a small Bézier, add if corners feel abrupt

    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    gsap.set(canvas, { x: stops[0].x, y: stops[0].y })
    let t = 0
    const marks = []
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1], b = stops[i]
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      tl.to(canvas, { x: b.x, y: b.y, duration: len }, t)
      if (b.row !== undefined && a.row !== b.row) marks.push({ at: t + len, row: b.row })
      t += len
    }
    // reveals forced along the timeline so fast scrolling never skips them
    marks.forEach(({ at, row }) => {
      tl.call(() => revealRow(rows[row]), null, Math.max(0, at - 1))
      if (row > 0) tl.call(() => arrows[row - 1].play(), null, at - 1)
    })
    tl.call(() => revealRow(rows[0]), null, 0.001)

    st = ScrollTrigger.create({
      trigger: wrapper, start: 'top top', end: `+=${t}`, pin: wrapper, pinSpacing: true,
      animation: tl, scrub: 0.6, invalidateOnRefresh: true,
      onUpdate: parallax,
    })
    parallax()
  }

  function parallax() {
    const cx = gsap.getProperty(canvas, 'x'), W = innerWidth
    for (const el of parallaxEls) {
      const home = el._home ??= (() => { const r = el.getBoundingClientRect(); return r.left + r.width / 2 - cx })()
      const s = gsap.utils.clamp(-1, 1, (cx + home - W / 2) / (0.65 * W))
      const c = Math.sign(s) * gsap.parseEase(el.dataset.pe)(Math.abs(s))
      el.style.setProperty('--pdx', `${-el.dataset.pp * W * c}px`)
      if (el.classList.contains('giant-prop--tag')) el.style.setProperty('--prot', `${-8 * c}deg`)
    }
  }
  gsap.ticker.add(parallax)
  build()
  ScrollTrigger.addEventListener('refreshInit', () => parallaxEls.forEach(el => delete el._home))
  let resizeT
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(build, 200) })

  initMakeItStick()
}

function buildRow(canvas, r) {
  const el = document.createElement('div')
  el.className = `giant-row ${r.cls}`
  Object.assign(el.style, { left: `${r.gx}vw`, top: `${r.gy}vw` })
  const h2 = document.createElement('h2')
  h2.className = 'giant'
  h2.setAttribute('aria-label', `TO ${r.word}`)
  const index = Object.assign(new Image(), { src: r.index, className: 'giant-index', alt: '' })
  const to = document.createElement('span')
  to.textContent = 'TO'
  const slot = document.createElement('span')
  slot.className = 'giant-slot'
  slot.dataset.pp = r.slot.pp
  slot.dataset.pe = r.slot.pe
  slot.style.cssText = `--giant-tilt:${r.slot.tilt}deg;--giant-dy:${r.slot.dy}em;--giant-dx:${r.slot.dx}em`
  slot.innerHTML = `<img class="giant-card" src="${r.slot.img}" alt=""><span class="giant-tape"></span>`
  const word = document.createElement('span')
  word.textContent = r.word
  h2.append(index, to, slot, word)
  el.append(h2)
  canvas.append(el)
  const chars = [...splitChars(to), ...splitChars(word)]
  gsap.set(chars, { yPercent: 130 })
  gsap.set(index, { autoAlpha: 0 })

  const peels = []
  const tape = (host, [img, back, from, h]) => {
    host.style.setProperty('--peel-h', `${h}em`)
    const p = makePeel(host, { img, dir: 88.4, from, back })
    peels.push(p)
  }
  tape(slot.querySelector('.giant-tape'), r.slot.tape)

  r.props.forEach(p => {
    let prop
    if (p.shot) {
      prop = document.createElement('span')
      prop.className = 'giant-prop giant-prop--shot'
      prop.innerHTML = `<img src="${p.shot}" alt=""><span class="giant-tape"></span>`
      tape(prop.querySelector('.giant-tape'), p.tape)
    } else {
      prop = Object.assign(new Image(), { src: p.tag, className: 'giant-prop giant-prop--tag', alt: '' })
    }
    prop.style.cssText += `--px:${p.px}%;--py:${p.py}%;--pw:${p.pw}vw;--pr:${p.pr}deg;--pz:${p.pz}`
    prop.dataset.pp = p.pp
    prop.dataset.pe = p.pe
    el.append(prop)
  })

  const note = document.createElement('div')
  note.className = 'hand-note giant-note'
  note.style.cssText = `--px:${r.note.px}%;--py:${r.note.py}%`
  note.innerHTML = `<div class="hand-ink">${r.note.lines.map(l => `<span class="hand-line">${l}</span>`).join('')}</div>`
  el.append(note)
  initHandNote(note, { draw: 0.3 })
  return { el, chars, index, peels, revealed: false }
}

function initMakeItStick() {
  const sec = document.querySelector('.make-it-stick')
  const shot = sec.querySelector('.stick-shot'), img = shot.querySelector('img')
  watchVisible(shot, () => {
    const r = shot.getBoundingClientRect(), H = innerHeight
    const l = (img.offsetHeight - r.height) / 2
    const s = gsap.utils.clamp(-1, 1, (H / 2 - (r.top + r.height / 2)) / ((H + r.height) / 2))
    img.style.setProperty('--stick-pan', `${Math.round(s * l * 2) / 2}px`)
  })

  const head = sec.querySelector('.stick-headline')
  head.innerHTML = head.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="line">${l}</span>`).join('')
  const chars = [...head.querySelectorAll('.line')].flatMap(l => splitChars(l))
  const words = splitWords(sec.querySelector('.stick-sub'))
  gsap.set(chars, { yPercent: 130 })
  gsap.set(words, { yPercent: 110 })
  ScrollTrigger.create({
    trigger: sec, start: 'top 75%', once: true,
    onEnter: () => gsap.to(shuffle(chars), { yPercent: 0, duration: 0.6, stagger: 0.02, ease: 'power3.out', onComplete: () => initPoke(head, chars) }),
  })
  ScrollTrigger.create({
    trigger: words[0], start: 'top 88%', once: true,
    onEnter: () => gsap.to(words, { yPercent: 0, duration: 0.72, ease: 'power3.out', stagger: 0.09 }),
  })

  const tape = sec.querySelector('.stick-tape')
  scrollPeel(tape, makePeel(tape, { dir: 90, from: 0.45, back: 'kraft' }), { inK: 1.08 })
}
