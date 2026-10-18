import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initLenis, runPreloader, initMenu, initSound, initCursor } from './chrome.js'
import { initHero } from './hero.js'
import { initSlider } from './slider.js'
import { initGiant } from './giant.js'
import { initFooter } from './footer.js'

gsap.registerPlugin(ScrollTrigger)

const lenis = initLenis()
initSound()
initMenu()
initCursor()
initHero()
initSlider()
initGiant()
initFooter()

runPreloader(lenis).then(() => {
  dispatchEvent(new Event('sweettape:revealed'))
  ScrollTrigger.refresh()
})
