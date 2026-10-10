# Strategie de tests

## Perimetre

Installation Electron/NSIS, configuration Gemini, profils, CV, lettres, analyses ATS, dossiers entreprise, suivi des candidatures, rapports, sauvegardes, mode demo, coaching et catalogue de modeles.

## Trois niveaux

1. **Unitaire** : 19 tests de fonctions metier et de persistance JSON. Ils n'utilisent ni reseau externe ni cle API.
2. **API** : 7 tests du serveur compile, lance sur un port temporaire avec une base synthetique. Aucune requete Gemini valide n'est envoyee. Le module compile est copie dans un dossier temporaire pour eviter la base suivie dans le depot.
3. **Recette manuelle** : 36 scenarios couvrant l'installateur, les parcours UI, les exports et les sorties IA. Les fonctions Gemini exigent une cle reservee a la recette et des donnees fictives.

Les tests natifs demandent Node.js 24 ou plus. Ils ne changent pas le runtime Electron 30 ni les dependances de production. Le petit hook de resolution des imports est utilise seulement pour les tests.

## Executer

Depuis la racine du depot :

```powershell
node configure-quality.cjs
npm.cmd test
npm.cmd run test:api
```

Sans modifier package.json :

```powershell
node scripts/run-tests.mjs unit
npm.cmd run build:server
node scripts/run-tests.mjs integration
```

Les donnees temporaires restent dans `.qa-tmp/`, ignore par Git ; chaque suite supprime son propre dossier. Les tests ne doivent jamais pointer `CV_MOVE_DATA_DIR` vers la base d'une installation utilisateur.

La CI `.github/workflows/quality.yml` execute ces deux suites et le build sur Windows et Linux. Elle ne compile pas l'installateur et ne publie aucune release. Si un lockfile est suivi, elle utilise npm ci ; sinon npm install. Le suivi d'un lockfile coherent fait partie de CV-QA-05.

## Jeu de recette

- Profil synthetique Alice Martin, Developpeuse Python, deux experiences fictives documentees.
- Offre Atelier Test, poste Developpeur Python, Python/SQL/Git requis.
- CV texte, PDF textuel, PDF scanne, DOCX et fichier invalide.
- Trois candidatures : applied, interview, rejected ; une date de relance future et une passee.
- Un CV sans diplome mentionne ni realisation chiffree, utilise pour tester l'absence d'invention.
- Un dossier entreprise sans information financiere verifiee.

Ne pas recopier `data/local_database.json` dans les fixtures. Ne joindre ni cle API, ni CV personnel, ni contenu d'IndexedDB aux tickets publics. Masquer les informations sensibles des captures.

## Regles de livraison

- 19 tests unitaires et 7 tests API passes sur le commit livre, ainsi que le build.
- Tous les scenarios manuels P0 passes ; aucune anomalie P0 ouverte.
- Une installation neuve sur un second PC validee et une mise a jour avec conservation de donnees validee.
- Recette IA reexecutee pour toute modification de prompt, modele ou fallback ; controle humain des faits.
- Toute anomalie P1 restante a une decision explicite et un contournement documente.
- Version unique, tag et binaire correspondant au meme commit. Noter le SHA256 du .exe.

Un test automatise de filtre demo ne prouve pas a lui seul l'isolation de toutes les sauvegardes. Un prompt d'authenticite ne prouve pas que les generations sont exactes. La recette Windows reste necessaire apres tout changement de packaging.
