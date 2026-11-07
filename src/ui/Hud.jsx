import { useState } from 'react'
import { perception, STAGES } from '../state/perception.js'

/** Barre flottante façon verre dépoli : progression, intensité, pause. */
export default function Hud({ stage, paused, onTogglePause }) {
  const [intensity, setIntensity] = useState(perception.intensity)

  const goTo = (i) => {
    const el = document.querySelector(`[data-stage="${i}"]`)
    if (el) window.__lenis?.scrollTo(el, { offset: i === 0 ? 0 : window.innerHeight * 0.1, duration: 2 })
  }

  return (
    <nav className="hud" aria-label="Contrôles de l'expérience">
      <ol className="hud__steps">
        {STAGES.map((s, i) => (
          <li key={s.key}>
            <button
              className={`hud__dot${i === stage ? ' is-active' : ''}`}
              aria-label={`Aller à l'étape ${i + 1} : ${s.label}`}
              aria-current={i === stage ? 'step' : undefined}
              onClick={() => goTo(i)}
            />
          </li>
        ))}
      </ol>
      <span className="hud__label" aria-live="polite">
        {STAGES[stage]?.label}
      </span>
      <label className="hud__range">
        <span>Intensité</span>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.01"
          value={intensity}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            perception.intensity = v
            setIntensity(v)
          }}
        />
      </label>
      <button className="hud__pause" onClick={onTogglePause} aria-pressed={paused}>
        {paused ? 'Reprendre' : 'Pause'}
      </button>
    </nav>
  )
}
