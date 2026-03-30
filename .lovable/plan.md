

## Plan : Ajouter "Mon Histoire" et "Instructions de redaction" a la Memoire

### Changements

1. **Migration DB** : Ajouter une colonne `writing_instructions text` a la table `user_memory` pour stocker les consignes de redaction obligatoires.

2. **MemoirePage.tsx** : 
   - Dans la Section 4 (Histoire & Offres), remplacer le champ fusionne "Histoire et valeurs" par deux champs distincts :
     - **"Mon histoire"** (`personal_story`) — textarea dedie au parcours personnel, moments cles, anecdotes
     - **"Instructions de redaction"** (`writing_instructions`) — textarea pour les consignes obligatoires sur le style, la structure et le ton des posts generes
   - Les deux champs auront dictee vocale + bouton Optimiser comme les autres textareas

3. **generate-posts edge function** : Injecter le contenu de `writing_instructions` dans le prompt AI comme section `INSTRUCTIONS OBLIGATOIRES DE RÉDACTION` pour que chaque post genere respecte ces consignes.

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonne `writing_instructions` |
| `src/pages/MemoirePage.tsx` | Ajouter les 2 champs dans Section 4 |
| `supabase/functions/generate-posts/index.ts` | Injecter `writing_instructions` dans le prompt |

