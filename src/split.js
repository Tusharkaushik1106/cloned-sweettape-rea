// Wraps each character in .clip > .char so it can rise out of a mask.
// arc: sets --i/--letters so CSS can bend the line into a curve.
export function splitChars(el, { arc = false, indexVar = false } = {}) {
  const text = el.textContent
  el.setAttribute('aria-label', text.trim())
  el.textContent = ''
  const letters = [...text]
  return letters.map((ch, i) => {
    const clip = document.createElement('span')
    clip.className = 'clip'
    clip.setAttribute('aria-hidden', 'true')
    if (arc || indexVar) clip.style.setProperty('--i', i)
    if (arc) clip.style.setProperty('--letters', letters.length)
    const c = document.createElement('span')
    c.className = 'char'
    c.textContent = ch === ' ' ? ' ' : ch
    clip.append(c)
    el.append(clip)
    return c
  })
}

// Words rise from a mask (.body-clip > .body-rise), used for body copy.
export function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/)
  el.setAttribute('aria-label', words.join(' '))
  el.textContent = ''
  return words.map(w => {
    const clip = document.createElement('span')
    clip.className = 'body-clip'
    clip.setAttribute('aria-hidden', 'true')
    const rise = document.createElement('span')
    rise.className = 'body-rise'
    rise.textContent = w
    clip.append(rise)
    el.append(clip, ' ')
    return rise
  })
}

export const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1])
