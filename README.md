# Fonds familial — Famille Tiwa Joseph

Application de bureau locale destinée à administrer un fonds familial / une tontine : membres, épargnes, mouvements, dépenses, crédits, dons, sessions et cassation. Elle ne nécessite pas de serveur distant : les données sont stockées dans une base SQLite.

> **Point d’entrée Vite.** Le fichier index.html à la racine charge l’application React depuis src/ui/main.tsx. Il est requis pour compiler l’interface et créer l’exécutable.

## Fonctionnalités

- **Authentification locale** avec deux rôles : administrateur et adjoint.
- **Tableau de bord** : membres, solde du fonds, épargne, remboursements, intérêts, crédits et derniers mouvements.
- **Membres** : ajout, modification, suppression, recherche, détail financier, historique et export PDF individuel.
- **Épargnes et mouvements** : saisie, modification, suppression, filtres, recherche et sélection multiple.
- **Dépenses communes** : catégories, contributions annuelles ou ponctuelles, modification et suppression.
- **Crédits** : octroi, échéance, remboursements, pénalités et suivi des états actif, remboursé et en retard.
- **Dons** : enregistrement par membre et institution, catégorisation et suppression par l’administrateur.
- **Sessions** : création, renommage, clôture, suppression des sessions inactives, consultation des mouvements et calcul des épargnes / intérêts par session.
- **Cassation** : simulation, exécution, répartition, état après cassation et préparation du cycle suivant.
- **Exports PDF** : mouvements, fiche membre et cassation. Les fichiers sont générés dans le dossier Downloads de l’utilisateur.
- **Préférences** : thème clair / sombre et changement des mots de passe.

Les actions de gestion les plus sensibles sont affichées à l’administrateur. L’adjoint dispose d’un accès plus restreint dans l’interface.

## Identifiants initiaux

Lorsqu’une base vide est créée, l’application initialise ces comptes :

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Administrateur | admin@tontine.com | admin1234 |
| Adjoint | adjoint@tontine.com | adjoint1234 |

Changez ces mots de passe dès la première connexion, depuis la page **Paramètres**.

## Architecture

    src/
    ├── ui/                    Point d’entrée React et application
    ├── components/
    │   ├── pages/             Écrans métier
    │   └── ui/                Composants d’interface réutilisables
    ├── electron/
    │   ├── main.ts            Processus principal, SQLite, migrations et PDF
    │   ├── preload.cts        API IPC exposée au rendu
    │   └── pathResolver.ts    Ressources en développement / production
    ├── hooks/                 Hooks React, dont la persistance du rôle
    └── types/                 Typages de l’API Electron
    assets/                    Icônes et images embarquées
    tontine.db                 Base SQLite de développement
    electron-builder.json      Configuration des paquets installables

La partie interface utilise React 19, TypeScript, Vite, Tailwind CSS et les composants Radix / shadcn. Electron fournit l’application bureau. Le processus principal utilise better-sqlite3 pour les données et bcryptjs pour les mots de passe ; l’interface dialogue avec lui via IPC et le preload Electron.

## Données et sauvegardes

- En développement, la base active est le fichier tontine.db à la racine du projet.
- Dans l’application installée, la base est copiée au premier lancement vers le dossier de données Electron. Sous Windows, cela correspond généralement à %APPDATA%\Famille Tiwa Joseph\tontine.db.
- Sauvegardez régulièrement ce fichier, application fermée, avant une mise à jour ou toute opération importante.
- Pour restaurer une sauvegarde, remplacez la base du dossier de données utilisateur, application fermée.
- Le fichier database.sqlite existe dans le dépôt, mais l’application utilise tontine.db.

Les principales tables sont users, membres, mouvements, credits, remboursements, caisse, dons, depenses_communes, sessions et session_membres. Les migrations de structure sont exécutées au démarrage.

## Prérequis

- Node.js 20 ou plus récent, idéalement une version LTS.
- pnpm 9 ou plus récent. Le projet contient un fichier pnpm-lock.yaml et ses scripts utilisent pnpm.
- Sous Windows, les outils de compilation C++ peuvent être nécessaires si better-sqlite3 doit être reconstruit pour Electron.

Installez les dépendances depuis la racine du projet :

    corepack enable
    pnpm install

En cas d’erreur relative au module natif better-sqlite3 :

    pnpm exec electron-builder install-app-deps

## Démarrer le projet

### Commande habituelle

    pnpm dev

Cette commande démarre Vite sur http://localhost:5123, compile Electron et ouvre l’application.

### Démarrage fiable en deux terminaux

Le script parallèle ne contient pas d’attente explicite du serveur Vite. Si Electron se lance avant que Vite ne soit prêt, utilisez deux terminaux dans le dossier du projet :

    # Terminal 1
    pnpm dev:react

Lorsque Vite écoute sur le port 5123 :

    # Terminal 2
    pnpm dev:electron

Pour démarrer Electron avec des fichiers déjà compilés :

    pnpm start

## Compiler l’application

Avec le fichier index.html présent à la racine :

    pnpm run transpile:electron
    pnpm run build

- transpile:electron produit les fichiers du processus principal et du preload dans dist-electron.
- build vérifie TypeScript puis produit l’interface React dans dist-react.

La commande pnpm test est actuellement un emplacement réservé et retourne volontairement une erreur : aucune suite de tests automatisés n’est encore configurée.

## Créer l’exécutable Windows

Après une compilation réussie, exécutez :

    pnpm run dist:win

Cette commande compile Electron et React, puis utilise electron-builder pour produire une version Windows x64. La configuration actuelle crée :

- un installateur NSIS ;
- une version portable ;
- dans le dossier C:\ff-build ;
- avec le nom fonds-familial et la version déclarée dans package.json.

Pour lister les exécutables générés puis ouvrir l’installateur :

    Get-ChildItem C:\ff-build -Filter *.exe
    Start-Process "C:\ff-build\fonds-familial Setup 1.0.0.exe"

Adaptez le second nom à la version réellement affichée par la première commande.

Les autres cibles fournies par les scripts sont :

    # macOS Apple Silicon, image DMG
    pnpm run dist:mac

    # Linux x64, AppImage
    pnpm run dist:linux

## Point d’entrée Vite

La configuration vite.config.ts définit la racine Vite comme le dossier du projet. Le fichier index.html est donc présent à cet emplacement et charge src/ui/main.tsx :

    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Famille Tiwa Joseph</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/ui/main.tsx"></script>
      </body>
    </html>

Pour compiler l’interface puis produire l’exécutable Windows :

    pnpm run build
    pnpm run dist:win

## Commandes utiles

| Commande | Usage |
| --- | --- |
| pnpm install | Installe les dépendances. |
| pnpm dev | Lance Vite et Electron en parallèle. |
| pnpm dev:react | Lance Vite seulement, sur le port 5123. |
| pnpm dev:electron | Compile et démarre Electron en développement. |
| pnpm run transpile:electron | Compile le processus Electron. |
| pnpm run build | Vérifie TypeScript et construit l’interface React. |
| pnpm start | Lance Electron avec les fichiers déjà compilés. |
| pnpm run dist:win | Produit l’installateur et le portable Windows x64. |
| pnpm run dist:mac | Produit l’image disque macOS ARM64. |
| pnpm run dist:linux | Produit l’AppImage Linux x64. |

## Dépannage

- **Electron ne se lance pas en développement** : démarrez d’abord pnpm dev:react, attendez Vite, puis lancez pnpm dev:electron dans un second terminal.
- **Erreur de build sur index.html** : vérifiez que ce fichier est bien présent à la racine et qu’il charge src/ui/main.tsx, comme indiqué dans la section « Point d’entrée Vite ».
- **Erreur better-sqlite3 ou module natif** : exécutez pnpm exec electron-builder install-app-deps après pnpm install.
- **Base inaccessible dans l’application installée** : vérifiez les droits du dossier %APPDATA%\Famille Tiwa Joseph et restaurez une sauvegarde de tontine.db, application fermée.
- **PDF introuvable** : vérifiez le dossier Downloads de l’utilisateur courant ; les exports y sont créés puis ouverts automatiquement.

## Guide utilisateur existant

Le guide métier HTML déjà présent dans le dépôt est disponible dans [docs/mode-emploi.html](docs/mode-emploi.html). Il complète ce README avec les opérations quotidiennes : membres, mouvements, crédits, sessions, cassation, exports et sauvegardes.
