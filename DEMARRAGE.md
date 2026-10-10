# Installer le referentiel et le suivi de projet

1. Extraire cette archive dans le depot local CV Improvement a jour.
2. Executer `node configure-quality.cjs` depuis sa racine. Le script ajoute seulement les commandes npm et les exclusions des fichiers temporaires ; package.json est sauvegarde.
3. Avec Node 24 ou plus, executer `npm.cmd test`, puis `npm.cmd run test:api` apres installation des dependances du projet.
4. Publier les fichiers sur une branche de qualite via `node scripts/publish-quality.mjs`. Le script utilise un worktree distinct, n'emporte pas les modifications locales de main.cjs/logo/package et ouvre une PR ; il ne fusionne pas automatiquement.
5. Avec GitHub CLI connecte a Mnichowdeltaone et le scope project, executer `node scripts/bootstrap-github-project.mjs --apply`.

Le referentiel se trouve dans docs/quality/README.md ; le plan de projet dans docs/project/README.md. Les fichiers ajoutent des outils de qualite et ne changent pas le comportement de l'application.

La connexion GitHub de preparation etait en lecture seule : aucun fichier, ticket ou projet n'a encore ete publie par cette connexion.
