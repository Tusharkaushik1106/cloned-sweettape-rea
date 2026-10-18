import gsap from 'gsap'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { splitChars, shuffle } from './split.js'
import { makePeel, scrollPeel, initHandNote, initPoke, watchVisible, damp } from './bits.js'

const vw = () => innerWidth / 100
const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t) }

export function initHero() {
  const hero = document.querySelector('.hero-section')

  /* ---------- intro ---------- */
  const titleChars = [
    ...[...hero.querySelectorAll('.h4 .half')].flatMap(h => splitChars(h)),
    ...[...hero.querySelectorAll('.h1 .line')].flatMap(l => splitChars(l, { arc: true })),
  ]
  const cornerChars = [...hero.querySelectorAll('.corner-mark .line')].flatMap(l => splitChars(l))
  const perf = hero.querySelector('.corner-perf')
  const mark = hero.querySelector('.hero-mark')
  gsap.set([...titleChars, ...cornerChars], { yPercent: 130 })
  gsap.set(perf, { clipPath: 'inset(0 0 100% 0)' })
  gsap.set(mark, { yPercent: -170 })

  addEventListener('sweettape:revealed', () => {
    gsap.to(shuffle(titleChars), { yPercent: 0, duration: 0.6, stagger: 0.025, ease: 'power3.out', delay: 0.3 })
    gsap.timeline({ delay: 0.55 })
      .to(perf, { clipPath: 'inset(0 0 0% 0)', duration: 0.5, ease: 'power2.out' }, 0)
      .to(shuffle(cornerChars), { yPercent: 0, duration: 0.6, stagger: 0.012, ease: 'power3.out' }, 0.12)
    gsap.to(mark, { yPercent: 0, duration: 0.85, delay: 0.45, ease: 'back.out(1.6)' })
    initPoke(hero.querySelector('.h1'), titleChars.slice(-11))
  }, { once: true })

  initTape(hero)
  initBottom(hero)
  initWaveBand()
}

/* ---------- 3D roll that unrolls down the page as you scroll ---------- */
function initTape(hero) {
  const box = hero.querySelector('.hero-tape')
  const canvas = box.querySelector('canvas')
  const cardboard = hero.querySelector('.cardboard-wrapper')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0, 0)
  renderer.toneMapping = THREE.NoToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const camZ = 1.95, R = 0.5
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100)
  camera.position.z = camZ
  const scene = new THREE.Scene()
  const key = new THREE.DirectionalLight(0xffffff, 1.44)
  key.position.set(-1.6, 3.6, 2.5)
  const fill = new THREE.DirectionalLight(0xffffff, 0.3)
  fill.position.set(2.7, 2, 1)
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, Math.PI * 1.36))

  const yawGroup = new THREE.Group() // yaw + idle tilt
  const spin = new THREE.Group() // rolls about the tape's own axis
  yawGroup.add(spin)
  scene.add(yawGroup)

  // The unrolled strip: a translucent plane hanging off the front of the roll.
  const stripMat = new THREE.MeshStandardMaterial({ color: 0xd8cba0, transparent: true, opacity: 0.4, roughness: 0.4, side: THREE.DoubleSide })
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), stripMat)
  const stripWidth = 0.472 * ((camZ + R) / (camZ - R)) * 0.838
  strip.geometry.translate(0, -0.5, 0) // hang from the top edge
  strip.rotation.y = Math.PI / 2
  strip.position.set(R, 0, 0) // behind the roll (world z = -R once yawed 90°), which the px→world scale assumes
  strip.visible = false
  yawGroup.add(strip)

  let size = { w: 1, h: 1 }
  const resize = () => {
    size = { w: box.clientWidth, h: box.clientHeight }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2, 4096 / size.h))
    renderer.setSize(size.w, size.h, false)
    // frame a square at the top of the tall canvas; the strip hangs into the rest
    camera.setViewOffset(size.w, size.w, 0, 0, size.w, size.h)
    camera.aspect = 1
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(box)
  resize()

  const pxPerWorld = () => size.w / (2 * (camZ + R) * Math.tan(THREE.MathUtils.degToRad(17.5)))
  const docTop = el => el.getBoundingClientRect().top + scrollY

  const s = { yaw: 35, len: 0, home: 0, cut: 0, done: false, maxD: 0, yawOff: 0, tiltX: 0, tiltZ: 0, spinX: 0, mx: 0, my: 0 }
  let t = 0
  addEventListener('pointermove', e => { s.mx = (e.clientX / innerWidth) * 2 - 1; s.my = (e.clientY / innerHeight) * 2 - 1 })

  new GLTFLoader().load('/assets/tapes/Low-Noise-Tape.glb', gltf => {
    const model = gltf.scene
    const bb = new THREE.Box3().setFromObject(model)
    model.position.sub(bb.getCenter(new THREE.Vector3()))
    const wrap = new THREE.Group()
    wrap.rotation.x = -Math.PI / 2
    wrap.add(model)
    spin.add(wrap)
    gsap.set(box, { y: 13 * vw(), scale: 0.82 })
    const play = () => gsap.fromTo(box, { y: 13 * vw(), scale: 0.82 }, { y: 0, scale: 1, duration: 1.3, ease: 'back.out(1.5)' })
    if (document.documentElement.hasAttribute('data-loading')) addEventListener('sweettape:sweeping', play, { once: true })
    else play()
    gsap.ticker.add(frame)
  })

  const finale = () => {
    s.done = true
    gsap.timeline()
      .to(s, { cut: 1, duration: 0.7, ease: 'power2.in' }, 0)
      .to(s, { home: 1, duration: 1, ease: 'power3.inOut' }, 0.35)
  }

  function frame(_, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05)
    t += dt
    const H = innerHeight
    const boxTop = docTop(box)
    const rollCentre = boxTop + size.w / 2
    const d = scrollY - (rollCentre - H / 2 - 200)
    s.maxD = Math.max(s.maxD, d) // never rewinds

    if (!s.done) {
      s.yaw = 35 + 55 * smooth(s.maxD / 550)
      const x = Math.max(s.maxD - 420, 0)
      const raw = 4 * x * x / (x + 250)
      const k = 250, smin = (a, b) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k))
      const cap = Math.min(docTop(cardboard) + cardboard.offsetHeight + 6.25 * vw(), boxTop + size.h) - rollCentre
      const len = smin(smin(raw, scrollY + H - rollCentre - 160), cap)
      s.len = Math.max(s.len, len)
      if (s.len >= cap - 2) finale()
    }

    // idle drift + mouse once the strip has been cut
    const idle = s.done ? 1 : 0
    const tgtYaw = idle * (2.2 * Math.sin(2 * Math.PI * t / 7.3) + 9 * s.mx)
    const tgtTX = idle * (1.4 * Math.sin(2 * Math.PI * t / 5.1 + 1.7) + 4.5 * s.my)
    const tgtTZ = idle * (0.9 * Math.sin(2 * Math.PI * t / 9.7 + 0.6) - 2.5 * s.mx)
    s.yawOff = damp(s.yawOff, tgtYaw, 3, dt)
    s.tiltX = damp(s.tiltX, tgtTX, 3, dt)
    s.tiltZ = damp(s.tiltZ, tgtTZ, 3, dt)
    s.spinX = damp(s.spinX, idle * 5 * s.mx, 1.4, dt)
    const yaw = s.yaw + (35 - s.yaw) * s.home + s.yawOff

    const D2R = Math.PI / 180
    yawGroup.rotation.set(s.tiltX * D2R, yaw * D2R, s.tiltZ * D2R)
    const lenWorld = s.len / pxPerWorld()
    // spin snaps to a full turn on the way home
    const rolled = lenWorld / R
    spin.rotation.z = rolled + (Math.ceil(rolled / (2 * Math.PI)) * 2 * Math.PI - rolled) * s.home + s.spinX * D2R

    strip.visible = lenWorld > 0.001
    strip.scale.set(stripWidth, lenWorld, 1)
    // once cut, the strip stays put on the page while the roll swings home
    if (s.home > 0 && strip.parent === yawGroup) scene.attach(strip)
    renderer.render(scene, camera)
  }
}

/* ---------- scrapbook below the fold ---------- */
function initBottom(hero) {
  // gift drifts against the scroll
  const gift = hero.querySelector('#gift')
  let gy = 0
  watchVisible(gift, (_, dtMs = 16) => {
    const r = gift.getBoundingClientRect()
    const target = (innerHeight / 2 - (r.top - gy + r.height / 2)) * -0.12
    gy = Math.round(damp(gy, target, 9, dtMs / 1000) * 2) / 2
    gift.style.transform = `translate3d(0,${gy}px,0)`
  })

  // cardboard headline: chars rise line by line, scrubbed by scroll, one-way
  const h2 = hero.querySelector('.cardboard-wrapper .h2')
  const words = h2.textContent.trim().split(/\s+/)
  h2.setAttribute('aria-label', words.join(' '))
  h2.textContent = ''
  const chars = []
  words.forEach(w => {
    const word = document.createElement('span')
    word.className = 'word'
    h2.append(word, ' ')
    chars.push(...splitChars(Object.assign(word, { textContent: w })))
  })
  gsap.set(chars, { yPercent: 130 })
  const h2Box = h2.getBoundingClientRect()
  const tl = gsap.timeline({ paused: true })
  chars.forEach(c => {
    const top = (c.parentElement.getBoundingClientRect().top - h2Box.top) / h2Box.height
    tl.to(c, { yPercent: 0, duration: 0.6, ease: 'power3.out' }, top + Math.random() * 0.35)
  })
  let best = 0
  watchVisible(h2, () => {
    const r = h2.getBoundingClientRect(), H = innerHeight
    const p = gsap.utils.clamp(0, 1, (0.9 * H - r.top) / (r.height + 0.2 * H))
    if (p > best) { best = p; tl.progress(p) }
  }, '20%')

  // tapes press down as they scroll in
  const fold = (el, opts) => scrollPeel(el, makePeel(el, opts))
  fold(hero.querySelector('#tape-on-note'), { dir: 90, from: 0.55, back: 'masking' })
  fold(hero.querySelector('#tape-on-lemon'), { dir: 106.952, from: 0.55, back: 'masking' })

  initHandNote(hero.querySelector('.hand-note'), { draw: 1 })
  initStickyNote(hero.querySelector('.sticky-note'))
}

/* ---------- sticky note: pinned at the top, the rest flutters ---------- */
function initStickyNote(wrap) {
  const canvas = wrap.querySelector('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50)
  const scene = new THREE.Scene()
  const sun = new THREE.DirectionalLight(0xffffff, 1.1)
  sun.position.set(-2, 2.5, 3)
  scene.add(sun, new THREE.AmbientLight(0xffffff, Math.PI * 0.72))

  const geo = new THREE.PlaneGeometry(1, 0.94, 44, 44)
  const rest = geo.attributes.position.array.slice()
  const mat = new THREE.MeshStandardMaterial({ map: fallbackNoteTexture(), roughness: 0.9, side: THREE.DoubleSide })
  // the real note art 404s on the source site; fall back like it does, but use it if it ever appears
  new THREE.TextureLoader().load('/assets/sticky-note.png', tex => { tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.needsUpdate = true })
  const note = new THREE.Mesh(geo, mat)
  scene.add(note)

  const fit = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // note spans 62% of the view height
    camera.position.z = (0.94 / 0.62) / 2 / Math.tan(THREE.MathUtils.degToRad(17.5))
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(fit).observe(wrap)
  fit()

  let t = 0, lastY = scrollY, vel = 0, gust = 0
  const ptr = new THREE.Vector2(9, 9)
  wrap.addEventListener('pointermove', e => {
    const r = wrap.getBoundingClientRect()
    ptr.set((e.clientX - r.left) / r.width - 0.5, 0.47 - (e.clientY - r.top) / r.height * 0.94)
  })
  wrap.addEventListener('pointerleave', () => ptr.set(9, 9))

  const pos = geo.attributes.position
  watchVisible(wrap, (_, dtMs = 16) => {
    const dt = Math.min(dtMs / 1000, 0.05)
    t += dt
    vel = damp(vel, (scrollY - lastY) / Math.max(dt, 1e-3) / 1000, 4, dt)
    lastY = scrollY
    gust = damp(gust, (Math.sin(t * 0.7) * Math.sin(t * 1.9) > 0.6 ? 1 : 0) + 1.1 * Math.abs(vel), 2, dt)
    for (let i = 0; i < pos.count; i++) {
      const x = rest[i * 3], y = rest[i * 3 + 1]
      const fromTop = 0.47 - y
      const corner = Math.abs(x) * 2
      const wgt = smooth(fromTop / 0.85) ** 2.1 * (1 + 0.15 * corner)
      const curl = 0.14 * fromTop * fromTop
      const flutter = 0.035 * (Math.sin(t * 2.1 + x * 3 + y * 2) + 0.5 * Math.sin(t * 3.3 - y * 4))
      const tremble = 0.016 * Math.sin(t * 13 + x * 9) * Math.sin(t * 11 + y * 7)
      const near = Math.max(0, 1 - Math.hypot(x - ptr.x, y - ptr.y) / 0.35)
      pos.array[i * 3 + 2] = wgt * (curl + flutter + tremble + 0.3 * 0.2 * gust + 0.6 * 0.25 * near)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    renderer.render(scene, camera)
  })
}

function fallbackNoteTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 482
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, c.height)
  grad.addColorStop(0, '#f9dd55')
  grad.addColorStop(1, '#f2cf3e')
  g.fillStyle = grad
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#5a4500'
  g.font = '48px "Nothing You Could Do", cursive'
  g.fillText('TO-DO LIST', 60, 110)
  g.strokeStyle = 'rgba(90,69,0,.35)'
  for (let y = 170; y < 450; y += 60) { g.beginPath(); g.moveTo(60, y); g.lineTo(450, y); g.stroke() }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---------- wave band: text marquee riding a wavy tape ---------- */
function initWaveBand() {
  const band = document.querySelector('.wave-band')
  const ns = 'http://www.w3.org/2000/svg'
  let d = 'M -3200,330'
  for (let x = -3200, up = true; x < 8000; x += 800, up = !up) d += ` Q ${x + 400},${up ? 460 : 200} ${x + 800},330`
  const gap = ' '.repeat(6), tail = ' '.repeat(3)
  const unit = `WHEN LIFE GETS MESSY,${gap}SOMETHING HAS TO HOLD${tail}`
  band.innerHTML = `
    <svg viewBox="-80 60 1760 540" preserveAspectRatio="xMidYMid slice">
      <defs>
        <path id="wave-band-path" d="${d}"/>
        <pattern id="wave-band-grain" patternUnits="userSpaceOnUse" width="1600" height="897" y="60">
          <image href="/assets/paper-overlay.webp" width="1600" height="897"/>
        </pattern>
      </defs>
      <use href="#wave-band-path" class="band-tape"/>
      <text class="band-text" dy=".35em"><textPath href="#wave-band-path">${unit.repeat(6)}</textPath></text>
      <use href="#wave-band-path" class="band-tape-grain"/>
    </svg>`
  const svg = band.querySelector('svg')
  const path = svg.querySelector('#wave-band-path')
  const textPath = svg.querySelector('textPath')
  const text = svg.querySelector('text')

  // where the path crosses x=0
  let lo = 0, hi = path.getTotalLength()
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; path.getPointAtLength(m).x < 0 ? lo = m : hi = m }
  const L0 = lo + 40
  const unitLen = text.getComputedTextLength() / 6
  const headLen = (() => { // centre of the 6-space gap within a unit, for the badges
    const probe = document.createElementNS(ns, 'text')
    probe.setAttribute('class', 'band-text')
    probe.textContent = `WHEN LIFE GETS MESSY,${' '.repeat(3)}`
    svg.append(probe)
    const w = probe.getComputedTextLength()
    probe.remove()
    return w
  })()

  const badges = Array.from({ length: 6 }, () => {
    const img = document.createElementNS(ns, 'image')
    img.setAttribute('href', '/assets/sibling-opp-normal.webp')
    img.setAttribute('width', 150)
    img.setAttribute('height', 150)
    img.setAttribute('class', 'band-badge')
    svg.insertBefore(img, svg.querySelector('.band-tape-grain'))
    return img
  })

  const st = { offset: L0 }
  const tween = gsap.to(st, { offset: L0 - unitLen, duration: unitLen / 120, ease: 'none', repeat: -1 })
  tween.timeScale(0.9)
  const total = path.getTotalLength()
  let lastY = scrollY, ts = 0.9
  const tick = () => {
    const delta = scrollY - lastY
    lastY = scrollY
    const target = gsap.utils.clamp(-4, 5, 0.9 + 0.5 * delta)
    ts += (target - ts) * (Math.abs(target - 0.9) > Math.abs(ts - 0.9) ? 0.12 : 0.03)
    tween.timeScale(ts)
    textPath.setAttribute('startOffset', st.offset)
    badges.forEach((b, n) => {
      const at = st.offset + n * unitLen + headLen
      if (at < 8 || at > total - 8) { b.style.visibility = 'hidden'; return }
      const p = path.getPointAtLength(at), a = path.getPointAtLength(at - 8), c = path.getPointAtLength(at + 8)
      const ang = Math.atan2(c.y - a.y, c.x - a.x) * 180 / Math.PI
      b.style.visibility = 'visible'
      b.setAttribute('transform', `translate(${p.x - 75} ${p.y - 75}) rotate(${ang} 75 75)`)
    })
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { tween.resume(); gsap.ticker.add(tick) } else { tween.pause(); gsap.ticker.remove(tick) }
  }, { rootMargin: '600px' }).observe(band)
}
