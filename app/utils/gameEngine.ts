// Love Letter Game Engine
// Implements the core game rules and logic

export type CardRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Card {
  id: string;
  name: string;
  rank: CardRank;
  description: string;
  effect: string;
  image?: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  discardPile: Card[];
  isProtected: boolean;
  isEliminated: boolean;
  tokens: number;
}

export interface GameState {
  players: Player[];
  deck: Card[];
  currentPlayerIndex: number;
  burnedCard?: Card;
  isGameOver: boolean;
  winner?: Player;
  roundWinner?: Player;
  gameLog: string[];
  turnPhase: 'draw' | 'play' | 'effect' | 'nextTurn' | 'roundEnd' | 'gameEnd';
  targetPlayerId?: string;
  selectedCardId?: string;
  roundNumber: number;
}

export const CARD_DECK: Card[] = [
  {
    id: 'guard-1',
    name: 'Garde',
    rank: 1,
    description: 'Devinez la carte d\'un adversaire (sauf Garde).',
    effect: 'Si correct, l\'adversaire est éliminé.'
  },
  {
    id: 'guard-2',
    name: 'Garde',
    rank: 1,
    description: 'Devinez la carte d\'un adversaire (sauf Garde).',
    effect: 'Si correct, l\'adversaire est éliminé.'
  },
  {
    id: 'guard-3',
    name: 'Garde',
    rank: 1,
    description: 'Devinez la carte d\'un adversaire (sauf Garde).',
    effect: 'Si correct, l\'adversaire est éliminé.'
  },
  {
    id: 'guard-4',
    name: 'Garde',
    rank: 1,
    description: 'Devinez la carte d\'un adversaire (sauf Garde).',
    effect: 'Si correct, l\'adversaire est éliminé.'
  },
  {
    id: 'guard-5',
    name: 'Garde',
    rank: 1,
    description: 'Devinez la carte d\'un adversaire (sauf Garde).',
    effect: 'Si correct, l\'adversaire est éliminé.'
  },
  {
    id: 'priest-1',
    name: 'Prêtre',
    rank: 2,
    description: 'Regardez la main d\'un adversaire.',
    effect: 'Information privée.'
  },
  {
    id: 'priest-2',
    name: 'Prêtre',
    rank: 2,
    description: 'Regardez la main d\'un adversaire.',
    effect: 'Information privée.'
  },
  {
    id: 'baron-1',
    name: 'Baron',
    rank: 3,
    description: 'Comparez votre main avec celle d\'un adversaire.',
    effect: 'Le joueur avec la carte de valeur la plus faible est éliminé.'
  },
  {
    id: 'baron-2',
    name: 'Baron',
    rank: 3,
    description: 'Comparez votre main avec celle d\'un adversaire.',
    effect: 'Le joueur avec la carte de valeur la plus faible est éliminé.'
  },
  {
    id: 'handmaid-1',
    name: 'Servante',
    rank: 4,
    description: 'Vous êtes protégé jusqu\'à votre prochain tour.',
    effect: 'Immunité temporaire.'
  },
  {
    id: 'handmaid-2',
    name: 'Servante',
    rank: 4,
    description: 'Vous êtes protégé jusqu\'à votre prochain tour.',
    effect: 'Immunité temporaire.'
  },
  {
    id: 'prince-1',
    name: 'Prince',
    rank: 5,
    description: 'Choisissez un joueur (y compris vous) qui défausse sa main et en pioche une nouvelle.',
    effect: 'Défausse forcée et nouvelle carte.'
  },
  {
    id: 'prince-2',
    name: 'Prince',
    rank: 5,
    description: 'Choisissez un joueur (y compris vous) qui défausse sa main et en pioche une nouvelle.',
    effect: 'Défausse forcée et nouvelle carte.'
  },
  {
    id: 'king-1',
    name: 'Roi',
    rank: 6,
    description: 'Échangez votre main avec celle d\'un autre joueur.',
    effect: 'Échange de cartes.'
  },
  {
    id: 'countess-1',
    name: 'Comtesse',
    rank: 7,
    description: 'Si vous avez le Roi ou le Prince en main, vous devez jouer la Comtesse.',
    effect: 'Défausse obligatoire sous condition.'
  },
  {
    id: 'princess-1',
    name: 'Princesse',
    rank: 8,
    description: 'Si vous défaussez cette carte, vous êtes éliminé de la manche.',
    effect: 'Auto-élimination si défaussée.'
  }
];

// Initialize a new game
export function initializeGame(playerIds: string[], playerNames: string[]): GameState {
  // Create shuffled deck
  const deck = shuffleDeck([...CARD_DECK]);
  
  // Initialize players
  const players = playerIds.map((id, index) => ({
    id,
    name: playerNames[index] || `Joueur ${index + 1}`,
    hand: [],
    discardPile: [],
    isProtected: false,
    isEliminated: false,
    tokens: 0
  }));
  
  // Burn one card (face down) if less than 4 players
  let burnedCard: Card | undefined;
  if (players.length < 4) {
    burnedCard = deck.pop();
  }
  
  // Deal one card to each player
  players.forEach(player => {
    if (deck.length > 0) {
      player.hand.push(deck.pop()!);
    }
  });
  
  // Initialize game state
  return {
    players,
    deck,
    currentPlayerIndex: 0,
    burnedCard,
    isGameOver: false,
    gameLog: ['La partie commence !'],
    turnPhase: 'draw',
    roundNumber: 1
  };
}

// Shuffle the deck
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Draw a card from the deck
export function drawCard(gameState: GameState, playerId: string): GameState {
  const updatedState = { ...gameState };
  const player = updatedState.players.find(p => p.id === playerId);
  
  if (!player || player.isEliminated) {
    return gameState;
  }
  
  if (updatedState.deck.length > 0) {
    const card = updatedState.deck.pop()!;
    player.hand.push(card);
    updatedState.gameLog.push(`${player.name} pioche une carte.`);
    updatedState.turnPhase = 'play';
  } else {
    // If deck is empty, end the round
    updatedState.turnPhase = 'roundEnd';
    updatedState.gameLog.push('Le deck est vide. Fin de la manche !');
    determineRoundWinner(updatedState);
  }
  
  return updatedState;
}

// Play a card
export function playCard(
  gameState: GameState, 
  playerId: string, 
  cardId: string, 
  targetPlayerId?: string, 
  additionalInfo?: any
): GameState {
  const updatedState = { ...gameState };
  const player = updatedState.players.find(p => p.id === playerId);
  
  if (!player || player.isEliminated) {
    return gameState;
  }
  
  // Find the card in player's hand
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    return gameState;
  }
  
  const playedCard = player.hand[cardIndex];
  
  // Handle Countess special rule (must be played if King or Prince in hand)
  if (
    playedCard.rank !== 7 && // Not playing Countess
    player.hand.some(c => c.rank === 7) && // Has Countess in hand
    (playedCard.rank === 6 || playedCard.rank === 5) // Playing King or Prince
  ) {
    updatedState.gameLog.push(`${player.name} doit jouer la Comtesse !`);
    return gameState;
  }
  
  // Remove the card from hand and add to discard pile
  player.hand.splice(cardIndex, 1);
  player.discardPile.push(playedCard);
  
  updatedState.gameLog.push(`${player.name} joue ${playedCard.name}.`);
  
  // Handle card effects
  updatedState.turnPhase = 'effect';
  return handleCardEffect(updatedState, player, playedCard, targetPlayerId, additionalInfo);
}

// Handle card effects
function handleCardEffect(
  gameState: GameState, 
  player: Player, 
  card: Card, 
  targetPlayerId?: string, 
  additionalInfo?: any
): GameState {
  const updatedState = { ...gameState };

  // NOTE: This is a simplified implementation of card effects
  // In a real implementation, you'd need to handle all edge cases
  
  switch (card.rank) {
    case 1: // Guard
      if (targetPlayerId && additionalInfo?.guessedRank) {
        const targetPlayer = updatedState.players.find(p => p.id === targetPlayerId);
        if (targetPlayer && !targetPlayer.isProtected && !targetPlayer.isEliminated) {
          updatedState.gameLog.push(`${player.name} devine que ${targetPlayer.name} a un(e) ${additionalInfo.guessedRank}.`);
          
          if (targetPlayer.hand[0].rank === additionalInfo.guessedRank) {
            targetPlayer.isEliminated = true;
            updatedState.gameLog.push(`${targetPlayer.name} est éliminé !`);
          } else {
            updatedState.gameLog.push(`La devinette est incorrecte.`);
          }
        }
      }
      break;
      
    case 2: // Priest
      if (targetPlayerId) {
        const targetPlayer = updatedState.players.find(p => p.id === targetPlayerId);
        if (targetPlayer && !targetPlayer.isProtected && !targetPlayer.isEliminated) {
          // In a real implementation, you'd send private info to the player
          updatedState.gameLog.push(`${player.name} regarde la main de ${targetPlayer.name}.`);
        }
      }
      break;
      
    case 3: // Baron
      if (targetPlayerId) {
        const targetPlayer = updatedState.players.find(p => p.id === targetPlayerId);
        if (targetPlayer && !targetPlayer.isProtected && !targetPlayer.isEliminated) {
          updatedState.gameLog.push(`${player.name} compare sa main avec celle de ${targetPlayer.name}.`);
          
          const playerCard = player.hand[0];
          const targetCard = targetPlayer.hand[0];
          
          if (playerCard.rank < targetCard.rank) {
            player.isEliminated = true;
            updatedState.gameLog.push(`${player.name} est éliminé !`);
          } else if (playerCard.rank > targetCard.rank) {
            targetPlayer.isEliminated = true;
            updatedState.gameLog.push(`${targetPlayer.name} est éliminé !`);
          } else {
            updatedState.gameLog.push(`Égalité ! Personne n'est éliminé.`);
          }
        }
      }
      break;
      
    case 4: // Handmaid
      player.isProtected = true;
      updatedState.gameLog.push(`${player.name} est protégé jusqu'à son prochain tour.`);
      break;
      
    case 5: // Prince
      if (targetPlayerId) {
        const targetPlayer = updatedState.players.find(p => p.id === targetPlayerId);
        if (targetPlayer && !targetPlayer.isProtected && !targetPlayer.isEliminated) {
          if (targetPlayer.hand.length > 0) {
            const discardedCard = targetPlayer.hand.pop()!;
            targetPlayer.discardPile.push(discardedCard);
            
            updatedState.gameLog.push(`${targetPlayer.name} défausse ${discardedCard.name}.`);
            
            // Check for Princess
            if (discardedCard.rank === 8) {
              targetPlayer.isEliminated = true;
              updatedState.gameLog.push(`${targetPlayer.name} a défaussé la Princesse et est éliminé !`);
            } else if (updatedState.deck.length > 0) {
              // Draw a new card
              const newCard = updatedState.deck.pop()!;
              targetPlayer.hand.push(newCard);
              updatedState.gameLog.push(`${targetPlayer.name} pioche une nouvelle carte.`);
            }
          }
        }
      }
      break;
      
    case 6: // King
      if (targetPlayerId) {
        const targetPlayer = updatedState.players.find(p => p.id === targetPlayerId);
        if (targetPlayer && !targetPlayer.isProtected && !targetPlayer.isEliminated) {
          updatedState.gameLog.push(`${player.name} échange sa main avec ${targetPlayer.name}.`);
          
          // Swap hands
          const playerHand = [...player.hand];
          player.hand = [...targetPlayer.hand];
          targetPlayer.hand = playerHand;
        }
      }
      break;
      
    case 7: // Countess
      // No special effect when played normally
      updatedState.gameLog.push(`${player.name} joue la Comtesse.`);
      break;
      
    case 8: // Princess
      player.isEliminated = true;
      updatedState.gameLog.push(`${player.name} a joué la Princesse et est éliminé !`);
      break;
  }
  
  // Check if round is over
  if (checkRoundEnd(updatedState)) {
    updatedState.turnPhase = 'roundEnd';
    determineRoundWinner(updatedState);
  } else {
    updatedState.turnPhase = 'nextTurn';
    prepareNextTurn(updatedState);
  }
  
  return updatedState;
}

// Check if the round is over
function checkRoundEnd(gameState: GameState): boolean {
  // Round ends if: only one player remains, or deck is empty
  const activePlayers = gameState.players.filter(p => !p.isEliminated);
  return activePlayers.length === 1 || gameState.deck.length === 0;
}

// Determine the round winner
function determineRoundWinner(gameState: GameState): GameState {
  const updatedState = { ...gameState };
  const activePlayers = updatedState.players.filter(p => !p.isEliminated);
  
  if (activePlayers.length === 1) {
    // Only one player remains
    const winner = activePlayers[0];
    winner.tokens += 1;
    updatedState.roundWinner = winner;
    updatedState.gameLog.push(`${winner.name} remporte la manche !`);
  } else {
    // Compare hand values
    let highestRank = -1;
    let winningPlayers: Player[] = [];
    
    activePlayers.forEach(player => {
      if (player.hand.length > 0) {
        const cardRank = player.hand[0].rank;
        
        if (cardRank > highestRank) {
          highestRank = cardRank;
          winningPlayers = [player];
        } else if (cardRank === highestRank) {
          winningPlayers.push(player);
        }
      }
    });
    
    if (winningPlayers.length === 1) {
      const winner = winningPlayers[0];
      winner.tokens += 1;
      updatedState.roundWinner = winner;
      updatedState.gameLog.push(`${winner.name} remporte la manche avec ${winner.hand[0].name} !`);
    } else if (winningPlayers.length > 1) {
      // In case of a tie, compare discard piles (sum of ranks)
      let highestDiscardSum = -1;
      let tieWinner: Player | undefined;
      
      winningPlayers.forEach(player => {
        const discardSum = player.discardPile.reduce((sum, card) => sum + card.rank, 0);
        if (discardSum > highestDiscardSum) {
          highestDiscardSum = discardSum;
          tieWinner = player;
        }
      });
      
      if (tieWinner) {
        tieWinner.tokens += 1;
        updatedState.roundWinner = tieWinner;
        updatedState.gameLog.push(`${tieWinner.name} remporte l'égalité et la manche !`);
      } else {
        updatedState.gameLog.push(`Égalité parfaite ! Personne ne remporte de jeton.`);
      }
    }
  }
  
  // Check if game is over
  checkGameEnd(updatedState);
  
  return updatedState;
}

// Check if the game is over
function checkGameEnd(gameState: GameState): GameState {
  const updatedState = { ...gameState };
  const tokensToWin = getTokensToWin(updatedState.players.length);
  
  updatedState.players.forEach(player => {
    if (player.tokens >= tokensToWin) {
      updatedState.isGameOver = true;
      updatedState.winner = player;
      updatedState.gameLog.push(`${player.name} remporte la partie avec ${player.tokens} jetons !`);
    }
  });
  
  return updatedState;
}

// Get number of tokens needed to win based on player count
function getTokensToWin(playerCount: number): number {
  switch (playerCount) {
    case 2: return 7;
    case 3: return 5;
    case 4: return 4;
    default: return 5;
  }
}

// Prepare for the next turn
function prepareNextTurn(gameState: GameState): GameState {
  const updatedState = { ...gameState };
  
  // Reset protection status for previous player
  const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
  currentPlayer.isProtected = false;
  
  // Find next player who is not eliminated
  let nextPlayerIndex = (updatedState.currentPlayerIndex + 1) % updatedState.players.length;
  while (updatedState.players[nextPlayerIndex].isEliminated) {
    nextPlayerIndex = (nextPlayerIndex + 1) % updatedState.players.length;
    
    // Safeguard against infinite loop (should never happen if checkRoundEnd is working correctly)
    if (nextPlayerIndex === updatedState.currentPlayerIndex) {
      updatedState.turnPhase = 'roundEnd';
      return updatedState;
    }
  }
  
  updatedState.currentPlayerIndex = nextPlayerIndex;
  updatedState.turnPhase = 'draw';
  
  const nextPlayer = updatedState.players[nextPlayerIndex];
  updatedState.gameLog.push(`C'est au tour de ${nextPlayer.name}.`);
  
  return updatedState;
}

// Start a new round
export function startNewRound(gameState: GameState): GameState {
  const updatedState = { ...gameState };
  updatedState.roundNumber += 1;
  
  // Reset player states
  updatedState.players.forEach(player => {
    player.hand = [];
    player.discardPile = [];
    player.isProtected = false;
    player.isEliminated = false;
  });
  
  // Create new shuffled deck
  updatedState.deck = shuffleDeck([...CARD_DECK]);
  
  // Burn one card (face down) if less than 4 players
  if (updatedState.players.length < 4) {
    updatedState.burnedCard = updatedState.deck.pop();
  } else {
    updatedState.burnedCard = undefined;
  }
  
  // Deal one card to each player
  updatedState.players.forEach(player => {
    if (updatedState.deck.length > 0) {
      player.hand.push(updatedState.deck.pop()!);
    }
  });
  
  // Reset game state
  updatedState.currentPlayerIndex = 0;
  updatedState.roundWinner = undefined;
  updatedState.gameLog = [`Manche ${updatedState.roundNumber} commence !`];
  updatedState.turnPhase = 'draw';
  
  return updatedState;
}
