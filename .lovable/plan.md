

## Plan : Corriger les 4 problemes (Publications, Prospection, Dates, UX Autopilote)

### 1. Publications ne s'affichent pas

**Cause** : La requete dans `SuggestedPostsPage.tsx` (ligne 33-37) ne filtre pas par `user_id`. Les posts sont proteges par RLS mais la requete manque le filtre explicite, ce qui peut causer des resultats vides si le token n'est pas bien transmis.

**Fix** : Ajouter `.eq("user_id", user.id)` a la requete et utiliser `useAuth()` pour obtenir le user.

### 2. Impossible de scrapper plus de 100 profils

**Cause** : Le edge function `search-profiles` (ligne 45) hardcode `limit=10` dans l'URL Unipile, ignorant completement le parametre `limit` envoye par le frontend.

**Fix** :
- Dans `search-profiles/index.ts` : lire le `limit` du body et le passer a l'API Unipile
- Dans `ProspectionPage.tsx` : ajouter les options 200, 500, 1000 dans le selecteur

### 3. Dates suggerees incorrectes

**Cause** : Dans `autopilot-run/index.ts` (lignes 396-400), la logique calcule `daysToAdd = Math.floor(idx / postingHours.length) + 1`, ce qui commence toujours a **demain**. Si on genere 2 posts avec 3 heures configurees, les 2 posts tombent tous sur demain au lieu d'aujourd'hui.

**Fix** : Les posts doivent etre planifies a partir d'**aujourd'hui** si les heures n'ont pas encore passe, sinon demain. Utiliser `daysToAdd = 0` pour commencer et incrementer quand les heures du jour sont epuisees.

### 4. Page Autopilote trop complexe

**Probleme** : 9 cartes empilees verticalement, trop de scroll, difficile de trouver les reglages importants.

**Restructuration** :
- **En-tete** : Toggle ON/OFF + bouton Executer + derniere execution (inchange)
- **Section 1 — Essentiel** (grille 2 colonnes) : Frequence + Mode d'approbation (existant)
- **Section 2 — Planning** (Tabs ou Accordion) : Regrouper "Jours actifs", "Heures", "Planning hebdo" dans un seul composant avec des onglets
- **Section 3 — Contenu** (Accordion) : Regrouper "Mix de contenu", "Visuels auto", "Sujets a surveiller" dans un accordion repliable
- **Section 4 — Tendances** : Tendances recentes (inchange, en bas)
- Supprimer le bloc "Comment fonctionne l'Autopilote" (redondant)

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/SuggestedPostsPage.tsx` | Ajouter filtre `user_id` |
| `supabase/functions/search-profiles/index.ts` | Passer le `limit` du body a Unipile |
| `src/pages/ProspectionPage.tsx` | Ajouter options 200/500/1000 |
| `supabase/functions/autopilot-run/index.ts` | Fixer logique de dates (partir d'aujourd'hui) |
| `src/pages/AutopilotPage.tsx` | Restructurer en sections avec Tabs + Accordion |

