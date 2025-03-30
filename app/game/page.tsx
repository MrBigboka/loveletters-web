"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card as GameCard, CardHand, CardStack, DiscardPile } from "@/app/components/ui/card";
import type { GameState, Card, CardRank } from "@/app/utils/gameEngine";
import { initializeGame, drawCard, playCard, startNewRound } from "@/app/utils/gameEngine";
import { initializeSocket, getSocket } from "@/app/utils/socket";

// Déclarations des fonctions de son (implémentées dans useEffect)
let playCardSound: () => void = () => {};
let drawCardSound: () => void = () => {};
let victorySound: () => void = () => {};

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
  const playerName = searchParams.get("name") || `Joueur ${Math.floor(Math.random() * 1000)}`;
  const isHost = searchParams.get("host") === "true";
  const myPlayerId = searchParams.get("playerId") || "player1"; // Fallback à player1 pour la compatibilité
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [guessedRank, setGuessedRank] = useState<CardRank | null>(null);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'waiting' | 'draw' | 'play' | 'roundEnd'>('waiting');
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [showCardHelp, setShowCardHelp] = useState(true);

  // Initialisation des sons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialiser les sons ici
      playCardSound = () => {
        const audio = new Audio('/sounds/card-play.mp3');
        audio.volume = 0.5;
        audio.play().catch((e: unknown) => console.log('Error playing sound:', e));
      };
      
      drawCardSound = () => {
        const audio = new Audio('/sounds/card-draw.mp3');
        audio.volume = 0.3;
        audio.play().catch((e: unknown) => console.log('Error playing sound:', e));
      };
      
      victorySound = () => {
        const audio = new Audio('/sounds/victory.mp3');
        audio.volume = 0.7;
        audio.play().catch((e: unknown) => console.log('Error playing sound:', e));
      };
    }
  }, []);

  // Initialisation de Socket.IO
  useEffect(() => {
    // Initialiser la connexion Socket.IO
    const socket = initializeSocket();
    
    // Écouter les événements du serveur
    socket.on('playerJoined', (data) => {
      console.log('Nouveau joueur:', data.players);
      setInfoMessage(`${data.players[data.players.length - 1].name} a rejoint la partie`);
    });
    
    socket.on('gameStarted', ({ gameId }) => {
      console.log('Partie démarrée:', gameId);
      setIsGameStarted(true);
      setCurrentPhase('draw');
      setInfoMessage("La partie commence !");
    });
    
    socket.on('cardPlayed', (data) => {
      console.log('Carte jouée:', data);
      setInfoMessage(`${data.playerId} a joué une carte`);
      playCardSound();
    });
    
    socket.on('error', ({ message }) => {
      setErrorMessage(message);
    });
    
    return () => {
      // Nettoyage des écouteurs d'événements
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('cardPlayed');
      socket.off('error');
    };
  }, []);

  // Simulate player join
  useEffect(() => {
    if (isHost) {
      setTimeout(() => {
        // Initialiser le jeu avec 2 joueurs
        const initialGameState = initializeGame(
          ["player1", "player2"], 
          [playerName, "Adversaire"]
        );
        
        // Distribuer les cartes
        const player1 = initialGameState.players[0];
        const player2 = initialGameState.players[1];
        
        if (initialGameState.deck.length > 0) {
          player1.hand.push(initialGameState.deck.pop()!);
        }
        
        if (initialGameState.deck.length > 0) {
          player2.hand.push(initialGameState.deck.pop()!);
        }
        
        setGameState(initialGameState);
      }, 1000);
    }
  }, [isHost, playerName]);

  // Fonction pour démarrer la partie
  const handleStartGame = () => {
    if (!isHost) return;
    
    const socket = getSocket();
    if (socket) {
      socket.emit('startGame', { gameId: lobbyCode });
    }
  };

  // Fonction pour jouer une carte
  const handlePlayCard = () => {
    console.log(`Tentative de jouer la carte ${selectedCardId}`);
    
    if (!gameState || !selectedCardId) {
      setErrorMessage("Veuillez d'abord sélectionner une carte");
      return;
    }
    
    // Trouver la carte sélectionnée
    const playerIndex = gameState.currentPlayerIndex;
    const player = gameState.players[playerIndex];
    const cardIndex = player.hand.findIndex(card => card.id === selectedCardId);
    
    if (cardIndex === -1) {
      setErrorMessage("Carte non trouvée");
      return;
    }
    
    const card = player.hand[cardIndex];
    
    // Vérifier si la carte nécessite une cible
    const needsTarget = [1, 2, 3, 5, 6].includes(card.rank);
    
    if (needsTarget && !selectedTargetId) {
      setErrorMessage("Veuillez sélectionner une cible");
      return;
    }
    
    // Pour la carte Garde (1), vérifier si un rang a été deviné
    if (card.rank === 1 && !guessedRank) {
      setErrorMessage("Veuillez deviner un rang");
      return;
    }
    
    // Envoyer l'action au serveur Socket.IO
    const socket = getSocket();
    if (socket) {
      socket.emit('playCard', {
        gameId: lobbyCode,
        cardIndex,
        targetPlayerId: selectedTargetId
      });
    }
    
    // Jouer la carte localement
    try {
      const targetPlayerIndex = selectedTargetId 
        ? gameState.players.findIndex(p => p.id === selectedTargetId)
        : undefined;
      
      const targetPlayerId = selectedTargetId || undefined;
      const additionalInfo = guessedRank ? { guessedRank } : undefined;
      
      const newGameState = playCard(
        gameState,
        myPlayerId,
        selectedCardId,
        targetPlayerId,
        additionalInfo
      );
      
      // Mettre à jour l'état du jeu
      setGameState(newGameState);
      
      // Réinitialiser la sélection
      setSelectedCardId(null);
      setSelectedTargetId(null);
      setGuessedRank(null);
      
      // Jouer le son de carte
      playCardSound();
      
      // Passer au joueur suivant
      setCurrentPhase('draw');
      
      // Ajouter au log
      const targetName = targetPlayerIndex !== undefined 
        ? gameState.players[targetPlayerIndex].name
        : 'personne';
      
      setGameLog([
        ...gameLog,
        `${player.name} a joué ${card.name} contre ${targetName}.`
      ]);
      
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  // Current player logic
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isPlayerTurn = currentPlayer?.id === myPlayerId;

  if (isGameStarted) {
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
          {/* Ajouter l'animation de carte jouée */}
        </AnimatePresence>

        {isPlayerTurn && currentPhase === 'play' && (
          <motion.div 
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/90 border border-red-500 px-4 py-2 rounded-lg shadow-lg z-30"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-white text-sm">Cliquez sur une carte pour la sélectionner, puis sur &quot;Jouer la carte&quot;</p>
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
                          selectedTargetId === player.id ? "ring-2 ring-green-500" : ""
                        }`}
                        onClick={() => {
                          if (!player.isEliminated && player.id !== myPlayerId && !player.isProtected) {
                            setSelectedTargetId(player.id);
                          }
                        }}
                        whileHover={!player.isEliminated && player.id !== myPlayerId && !player.isProtected ? { scale: 1.02, x: 5 } : {}}
                        animate={player.id === currentPlayer?.id ? 
                          { boxShadow: ["0 0 0 rgba(59, 130, 246, 0.0)", "0 0 15px rgba(59, 130, 246, 0.5)", "0 0 0 rgba(59, 130, 246, 0.0)"] } : 
                          {}
                        }
                        transition={{ duration: 2, repeat: player.id === currentPlayer?.id ? Infinity : 0 }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-inner">
                            {player.id === myPlayerId ? "👤" : "🤖"}
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
                  {gameState?.isGameOver ? (
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
                  ) : currentPhase === 'roundEnd' ? (
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
                        <Button className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 shadow-lg border-none" onClick={() => {
                          const newGameState = startNewRound(gameState!);
                          setGameState(newGameState);
                          setGameLog(newGameState.gameLog);
                        }}>
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
                          {currentPhase === 'draw' ? "Piochez une carte pour commencer" : currentPhase === 'play' ? "Jouez une carte de votre main" : ""}
                        </p>
                      </div>
                      {isPlayerTurn && currentPhase === 'draw' && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Button 
                            className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 shadow-lg border-none" 
                            onClick={() => {
                              const newGameState = drawCard(gameState!, currentPlayer!.id);
                              setGameState(newGameState);
                              setGameLog(newGameState.gameLog);
                              setCurrentPhase('play');
                            }}
                          >
                            Piocher une carte
                          </Button>
                        </motion.div>
                      )}
                      {isPlayerTurn && currentPhase === 'play' && selectedCardId && (
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
                               (!selectedTargetId || guessedRank === null)) ||
                              // Or if it needs a target but doesn't have one
                              ([2, 3, 5, 6].includes(gameState?.players[0].hand.find(c => c.id === selectedCardId)?.rank || 0) && 
                               !selectedTargetId)
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
              {isPlayerTurn && currentPhase === 'play' && selectedCardId && 
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
                          onClick={() => setGuessedRank(rank as CardRank)}
                        >
                          {rank.toString()}
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
                          selectedCardId={selectedCardId || undefined}
                          onSelectCard={isPlayerTurn && currentPhase === 'play' ? (cardId: string) => setSelectedCardId(cardId) : undefined}
                          isActive={isPlayerTurn && currentPhase === 'play'}
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
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4 overflow-hidden">
        <motion.div 
          className="max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <UICard className="bg-slate-800 border-slate-700 text-white shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl bg-gradient-to-r from-red-400 to-amber-300 bg-clip-text text-transparent">
                En attente de joueurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <motion.div 
                  className="w-24 h-24 mx-auto mb-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-full h-full rounded-full border-4 border-t-red-500 border-r-amber-500 border-b-red-400 border-l-amber-400 border-t-transparent animate-spin"></div>
                </motion.div>
                <p className="text-slate-300">
                  {isHost 
                    ? "Vous êtes l'hôte de cette partie. Attendez que d'autres joueurs vous rejoignent ou démarrez la partie maintenant."
                    : "En attente du démarrage de la partie par l'hôte..."}
                </p>
              </div>
              
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Code de partie:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{lobbyCode}</span>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button size="sm" onClick={() => {
                        if (lobbyCode) {
                          navigator.clipboard.writeText(lobbyCode);
                        }
                      }} className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                        Copier
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              {isHost && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    className="w-full bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 shadow-lg"
                    onClick={handleStartGame}
                  >
                    Démarrer la partie
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </UICard>
        </motion.div>
      </div>
    );
  }
}
