const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Configuration
const PORT = process.env.PORT || 3001;
const MAX_PLAYERS_PER_LOBBY = 4;

// Initialisation
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://loveletter-web.vercel.app"] 
      : ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Stockage des parties en cours
const lobbies = new Map();

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Nouvelle connexion: ${socket.id}`);

  // Créer une nouvelle partie
  socket.on('create_lobby', ({ playerName }) => {
    try {
      // Générer un code de lobby unique de 6 caractères
      const generateLobbyCode = () => {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Éviter les caractères similaires
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };

      let lobbyCode = generateLobbyCode();
      // Vérifier que le code n'existe pas déjà
      while (lobbies.has(lobbyCode)) {
        lobbyCode = generateLobbyCode();
      }

      // Créer le lobby
      lobbies.set(lobbyCode, {
        players: [{
          id: socket.id,
          name: playerName,
          isHost: true,
          isReady: false
        }],
        status: 'waiting', // waiting, playing, ended
        gameState: null,
        createdAt: Date.now()
      });

      // Rejoindre la room Socket.IO
      socket.join(lobbyCode);
      
      // Envoyer la confirmation
      socket.emit('lobby_created', { 
        lobbyCode, 
        playerId: socket.id,
        isHost: true
      });
      
      console.log(`🎮 Lobby créé: ${lobbyCode} par ${playerName}`);
    } catch (error) {
      console.error('Erreur lors de la création du lobby:', error);
      socket.emit('error', { message: 'Erreur lors de la création du lobby.' });
    }
  });

  // Rejoindre une partie existante
  socket.on('join_lobby', ({ lobbyCode, playerName }) => {
    try {
      // Vérifier si le lobby existe
      if (!lobbies.has(lobbyCode)) {
        return socket.emit('error', { message: 'Ce lobby n\'existe pas.' });
      }

      const lobby = lobbies.get(lobbyCode);
      
      // Vérifier si le lobby est plein
      if (lobby.players.length >= MAX_PLAYERS_PER_LOBBY) {
        return socket.emit('error', { message: 'Ce lobby est complet.' });
      }
      
      // Vérifier si la partie a déjà commencé
      if (lobby.status !== 'waiting') {
        return socket.emit('error', { message: 'Cette partie a déjà commencé.' });
      }

      // Rejoindre la room Socket.IO
      socket.join(lobbyCode);
      
      // Ajouter le joueur au lobby
      lobby.players.push({
        id: socket.id,
        name: playerName,
        isHost: false,
        isReady: false
      });
      
      // Envoyer la confirmation au joueur qui rejoint
      socket.emit('lobby_joined', { 
        lobbyCode, 
        playerId: socket.id,
        isHost: false,
        players: lobby.players
      });
      
      // Informer les autres joueurs
      socket.to(lobbyCode).emit('player_joined', {
        playerId: socket.id,
        playerName,
        players: lobby.players
      });
      
      console.log(`👋 ${playerName} a rejoint le lobby ${lobbyCode}`);
    } catch (error) {
      console.error('Erreur lors de la connexion au lobby:', error);
      socket.emit('error', { message: 'Erreur lors de la connexion au lobby.' });
    }
  });

  // Marquer un joueur comme prêt
  socket.on('player_ready', ({ lobbyCode }) => {
    try {
      if (!lobbies.has(lobbyCode)) return;
      
      const lobby = lobbies.get(lobbyCode);
      const player = lobby.players.find(p => p.id === socket.id);
      
      if (!player) return;
      
      player.isReady = true;
      
      // Informer tous les joueurs
      io.to(lobbyCode).emit('player_status_updated', {
        playerId: socket.id,
        isReady: true,
        players: lobby.players
      });
      
      // Vérifier si tous les joueurs sont prêts
      const allReady = lobby.players.length >= 2 && lobby.players.every(p => p.isReady);
      
      if (allReady) {
        // Démarrer la partie
        startGame(lobbyCode);
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  });

  // Gérer les actions dans le jeu
  socket.on('game_action', ({ lobbyCode, action, data }) => {
    try {
      if (!lobbies.has(lobbyCode)) return;
      
      const lobby = lobbies.get(lobbyCode);
      
      // Vérifier que la partie est en cours
      if (lobby.status !== 'playing') return;
      
      // Traiter l'action selon son type
      switch (action) {
        case 'draw_card':
          // Logic for drawing a card
          // Update gameState
          break;
          
        case 'play_card':
          // Logic for playing a card
          // Update gameState
          break;
          
        case 'select_target':
          // Logic for selecting a target
          // Update gameState
          break;
          
        // Add more actions as needed
      }
      
      // Envoyer le nouvel état du jeu à tous les joueurs
      io.to(lobbyCode).emit('game_updated', {
        gameState: sanitizeGameState(lobby.gameState, socket.id)
      });
    } catch (error) {
      console.error('Erreur lors de l\'action de jeu:', error);
    }
  });

  // Déconnexion d'un joueur
  socket.on('disconnect', () => {
    console.log(`🔌 Déconnexion: ${socket.id}`);
    
    // Trouver tous les lobbies où le joueur est présent
    for (const [lobbyCode, lobby] of lobbies.entries()) {
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const player = lobby.players[playerIndex];
        
        // Retirer le joueur du lobby
        lobby.players.splice(playerIndex, 1);
        
        console.log(`👋 ${player.name} a quitté le lobby ${lobbyCode}`);
        
        // Si le lobby est vide, le supprimer
        if (lobby.players.length === 0) {
          lobbies.delete(lobbyCode);
          console.log(`🗑️ Lobby supprimé: ${lobbyCode}`);
          continue;
        }
        
        // Si c'était l'hôte, désigner un nouvel hôte
        if (player.isHost && lobby.players.length > 0) {
          lobby.players[0].isHost = true;
        }
        
        // Informer les autres joueurs
        io.to(lobbyCode).emit('player_left', {
          playerId: socket.id,
          players: lobby.players
        });
        
        // Si la partie était en cours, la terminer
        if (lobby.status === 'playing') {
          // Logique pour gérer l'abandon d'un joueur en cours de partie
          // Par exemple, déclarer les autres joueurs comme gagnants
        }
      }
    }
  });
});

// Fonction pour démarrer une partie
function startGame(lobbyCode) {
  if (!lobbies.has(lobbyCode)) return;
  
  const lobby = lobbies.get(lobbyCode);
  
  // Mettre à jour le statut du lobby
  lobby.status = 'playing';
  
  // Initialiser l'état du jeu
  // Cette partie serait implémentée avec la logique complète du jeu
  // Pour l'instant, c'est un placeholder
  lobby.gameState = {
    players: lobby.players.map(p => ({
      id: p.id,
      name: p.name,
      hand: [],
      discardPile: [],
      isProtected: false,
      isEliminated: false,
      tokens: 0
    })),
    deck: [], // Initialiser le deck
    currentPlayerIndex: 0,
    round: 1,
    // autres propriétés nécessaires
  };
  
  // Informer tous les joueurs que la partie commence
  io.to(lobbyCode).emit('game_started', {
    gameState: sanitizeGameState(lobby.gameState)
  });
  
  console.log(`🎮 Partie démarrée dans le lobby ${lobbyCode}`);
}

// Fonction pour nettoyer l'état du jeu avant de l'envoyer à un joueur spécifique
// Cela permet de cacher les informations qui ne devraient pas être visibles
function sanitizeGameState(gameState, playerId) {
  if (!gameState) return null;
  
  // Créer une copie profonde
  const sanitized = JSON.parse(JSON.stringify(gameState));
  
  // Cacher les cartes des autres joueurs
  sanitized.players.forEach(player => {
    if (player.id !== playerId) {
      // Remplacer les cartes par des informations génériques
      player.hand = player.hand.map(card => ({
        id: 'hidden',
        isHidden: true
      }));
    }
  });
  
  // Cacher le deck
  sanitized.deck = sanitized.deck.length; // Juste le nombre de cartes
  
  return sanitized;
}

// Nettoyage périodique des lobbies inactifs
setInterval(() => {
  const now = Date.now();
  
  for (const [lobbyCode, lobby] of lobbies.entries()) {
    // Supprimer les lobbies inactifs depuis plus de 2 heures
    if (now - lobby.createdAt > 2 * 60 * 60 * 1000) {
      lobbies.delete(lobbyCode);
      console.log(`🗑️ Lobby inactif supprimé: ${lobbyCode}`);
    }
  }
}, 30 * 60 * 1000); // Vérifier toutes les 30 minutes

// Route simple pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.send('Serveur Love Letter opérationnel');
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur Socket.IO démarré sur le port ${PORT}`);
});
