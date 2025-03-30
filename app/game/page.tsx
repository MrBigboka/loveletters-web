"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card as GameCard, CardHand, CardStack, DiscardPile } from "@/app/components/ui/card";
import type { GameState, Card, CardRank } from "@/app/utils/gameEngine";
import { initializeGame, drawCard, playCard, startNewRound } from "@/app/utils/gameEngine";

// Déclarations des fonctions de son (implémentées dans useEffect)
let playCardSound = () => {};
let drawCardSound = () => {};
let victorySound = () => {};

// Dans une application réelle, nous utiliserions Socket.IO ici
// Pour l'instant, nous allons simuler une partie locale

export default function GamePage() {
  return (
    <Suspense fallback={<LoadingGame />}>
      <GameContent />
    </Suspense>
  );
}

// Composant de chargement
function LoadingGame() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 flex items-center justify-center">
      <div className="text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"
        />
        <h2 className="text-2xl font-bold text-white">Chargement du jeu...</h2>
      </div>
    </div>
  );
}

// Contenu principal du jeu
function GameContent() {
  const searchParams = useSearchParams();
  const lobbyCode = searchParams.get("lobby") || "";
  const playerName = searchParams.get("name") || "Joueur";
  const isHost = searchParams.get("host") === "true";
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  
  const players = useMemo(() => [
    { id: "player1", name: playerName, hand: [], discardPile: [], isProtected: false, isEliminated: false, tokens: 0 },
    { id: "player2", name: "Adversaire", hand: [], discardPile: [], isProtected: false, isEliminated: false, tokens: 0 }
  ], [playerName]);
  
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [targetPlayerId, setTargetPlayerId] = useState<string | undefined>();
  const [guessedRank, setGuessedRank] = useState<CardRank | undefined>();
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [waitingPlayers, setWaitingPlayers] = useState(isHost);
  const [copySuccess, setCopySuccess] = useState(false);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [showPlayedCard, setShowPlayedCard] = useState<Card | null>(null);
  const [cardPlayAnimation, setCardPlayAnimation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialiser les sons côté client uniquement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Implémentation des fonctions de son
      playCardSound = () => {
        const audio = new Audio("/sounds/card-play.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play failed:", e));
      };
      
      drawCardSound = () => {
        const audio = new Audio("/sounds/card-draw.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play failed:", e));
      };
      
      victorySound = () => {
        const audio = new Audio("/sounds/victory.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play failed:", e));
      };
    }
  }, []);

  // Simulate player join
  useEffect(() => {
    if (isHost) {
      // Host is waiting for players
      const timer = setTimeout(() => {
        setWaitingPlayers(false);
        // Initialize game with default players
        const newGameState = initializeGame(
          players.map((p) => p.id),
          players.map((p) => p.name)
        );
        setGameState(newGameState);
        setGameLog(newGameState.gameLog);
      }, 2000); // Simulating a 2-second wait for players

      return () => clearTimeout(timer);
    } else {
      // Non-host player is joining an existing game
      // In a real app, we would connect to Socket.IO here
      setWaitingPlayers(false);
      const newGameState = initializeGame(
        players.map((p) => p.id),
        players.map((p) => p.name)
      );
      setGameState(newGameState);
      setGameLog(newGameState.gameLog);
    }
  }, [isHost, players]);

  // Copy lobby code to clipboard
  const copyLobbyCode = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Handle card selection
  const handleSelectCard = (cardId: string) => {
    console.log("Selected card:", cardId);
    // Effacer le message d'erreur s'il y en a un
    if (errorMessage) setErrorMessage(null);
    
    // Vérifier si c'est le tour du joueur et s'il est en phase de jeu
    if (!isPlayerTurn || !isTurnPhasePlay) {
      console.log("Cannot select card: not player turn or not in play phase");
      return;
    }
    
    // Mettre à jour la carte sélectionnée
    setSelectedCardId(cardId);
    
    // Jouer le son
    playCardSound();
  };

  // Handle player target selection
  const handleSelectTarget = (playerId: string) => {
    setTargetPlayerId(playerId === targetPlayerId ? undefined : playerId);
  };

  // Handle rank guess selection (for Guard card)
  const handleSelectRank = (rank: CardRank) => {
    setGuessedRank(rank === guessedRank ? undefined : rank);
  };

  // Handle playing a card with animation
  const handlePlayCard = () => {
    if (!gameState || !selectedCardId) {
      console.log("Cannot play card: gameState or selectedCardId is null", { gameState, selectedCardId });
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    console.log("Current player:", currentPlayer);
    
    // Find the selected card
    const selectedCard = currentPlayer.hand.find(card => card.id === selectedCardId);
    if (!selectedCard) {
      console.log("Selected card not found in player's hand", { selectedCardId, hand: currentPlayer.hand });
      return;
    }
    console.log("Selected card:", selectedCard);

    // Check if the card requires a target
    const needsTarget = [1, 2, 3, 5, 6].includes(selectedCard.rank);
    const isGuard = selectedCard.rank === 1;

    // Guard card requires both a target and a guessed rank
    if (isGuard && (!targetPlayerId || guessedRank === undefined)) {
      console.log("Guard card needs target and guessed rank", { targetPlayerId, guessedRank });
      // Show error or prompt
      setErrorMessage("Sélectionnez une cible et une rang pour la carte Garde");
      return;
    }
    // Other targeting cards require a target
    else if (needsTarget && !targetPlayerId && !isGuard) {
      console.log("Targeting card needs target", { targetPlayerId });
      // Show error or prompt
      setErrorMessage("Sélectionnez une cible pour cette carte");
      return;
    }

    console.log("Playing card:", { selectedCard, targetPlayerId, guessedRank });
    
    // Animate card being played
    setShowPlayedCard(selectedCard);
    setCardPlayAnimation(true);
    playCardSound();

    setTimeout(() => {
      // Play the card
      const newGameState = playCard(
        gameState, 
        currentPlayer.id, 
        selectedCardId, 
        targetPlayerId, 
        isGuard ? { guessedRank } : undefined
      );

      // Update game state
      setGameState(newGameState);
      setGameLog(newGameState.gameLog);
      
      // Reset selections
      setSelectedCardId(undefined);
      setTargetPlayerId(undefined);
      setGuessedRank(undefined);
      setCardPlayAnimation(false);
      setShowPlayedCard(null);

      // For demo purposes, if it's AI's turn, let them play after a delay
      if (newGameState.currentPlayerIndex === 1 && !newGameState.isGameOver) {
        setTimeout(() => {
          const aiPlayer = newGameState.players[newGameState.currentPlayerIndex];
          
          // AI draws a card
          drawCardSound();
          const afterDrawState = drawCard(newGameState, aiPlayer.id);
          
          // AI always plays their first card (dumb AI)
          const cardToPlay = afterDrawState.players[afterDrawState.currentPlayerIndex].hand[0];
          
          // AI animated card play
          setShowPlayedCard(cardToPlay);
          setCardPlayAnimation(true);
          playCardSound();
          
          setTimeout(() => {
            // AI randomly targets the human player for cards that need targets
            const needsTarget = [1, 2, 3, 5, 6].includes(cardToPlay.rank);
            
            // Play the card
            const afterPlayState = playCard(
              afterDrawState, 
              aiPlayer.id, 
              cardToPlay.id,
              needsTarget ? "player1" : undefined, 
              cardToPlay.rank === 1 ? { guessedRank: (Math.floor(Math.random() * 7) + 2) as CardRank } : undefined
            );
            
            setGameState(afterPlayState);
            setGameLog(afterPlayState.gameLog);
            setCardPlayAnimation(false);
            setShowPlayedCard(null);
          }, 1000);
        }, 1500);
      }
    }, 1000);
  };

  // Handle starting the player's turn (drawing a card)
  const handleStartTurn = () => {
    if (!gameState) return;
    
    drawCardSound();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const newGameState = drawCard(gameState, currentPlayer.id);
    
    setGameState(newGameState);
    setGameLog(newGameState.gameLog);
  };

  // Handle starting a new round
  const handleNewRound = () => {
    if (!gameState) return;
    
    const newGameState = startNewRound(gameState);
    setGameState(newGameState);
    setGameLog(newGameState.gameLog);
  };

  // Current player logic
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isPlayerTurn = currentPlayer?.id === "player1";
  const isTurnPhasePlay = gameState?.turnPhase === "play";
  const isTurnPhaseDraw = gameState?.turnPhase === "draw";
  const isRoundEnd = gameState?.turnPhase === "roundEnd";
  const isGameOver = gameState?.isGameOver;

  // Sound effect for game over
  useEffect(() => {
    if (isGameOver) {
      victorySound();
    }
  }, [isGameOver]);

  if (waitingPlayers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4 overflow-hidden">
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Animated particles in background */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 rounded-full bg-red-500 opacity-20"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight, 
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: [null, Math.random() * -window.innerHeight],
                opacity: [0.2, 0],
                scale: [null, Math.random() * 1 + 1]
              }}
              transition={{ 
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
          ))}
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <UICard className="w-full max-w-md bg-slate-800/90 border-slate-700 text-white backdrop-blur-md">
            <CardHeader>
              <motion.div 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <CardTitle className="text-2xl bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
                  En attente de joueurs
                </CardTitle>
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-slate-300">Partagez ce code avec vos amis pour qu&#39;ils puissent rejoindre la partie :</p>
                <div className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Badge className="text-xl py-3 px-4 bg-gradient-to-r from-indigo-800 to-purple-900 shadow-glow">{lobbyCode}</Badge>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button size="sm" onClick={copyLobbyCode} className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                      {copySuccess ? "Copié !" : "Copier"}
                    </Button>
                  </motion.div>
                </div>
                <motion.div
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Alert className="bg-slate-700/80 border-slate-600 backdrop-blur-sm">
                    <AlertDescription>
                      {isHost ? "Vous êtes l&#39;hôte de cette partie. Le jeu démarrera automatiquement lorsque tous les joueurs seront prêts." : "En attente du démarrage de la partie par l&#39;hôte..."}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              </div>
            </CardContent>
          </UICard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 overflow-hidden" ref={gameAreaRef}>
      {/* Animated background elements */}
      {typeof window !== 'undefined' && (
        <motion.div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => {
            // Dimensions sécurisées pour SSR
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            const randomX = Math.random() * (windowWidth * 0.8);
            const randomY = Math.random() * (windowHeight * 0.8);
            
            return (
              <motion.div
                key={i}
                className="absolute w-4 h-4 rounded-full bg-red-500 opacity-20"
                initial={{ 
                  x: randomX, 
                  y: randomY, 
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{
                  y: [randomY, randomY - 100],
                  opacity: [0.1, 0],
                  scale: [1, Math.random() * 1.5 + 1]
                }}
                transition={{
                  duration: Math.random() * 15 + 15,
                  repeat: Infinity,
                  repeatType: "loop"
                }}
              />
            );
          })}
        </motion.div>
      )}
      
      {/* Card being played animation */}
      <AnimatePresence>
        {cardPlayAnimation && showPlayedCard && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 2, y: 100, rotate: 15 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0, y: -100, rotate: -15 }}
              transition={{ type: "spring", damping: 12 }}
            >
              <GameCard card={showPlayedCard} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isPlayerTurn && isTurnPhasePlay && (
        <motion.div 
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/90 border border-red-500 px-4 py-2 rounded-lg shadow-lg z-30"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-white text-sm">Cliquez sur une carte pour la sélectionner, puis sur "Jouer la carte"</p>
        </motion.div>
      )}

      {/* Toast pour afficher les erreurs ou instructions */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-xl z-50"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            onClick={() => setErrorMessage(null)}
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dialogue des règles du jeu */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">Règles du jeu</DialogTitle>
            <DialogDescription className="text-slate-400">
              Comment jouer à Love Letter
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-4">
            <h3 className="font-bold">But du jeu</h3>
            <p className="mb-4 text-sm">Gagnez des jetons en éliminant vos adversaires ou en ayant la carte de plus haute valeur à la fin de la manche.</p>
            
            <h3 className="font-bold">Tour de jeu</h3>
            <p className="mb-4 text-sm">À votre tour, piochez une carte et jouez-en une des deux cartes de votre main. Suivez les effets de la carte jouée.</p>
            
            <h3 className="font-bold">Cartes</h3>
            <ul className="space-y-2 mb-4 text-sm">
              <li><strong>1 - Garde (5):</strong> Devinez la carte d&#39;un adversaire (sauf Garde). S&#39;il la possède, il est éliminé.</li>
              <li><strong>2 - Prêtre (2):</strong> Regardez la main d&#39;un adversaire.</li>
              <li><strong>3 - Baron (2):</strong> Comparez votre main avec celle d&#39;un adversaire. Le joueur avec la carte la plus faible est éliminé.</li>
              <li><strong>4 - Servante (2):</strong> Vous êtes protégé jusqu&#39;à votre prochain tour.</li>
              <li><strong>5 - Prince (2):</strong> Forcez un joueur (vous inclus) à défausser sa main et à piocher une nouvelle carte.</li>
              <li><strong>6 - Roi (1):</strong> Échangez votre main avec celle d&#39;un autre joueur.</li>
              <li><strong>7 - Comtesse (1):</strong> Si vous avez le Roi ou le Prince en main, vous devez jouer la Comtesse.</li>
              <li><strong>8 - Princesse (1):</strong> Si vous défaussez cette carte, vous êtes éliminé.</li>
            </ul>
            
            <h3 className="font-bold">Fin de manche</h3>
            <p className="mb-4 text-sm">La manche se termine quand il ne reste qu&#39;un joueur ou que le deck est vide. Le joueur avec la carte de plus haute valeur gagne alors un jeton.</p>
            
            <h3 className="font-bold">Victoire</h3>
            <p className="text-sm">Le premier joueur à obtenir 7 jetons (à 2 joueurs), 5 jetons (à 3 joueurs) ou 4 jetons (à 4 joueurs) remporte la partie.</p>
          </div>
          
          <DialogFooter>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => setShowRulesDialog(false)} className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                Fermer
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <motion.div 
        className="container mx-auto max-w-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="flex justify-between items-center mb-4 text-white">
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/">
                <Button variant="outline" size="sm" className="border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700 shadow-md">
                  Quitter
                </Button>
              </Link>
            </motion.div>
            <motion.h1 
              className="text-2xl font-bold bg-gradient-to-r from-red-400 to-amber-300 bg-clip-text text-transparent"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 12 }}
            >
              Love Letter <span className="text-slate-400">· Code: {lobbyCode}</span>
            </motion.h1>
          </div>
          <motion.div 
            className="flex gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700 shadow-md" 
              onClick={() => setShowRulesDialog(true)}
            >
              Règles
            </Button>
          </motion.div>
        </header>
        
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Left sidebar - Game info */}
          <motion.div 
            className="lg:col-span-1 space-y-4"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <UICard className="bg-slate-800/90 border-slate-700 text-white backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg bg-gradient-to-r from-red-400 to-amber-300 bg-clip-text text-transparent">Joueurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {gameState?.players.map((player) => (
                    <motion.div 
                      key={player.id} 
                      className={`flex justify-between items-center p-2 rounded-md ${
                        player.isEliminated ? "bg-red-900/20 line-through" : 
                        player.id === currentPlayer?.id ? "bg-blue-900/30 border border-blue-500/50" : 
                        "bg-slate-700/30"
                      } ${
                        player.isProtected ? "ring-2 ring-yellow-500/50" : ""
                      } ${
                        targetPlayerId === player.id ? "ring-2 ring-green-500" : ""
                      }`}
                      onClick={() => {
                        if (!player.isEliminated && player.id !== "player1" && !player.isProtected) {
                          handleSelectTarget(player.id);
                        }
                      }}
                      whileHover={!player.isEliminated && player.id !== "player1" && !player.isProtected ? { scale: 1.02, x: 5 } : {}}
                      animate={player.id === currentPlayer?.id ? 
                        { boxShadow: ["0 0 0 rgba(59, 130, 246, 0.0)", "0 0 15px rgba(59, 130, 246, 0.5)", "0 0 0 rgba(59, 130, 246, 0.0)"] } : 
                        {}
                      }
                      transition={{ duration: 2, repeat: player.id === currentPlayer?.id ? Infinity : 0 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-inner">
                          {player.id === "player1" ? "👤" : "🤖"}
                        </div>
                        <span>{player.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.isProtected && (
                          <motion.span 
                            title="Protégé" 
                            className="text-yellow-400"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            🛡️
                          </motion.span>
                        )}
                        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 shadow-sm">{player.tokens} pts</Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </UICard>
            
            <UICard className="bg-slate-800/90 border-slate-700 text-white backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg bg-gradient-to-r from-red-400 to-amber-300 bg-clip-text text-transparent">Jetons nécessaires: {gameState?.players.length === 2 ? 7 : gameState?.players.length === 3 ? 5 : 4}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <motion.div 
                    className="flex justify-center my-4"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                  >
                    {gameState && (
                      <CardStack count={gameState.deck.length} />
                    )}
                  </motion.div>
                  <motion.div 
                    className="text-center text-sm bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent font-medium mt-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Manche {gameState?.roundNumber || 1}
                  </motion.div>
                </div>
              </CardContent>
            </UICard>
            
            <UICard className="bg-slate-800/90 border-slate-700 text-white backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg bg-gradient-to-r from-red-400 to-amber-300 bg-clip-text text-transparent">Journal de partie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] overflow-y-auto space-y-1 text-sm custom-scrollbar">
                  {gameLog.map((log, index) => (
                    <motion.p 
                      key={index} 
                      className="text-slate-300 border-l-2 border-slate-700 pl-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      {log}
                    </motion.p>
                  ))}
                </div>
              </CardContent>
            </UICard>
          </motion.div>
          
          {/* Main game area */}
          <motion.div 
            className="lg:col-span-3 flex flex-col"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Game status */}
            <UICard className="bg-slate-800/90 border-slate-700 text-white mb-4 backdrop-blur-sm shadow-xl">
              <CardContent className="p-4">
                {isGameOver ? (
                  <div className="text-center">
                    <motion.h2 
                      className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 8 }}
                    >
                      Partie terminée !
                    </motion.h2>
                    <motion.p 
                      className="text-xl"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {gameState?.winner?.name === playerName 
                        ? "🎉 Félicitations ! Vous avez gagné la partie ! 🎉" 
                        : `${gameState?.winner?.name} a remporté la partie.`}
                    </motion.p>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Button 
                        className="mt-4 bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 shadow-lg text-white border-none" 
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.location.href = "/";
                          }
                        }}
                      >
                        Nouvelle partie
                      </Button>
                    </motion.div>
                  </div>
                ) : isRoundEnd ? (
                  <div className="text-center">
                    <motion.h2 
                      className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Fin de la manche {gameState?.roundNumber}
                    </motion.h2>
                    <p className="mb-4">
                      {gameState?.roundWinner?.name === playerName 
                        ? "Vous avez remporté cette manche !" 
                        : `${gameState?.roundWinner?.name} a remporté cette manche.`}
                    </p>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 shadow-lg border-none" onClick={handleNewRound}>
                        Nouvelle manche
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <motion.h2 
                        className="text-lg font-medium"
                        animate={isPlayerTurn ? { color: ["#ffffff", "#ff9900", "#ffffff"] } : {}}
                        transition={{ duration: 2, repeat: isPlayerTurn ? Infinity : 0 }}
                      >
                        Tour de {currentPlayer?.name}
                      </motion.h2>
                      <p className="text-sm text-slate-400">
                        {isTurnPhaseDraw ? "Piochez une carte pour commencer" : isTurnPhasePlay ? "Jouez une carte de votre main" : ""}
                      </p>
                    </div>
                    {isPlayerTurn && isTurnPhaseDraw && (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Button 
                          className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 shadow-lg border-none" 
                          onClick={handleStartTurn}
                        >
                          Piocher une carte
                        </Button>
                      </motion.div>
                    )}
                    {isPlayerTurn && isTurnPhasePlay && selectedCardId && (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Button 
                          className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 shadow-lg border-none" 
                          onClick={handlePlayCard}
                          disabled={
                            // Disable if it's a Guard and we don't have both target and guessed rank
                            (gameState?.players[0].hand.find(c => c.id === selectedCardId)?.rank === 1 && 
                             (!targetPlayerId || guessedRank === undefined)) ||
                            // Or if it needs a target but doesn't have one
                            ([2, 3, 5, 6].includes(gameState?.players[0].hand.find(c => c.id === selectedCardId)?.rank || 0) && 
                             !targetPlayerId)
                          }
                        >
                          Jouer la carte
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </UICard>
            
            {/* Opponent area */}
            <div className="flex justify-center">
              {gameState?.players[1] && (
                <div className="text-center text-white mb-8">
                  <div className="mb-2">
                    <span className="font-medium">{gameState.players[1].name}</span>
                    {gameState.players[1].isProtected && <span className="ml-2">🛡️</span>}
                  </div>
                  {gameState.players[1].isEliminated ? (
                    <div className="text-red-400">Éliminé</div>
                  ) : (
                    <CardHand 
                      cards={Array(gameState.players[1].hand.length).fill({ id: 'hidden', name: '?', rank: 0, description: '?', effect: '?' })} 
                      isActive={false}
                    />
                  )}
                  {gameState.players[1].discardPile.length > 0 && (
                    <div className="mt-4 flex justify-center">
                      <DiscardPile cards={gameState.players[1].discardPile} />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Center area - additional UI for Guard card */}
            {isPlayerTurn && isTurnPhasePlay && selectedCardId && 
             gameState?.players[0].hand.find(c => c.id === selectedCardId)?.rank === 1 && (
              <UICard className="bg-slate-800/90 border-slate-700 text-white mb-4 mt-4 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg bg-gradient-to-r from-red-400 to-amber-300 bg-clip-text text-transparent">Carte Garde: Devinez une carte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5, 6, 7, 8].map(rank => (
                      <Button
                        key={rank}
                        variant={guessedRank === rank ? "default" : "outline"}
                        className={guessedRank === rank 
                          ? "bg-red-600 hover:bg-red-700 text-white" 
                          : "border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700 shadow-md"}
                        onClick={() => handleSelectRank(rank as CardRank)}
                      >
                        {rank}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </UICard>
            )}
            
            {/* Player hand */}
            <div className="mt-auto">
              <div className="flex justify-center">
                {gameState?.players[0] && (
                  <div className="text-center text-white mt-8">
                    {gameState.players[0].discardPile.length > 0 && (
                      <div className="mb-4 flex justify-center">
                        <DiscardPile cards={gameState.players[0].discardPile} />
                      </div>
                    )}
                    {gameState.players[0].isEliminated ? (
                      <div className="text-red-400 mb-2">Vous êtes éliminé</div>
                    ) : (
                      <CardHand 
                        cards={gameState.players[0].hand} 
                        selectedCardId={selectedCardId}
                        onSelectCard={isPlayerTurn && isTurnPhasePlay ? handleSelectCard : undefined}
                        isActive={isPlayerTurn && isTurnPhasePlay}
                      />
                    )}
                    <div className="mt-2">
                      <span className="font-medium">{gameState.players[0].name} (Vous)</span>
                      {gameState.players[0].isProtected && <span className="ml-2">🛡️</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
