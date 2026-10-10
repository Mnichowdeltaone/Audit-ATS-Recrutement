# Pilotage CV Improvement

Studio : DeltaOne Developpement. Direction de projet : Francois Delrieu.

Le backlog initial est [backlog.json](backlog.json) : 9 tickets, 3 jalons, priorites P0/P1/P2 et criteres d'acceptation relies aux tests. Les noms n'impliquent aucune attribution automatique de compte GitHub.

## Flux de travail

Utiliser le champ Status de GitHub Projects : Todo, In Progress, Done. Une tache bloquee reste In Progress avec son obstacle et son prochain point de decision indiques dans le ticket. Un ticket est termine quand ses criteres sont remplis, les tests sont joints et le code est integre.

- P0 : bloque la diffusion (installation, perte de donnees, divulgation ou faits inventes dans un CV).
- P1 : fonctionnalite principale ou risque important ; decision explicite si livraison avec anomalie connue.
- P2 : amelioration planifiee, sans blocage de la livraison.

Jalons : M1 socle qualite ; M2 installation et donnees ; M3 IA et diffusion. Aucune date arbitraire n'est imposee. Revoir l'ordre et la charge a chaque point de suivi.

## Creer le suivi dans GitHub

Preconditions : GitHub CLI disponible (`gh --version`), compte Mnichowdeltaone connecte, droits d'ecriture sur le depot et scope project. Les commandes d'authentification restent interactives : ne jamais coller un token dans un ticket.

```powershell
gh auth status
gh auth refresh -h github.com -s project
node scripts/bootstrap-github-project.mjs
node scripts/bootstrap-github-project.mjs --apply
```

Sans --apply, le script affiche seulement le plan. Avec --apply, il cree/reutilise le projet, les labels, les jalons et les 9 tickets, les ajoute au projet et affecte les priorites. Il ne modifie pas les tickets et statuts existants deja reconnus. Une interruption peut etre reprise : les marqueurs CV-QA-xx evitent les doublons. Le fichier `github-index.json` contient alors les vraies URLs et numeros obtenus.

Dans le projet, choisir une vue **Board**, grouper par **Status** et enregistrer la vue. Le script cree le projet et les champs, mais ne configure pas la disposition de cette vue. Ajouter une vue Table filtree par milestone pour la preparation des releases.

## Rituels et indicateurs

- Avant developpement : besoin, priorite, criteres d'acceptation et tests associes dans le ticket.
- Avant merge : PR revue, CI verte et recette du perimetre touche.
- Avant release : campagne datee, P0 fermes et binaire lie a un tag unique.
- Point de suivi : tickets bloques, P0/P1 ouverts, tests P0 passes/total, tests non executes et prochaines decisions.

Les templates GitHub permettent de creer une anomalie, une evolution et une PR avec les informations de validation. La publication de ce pack ne corrige pas automatiquement les anomalies du backlog et ne modifie pas la release existante.
