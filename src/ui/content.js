// Textes des étapes. Les étapes forment une séquence réelle (montée → pic → retour),
// d'où la numérotation « Étape n sur 6 ».
export const CHAPTERS = [
  {
    stage: 1,
    title: 'Les surfaces respirent.',
    body: "Les contours ondulent lentement, comme si la matière inspirait. C'est souvent le premier signe : le cerveau cesse de stabiliser l'image qu'il reçoit.",
  },
  {
    stage: 2,
    title: 'La couleur sature.',
    body: "Les teintes gagnent en intensité puis glissent les unes vers les autres. Les bords se dédoublent en rouge et en bleu, comme à travers un prisme.",
  },
  {
    stage: 3,
    title: 'Chaque mouvement laisse une trace.',
    body: "Bougez la souris. Les images persistent et se superposent au lieu de disparaître : on appelle ces rémanences des traînées.",
    hint: 'Bougez la souris',
  },
  {
    stage: 4,
    title: 'Le cortex dessine ses propres formes.',
    body: "Tunnels, spirales, treillis, toiles d'araignée. Heinrich Klüver a décrit ces quatre « constantes de forme » en 1926. Elles reflètent la façon dont la rétine est projetée sur le cortex visuel.",
  },
  {
    stage: 5,
    title: 'Le monde se replie sur lui-même.',
    body: "Déplacez la souris de gauche à droite pour changer le nombre de miroirs, de haut en bas pour les faire tourner. Cliquez pour envoyer une onde.",
    hint: 'Cliquez pour envoyer une onde',
  },
  {
    stage: 6,
    title: 'Des motifs sans fin.',
    body: "Chaque détail contient l'ensemble. Ce que vous voyez est un ensemble de Julia, recalculé pour chaque pixel soixante fois par seconde.",
  },
]

export const TOTAL_STEPS = 6
