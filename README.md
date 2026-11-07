# Simulateur d'effets hallucinogènes

Une expérience WebGL en huit temps (seuil → six effets → retour) pilotée par le scroll.
Tout est procédural : aucun modèle 3D ni texture à télécharger, tout est calculé par le GPU.

---

## 1. Lancer le site en local, pas à pas

### Prérequis

1. **Node.js 18 ou plus récent** (20 LTS recommandé).
   Vérifiez dans le Terminal :
   ```bash
   node -v
   ```
   Si la commande est inconnue ou affiche une version < 18, installez Node depuis https://nodejs.org (bouton « LTS »), ou avec Homebrew : `brew install node`.
2. Un navigateur récent avec WebGL 2 : Chrome, Arc, Edge, Safari 17+ ou Firefox.

### Installation

1. Installez les dépendances (1 à 2 minutes la première fois) :
   ```bash
   npm install
   ```
2. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
   Le navigateur s'ouvre automatiquement sur `http://localhost:5173`. Sinon, ouvrez cette adresse à la main.
3. Choisissez **Entrer** (ou **Entrer en mode calme**), puis faites défiler.

Toute modification d'un fichier dans `src/` se recharge instantanément (Hot Module Replacement).

### Version de production

```bash
npm run build     # génère le dossier dist/
npm run preview   # sert dist/ sur http://localhost:4173
```
Le dossier `dist/` peut être déposé tel quel sur Vercel, Netlify ou n'importe quel hébergement statique.

### En cas de problème

| Symptôme | Solution |
|---|---|
| `command not found: npm` | Node n'est pas installé : voir Prérequis. |
| `EACCES` ou erreur de permission pendant `npm install` | Ne pas utiliser `sudo` ; réinstaller Node via nodejs.org ou Homebrew. |
| Page blanche, erreur WebGL dans la console | Activer l'accélération matérielle du navigateur (Chrome : Réglages → Système). |
| Animation saccadée | Baisser le curseur « Intensité » ; le site réduit aussi sa résolution automatiquement si le GPU décroche. |
| Le port 5173 est occupé | `npm run dev -- --port 3000` |

---

## 2. Choix techniques

| Besoin | Choix | Pourquoi |
|---|---|---|
| Rendu 3D | **Three.js** via **React Three Fiber** | R3F donne une structure de composants claire (un fichier par élément 3D) sans coût de performance : la boucle de rendu reste impérative (`useFrame`), React n'est pas sollicité à chaque frame. |
| Effets visuels | **Shaders GLSL écrits à la main** | Domain warping, projection log-polaire, Julia, kaléidoscope : aucun de ces effets n'existe tout fait. Les écrire directement donne le contrôle total et le meilleur coût GPU. |
| Post-traitement | **Pipeline maison** (pas de librairie) | Loupe, kaléidoscope, aberration chromatique et traînées sont fusionnés en **un seul pass plein écran** ; le bloom tourne à 1/4 de résolution. Les traînées réinjectent l'image précédente (feedback), ce que les librairies standard ne font pas simplement. |
| Matériaux "premium" | `MeshPhysicalMaterial` (iridescence, clearcoat) + `Environment` / `Lightformer` de **drei** | Reflets de studio procéduraux : aucun fichier HDR à charger. |
| Scroll cinématique | **GSAP ScrollTrigger** + **Lenis** | Le duo standard des pages produit type Apple : timelines "scrubbées" sur le scroll et défilement inertiel fluide. |
| Build | **Vite** | Démarrage instantané, HMR, build optimisé avec découpage de Three.js dans son propre chunk. |

Principes de performance appliqués :
- **le shader le plus lourd (fond « cortex ») tourne en demi-résolution** (1/4 des pixels), puis sert à la fois de décor et de source de réfraction pour le noyau en verre ;
- domain warping réduit à 3 fbm, Julia et constantes de forme calculés seulement quand ils sont visibles ;
- noyau en géométrie **indexée** (`mergeVertices`) : ~6× moins de sommets à déformer ;
- bloom à 1/4 de résolution (extraction + 4 flous séparables de 5 lectures) ;
- **aucun `backdrop-filter` ni `filter: blur()` animé** dans le CSS (ils forcent le navigateur à recalculer un flou au-dessus d'un canvas qui change à chaque image) ;
- titre cinétique animé à 30 i/s, seulement quand il est visible, avec `contain: layout` ;
- le DOM n'est modifié que lorsque l'encre bascule clair/sombre, jamais à chaque frame ;
- état temps réel dans des objets mutables (`src/state/perception.js`) → zéro re-rendu React ;
- `PerformanceMonitor` : résolution ajustée en continu entre 0.75× et 1.5× selon le framerate mesuré.

Lisibilité du texte :
- un **voile intégré au rendu WebGL** assombrit (ou éclaircit) toute la zone du texte, quel que soit l'effet en dessous ;
- l'encre bascule nettement du noir au blanc (avec hystérésis), sans jamais passer par du gris sur fond gris ;
- les étapes alternent entre un monde clair et un monde sombre, sans valeur intermédiaire ;
- le texte n'apparaît qu'au centre de chaque étape, jamais pendant les transitions de fond.

---

## 3. Architecture

```
site3D/
├── index.html                 Police Bricolage Grotesque (axes variables wght/wdth/opsz)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx               Point d'entrée React
    ├── App.jsx                Structure de la page : écran d'entrée, héros, 6 chapitres, retour, HUD
    ├── styles.css             Tokens, typographie, mise en page, mode clair → profond (--deep)
    ├── state/
    │   └── perception.js      Table des 8 étapes, état partagé, uniforms, interpolation
    ├── hooks/
    │   └── useScrollChoreography.js   Lenis + ScrollTrigger : scroll → étape, révélations de texte
    ├── gl/
    │   ├── Experience.jsx     <Canvas>, lumières, environnement procédural
    │   ├── Director.jsx       Chef d'orchestre : amortit les effets et met à jour les uniforms
    │   ├── Backdrop.jsx       Décor plein écran (lit la texture du cortex)
    │   ├── OrganicCore.jsx    Noyau en verre liquide : déformé, réfracte le fond avec dispersion
    │   ├── Satellites.jsx     3 nœuds toriques irisés en orbite + 90 cristaux instanciés
    │   ├── CameraRig.jsx      Parallaxe souris et roulis
    │   └── PostPipeline.jsx   cortex ½ rés. → scène → composite (feedback) → bloom ¼ → écran
    ├── shaders/
    │   ├── common.js          Simplex noise 3D, fbm, palette irisée, rotation de teinte
    │   ├── cortex.js          Domain warping, constantes de forme de Klüver, ensemble de Julia
    │   ├── organic.js         Déplacement de sommets, réfraction + dispersion, film mince
    │   └── post.js            Loupe, kaléidoscope, chroma, traînées, bloom, voile de lecture, grain
    └── ui/
        ├── content.js         Textes des chapitres
        ├── Gate.jsx           Avertissement photosensibilité + mode calme
        ├── Hud.jsx            Barre flottante : étapes, intensité, pause
        ├── KineticTitle.jsx   Titre dont chaque lettre respire (axes variables)
        └── SplitTitle.jsx     Titres de chapitre révélés mot par mot
```

### Flux de données

```
scroll (Lenis) ──► ScrollTrigger ──► perception.stage (0 → 7, continu)
souris / clic  ──────────────────► perception.mouse / pulse / segments
                                          │
                              Director.jsx (useFrame)
                    sampleStage() → damping → U.uDose, U.uGeo, …
                                          │
           ┌──────────────────────────────┼──────────────────────────┐
     CortexBackground              OrganicCore / Satellites      PostPipeline
                                          │
                         --deep (CSS) : l'encre passe du noir au blanc
```

### Les étapes

| # | Étape | Effet principal | Interaction |
|---|---|---|---|
| 0 | Seuil | monde clinique, objet nacré | — |
| 1 | Respiration | ondulation des surfaces | — |
| 2 | Couleur | sursaturation + aberration chromatique | — |
| 3 | Traînées | feedback de l'image précédente | bouger la souris |
| 4 | Géométries | tunnel, spirale, treillis, toile (log-polaire) | — |
| 5 | Kaléidoscope | repliement en 3 à 16 miroirs | souris X = miroirs, Y = rotation, clic = onde |
| 6 | Fractales | ensemble de Julia animé | clic = onde |
| 7 | Retour | retour au blanc | bouton Recommencer |

Pour régler un effet, modifiez la ligne correspondante de `STAGES` dans `src/state/perception.js` (valeurs de 0 à 1).

### Ajouter un vrai modèle 3D (optionnel)

Déposez un fichier `.glb` dans `public/models/`, puis dans un composant :
```jsx
import { useGLTF } from '@react-three/drei'
const { scene } = useGLTF('/models/mon-modele.glb')
return <primitive object={scene} />
```
Placez ce composant dans `Experience.jsx`, à l'intérieur du `<Suspense>`.

---

## 4. Accessibilité

- Écran d'entrée avec avertissement photosensibilité et **mode calme** (temps figé, traînées coupées). Si le système demande moins d'animations, le mode calme reçoit le focus par défaut.
- Aucun clignotement rapide : les variations les plus rapides restent sous 2 Hz (le seuil de risque photosensible se situe autour de 3 Hz).
- Bouton Pause et curseur d'intensité accessibles en permanence.
- Navigation clavier sur tous les contrôles, focus visible.

Ceci est une simulation visuelle à visée artistique et pédagogique. Elle ne reproduit pas les effets d'une substance et n'encourage pas leur consommation.
# visual-simulator
