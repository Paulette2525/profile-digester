

## Plan : Lien public pour soumettre des idées + Auto-création des règles DM

### 1. Page publique de soumission d'idées (`/idee/:userId`)

Créer une route publique (comme `/form/:slug`) qui permet de soumettre une idée depuis un téléphone sans être connecté.

**Edge Function `submit-idea`** : endpoint public qui reçoit `{ user_id, idea_text, content_type }`, valide les champs, et insère dans `content_ideas`. Si `resource_url` est fourni, crée automatiquement une règle DM (voir point 2).

**Page `PublicIdeaPage.tsx`** : formulaire simple et mobile-friendly avec :
- Champ texte pour l'idée
- Sélecteur de type (tutoriel, viral, storytelling, news, autre)
- Champ optionnel pour lien/ressource
- Message de confirmation après soumission

**Bouton "Copier mon lien" sur IdeasPage** : en haut de la page Boîte à idées, un bouton qui copie l'URL publique dans le presse-papier pour l'avoir sur son téléphone.

**Route** : `/idee/:userId` dans `App.tsx` (publique, hors `ProtectedLayout`).

### 2. Auto-création des règles DM quand une idée a une `resource_url`

Quand une idée est créée (via la page interne OU via le lien public) avec un `resource_url` non vide :

**Dans l'Edge Function `submit-idea`** et **dans `IdeasPage.tsx` (handleSubmit)** :
- Générer automatiquement un mot-clé déclencheur basé sur le type de contenu (ex: "GUIDE", "LIEN", "RESSOURCE")
- Créer une entrée dans `post_dm_rules` avec :
  - `trigger_keyword` : mot-clé généré (ex: "GUIDE")
  - `dm_message` : message pré-rédigé du type "Bonjour {author_name} ! Voici la ressource mentionnée dans mon post : [url]"
  - `resource_url` : le lien fourni
  - `user_id` : l'utilisateur
  - `is_active` : true
- Le tout sans intervention manuelle sur la page Engagement

### Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/submit-idea/index.ts` | Créer — soumission publique + auto DM rule |
| `src/pages/PublicIdeaPage.tsx` | Créer — formulaire mobile-friendly |
| `src/pages/IdeasPage.tsx` | Modifier — bouton "Copier lien" + auto DM rule dans handleSubmit |
| `src/App.tsx` | Ajouter route publique `/idee/:userId` |

### Section technique

- L'edge function `submit-idea` utilise `SUPABASE_SERVICE_ROLE_KEY` pour insérer dans `content_ideas` (car l'utilisateur n'est pas authentifié)
- Le mot-clé DM est déduit du `content_type` : tutorial→"GUIDE", viral→"LIEN", storytelling→"RESSOURCE", news→"ARTICLE", autre→"LIEN"
- Le message DM est un template standard : "Bonjour {author_name} ! 👋 Merci pour ton intérêt. Voici la ressource : [resource_url]. N'hésite pas si tu as des questions !"
- L'auto-création DM rule ne crée pas de doublon si une règle avec le même `resource_url` existe déjà pour cet utilisateur
- RLS : `content_ideas` n'a pas de policy `anon INSERT`, donc l'edge function utilise le service role key (comme `submit-lead-form`)

