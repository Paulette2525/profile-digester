

## Plan : Prioriser les instructions de redaction + Calendrier editorial avant generation

### Partie 1 — Prioriser les instructions de redaction dans le prompt

**Probleme** : Les `writing_instructions` sont mentionnees a la fin du bloc memoire, noyees parmi 25+ autres champs. L'IA les ignore car elles n'ont pas assez de poids.

**Solution** : Restructurer le prompt dans `generate-posts/index.ts` :
- Deplacer `writing_instructions` dans le **system message** (pas dans le user message) pour lui donner le plus haut niveau de priorite
- Ajouter une section dediee `STYLE OBLIGATOIRE` tout en haut du prompt utilisateur, AVANT l'analyse de viralite
- Ajouter dans les REGLES une ligne explicite : "Respecter IMPERATIVEMENT les instructions de redaction de l'auteur"
- Insister sur le ton humain : "Les posts doivent etre authentiques et humanises, PAS des posts vendeurs"
- Inclure les donnees des profils scraped (tracked_profiles + linkedin_posts) pour enrichir le contexte

### Partie 2 — Workflow calendrier editorial depuis la strategie

**Flux actuel** : Strategie → clic "Creer des posts" → redirige vers SuggestedPostsPage → generation immediate

**Nouveau flux** : Strategie → clic "Creer des posts" → ouvre un **dialogue/page de configuration** avec :

1. **Type de calendrier** : choix entre Hebdomadaire (1 semaine) ou Mensuel (4 semaines) — boutons radio
2. **Nombre de posts par jour** : selecteur (1-3)
3. **Jours de publication** : cases a cocher (Lun-Dim)
4. L'IA genere un **calendrier editorial preview** (liste de jours + theme/type prevu pour chaque slot) base sur la strategie selectionnee
5. L'utilisateur **valide ou ajuste** ce calendrier
6. A la validation, generation des posts en respectant le calendrier et les instructions de redaction

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/generate-posts/index.ts` | Restructurer le prompt : writing_instructions dans system msg + en tete du prompt + ajout profils scrapes + regles humanisation |
| `src/pages/StrategiePage.tsx` | Remplacer le bouton "Creer des posts" par un dialogue de configuration calendrier editorial |
| `src/pages/SuggestedPostsPage.tsx` | Accepter les params du calendrier editorial (via query params ou state) pour generer les posts en lot |
| Nouveau : `src/components/strategy/EditorialCalendarDialog.tsx` | Composant dialog : choix hebdo/mensuel, posts/jour, jours actifs, preview calendrier IA, validation |
| `supabase/functions/generate-posts/index.ts` | Accepter un param `calendar` optionnel avec les slots (date + theme) pour generer les posts en respectant le planning |

### Detail technique du prompt restructure

```
System message:
"Tu es un copywriter LinkedIn expert qui ecrit des posts HUMAINS et authentiques.
INSTRUCTIONS DE REDACTION OBLIGATOIRES A RESPECTER POUR CHAQUE POST :
{writing_instructions}"

User message:
"STYLE OBLIGATOIRE DE L'AUTEUR:
{writing_instructions repete}

PROFIL DE L'AUTEUR: ...
PROFILS ANALYSES (inspiration): ...
ANALYSE DE VIRALITE: ...

REGLES:
- Respecter IMPERATIVEMENT les instructions de redaction
- Posts HUMAINS, authentiques, PAS vendeurs
- ..."
```

### Detail du dialogue calendrier editorial

```text
+------------------------------------------+
|  Planifier mon calendrier editorial       |
|                                          |
|  Periode:  [x] Hebdomadaire  [ ] Mensuel |
|                                          |
|  Posts par jour:  [2]                    |
|                                          |
|  Jours actifs:                           |
|  [x] Lun [x] Mar [x] Mer [ ] Jeu        |
|  [x] Ven [ ] Sam [ ] Dim                |
|                                          |
|  [Generer le calendrier]                 |
|                                          |
|  --- Preview calendrier ---              |
|  Lun 31/03 - Storytelling: "Mon parcours"|
|  Lun 31/03 - Tuto: "3 astuces..."       |
|  Mar 01/04 - Viral: "Ce que personne..." |
|  ...                                     |
|                                          |
|  [Valider et generer les posts]          |
+------------------------------------------+
```

A la validation, le nombre total de posts = jours actifs x posts/jour x nombre de semaines. Les posts sont generes par lots avec le theme/type de chaque slot injecte dans le prompt.

