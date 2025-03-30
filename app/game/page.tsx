"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card as GameCard, CardHand, CardStack, DiscardPile } from "@/app/components/ui/card";
import type { GameState, Card, Player } from "@/app/utils/gameEngine";
import { initializeGame, drawCard, playCard, startNewRound } from "@/app/utils/gameEngine";

// Dans une application réelle, nous utiliserions Socket.IO ici
// Pour l'instant, nous allons simuler une partie locale

export default function GamePage() {
  const searchParams = useSearchParams();
  const lobbyCode = searchParams.get("lobby") || "";
  const playerName = searchParams.get("name") || "Joueur";
  const isHost = searchParams.get("host") === "true";

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([
    { id: "player1", name: playerName, hand: [], discardPile: [], isProtected: false, isEliminated: false, tokens: 0 },
    { id: "player2", name: "Adversaire", hand: [], discardPile: [], isProtected: false, isEliminated: false, tokens: 0 }
  ]);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [targetPlayerId, setTargetPlayerId] = useState<string | undefined>();
  const [guessedRank, setGuessedRank] = useState<number | undefined>();
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [waitingPlayers, setWaitingPlayers] = useState(isHost);
  const [copySuccess, setCopySuccess] = useState(false);
  const [gameLog, setGameLog] = useState<string[]>([]);

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
    setSelectedCardId(cardId === selectedCardId ? undefined : cardId);
    // Reset target and guessed rank when changing card selection
    setTargetPlayerId(undefined);
    setGuessedRank(undefined);
  };

  // Handle player target selection
  const handleSelectTarget = (playerId: string) => {
    setTargetPlayerId(playerId === targetPlayerId ? undefined : playerId);
  };

  // Handle rank guess selection (for Guard card)
  const handleSelectRank = (rank: number) => {
    setGuessedRank(rank === guessedRank ? undefined : rank);
  };

  // Handle playing a card
  const handlePlayCard = () => {
    if (!gameState || !selectedCardId) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Find the selected card
    const selectedCard = currentPlayer.hand.find(card => card.id === selectedCardId);
    if (!selectedCard) return;

    // Check if the card requires a target
    const needsTarget = [1, 2, 3, 5, 6].includes(selectedCard.rank);
    const isGuard = selectedCard.rank === 1;

    // Guard card requires both a target and a guessed rank
    if (isGuard && (!targetPlayerId || guessedRank === undefined)) {
      // Show error or prompt
      return;
    }
    // Other targeting cards require a target
    else if (needsTarget && !targetPlayerId && !isGuard) {
      // Show error or prompt
      return;
    }

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

    // For demo purposes, if it's AI's turn, let them play after a delay
    if (newGameState.currentPlayerIndex === 1 && !newGameState.isGameOver) {
      setTimeout(() => {
        const aiPlayer = newGameState.players[newGameState.currentPlayerIndex];
        
        // AI draws a card
        const afterDrawState = drawCard(newGameState, aiPlayer.id);
        
        // AI always plays their first card (dumb AI)
        const cardToPlay = afterDrawState.players[afterDrawState.currentPlayerIndex].hand[0];
        
        // AI randomly targets the human player for cards that need targets
        const needsTarget = [1, 2, 3, 5, 6].includes(cardToPlay.rank);
        
        // Play the card
        const afterPlayState = playCard(
          afterDrawState, 
          aiPlayer.id, 
          cardToPlay.id,
          needsTarget ? "player1" : undefined, 
          cardToPlay.rank === 1 ? { guessedRank: Math.floor(Math.random() * 7) + 2 } : undefined
        );
        
        setGameState(afterPlayState);
        setGameLog(afterPlayState.gameLog);
      }, 1500);
    }
  };

  // Handle starting the player's turn (drawing a card)
  const handleStartTurn = () => {
    if (!gameState) return;
    
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

  if (waitingPlayers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
        <UICard className="w-full max-w-md bg-slate-800 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">En attente de joueurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-slate-300">Partagez ce code avec vos amis pour qu'ils puissent rejoindre la partie :</p>
              <div className="flex items-center gap-2">
                <Badge className="text-xl py-3 px-4 bg-slate-700">{lobbyCode}</Badge>
                <Button size="sm" onClick={copyLobbyCode} className="bg-red-600 hover:bg-red-700 text-white">
                  {copySuccess ? "Copié !" : "Copier"}
                </Button>
              </div>
              <Alert className="bg-slate-700 border-slate-600">
                <AlertDescription>
                  {isHost ? "Vous êtes l'hôte de cette partie. Le jeu démarrera automatiquement lorsque tous les joueurs seront prêts." : "En attente du démarrage de la partie par l'hôte..."}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </UICard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>Règles du jeu</DialogTitle>
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
              <li><strong>1 - Garde (5):</strong> Devinez la carte d'un adversaire (sauf Garde). S'il la possède, il est éliminé.</li>
              <li><strong>2 - Prêtre (2):</strong> Regardez la main d'un adversaire.</li>
              <li><strong>3 - Baron (2):</strong> Comparez votre main avec celle d'un adversaire. Le joueur avec la carte la plus faible est éliminé.</li>
              <li><strong>4 - Servante (2):</strong> Vous êtes protégé jusqu'à votre prochain tour.</li>
              <li><strong>5 - Prince (2):</strong> Forcez un joueur (vous inclus) à défausser sa main et à piocher une nouvelle carte.</li>
              <li><strong>6 - Roi (1):</strong> Échangez votre main avec celle d'un autre joueur.</li>
              <li><strong>7 - Comtesse (1):</strong> Si vous avez le Roi ou le Prince en main, vous devez jouer la Comtesse.</li>
              <li><strong>8 - Princesse (1):</strong> Si vous défaussez cette carte, vous êtes éliminé.</li>
            </ul>
            
            <h3 className="font-bold">Fin de manche</h3>
            <p className="mb-4 text-sm">La manche se termine quand il ne reste qu'un joueur ou que le deck est vide. Le joueur avec la carte de plus haute valeur gagne alors un jeton.</p>
            
            <h3 className="font-bold">Victoire</h3>
            <p className="text-sm">Le premier joueur à obtenir 7 jetons (à 2 joueurs), 5 jetons (à 3 joueurs) ou 4 jetons (à 4 joueurs) remporte la partie.</p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowRulesDialog(false)} className="bg-red-600 hover:bg-red-700 text-white">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto max-w-6xl">
        <header className="flex justify-between items-center mb-4 text-white">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700">
                Quitter
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Love Letter <span className="text-slate-400">· Code: {lobbyCode}</span></h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700" onClick={() => setShowRulesDialog(true)}>
              Règles
            </Button>
          </div>
        </header>
        
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Left sidebar - Game info */}
          <div className="lg:col-span-1 space-y-4">
            <UICard className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Joueurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {gameState?.players.map((player) => (
                    <div 
                      key={player.id} 
                      className={`flex justify-between items-center p-2 rounded-md ${
                        player.isEliminated ? "bg-red-900/20 line-through" : 
                        player.id === currentPlayer?.id ? "bg-blue-900/30" : 
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
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          {player.id === "player1" ? "👤" : "🤖"}
                        </div>
                        <span>{player.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.isProtected && <span title="Protégé">🛡️</span>}
                        <Badge className="bg-amber-600">{player.tokens} pts</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </UICard>
            
            <UICard className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Jetons nécessaires: {gameState?.players.length === 2 ? 7 : gameState?.players.length === 3 ? 5 : 4}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center my-2">
                  {gameState && (
                    <CardStack count={gameState.deck.length} className="transform scale-75" />
                  )}
                </div>
                <div className="text-center text-sm text-slate-400 mt-4">
                  Manche {gameState?.roundNumber || 1}
                </div>
              </CardContent>
            </UICard>
            
            <UICard className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Journal de partie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] overflow-y-auto space-y-1 text-sm">
                  {gameLog.map((log, index) => (
                    <p key={index} className="text-slate-300 border-l-2 border-slate-700 pl-2">
                      {log}
                    </p>
                  ))}
                </div>
              </CardContent>
            </UICard>
          </div>
          
          {/* Main game area */}
          <div className="lg:col-span-3 flex flex-col">
            {/* Game status */}
            <UICard className="bg-slate-800 border-slate-700 text-white mb-4">
              <CardContent className="p-4">
                {isGameOver ? (
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Partie terminée !</h2>
                    <p className="text-xl">
                      {gameState.winner?.name === playerName 
                        ? "🎉 Félicitations ! Vous avez gagné la partie ! 🎉" 
                        : `${gameState.winner?.name} a remporté la partie.`}
                    </p>
                    <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white" onClick={() => window.location.href = "/"}>
                      Nouvelle partie
                    </Button>
                  </div>
                ) : isRoundEnd ? (
                  <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">Fin de la manche {gameState?.roundNumber}</h2>
                    <p className="mb-4">
                      {gameState?.roundWinner?.name === playerName 
                        ? "Vous avez remporté cette manche !" 
                        : `${gameState?.roundWinner?.name} a remporté cette manche.`}
                    </p>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleNewRound}>
                      Nouvelle manche
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium">Tour de {currentPlayer?.name}</h2>
                      <p className="text-slate-400 text-sm">
                        {isPlayerTurn 
                          ? isTurnPhaseDraw 
                            ? "Piochez une carte pour commencer votre tour"
                            : "Jouez une carte de votre main"
                          : "En attente du tour de l'adversaire..."}
                      </p>
                    </div>
                    {isPlayerTurn && isTurnPhaseDraw && (
                      <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleStartTurn}>
                        Piocher une carte
                      </Button>
                    )}
                    {isPlayerTurn && isTurnPhasePlay && selectedCardId && (
                      <Button 
                        className="bg-red-600 hover:bg-red-700 text-white" 
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
              <UICard className="bg-slate-800 border-slate-700 text-white mb-4 mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Carte Garde: Devinez une carte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5, 6, 7, 8].map(rank => (
                      <Button
                        key={rank}
                        variant={guessedRank === rank ? "default" : "outline"}
                        className={guessedRank === rank 
                          ? "bg-red-600 hover:bg-red-700 text-white" 
                          : "border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700"}
                        onClick={() => handleSelectRank(rank)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
