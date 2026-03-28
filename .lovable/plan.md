

## Plan : Dictee vocale + Optimisation IA sur les champs Memoire

### Objectif
Ajouter deux boutons sur chaque champ textarea de la section "Expertise & Realisations" (et les autres textareas) :
1. **Micro** : enregistre la voix via l'API Web Speech Recognition du navigateur et transcrit le texte dans le champ
2. **Optimiser** : envoie le texte du champ a une edge function qui utilise Lovable AI pour ameliorer/corriger le texte, puis remplace le contenu du champ

### Architecture

```text
┌─────────────────────────────────────────┐
│  Champ textarea                         │
│  [contenu transcrit ou tape]            │
│                                         │
│  🎤 Dicter    ✨ Optimiser              │
└─────────────────────────────────────────┘
```

### Implementation

**1. Composant `Field` enrichi (dans MemoirePage.tsx)**

Pour les champs `textarea`, ajouter sous le textarea :
- Bouton **Dicter** (icone `Mic`) : utilise `webkitSpeechRecognition` / `SpeechRecognition` (API native du navigateur, pas besoin de service externe). Quand actif, l'icone passe en rouge et le texte dicte s'ajoute au contenu existant du champ.
- Bouton **Optimiser** (icone `Sparkles`) : appelle l'edge function `optimize-text` qui reformule et corrige le texte via Lovable AI.

Pas de dependance externe — le navigateur gere la reconnaissance vocale nativement en francais (`lang: 'fr-FR'`).

**2. Edge function `optimize-text`**

Recoit `{ text, fieldContext }` et retourne le texte optimise. Utilise Lovable AI (`google/gemini-3-flash-preview`) avec un prompt qui :
- Corrige les erreurs de transcription
- Ameliore la clarte et le style professionnel
- Garde le sens et le ton de l'original
- Retourne uniquement le texte corrige

**3. Champs concernes**

Tous les champs `textarea` de la page Memoire (expertise_areas, achievements, key_results, unique_methodology, differentiators, audience_pain_points, personal_story, ambitions, etc.)

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/optimize-text/index.ts` | Creer — optimise un texte via Lovable AI |
| `src/pages/MemoirePage.tsx` | Modifier le composant `Field` pour ajouter les boutons Dicter et Optimiser sur les textareas |

### Section technique

- Web Speech API : `new (window.SpeechRecognition || window.webkitSpeechRecognition)()` avec `lang = 'fr-FR'`, `continuous = true`, `interimResults = true`
- Le texte dicte s'**ajoute** au contenu existant du champ (ne remplace pas)
- L'edge function `optimize-text` utilise `LOVABLE_API_KEY` (deja configure) via `https://ai.gateway.lovable.dev/v1/chat/completions`
- Prompt systeme : "Tu es un expert en communication LinkedIn. Corrige les erreurs, ameliore la clarte et le style professionnel du texte suivant. Garde le meme sens. Retourne uniquement le texte corrige."
- Le bouton Optimiser est desactive si le champ est vide
- Indicateur de chargement pendant l'optimisation

