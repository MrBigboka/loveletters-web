import { 
  initializeGame,
  drawCard,
  playCard,
  startNewRound,
  CARD_DECK
} from '@/app/utils/gameEngine';

describe('Game Engine', () => {
  describe('initializeGame', () => {
    it('should initialize a game with the correct players', () => {
      const playerIds = ['player1', 'player2'];
      const playerNames = ['Player One', 'Player Two'];
      
      const gameState = initializeGame(playerIds, playerNames);
      
      expect(gameState.players.length).toBe(2);
      expect(gameState.players[0].id).toBe('player1');
      expect(gameState.players[0].name).toBe('Player One');
      expect(gameState.players[1].id).toBe('player2');
      expect(gameState.players[1].name).toBe('Player Two');
    });
    
    it('should deal one card to each player', () => {
      const playerIds = ['player1', 'player2'];
      const playerNames = ['Player One', 'Player Two'];
      
      const gameState = initializeGame(playerIds, playerNames);
      
      expect(gameState.players[0].hand.length).toBe(1);
      expect(gameState.players[1].hand.length).toBe(1);
    });
    
    it('should initialize the game with proper starting values', () => {
      const playerIds = ['player1', 'player2'];
      const playerNames = ['Player One', 'Player Two'];
      
      const gameState = initializeGame(playerIds, playerNames);
      
      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.turnPhase).toBe('draw');
      expect(gameState.roundNumber).toBe(1);
      // Initial deck should have less cards because one is dealt to each player and one is burned
      expect(gameState.deck.length).toBe(CARD_DECK.length - 2 - 1); // deck - players - burned
    });
  });
  
  describe('drawCard', () => {
    it('should add a card to the player\'s hand', () => {
      const gameState = initializeGame(['player1', 'player2'], ['Player One', 'Player Two']);
      const initialHandSize = gameState.players[0].hand.length;
      const initialDeckSize = gameState.deck.length;
      
      const newGameState = drawCard(gameState, 'player1');
      
      expect(newGameState.players[0].hand.length).toBe(initialHandSize + 1);
      expect(newGameState.deck.length).toBe(initialDeckSize - 1);
      expect(newGameState.turnPhase).toBe('play');
    });
    
    it('should handle empty deck scenario', () => {
      const gameState = initializeGame(['player1', 'player2'], ['Player One', 'Player Two']);
      // Empty the deck
      gameState.deck = [];
      
      const newGameState = drawCard(gameState, 'player1');
      
      // The game should end the round if the deck is empty
      expect(newGameState.turnPhase).toBe('roundEnd');
    });
  });
  
  describe('playCard', () => {
    it('should move the played card from hand to discard pile', () => {
      let gameState = initializeGame(['player1', 'player2'], ['Player One', 'Player Two']);
      
      // Ensure player has a card to play (draw phase)
      gameState = drawCard(gameState, 'player1');
      const cardToPlay = gameState.players[0].hand[0];
      
      const newGameState = playCard(gameState, 'player1', cardToPlay.id);
      
      expect(newGameState.players[0].hand.length).toBe(1); // After playing, should have 1 card left
      expect(newGameState.players[0].discardPile.length).toBe(1); // Card should be in discard
      expect(newGameState.players[0].discardPile[0].id).toBe(cardToPlay.id);
    });
  });
  
  describe('startNewRound', () => {
    it('should reset the game state for a new round', () => {
      let gameState = initializeGame(['player1', 'player2'], ['Player One', 'Player Two']);
      
      // Simulate end of round with player 1 winning
      gameState.roundNumber = 1;
      gameState.turnPhase = 'roundEnd';
      gameState.roundWinner = gameState.players[0];
      gameState.players[0].tokens = 1;
      
      const newGameState = startNewRound(gameState);
      
      expect(newGameState.roundNumber).toBe(2); // Round number should increase
      expect(newGameState.turnPhase).toBe('draw'); // Reset to draw phase
      expect(newGameState.roundWinner).toBeUndefined(); // No round winner yet
      expect(newGameState.players[0].tokens).toBe(1); // Tokens should persist
      expect(newGameState.players[0].hand.length).toBe(1); // Should have a new hand
      expect(newGameState.players[0].isProtected).toBe(false); // Protection should reset
      expect(newGameState.deck.length).toBe(CARD_DECK.length - 2 - 1); // New deck with initial cards minus dealt
    });
  });
});
