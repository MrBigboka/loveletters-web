"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { initializeSocket, getSocket } from "@/app/utils/socket";

export default function JoinLobbyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  
  // Initialiser Socket.IO
  useEffect(() => {
    const socket = initializeSocket();
    
    // Écouter l'événement de partie rejointe
    socket.on('gameJoined', ({ gameId, playerId }) => {
      console.log('Partie rejointe:', gameId, 'Joueur:', playerId);
      
      // Rediriger vers la page de jeu
      router.push(`/game?lobby=${gameId}&name=${encodeURIComponent(playerName)}&host=false&playerId=${playerId}`);
    });
    
    // Écouter les erreurs
    socket.on('error', ({ message }) => {
      setError(message);
      setIsJoining(false);
    });
    
    return () => {
      // Nettoyer les écouteurs d'événements
      socket.off('gameJoined');
      socket.off('error');
    };
  }, [playerName, router]);
  
  // Fonction pour rejoindre une partie
  const handleJoinLobby = () => {
    if (!playerName.trim()) {
      setError("Veuillez entrer votre nom");
      return;
    }
    
    if (!lobbyCode.trim()) {
      setError("Veuillez entrer un code de partie");
      return;
    }
    
    setError("");
    setIsJoining(true);
    
    // Envoyer la demande pour rejoindre la partie au serveur
    const socket = getSocket();
    if (socket) {
      socket.emit('joinGame', { 
        gameId: lobbyCode.toUpperCase(), 
        playerName 
      });
    } else {
      setError("Impossible de se connecter au serveur");
      setIsJoining(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <motion.div 
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-slate-800 border-slate-700 text-white shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-to-r from-red-400 to-amber-300 bg-clip-text text-transparent">
              Rejoindre une partie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-900/20 text-red-400 border-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-medium text-slate-300">
                Votre nom
              </label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Entrez votre nom"
                disabled={isJoining}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="lobbyCode" className="text-sm font-medium text-slate-300">
                Code de partie
              </label>
              <Input
                id="lobbyCode"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Exemple: ABC123"
                maxLength={6}
                disabled={isJoining}
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleJoinLobby} 
                  className="w-full bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white shadow-lg"
                  disabled={isJoining}
                >
                  {isJoining ? "Connexion en cours..." : "Rejoindre la partie"}
                </Button>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/lobby/create">
                  <Button 
                    variant="outline" 
                    className="w-full mt-2 border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
                    disabled={isJoining}
                  >
                    Créer une partie
                  </Button>
                </Link>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/">
                  <Button 
                    variant="ghost" 
                    className="w-full mt-2 text-slate-400 hover:text-white hover:bg-slate-700"
                    disabled={isJoining}
                  >
                    Retour
                  </Button>
                </Link>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
