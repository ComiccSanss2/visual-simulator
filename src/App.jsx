import { useCallback, useEffect, useState } from 'react'
import Experience from './gl/Experience.jsx'
import Gate from './ui/Gate.jsx'
import Hud from './ui/Hud.jsx'
import KineticTitle from './ui/KineticTitle.jsx'
import SplitTitle from './ui/SplitTitle.jsx'
import { CHAPTERS, TOTAL_STEPS } from './ui/content.js'
import useScrollChoreography from './hooks/useScrollChoreography.js'
import { perception } from './state/perception.js'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [paused, setPaused] = useState(false)
  const [stage, setStage] = useState(0)
  const onStage = useCallback((s) => setStage(s), [])

  useScrollChoreography(entered, onStage)

  // Souris → parallaxe, miroirs du kaléidoscope ; clic → onde
  useEffect(() => {
    const move = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -((e.clientY / window.innerHeight) * 2 - 1)
      perception.mouse.set(x, y)
      perception.segments = 3 + Math.round((x * 0.5 + 0.5) * 13)
    }
    const down = (e) => {
      if (e.target.closest('button, input, a')) return
      perception.pulse = 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
    }
  }, [])

  const enter = (calm) => {
    perception.paused = calm
    setPaused(calm)
    setEntered(true)
  }

  const togglePause = () => {
    perception.paused = !perception.paused
    setPaused(perception.paused)
  }

  const restart = () => window.__lenis?.scrollTo(0, { duration: 3 })

  return (
    <>
      <div className="canvas-layer">
        <Experience />
      </div>

      {!entered && <Gate onEnter={enter} />}

      <main className={`story${entered ? ' is-live' : ''}`} aria-hidden={!entered}>
        <section className="hero" data-stage="0">
          <div className="hero__inner">
            <KineticTitle text="Simulateur d'effets hallucinogènes" active={entered} />
            <div className="hero__foot">
              <p className="hero__sub">
                Six étapes, du regard ordinaire à la géométrie pure. Chaque image est calculée en temps réel par votre carte graphique.
              </p>
              <p className="hero__cue">Faites défiler pour commencer</p>
            </div>
          </div>
        </section>

        {CHAPTERS.map((c) => (
          <section className="chapter" data-stage={c.stage} key={c.stage}>
            <div className="chapter__sticky">
              <div className="chapter__copy">
                <p className="chapter__step" data-reveal>
                  Étape {c.stage} sur {TOTAL_STEPS}
                </p>
                <SplitTitle className="chapter__title" text={c.title} />
                <p className="chapter__body" data-reveal>
                  {c.body}
                </p>
                {c.hint && (
                  <p className="chapter__hint" data-reveal>
                    {c.hint}
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}

        <section className="outro" data-stage="7">
          <div className="outro__inner">
            <h2 className="outro__title">Retour au calme.</h2>
            <p className="outro__body">
              Les couleurs se retirent, les formes se stabilisent. Le cerveau reprend son travail habituel : effacer tout ce qu'il vient de vous montrer.
            </p>
            <button className="btn btn--primary" onClick={restart}>
              Recommencer
            </button>
            <div className="outro__notes">
              <p>
                Ceci est une simulation visuelle à visée artistique et pédagogique. Elle ne reproduit pas les effets d'une substance et n'encourage pas leur consommation.
              </p>
              <p>
                Pour aller plus loin : H. Klüver, <cite>Mescal and Mechanisms of Hallucinations</cite> (1966) ; P. Bressloff, J. Cowan et al., <cite>Geometric visual hallucinations, Euclidean symmetry and the functional architecture of striate cortex</cite> (2001).
              </p>
            </div>
          </div>
        </section>
      </main>

      {entered && <Hud stage={stage} paused={paused} onTogglePause={togglePause} />}
    </>
  )
}
