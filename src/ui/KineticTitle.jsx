import { useEffect, useRef } from 'react'
import { fx, U } from '../state/perception.js'

/**
 * Titre cinétique : chaque lettre fait varier sa graisse et sa chasse
 * (axes variables wght / wdth de Bricolage Grotesque).
 * Optimisé : animé seulement quand il est visible, à 30 i/s, layout confiné (CSS contain).
 */
export default function KineticTitle({ text, active = true, as: Tag = 'h1', className = '' }) {
  const ref = useRef()

  useEffect(() => {
    if (!active) return
    const node = ref.current
    const letters = Array.from(node.querySelectorAll('.kl'))
    let raf = 0
    let visible = true
    let last = 0
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(loop)
    })
    io.observe(node)

    function loop(now) {
      raf = 0
      if (!visible) return
      raf = requestAnimationFrame(loop)
      if (now - last < 33) return
      last = now
      const t = U.uTime.value
      const amp = 0.3 + fx.dose * 0.7 + fx.breath * 0.25
      for (let i = 0; i < letters.length; i++) {
        const w = 560 + Math.sin(t * 1.3 + i * 0.45) * 200 * amp
        const d = 88 + Math.sin(t * 0.9 + i * 0.6) * 11 * amp
        letters[i].style.fontVariationSettings = `"wght" ${w | 0}, "wdth" ${d.toFixed(1)}, "opsz" 96`
      }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [text, active])

  let n = 0
  return (
    <Tag ref={ref} className={`kinetic ${className}`} aria-label={text}>
      {text.split(' ').map((word, wi) => (
        <span className="kw" key={wi} aria-hidden="true">
          {Array.from(word).map((ch, ci) => (
            <span className="kl" key={ci} style={{ '--i': n++ }}>
              {ch}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  )
}
