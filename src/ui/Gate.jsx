import { useEffect, useRef } from 'react'

/**
 * Écran d'entrée : avertissement photosensibilité + choix du mode.
 * Le mode calme fige le temps et coupe les traînées (contenu toujours lisible au scroll).
 */
export default function Gate({ onEnter }) {
  const btn = useRef()
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    btn.current?.focus()
  }, [])

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate__card">
        <p className="gate__kicker">Avant d'entrer</p>
        <h2 id="gate-title" className="gate__title">
          Cette expérience contient des motifs en mouvement et des couleurs intenses.
        </h2>
        <p className="gate__body">
          Si vous êtes sensible à la lumière ou au mal des transports, choisissez le mode calme : les images restent figées et vous pouvez toujours parcourir les étapes. Le bouton Pause reste disponible à tout moment.
        </p>
        <div className="gate__actions">
          <button ref={reduce ? undefined : btn} className="btn btn--primary" onClick={() => onEnter(false)}>
            Entrer
          </button>
          <button ref={reduce ? btn : undefined} className="btn btn--ghost" onClick={() => onEnter(true)}>
            Entrer en mode calme
          </button>
        </div>
      </div>
    </div>
  )
}
