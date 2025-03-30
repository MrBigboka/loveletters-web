"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinLobby() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoinGame = () => {
    if (!playerName.trim() || !lobbyCode.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    
    setIsJoining(true);
    setError("");
    
    // Dans une implémentation réelle, nous vérifierions si le lobby existe
    // Pour l'instant, nous allons simplement rediriger vers la page du jeu
    
    // Simuler un délai réseau
    setTimeout(() => {
      router.push(`/game?lobby=${lobbyCode.toUpperCase()}&name=${encodeURIComponent(playerName)}`);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Rejoindre une partie</CardTitle>
          <CardDescription className="text-slate-400">
            Entrez le code de la partie que vous souhaitez rejoindre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Votre nom</Label>
              <Input
                id="name"
                placeholder="Entrez votre nom"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className="text-white">Code de la partie</Label>
              <Input
                id="code"
                placeholder="Ex: ABC123"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                className="bg-slate-700 border-slate-600 text-white"
                maxLength={6}
              />
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/">
            <Button variant="outline" className="border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700">
              Retour
            </Button>
          </Link>
          <Button 
            onClick={handleJoinGame} 
            disabled={!playerName.trim() || !lobbyCode.trim() || isJoining}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isJoining ? "Connexion..." : "Rejoindre"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
