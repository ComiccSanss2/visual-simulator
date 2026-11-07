/** Titre découpé en mots masqués : chaque mot monte depuis sous sa ligne (révélation façon Apple). */
export default function SplitTitle({ text, className = '' }) {
  return (
    <h2 className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span className="mask" key={i} aria-hidden="true">
          <span className="word">{w}</span>
        </span>
      ))}
    </h2>
  )
}
