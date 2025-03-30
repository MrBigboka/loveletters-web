const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Stockage des parties
const games = {};

io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté:', socket.id);

  // Créer une nouvelle partie
  socket.on('createGame', ({ playerName }) => {
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    games[gameId] = {
      id: gameId,
      players: [{
        id: socket.id,
        name: playerName
      }],
      host: socket.id,
      status: 'waiting'
    };
    
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, playerId: socket.id });
    console.log(`Partie créée: ${gameId} par ${playerName}`);
  });

  // Rejoindre une partie
  socket.on('joinGame', ({ gameId, playerName }) => {
    const game = games[gameId];
    
    if (!game) {
      socket.emit('error', { message: 'Partie introuvable' });
      return;
    }
    
    if (game.status !== 'waiting') {
      socket.emit('error', { message: 'La partie a déjà commencé' });
      return;
    }
    
    game.players.push({
      id: socket.id,
      name: playerName
    });
    
    socket.join(gameId);
    socket.emit('gameJoined', { gameId, playerId: socket.id });
    io.to(gameId).emit('playerJoined', { players: game.players });
    console.log(`${playerName} a rejoint la partie ${gameId}`);
  });

  // Démarrer la partie
  socket.on('startGame', ({ gameId }) => {
    const game = games[gameId];
    
    if (!game) {
      socket.emit('error', { message: 'Partie introuvable' });
      return;
    }
    
    if (socket.id !== game.host) {
      socket.emit('error', { message: 'Seul l\'hôte peut démarrer la partie' });
      return;
    }
    
    game.status = 'playing';
    io.to(gameId).emit('gameStarted', { gameId });
    console.log(`Partie ${gameId} démarrée`);
  });

  // Jouer une carte
  socket.on('playCard', ({ gameId, cardIndex, targetPlayerId }) => {
    console.log(`Joueur ${socket.id} joue la carte ${cardIndex} contre ${targetPlayerId || 'personne'}`);
    io.to(gameId).emit('cardPlayed', { 
      playerId: socket.id, 
      cardIndex, 
      targetPlayerId 
    });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    
    // Mettre à jour les parties où le joueur était présent
    Object.keys(games).forEach(gameId => {
      const game = games[gameId];
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        io.to(gameId).emit('playerLeft', { 
          playerId: socket.id,
          players: game.players 
        });
        
        // Si l'hôte quitte, assigner un nouvel hôte ou supprimer la partie
        if (socket.id === game.host) {
          if (game.players.length > 0) {
            game.host = game.players[0].id;
            io.to(gameId).emit('newHost', { hostId: game.host });
          } else {
            delete games[gameId];
          }
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO démarré sur le port ${PORT}`);
});
