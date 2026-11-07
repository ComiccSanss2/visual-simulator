import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { perception } from '../state/perception.js'

gsap.registerPlugin(ScrollTrigger)

/**
 * Lenis (scroll inertiel) + GSAP ScrollTrigger.
 * - [data-stage] → perception.stage (continu, lu par le WebGL)
 * - .chapter → timeline scrubbée. Le texte n'est visible qu'au CENTRE de l'étape,
 *   jamais pendant les transitions de fond : il est toujours lisible.
 * Aucune animation de `filter` (très coûteux) : uniquement transform + opacity.
 */
export default function useScrollChoreography(enabled, onStage) {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = new Lenis({ lerp: reduce ? 0.2 : 0.11, smoothWheel: true, wheelMultiplier: 0.9 })
    lenis.on('scroll', (e) => {
      perception.velocity = e.velocity || 0
      ScrollTrigger.update()
    })
    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    if (!enabled) lenis.stop()

    const ctx = gsap.context(() => {
      let lastRounded = 0
      gsap.utils.toArray('[data-stage]').forEach((el) => {
        const idx = Number(el.dataset.stage)
        ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          end: 'bottom center',
          onUpdate: (self) => {
            perception.stage = idx - 0.5 + self.progress
            const r = Math.round(perception.stage)
            if (r !== lastRounded) {
              lastRounded = r
              perception.pulse = Math.max(perception.pulse, 0.55) // ponctuation à chaque étape
              onStage?.(r)
            }
          },
        })
      })

      gsap.utils.toArray('.chapter').forEach((el) => {
        const words = el.querySelectorAll('.word')
        const rest = el.querySelectorAll('[data-reveal]')
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        })
        tl.to({}, { duration: 0.2 })
          .fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 0.14, stagger: 0.012, ease: 'power3.out' })
          .fromTo(rest, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.03, ease: 'power2.out' }, '<0.04')
          .to({}, { duration: 0.24 })
          .to(words, { yPercent: -115, duration: 0.1, stagger: 0.008, ease: 'power2.in' })
          .to(rest, { autoAlpha: 0, y: -30, duration: 0.08, ease: 'power2.in' }, '<')
          .to({}, { duration: 0.22 })
      })

      gsap.to('.hero__inner', {
        yPercent: -12,
        scale: 0.92,
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true },
      })
    })

    window.__lenis = lenis
    return () => {
      ctx.revert()
      gsap.ticker.remove(tick)
      lenis.destroy()
      delete window.__lenis
    }
  }, [enabled, onStage])

  // Séquence d'ouverture unique : travelling caméra + apparition du noyau
  useEffect(() => {
    if (!enabled) return
    const tw = gsap.to(perception, { intro: 1, duration: 2.8, ease: 'expo.out', delay: 0.15 })
    return () => tw.kill()
  }, [enabled])
}
