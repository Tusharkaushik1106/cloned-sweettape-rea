import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Matter from 'matter-js'
import { splitChars, shuffle } from './split.js'

const { Engine, Bodies, Body, Composite, Constraint, Events, Sleeping } = Matter
const BALLS = [ // d / x / y in vw
  [18.7, 9.6, 18.7], [18.7, 22.6, 35.6], [18.7, 65.5, 37.3], [18.7, 89.9, 37.5],
  [12.7, 80.6, 22], [12.7, 93.6, 20.2], [12.7, 38.7, 38.6],
]

export function initFooter() {
  const footer = document.querySelector('.site-footer')
  const head = footer.querySelector('.footer-headline')
  const linkChars = [...footer.querySelectorAll('.footer-link-label')].flatMap(l => splitChars(l, { indexVar: true }))
  const headChars = [...head.querySelectorAll('.line')].flatMap(l => splitChars(l, { arc: true }))
  const dots = footer.querySelectorAll('.footer-link-dot')

  gsap.set([...linkChars, ...headChars], { yPercent: 130 })
  gsap.set(dots, { scale: 0 })
  ScrollTrigger.create({
    trigger: footer, start: 'top 80%', once: true,
    onEnter: () => gsap.timeline({ onComplete: () => initPoke(head, headChars) })
      .to(shuffle(linkChars), { yPercent: 0, duration: 0.6, stagger: 0.014, ease: 'power3.out' }, 0)
      .to(shuffle(headChars), { yPercent: 0, duration: 0.6, stagger: 0.025, ease: 'power3.out' }, 0.24)
      .to(dots, { scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(2.2)' }, 0.3),
  })

  const box = footer.querySelector('.footer-bottom')
  const els = [...box.querySelectorAll('.footer-ball')]
  els.forEach((el, i) => {
    const [d, x, y] = BALLS[i]
    el.style.cssText += `--ball-d:${d};--ball-x:${x};--ball-y:${y}`
  })
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let world = buildWorld(box, els)
  let resizeT
  addEventListener('resize', () => {
    clearTimeout(resizeT)
    // ponytail: rebuild drops balls in again instead of restoring positions; snapshot/restore if it bothers anyone
    resizeT = setTimeout(() => { world.destroy(); world = buildWorld(box, els) }, 180)
  })
}

function buildWorld(box, els) {
  const vw = innerWidth / 100
  const w = box.clientWidth, h = box.clientHeight
  const engine = Engine.create({ enableSleeping: true })
  engine.gravity.y = 1
  engine.gravity.scale = 60 * vw / 1e6

  const T = 20 * vw, floorY = h - 3.2 * vw
  // passing collisionFilter: undefined wipes Matter's default filter, so only set it on side walls
  const wall = (x, y, ww, hh, side) => Bodies.rectangle(x, y, ww, hh, {
    isStatic: true, restitution: 0.32, friction: side ? 0 : 0.16,
    ...(side && { collisionFilter: { category: 2, mask: -1, group: 0 } }),
  })
  Composite.add(engine.world, [
    wall(w / 2, -T / 2, w + 2 * T, T),
    wall(w / 2, floorY + T / 2, w + 2 * T, T),
    wall(-2 * vw - T / 2, h / 2, T, h * 3, true),
    wall(w + 2 * vw + T / 2, h / 2, T, h * 3, true),
  ])

  const balls = els.map(el => {
    el.style.transform = ''
    const r = el.offsetWidth / 2
    const home = { x: el.offsetLeft + r, y: el.offsetTop + r }
    return { el, r, home, side: home.x < w / 2 ? -1 : 1, body: null, armed: false }
  })
  const left = balls.filter(b => b.side < 0), right = balls.filter(b => b.side > 0)
  const order = []
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) order.push(left[i])
    if (right[i]) order.push(right[i])
  }
  order.forEach((b, f) => { b.releaseAt = f * 0.26; b.f = f })

  let clock = 0, visible = false, drag = null, lastPop = 0, lastPtr = null, dragMoved = 0
  const pop = new Audio('/assets/sounds/box-pop.mp3')

  const release = b => {
    const n = order.length
    const y = gsap.utils.clamp(b.r + 0.5 * vw, floorY - b.r, 9 * vw + (1 - b.f / (n - 1)) * 9 * vw)
    const x = b.side < 0 ? -(4 * vw + b.r) : w + 4 * vw + b.r
    b.body = Bodies.circle(x, y, b.r, {
      restitution: 0.32, friction: 0.16, frictionAir: 0.004, density: 0.001,
      collisionFilter: { category: 1, mask: ~2, group: 0 }, // passes through side walls until armed
    })
    b.body.ball = b
    Composite.add(engine.world, b.body)
    Body.setVelocity(b.body, { x: -b.side * 55 * vw / 60, y: 6 * vw / 60 })
    Body.setAngularVelocity(b.body, -b.side * 5 / 60)
  }

  Events.on(engine, 'collisionStart', e => {
    const now = performance.now()
    for (const { collision } of e.pairs) {
      const { bodyA: a, bodyB: c, normal } = collision
      const rel = (a.velocity.x - c.velocity.x) * normal.x + (a.velocity.y - c.velocity.y) * normal.y
      const v = Math.abs(rel) * 60 / vw
      if (v > 10 && now - lastPop > 90) {
        lastPop = now
        pop.currentTime = 0
        pop.volume = Math.min((v - 10) / 60, 1) * 0.5
        pop.play().catch(() => {})
      }
    }
  })

  const tick = (_, dtMs) => {
    if (!visible) return
    const dt = Math.min(dtMs, 1000 / 60)
    clock += dt / 1000
    const maxV = 85 * vw / 60
    for (const b of balls) {
      if (!b.body) { if (clock >= b.releaseAt) release(b); continue }
      const body = b.body
      if (!b.armed) {
        Body.applyForce(body, body.position, { x: -b.side * 90 * vw * vw / 1e6 * body.mass, y: 0 })
        if (body.position.x - b.r > -2 * vw && body.position.x + b.r < w + 2 * vw) {
          b.armed = true
          body.collisionFilter.mask = -1
        }
      }
      const s = Math.hypot(body.velocity.x, body.velocity.y)
      if (s > maxV) Body.setVelocity(body, { x: body.velocity.x / s * maxV, y: body.velocity.y / s * maxV })
      if (drag?.bodyB === body) Body.setAngularVelocity(body, body.angularVelocity * 0.9)
    }
    Engine.update(engine, dt)
    for (const b of balls) {
      if (!b.body) continue
      const p = b.body.position
      b.el.style.transform = `translate3d(${p.x - b.home.x}px,${p.y - b.home.y}px,0) rotate(${b.body.angle}rad)`
    }
  }
  gsap.ticker.add(tick)

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.2 })
  io.observe(box)

  const local = e => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const onMove = e => {
    const p = local(e)
    if (drag) { drag.pointA = p; dragMoved += Math.hypot(e.movementX, e.movementY) }
    if (lastPtr && p.x > -7 * vw && p.x < w + 7 * vw && p.y > -7 * vw && p.y < h + 7 * vw) {
      const mx = p.x - lastPtr.x, my = p.y - lastPtr.y
      const m = Math.min(Math.hypot(mx, my), 60)
      if (m >= 0.5) {
        const unit = Math.PI * (9 * vw) ** 2 * 0.001 * vw / 1e6
        for (const b of balls) {
          if (!b.body || b.body === drag?.bodyB) continue
          const dx = b.body.position.x - p.x, dy = b.body.position.y - p.y
          const dist = Math.hypot(dx, dy), gap = dist - b.r
          if (gap > 5 * vw) continue
          const k = 1 - Math.max(gap, 0) / (5 * vw)
          const nx = dx / dist, ny = dy / dist
          const push = 200 * unit * k * (m / 60), along = 70 * unit * k
          Sleeping.set(b.body, false)
          Body.applyForce(b.body, { x: b.body.position.x - nx * b.r, y: b.body.position.y - ny * b.r },
            { x: nx * push + mx / m * along, y: ny * push + my / m * along })
        }
      }
    }
    lastPtr = p
  }
  const onDown = e => {
    if (e.button !== 0) return
    const p = local(e)
    const b = balls.find(b => b.body && Math.hypot(b.body.position.x - p.x, b.body.position.y - p.y) < b.r)
    if (!b) return
    e.preventDefault()
    const off = { x: p.x - b.body.position.x, y: p.y - b.body.position.y }
    const c = Math.cos(-b.body.angle), s = Math.sin(-b.body.angle)
    drag = Constraint.create({
      pointA: p, bodyB: b.body, length: 0, stiffness: 0.06, damping: 0.08,
      pointB: { x: (off.x * c - off.y * s) * 0.34, y: (off.x * s + off.y * c) * 0.34 },
    })
    dragMoved = 0
    Composite.add(engine.world, drag)
  }
  const onUp = () => { if (drag) { Composite.remove(engine.world, drag); drag = null } }
  const onClick = e => { if (dragMoved > 6) { e.preventDefault(); e.stopPropagation(); dragMoved = 0 } }
  addEventListener('pointermove', onMove)
  addEventListener('pointerdown', onDown)
  addEventListener('pointerup', onUp)
  addEventListener('pointercancel', onUp)
  box.addEventListener('click', onClick, true)

  return {
    destroy() {
      gsap.ticker.remove(tick)
      io.disconnect()
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerdown', onDown)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onUp)
      box.removeEventListener('click', onClick, true)
      Engine.clear(engine)
    },
  }
}

function initPoke(head, chars) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
  head.addEventListener('pointermove', e => {
    const fs = parseFloat(getComputedStyle(head).fontSize)
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
  head.addEventListener('pointerleave', () => gsap.to(chars, {
    y: 0, rotation: 0, scale: 1, duration: 0.9, ease: 'elastic.out(1,0.45)', stagger: { each: 0.014, from: 'center' },
  }))
}
