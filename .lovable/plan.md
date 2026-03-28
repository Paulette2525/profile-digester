

## Migrer l'analyse et la generation de posts vers OpenRouter (Claude Sonnet 4)

### Objectif
Remplacer l'appel au gateway Lovable AI par l'API OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) dans les deux edge functions concernees, en utilisant le modele `anthropic/claude-sonnet-4`.

### Etape 1 : Ajouter le secret OPENROUTER_API_KEY
Utiliser l'outil `add_secret` pour stocker la cle API OpenRouter en tant que secret backend.

### Etape 2 : Modifier `analyze-virality/index.ts`
- Remplacer `LOVABLE_API_KEY` par `OPENROUTER_API_KEY`
- Changer l'URL de `https://ai.gateway.lovable.dev/v1/chat/completions` vers `https://openrouter.ai/api/v1/chat/completions`
- Changer le modele en `anthropic/claude-sonnet-4`
- Adapter le header Authorization en `Bearer ${OPENROUTER_API_KEY}`
- Conserver la meme structure de prompt, tools et parsing

### Etape 3 : Modifier `generate-posts/index.ts`
- Memes modifications que pour analyze-virality : URL, cle, modele
- Conserver le prompt existant et le tool calling `generate_posts`

### Fichiers concernes
- `supabase/functions/analyze-virality/index.ts`
- `supabase/functions/generate-posts/index.ts`
- Ajout du secret `OPENROUTER_API_KEY`

### Ce qui ne change PAS
- `generate-visual/index.ts` reste sur Kie AI
- `fetch-post-stats/index.ts` reste sur Unipile
- Les prompts et la structure des reponses restent identiques
- La base de donnees n'est pas modifiee

