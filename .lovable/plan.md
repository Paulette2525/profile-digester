

## Plan : Simplifier la page Memoire

### Constat

La page contient 7 sections avec ~25 champs texte + 4 champs tags + 4 champs numeriques = trop de questions. Beaucoup sont redondants ou trop granulaires.

### Restructuration proposee

Passer de 7 sections a 4 sections avec des champs consolides :

**Section 1 — Identite & Expertise** (fusion des sections 1 et 2)
- Nom complet (input)
- Profession (input)
- Entreprise (input)
- Industrie (input)
- Expertise et realisations (1 seul textarea fusionnant : expertise_areas, achievements, key_results, unique_methodology, differentiators)

**Section 2 — Audience & Objectifs** (fusion des sections 3 et 4)
- Audience cible (textarea)
- Objectifs LinkedIn (textarea — fusionne linkedin_goals + audience_pain_points + competitors)
- Objectifs chiffres : abonnes / connexions / engagement / horizon (4 inputs sur 1 ligne, garde)

**Section 3 — Contenu & Ton** (simplifie la section 5)
- Themes de contenu (tags — fusionne content_themes + content_pillars)
- Types de contenu (tags — garde)
- Ton et style (1 textarea fusionnant : tone_of_voice, call_to_action_style, preferred_formats, posting_frequency)

**Section 4 — Histoire & Offres** (fusion des sections 6 et 7)
- Histoire et valeurs (1 textarea fusionnant : personal_story, values, ambitions)
- Offres et notes (1 textarea fusionnant : offers_description, additional_notes)

Les sections Photos et Idees restent inchangees.

### Resultat
- De ~25 champs texte a ~12
- De 4 champs tags a 2
- De 7 sections a 4
- Les donnees existantes sont preservees (les champs DB restent, on les concatene a l'affichage et on les stocke dans les memes colonnes)

### Fichier a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/MemoirePage.tsx` | Fusionner sections et reduire champs |

