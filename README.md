# LoveLetter Web Game

LoveLetter Web est une adaptation en ligne du célèbre jeu de cartes "Love Letter". Ce projet est conçu pour être joué en ligne ou en co-op local via navigateur, avec un design sobre inspiré de Discord et un gameplay fidèle au jeu d'origine.

---

## Fonctionnalités (MVP)
- Lobby de partie (créer/rejoindre)
- Multijoueur en ligne (2 à 4 joueurs)
- Règles fidèles au jeu Love Letter
- Système de jeu au tour par tour
- Interface simple, sobre, responsive
- Cartes cachées visibles uniquement par leur propriétaire

---

## Stack technologique

| Côté | Technologie |
|------|-------------|
| Frontend | Next.js (React + TypeScript) |
| UI | TailwindCSS + ShadCN |
| Animation | Framer Motion |
| Temps réel | Socket.IO (WebSocket) |
| Auth / Lobby | NanoID + gestion d'état client |
| Backend | Node.js (avec Express + Socket.IO server) |
| Déploiement | Vercel (Front) + Railway ou Render (Socket Server) |

---

## Installation

```bash
git clone https://github.com/ton-utilisateur/loveletter-web.git
cd loveletter-web
pnpm install
pnpm dev
```

- Le serveur Socket.IO sera à démarrer séparément (cd server && pnpm dev)
- Assure-toi que le port du serveur WebSocket est bien configuré dans .env

## Démarrage
1. Un joueur crée une partie, ce qui génère un code de lobby unique.
2. Les autres joueurs rejoignent la partie via ce code.
3. Lorsque tous sont prêts, la partie commence :
   - Chaque joueur reçoit une carte.
   - Tour à tour, ils piochent une carte et jouent selon les règles du jeu.
   - L'état du jeu est synchronisé via WebSocket.

## Structure du projet

```
loveletter-web/
├── app/                 → App Next.js (React)
│   ├── lobby/           → Création & entrée de parties
│   ├── game/            → Interface principale du jeu
│   ├── components/      → UI reusable (cards, board, etc.)
│   └── utils/           → Logic & helpers (règles, logique du jeu)
├── server/              → Socket.IO server (Node.js)
├── public/              → Assets
├── styles/              → Tailwind
└── README.md
```

## Améliorations futures
- Thèmes personnalisables
- Mode mobile responsive amélioré
- Ajout vocal ou chat
- Mode "IA" pour jouer seul
- Intégration Steam avec Electron

## Ressources
- Règles officielles de Love Letter (PDF)
- Socket.IO
- ShadCN UI
- Framer Motion

Créé par Miguel Boka — SmartScaling.dev

---

## Instructions pour le développement

### Étape 1 : Prototype solo
- Implémente un moteur de règles de Love Letter dans un fichier TypeScript pur (`gameEngine.ts`).
- Simule des tours entre joueurs manuellement.

### Étape 2 : Multijoueur local
- Ajoute un serveur Socket.IO.
- Crée un système de lobby simple (host → join avec code).
- Envoie les cartes aux joueurs via WebSocket, conserve la logique côté serveur.

### Étape 3 : UI épurée
- Crée une grille avec les cartes visibles, main cachée, et un bouton "jouer".
- Rends le jeu responsive (mobile friendly).

### Étape 4 : Finitions
- Gère les éliminations, fin de manche, attribution des points.
- Affiche les messages du jeu ("Raphaël a été éliminé!", "Tour de Miguel", etc.)
