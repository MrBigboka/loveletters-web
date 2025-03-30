"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateLobby() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = () => {
    if (!playerName.trim()) return;
    
    setIsCreating(true);
    
    // Générer un code de lobby unique avec nanoid (facile à partager)
    const lobbyCode = nanoid(6).toUpperCase();
    
    // Dans une implémentation réelle, nous enverrions ce code au serveur Socket.IO
    // Pour l'instant, nous allons simplement rediriger vers la page du jeu
    
    // Simuler un délai réseau
    setTimeout(() => {
      router.push(`/game?lobby=${lobbyCode}&name=${encodeURIComponent(playerName)}&host=true`);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Créer une nouvelle partie</CardTitle>
          <CardDescription className="text-slate-400">
            Créez une partie et invitez vos amis à vous rejoindre
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
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/">
            <Button variant="outline" className="border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700">
              Retour
            </Button>
          </Link>
          <Button 
            onClick={handleCreateGame} 
            disabled={!playerName.trim() || isCreating}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isCreating ? "Création..." : "Créer la partie"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
