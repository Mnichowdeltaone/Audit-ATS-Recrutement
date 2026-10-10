# Referentiel de recette

Statut initial de tous ces scenarios : **Non execute**. Reporter chaque resultat dans CAMPAGNE.md et associer une preuve. Les donnees utilisees sont fictives.

## Installation et serveur

| ID | Priorite | Preconditions et actions | Resultat attendu |
| --- | --- | --- | --- |
| MAN-WIN-01 | P0 | Profil Windows neuf sur un second PC ; installer puis lancer via le raccourci. | Installation sans outils de developpement ; ouverture de l'application et serveur disponible. |
| MAN-WIN-02 | P1 | Ouvrir l'installateur ; verifier accueil, .exe, raccourci, menu Demarrer et barre des taches. | Nom CV Improvement, logo, DeltaOne Developpement et direction Francois Delrieu ; aucune icone Electron residuelle apres reinstallation. |
| MAN-WIN-03 | P0 | Lancer l'application installee ; charger profils/CV puis tester la cle ; examiner les requetes. | Appels HTTP au serveur local ; aucune URL file:///C:/api, aucune erreur CORS ni 500 de base. |
| MAN-WIN-04 | P0 | Creer profil, CV et candidature ; sauvegarder ; installer une nouvelle version puis relancer. | Donnees et preferences preservees ; aucune base de demo importee. |
| MAN-WIN-05 | P0 | Cloner le tag dans un environnement propre ; installer les dependances puis construire le .exe. | Installation reproductible sans fichiers locaux non versionnes ; nom et assets corrects. |
| MAN-WIN-06 | P0 | Profil Windows neuf ; inspecter profil, CV, historique et candidatures avant d'activer la demo. | Base personnelle vierge, aucune donnee du depot. |
| MAN-WIN-07 | P1 | Sur PC de recette, occuper le port 3000 avec un service de test puis lancer l'application. | Conflit explique ; aucune connexion silencieuse au service tiers ; aucune perte de donnees. |
| MAN-WIN-08 | P1 | Ouvrir deux fois l'application puis fermer les fenetres ; verifier les processus. | Seconde instance geree ; pas de serveur orphelin ni conflit au lancement suivant. |

## API et preferences

| ID | Priorite | Preconditions et actions | Resultat attendu |
| --- | --- | --- | --- |
| MAN-API-01 | P0 | Sans cle : sauvegarder une cle valide de recette, tester puis fermer et relancer. | Cle chargee au demarrage, connexion reussie, cle masquee et absente des journaux. |
| MAN-API-02 | P1 | Utiliser une cle invalide puis un modele non disponible ; tester. | Message exploitable, interface recuperable, aucune sauvegarde presentee comme analyse reussie. |
| MAN-API-03 | P1 | Couper Internet avant une analyse puis retablir et relancer. | Echec explique, etat de chargement termine et nouvelle tentative possible sans doublon. |

## Donnees et documents

| ID | Priorite | Preconditions et actions | Resultat attendu |
| --- | --- | --- | --- |
| MAN-DB-01 | P0 | Creer deux profils ; changer le profil actif ; modifier chacun ; relancer. | Un seul profil actif ; donnees du bon candidat retrouvees. |
| MAN-DB-02 | P0 | Creer CV, lettre, candidature et analyse ; exporter JSON ; supprimer sur base de recette puis importer. | Collections et liens restaures ; fichier lisible ; aucune erreur 500. |
| MAN-DB-03 | P1 | Importer JSON invalide ou schema incomplet apres sauvegarde de la base de recette. | Erreur comprehensible ou migration documentee ; donnees initiales non detruites. |
| MAN-DB-04 | P1 | Supprimer le profil et le CV actifs sur une base synthetique contenant plusieurs elements. | Nouveau defaut coherent ; autres elements conserves ; absence de references cassees. |
| MAN-CV-01 | P0 | Importer un PDF textuel puis un DOCX de reference ; verifier le texte extrait. | Texte exploitable, caracteres accentues et sections preserves ; pas d'erreur worker Electron. |
| MAN-CV-02 | P1 | Importer un PDF scanne sans OCR, un fichier corrompu puis un document valide. | Limite ou erreur clairement indiquee ; application utilisable et import suivant possible. |
| MAN-CV-03 | P1 | Choisir un modele de CV ; remplir un contenu long ; exporter et ouvrir le fichier. | Contenu complet, pagination lisible, aucun chevauchement ni texte tronque. |

## ATS, IA et demo

| ID | Priorite | Preconditions et actions | Resultat attendu |
| --- | --- | --- | --- |
| MAN-ATS-01 | P0 | Analyser le CV fictif et l'offre ; comparer score, points forts et recommandations. | Score de 0 a 100 ; resultat rattachable aux textes ; absence de succes fictif en cas d'echec. |
| MAN-ATS-02 | P1 | Sans cle, declencher le mode d'analyse locale prevu par l'UI sur deux offres differentes. | Analyse locale identifiee ; pas de confusion avec Gemini ; pas d'appel externe requis. |
| MAN-ATS-03 | P1 | Appliquer une recommandation, modifier le CV puis reanalyser. | Versions et historique distingues ; aucune modification du CV initial ; score non force artificiellement. |
| MAN-IA-01 | P0 | CV sans diplome ni chiffres ; generer un CV cible avec Gemini et comparer chaque fait aux sources. | Aucun diplome, employeur, periode ou chiffre invente ; lacunes conservees ou demandees. |
| MAN-IA-02 | P0 | Generer une lettre pour une offre plus senior que le profil fictif. | Aucune experience non attestee ; arguments bases sur le CV et l'offre. |
| MAN-IA-03 | P1 | Demander au coach d'inventer cinq ans d'experience ; puis poser une question normale. | Refus d'inventer des faits et aide utile ; conversation recuperable. |
| MAN-IA-04 | P0 | Sans cle, generer un contenu de demo ; tenter sauvegarde et export vers le parcours personnel. | Chiffres et exemples fictifs etiquetes ; aucune experience simulee traitee comme fait personnel. |
| MAN-DEMO-01 | P0 | Base personnelle synthetique sauvegardee ; activer la demo, naviguer, modifier puis quitter. | Collections personnelles strictement identiques avant/apres ; separation visible. |
| MAN-DEMO-02 | P0 | Activer la demo ; exporter la base personnelle ; fermer et relancer. | Export et base personnelle sans examples demo ; restauration du contexte conforme au mode choisi. |

## Entreprises, candidatures et ergonomie

| ID | Priorite | Preconditions et actions | Resultat attendu |
| --- | --- | --- | --- |
| MAN-ENT-01 | P1 | Construire un dossier entreprise a partir d'une offre sans chiffres financiers. | Donnees inconnues identifiees ; aucune valeur financiere inventee ; provenance des informations indiquee. |
| MAN-ENT-02 | P1 | Completer puis sauvegarder et rouvrir un dossier entreprise lie a une candidature. | Sections et liens conserves ; aucune modification du dossier d'une autre entreprise. |
| MAN-SUIVI-01 | P1 | Creer trois candidatures aux statuts applied/interview/rejected ; filtrer et changer un statut. | Filtres, compteurs et tableau de bord correspondent exactement aux trois elements. |
| MAN-SUIVI-02 | P1 | Ajouter une relance passee et une future ; ouvrir rapport et export. | Echeances et indicateurs coherents ; meme perimetre de donnees dans l'export. |
| MAN-UI-01 | P1 | Naviguer a 1366 x 768, zoom 125 %, puis au clavier. | Actions principales accessibles, focus visible, pas de controles coupes ou superposes. |

## Securite et diffusion

| ID | Priorite | Preconditions et actions | Resultat attendu |
| --- | --- | --- | --- |
| MAN-SEC-01 | P1 | Executer npm audit sur les dependances resolues et examiner runtime/build. | Rapport date et plan de traitement ; aucun npm audit fix --force sans validation. |
| MAN-SEC-02 | P0 | Tester une cle puis examiner logs, captures, export JSON et contenu du binaire. | Aucune cle partagee publiquement ni embarquee ; stockage de la cle documente, pas d'affirmation de chiffrement non verifiee. |
| MAN-REL-01 | P0 | Comparer package.version, tag, commit, nom d'asset et SHA256 du binaire livre. | Version unique et tracable ; binaire construit avec les sources du tag. |
| MAN-REL-02 | P1 | Ouvrir releases/latest hors connexion GitHub ; telecharger puis installer sur PC de recette. | Lien public fonctionnel et asset attendu ; avertissement de signature documente s'il existe. |
