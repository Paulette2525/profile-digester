

## Plan : Transformer l'Autopilote en veille intelligence temps reel

### Probleme

Le prompt Perplexity actuel demande des "sujets tendance LinkedIn" de maniere vague. Il ne demande pas specifiquement des **news concretes** (nouveau produit IA lance, mise a jour d'un outil, etc.) ni des **angles pedagogiques** (tuto, comparatif, implementation). Les posts generes restent generiques au lieu d'etre des posts d'actualite informatifs et utiles.

### Solution

Restructurer le prompt Perplexity et le prompt de generation pour produire des posts de type **veille informationnelle** : news + explication + cas d'usage concret.

### Modifications

**1. `autopilot-run/index.ts` — Prompt Perplexity restructure**

Remplacer le prompt generique par un prompt en 2 etapes :

- **Etape 1 — News fraiches** : Demander a Perplexity les **nouveautes concretes** (nouveaux outils IA, mises a jour, levees de fonds, lancements produit) dans les domaines surveilles. Filtre `search_recency_filter: "day"` conserve.
- **Etape 2 — Angles de contenu** : Pour chaque news, demander un angle pratique (tuto, comparatif, implementation, impact business).

Le prompt Perplexity deviendra :
```
Quelles sont les actualites et nouveautes CONCRETES sorties ces dernieres 24h 
dans : ${industries} ?
Je cherche : lancements de produits, nouvelles IA, mises a jour d'outils, 
acquisitions, etudes marquantes.
Pour chaque news, donne :
- Le fait precis (quoi, qui, quand)
- Pourquoi c'est important pour les professionnels
- Un angle de post LinkedIn : tuto, comparatif, retour d'experience, 
  guide d'implementation, ou analyse d'impact
```

**2. `autopilot-run/index.ts` — Prompt de generation restructure**

Ajouter des regles specifiques pour transformer les news en contenu a forte valeur :

```
RÈGLES DE CONTENU INFORMATIF :
- Chaque post doit apporter une INFORMATION CONCRETE et ACTIONNABLE
- Transforme les news en contenu utile : comment utiliser l'outil, 
  a quoi il sert, comparaison avec les alternatives, guide d'implementation
- L'objectif est que les lecteurs viennent sur ce compte pour APPRENDRE 
  et RESTER INFORMES en premier
- Inclure des chiffres, des faits, des exemples concrets
- Varier les formats : tuto step-by-step, analyse comparative, 
  retour d'experience, prediction/vision, cas d'usage concret
```

Ajouter un champ `post_type` dans le tool schema pour forcer la variete :
```json
"post_type": { 
  "type": "string", 
  "enum": ["news_analysis", "tutorial", "comparison", "use_case", "industry_insight"],
  "description": "Type de post informatif" 
}
```

**3. `generate-posts/index.ts` — Meme renforcement**

Ajouter les memes regles de contenu informatif quand des `trends` sont fournies en parametre, pour que la generation manuelle beneficie aussi de cette logique.

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/autopilot-run/index.ts` | Prompt Perplexity + prompt generation restructures pour news concretes |
| `supabase/functions/generate-posts/index.ts` | Ajouter regles de contenu informatif quand trends disponibles |

### Resultat attendu

Au lieu de : *"L'IA transforme le marketing — voici pourquoi"* (generique)
On obtient : *"OpenAI vient de lancer GPT-5. Voici 3 facons concretes de l'utiliser pour automatiser votre prospection LinkedIn..."* (informatif, actionnable, d'actualite)

