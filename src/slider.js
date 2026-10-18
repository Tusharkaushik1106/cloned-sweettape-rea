import gsap from 'gsap'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { makePeel, damp } from './bits.js'

const M = '/api/media/file/'
const SLIDES = [
  { id: 'masking', word: 'creative', bg: '#fa8005', wc: '#fcd805', ring: '#fff1a2', tagBg: '#FFDC13', tagInk: '#D7791A', ink: '#FFDC13',
    tags: ['LABELING', 'PAINT WORK', 'BUNDLING'], copy: 'Always ready for school projects, quick labels, and weekend crafts. Easygoing. Comes off clean. No drama.',
    roll: 'masking-roll.webp?v=mudws2na', model: 'Masking-Tape.glb', shots: ['img-masking-tape-2.webp?v=mttikd2e', 'img-masking-tape-1.webp?v=mttikcys'],
    strip: ['/assets/masking-tape-x2.png', 'masking', 129.23, 37.12],
    glyphs: [['C', 95, 221], ['R', 92, 223], ['E', 77, 219], ['A', 100, 216], ['T', 75, 217], ['I', 48, 217], ['V', 99, 222], ['E2', 99, 223]] },
  { id: 'double', word: 'trusty', mul: 0.9888, tilt: 0, depth: -3.5, bg: '#50CBFF', wc: '#007db2', ring: '#a8dcf0', tagBg: '#1b87b8', tagInk: '#8bd8f5', ink: '#1b87b8',
    tags: ['INVISIBLE HOLDING', 'SMOOTH MOUNTING', 'QUICK PATCHING'], copy: 'The kind of tape that commits. Strong hold on both sides, easy to use, hard to let go.',
    roll: 'double-roll.webp?v=mudws2mt', model: 'Double-Tape.glb', clarity: 0.04, shots: ['img-double-sided-tape-2.webp?v=mttikd9j', 'img-double-sided-tape-4.webp?v=mttikdd3'],
    strip: ['/assets/double-side-x4.png', 'tissue', 138.77, 51.54],
    glyphs: [['T', 114, 221], ['R', 144, 225], ['U', 129, 218], ['S', 128, 220], ['T2', 117, 224], ['Y', 140, 226]] },
  { id: 'stationery', word: 'buddy', mul: 0.991, bg: '#FF7B5F', wc: '#a82712', ring: '#ffd9c2', tagBg: '#9e2a12', tagInk: '#f2a08c', ink: '#9e2a12',
    tags: ['SMALL REPAIRS', 'STICK & GO', 'DESK DRAWER ESSENTIAL'], copy: 'From broken corners to last-minute projects. Easy to tear. Easy to use. Weirdly reliable.',
    roll: 'stationery-roll.webp?v=mudws2o9', model: 'Cello-Tape.glb', clarity: 0.11, shots: ['img-stationery-tape-3.webp?v=mtqruzwr', 'img-stationery-tape-2.webp?v=mttikdgc'],
    strip: ['/assets/low-noise-x4-clear.png', 'clear', 147.71, 96.64],
    glyphs: [['B', 182, 231], ['U', 178, 222], ['D', 167, 220], ['D2', 157, 220], ['Y', 193, 231]] },
  { id: 'cloth', word: 'fixer', mul: 1.0185, bg: '#2E3EAC', wc: '#101E83', ring: '#d9d2f7', tagBg: '#172795', tagInk: '#B0B9FA', ink: '#919CFF',
    tags: ['QUICK FIX', 'STRONG REPAIRS', 'BUNDLING'], copy: 'Doesn’t talk much. Just holds everything together. Rain or shine.',
    roll: 'cloth-roll.webp?v=mudws2lk', model: 'Cloth-Tape.glb', shots: ['img-cloth-tape-3.webp?v=mttikdmg', 'img-cloth-tape-5.webp?v=mttikdjd'],
    strip: ['/assets/black-cloth-tape-x4.png', 'black', 155.56, 52.81],
    glyphs: [['F', 197, 217], ['I', 117, 212], ['X', 200, 206], ['E', 181, 216], ['R', 221, 221]] },
  { id: 'opp', word: 'reliable', mul: 0.9503, bg: '#b6fe00', wc: '#52AF16', ring: '#e4f7a8', tagBg: '#52AF16', tagInk: '#E7FF8F', ink: '#52AF16',
    tags: ['SEALING', 'PACKAGING', 'WRAPPING'], copy: 'Moving house? Packing chaos? This one shows up every time.',
    roll: 'opp-roll.webp?v=muqg6vzf', model: 'header-brown.glb', clarity: 0.09, shots: ['opp-tape-shot-1.webp?v=muov8cmb', 'opp-shot-2.webp?v=mtbq3364'],
    strip: ['/assets/opp-tape-x4.png', 'masking', 128.83, 40.74],
    glyphs: [['R', 147, 244], ['E', 115, 236], ['L', 80, 232], ['I', 39, 228], ['A', 111, 229], ['B', 129, 231], ['L2', 113, 229], ['E2', 133, 240]] },
  { id: 'opp-quiet', word: 'silent', mul: 1.0706, bg: '#F7D000', wc: '#a88700', ring: '#fff0b0', tagBg: '#a88700', tagInk: '#ffeda0', ink: '#8a6f00',
    tags: ['CHILL BUNDLING', 'QUIET LABELING', 'SOFT PACKING'], copy: 'Perfect for calm packers, quiet workers, and people who tape at 2AM. Soft roll. Strong stick.',
    roll: 'opp-quiet-roll.webp?v=mudwy9fg', model: 'Low-Noise-Tape.glb', clarity: 0.1, shots: ['img-opp-no-noise-tape-2.webp?v=mtquwmc6', 'opp-quiet-shot-2.webp?v=mtbq32q3'],
    strip: ['/assets/low-noise-x4-clear.png', 'clear', 147.71, 96.64],
    glyphs: [['S', 139, 204], ['I', 90, 202], ['L', 156, 207], ['E', 158, 199], ['N', 184, 210], ['T', 170, 213]] },
]
const THE = [['T', 120, 212], ['H', 139, 207], ['E', 120, 214]]

export function initSlider() {
  const sec = document.querySelector('.tape-slider-parent')
  const base = sec.querySelector('.bg-layer--base')
  const next = sec.querySelector('.bg-layer--next')
  const subhead = sec.querySelector('.subhead')
  const rollIt = sec.querySelector('.roll-it')
  const track = sec.querySelector('.rail-track')
  const left = sec.querySelector('.left')
  const tagsBox = sec.querySelector('.tags')
  const body = sec.querySelector('.subtext .h5')
  const topTitle = sec.querySelector('.top-title')
  const bottomTitle = sec.querySelector('.bottom-title')
  const explore = sec.querySelector('.explore-button')
  const showBox = sec.querySelector('.showcases')
  let cur = 0, busy = null
  const S = () => SLIDES[cur]

  const lift = () => sec.style.setProperty('--slide-lift', `${-Math.min(Math.max(0, 0.36 * innerWidth - 0.576 * innerHeight), 0.036 * innerWidth)}px`)
  addEventListener('resize', lift)
  lift()

  const paint = s => {
    sec.style.setProperty('--tag-bg', s.tagBg)
    sec.style.setProperty('--tag-ink', s.tagInk)
    sec.style.setProperty('--ink', s.ink)
  }

  /* rail */
  const buttons = SLIDES.map((s, i) => {
    const b = document.createElement('button')
    b.setAttribute('aria-label', `${s.id} tape`)
    b.style.setProperty('--ring', s.ring)
    b.innerHTML = `<span class="roll-ring"></span><img src="${M + s.roll}" alt="">`
    b.addEventListener('click', () => go(i))
    track.append(b)
    return b
  })
  const rail = { rot: 180 }
  const placeRail = () => {
    const r = track.offsetWidth / 2
    buttons.forEach((b, i) => {
      const a = (i * 60 + rail.rot) * Math.PI / 180
      b.style.transform = `translate(-50%,-50%) translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px)`
    })
  }
  const rings = buttons.map(b => b.querySelector('.roll-ring'))
  const setActive = () => buttons.forEach((b, i) => { b.classList.toggle('is-active', i === cur); b.setAttribute('aria-pressed', i === cur); b.style.zIndex = i === cur ? 2 : 1 })

  /* letters are coloured by mask so one image set serves every tint */
  const letter = (cls, src, w, h, unit) => {
    const el = document.createElement('span')
    el.className = cls
    el.style.cssText = `--glyph:url(${src});width:${w * unit}vw;height:${h * unit}vw`
    el.innerHTML = '<i></i>'
    return el
  }
  const theEls = THE.map(([L, w, h]) => {
    const el = letter('the-glyph', `/assets/middle-${L}.webp`, w, h, 0.0674 * 0.85)
    topTitle.append(el)
    return el.firstChild
  })
  let glyphEls = []
  const buildWord = s => {
    bottomTitle.innerHTML = ''
    const u = 0.0674 * (s.mul ?? 1), n = s.glyphs.length
    glyphEls = s.glyphs.map(([L, w, h], i) => {
      const el = letter('glyph', `/assets/words/${s.word}/${L}.webp`, w, h, u)
      const k = 2 * i / (n - 1) - 1
      el.style.transform = `translateY(${(s.depth ?? 1.3) * (1 - k * k)}vw) rotate(${-(s.tilt ?? 8) * k}deg)`
      bottomTitle.append(el)
      return el.firstChild
    })
    bottomTitle.style.left = s.id === 'opp-quiet' ? '51%' : ''
  }

  /* left column */
  const fillLeft = s => {
    tagsBox.innerHTML = `<div class="tag">${s.tags.map(t => `<h6 class="h6">${t}</h6>`).join('')}</div>`
    body.innerHTML = s.copy.split(' ').map(w => `<span class="body-clip"><span class="body-rise">${w}</span></span>`).join(' ')
  }
  const bodyLines = () => {
    const rows = new Map()
    body.querySelectorAll('.body-rise').forEach(w => { const k = w.parentElement.offsetTop; rows.set(k, [...(rows.get(k) || []), w]) })
    return [...rows.values()]
  }
  const tagEls = () => [...tagsBox.querySelectorAll('h6')]

  /* showcases */
  const shots = [0, 1].map(i => {
    const wrap = document.createElement('span')
    wrap.className = `showcase showcase--${i + 1}`
    wrap.innerHTML = '<img alt=""><span class="showcase-tape"></span>'
    showBox.append(wrap)
    return { wrap, img: wrap.firstChild, tape: wrap.lastChild, peel: null }
  })
  const fillShots = s => shots.forEach((sh, i) => {
    sh.img.src = M + s.shots[i]
    const [src, back, w, h] = s.strip
    sh.tape.style.width = `${w}px`
    sh.tape.style.height = `${h}px`
    const p = sh.peel?.progress ?? 0
    sh.peel = makePeel(sh.tape, { img: src, dir: 90, from: i ? 0.54 : 0.66, back })
    sh.peel.progress = p
  })

  /* 3D key visual */
  const viewer = initViewer(sec.querySelector('.key-visual'), SLIDES)

  /* first paint */
  const s0 = S()
  base.style.background = s0.bg
  sec.style.setProperty('--word-colour', s0.wc)
  paint(s0)
  buildWord(s0)
  fillLeft(s0)
  fillShots(s0)
  setActive()
  placeRail()
  addEventListener('resize', placeRail)
  explore.href = '#'

  /* entrance */
  const dipH = el => el.parentElement.offsetHeight + 2
  gsap.set(theEls, { y: i => dipH(theEls[i]) })
  gsap.set(glyphEls, { y: i => dipH(glyphEls[i]) })
  gsap.set(tagEls(), { x: () => -(left.getBoundingClientRect().right + 40) })
  gsap.set(body.querySelectorAll('.body-rise'), { yPercent: 110 })
  gsap.set(shots.map(s => s.wrap), { rotationY: -90, z: -55, transformPerspective: 900 })
  gsap.set(explore, { autoAlpha: 0, scale: 0, y: 0.022 * innerWidth })
  gsap.set(explore.querySelector('.button-text'), { yPercent: 115 })
  gsap.set(rings, { scale: 0, opacity: 0 })
  gsap.set(subhead, { autoAlpha: 0, rotationY: -100, transformPerspective: 420 })

  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return
    io.disconnect()
    sec.classList.add('is-ready')
    gsap.timeline()
      .to(subhead, { autoAlpha: 1, rotationY: 0, duration: 0.85, ease: 'back.out(1.4)' }, 0)
      .to(rings[cur], { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' }, 0.4)
      .to(theEls, { y: 0, duration: 0.42, ease: 'power3.out', stagger: 0.08 }, 0.1)
      .to(glyphEls, { y: 0, duration: 0.42, ease: 'power3.out', stagger: 0.05 }, 0.26)
      .to(tagEls(), { x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.07 }, 0.2)
      .add(() => gsap.to(bodyLines(), { yPercent: 0, duration: 0.72, ease: 'power3.out', stagger: 0.09 }), 0.2)
      .to(shots.map(s => s.wrap), { rotationY: 0, z: 0, duration: 0.39, ease: 'power2.out', stagger: 0.26 }, 0.22)
      .to(shots.map(s => s.peel), { progress: 1, duration: 0.62, ease: 'power2.out', stagger: 0.26 }, 0.69)
      .to(explore, { scale: 1, duration: 0.52, ease: 'back.out(2.4)' }, 0.6)
      .to(explore, { autoAlpha: 1, y: 0, duration: 0.68, ease: 'back.out(1.9)' }, 0.6)
      .to(explore.querySelector('.button-text'), { yPercent: 0, duration: 0.5, ease: 'power3.out' }, 0.76)
  }, { rootMargin: '0px 0px -45% 0px' }).observe(sec)

  /* slide change */
  const sound = new Audio('/assets/sounds/slide-change.mp3')
  function go(i) {
    i = (i + SLIDES.length) % SLIDES.length
    if (i === cur) return
    busy?.progress(1)
    cur = i
    const s = S()
    sound.currentTime = 0
    sound.play().catch(() => {})
    setActive()

    const tl = busy = gsap.timeline()
    // rail spins the shortest way so the chosen roll lands at the far left
    const delta = ((180 - i * 60 - rail.rot) % 360 + 540) % 360 - 180
    tl.to(rings, { scale: 0, opacity: 0, duration: 0.46, ease: 'back.in(0.9)' }, 0)
      .to(rail, { rot: rail.rot + delta, duration: 0.85, ease: 'sine.inOut', onUpdate: placeRail }, 0.12)
      .to(rings[i], { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' }, 0.75)

    // background sweeps down with a curved leading edge
    const H = sec.offsetHeight, arc = sec.offsetWidth * 150.5 / 1456, o = H + arc + 2
    next.style.height = `${o}px`
    next.style.background = s.bg
    const sweepEase = gsap.parseEase('power2.out')
    // time at which the sweep's edge passes an element's bottom
    const passes = el => {
      const y = el.getBoundingClientRect().bottom - sec.getBoundingClientRect().top + arc
      let lo = 0, hi = 1
      for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; sweepEase(m) * o < y ? lo = m : hi = m }
      return 0.75 + 0.85 * hi
    }
    tl.fromTo(next, { y: -o }, { y: 0, duration: 0.85, ease: 'power2.out' }, 0.75)
      .call(() => paint(s), null, passes(subhead))
      .call(() => rollIt.style.color = s.ink, null, passes(rollIt))
      .call(() => { base.style.background = s.bg; gsap.set(next, { y: -o }) }, null, 1.6)

    // "THE" letters dip, change ink, rise again
    const n = theEls.length
    theEls.forEach((el, k) => {
      tl.to(el, { y: dipH(el), duration: 0.32, ease: 'power2.in' }, 0.08 * k)
    })
    tl.call(() => sec.style.setProperty('--word-colour', s.wc), null, 0.08 * (n - 1) + 0.32)
    theEls.forEach((el, k) => tl.to(el, { y: 0, duration: 0.42, ease: 'power3.out' }, Math.max(0.39 + 0.08 * (n - 1), 0.81) + 0.08 * k))

    // word glyphs dip out, swap word, rise in
    const out = glyphEls
    out.forEach((el, k) => tl.to(el, { y: dipH(el), duration: 0.32, ease: 'power2.in' }, 0.06 + 0.05 * k))
    const swapAt = 0.06 + 0.05 * (out.length - 1) + 0.32
    tl.call(() => {
      buildWord(s)
      gsap.set(glyphEls, { y: k => dipH(glyphEls[k]) })
      glyphEls.forEach((el, k) => gsap.to(el, { y: 0, duration: 0.42, ease: 'power3.out', delay: Math.max(0, 0.9 - swapAt) + 0.05 * k }))
    }, null, swapAt)

    // model does a coin flip
    tl.add(() => viewer.flipTo(i), 0.1)

    // showcase cards flip edge-on, swap, flip back
    shots.forEach((sh, k) => {
      const t0 = 0.18 + 0.26 * k
      tl.to(sh.wrap, { rotationY: 90, z: -55, duration: 0.39, ease: 'power2.in' }, t0)
        .call(() => {
          sh.img.src = M + s.shots[k]
          const [src, back, w, h] = s.strip
          Object.assign(sh.tape.style, { width: `${w}px`, height: `${h}px` })
          sh.peel = makePeel(sh.tape, { img: src, dir: 90, from: k ? 0.54 : 0.66, back })
          sh.peel.progress = 1
          gsap.set(sh.wrap, { rotationY: -90 })
        }, null, t0 + 0.39)
        .to(sh.wrap, { rotationY: 0, z: 0, duration: 0.39, ease: 'power2.out' }, t0 + 0.39)
    })

    // left column slides out, swaps copy, comes back
    const leftOut = 0.12 + 0.34 + 0.07 * 2
    tl.to(tagEls(), { x: -(left.getBoundingClientRect().right + 40), duration: 0.34, ease: 'power2.in', stagger: 0.07 }, 0.12)
      .add(() => gsap.to(bodyLines(), { yPercent: 110, duration: 0.26, ease: 'power2.in', stagger: 0.05 }), 0.12)
      .call(() => {
        fillLeft(s)
        gsap.set(tagEls(), { x: -(left.getBoundingClientRect().right + 40) })
        gsap.set(body.querySelectorAll('.body-rise'), { yPercent: 110 })
      }, null, leftOut)
      .add(() => {
        gsap.to(tagEls(), { x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.07 })
        gsap.to(bodyLines(), { yPercent: 0, duration: 0.72, ease: 'power3.out', stagger: 0.09 })
      }, Math.max(leftOut + 0.06, 1.48))
  }

  sec.querySelectorAll('.tape-nav button').forEach(b => b.addEventListener('click', () => go(cur + +b.dataset.dir)))
  addEventListener('keydown', e => {
    const r = sec.getBoundingClientRect()
    if (r.top > innerHeight / 2 || r.bottom < innerHeight / 2) return
    if (e.key === 'ArrowRight') go(cur + 1)
    if (e.key === 'ArrowLeft') go(cur - 1)
  })
}

/* ---------- key visual: the current roll in 3D, with a gentle mouse tilt ---------- */
function initViewer(box, slides) {
  const canvas = box.querySelector('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0, 0)
  renderer.toneMapping = THREE.NoToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.14
  const extra = new THREE.DirectionalLight(0xffffff, 0.12)
  extra.position.set(2.7, 2, 1)
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * 0.97), extra)
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100)
  camera.position.z = 2.3

  const tilt = new THREE.Group(), flip = new THREE.Group()
  tilt.add(flip)
  scene.add(tilt)
  const models = []
  let shown = 0, dirty = true
  const loader = new GLTFLoader()
  const load = i => new Promise(res => loader.load(`/assets/tapes/${slides[i].model}`, g => {
    const m = g.scene
    m.position.sub(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))
    const wrap = new THREE.Group()
    wrap.rotation.x = -Math.PI / 2
    wrap.add(m)
    wrap.visible = i === shown
    flip.add(wrap)
    models[i] = wrap
    dirty = true
    res()
  }, undefined, () => res()))
  load(0).then(async () => {
    gsap.to(canvas, { opacity: 1, duration: 0.35 })
    for (let i = 1; i < slides.length; i++) await load(i)
  })

  const fit = () => {
    const s = box.clientWidth * 1.3
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(s, s, false)
    dirty = true
  }
  new ResizeObserver(fit).observe(box)
  fit()

  const ptr = { x: 0, y: 0 }, cur = { x: 0, y: 0 }
  if (matchMedia('(hover: hover)').matches) {
    addEventListener('pointermove', e => {
      const r = box.getBoundingClientRect()
      const k = 0.5 * Math.min(innerWidth, innerHeight) * 0.42
      ptr.x = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / k)
      ptr.y = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / k)
    })
    addEventListener('blur', () => { ptr.x = ptr.y = 0 })
  }
  const flipState = { a: 0 }
  gsap.ticker.add((_, dtMs) => {
    const dt = dtMs / 1000
    const nx = damp(cur.x, ptr.x, 5, dt), ny = damp(cur.y, ptr.y, 5, dt)
    if (Math.abs(nx - cur.x) + Math.abs(ny - cur.y) > 1e-5) dirty = true
    cur.x = nx
    cur.y = ny
    if (!dirty) return
    tilt.rotation.set(-0.08 * cur.y, 0.12 * cur.x, 0)
    tilt.position.set(-0.09 * cur.x, 0.065 * cur.y, 0)
    flip.rotation.y = flipState.a
    renderer.render(scene, camera)
    dirty = false
  })
  const mark = () => { dirty = true }
  return {
    flipTo(i) {
      gsap.timeline()
        .to(flipState, { a: Math.PI / 2, duration: 0.45, ease: 'power2.in', onUpdate: mark })
        .call(() => {
          models.forEach((m, k) => m && (m.visible = k === i))
          shown = i
          flipState.a = -Math.PI / 2
        })
        .to(flipState, { a: 0, duration: 0.45, ease: 'power2.out', onUpdate: mark })
    },
  }
}
