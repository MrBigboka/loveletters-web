import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="grid min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <main className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative h-40 w-40">
            <div className="absolute inset-0 animate-pulse rounded-full bg-red-500 blur-xl opacity-20"></div>
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-lg">
              <h1 className="font-serif text-4xl font-bold">💌</h1>
            </div>
          </div>
          <h1 className="text-center text-4xl font-bold tracking-tight sm:text-6xl">
            Love Letter
          </h1>
          <p className="max-w-md text-center text-lg text-slate-300">
            Une adaptation en ligne du célèbre jeu de cartes. Stratégie, bluff et déduction dans la cour royale.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <Link href="/lobby/create">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">
              Créer une partie
            </Button>
          </Link>
          <Link href="/lobby/join">
            <Button size="lg" variant="outline" className="border-red-800 bg-slate-800 text-white hover:bg-slate-700 hover:border-red-700 w-full sm:w-auto">
              Rejoindre une partie
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Bluff & Deduction",
              description: "Devinez les cartes adverses et protégez votre main",
              icon: "🎭",
            },
            {
              title: "2-4 Joueurs",
              description: "Jouez en ligne avec vos amis ou votre famille",
              icon: "👥",
            },
            {
              title: "Parties Rapides",
              description: "Une manche se joue en 5 minutes environ",
              icon: "⏱️",
            },
            {
              title: "Fidèle à l'Original",
              description: "Toutes les règles du jeu de cartes physique",
              icon: "📝",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center"
            >
              <div className="mb-2 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-medium">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <footer className="mt-12 text-center text-sm text-slate-500">
          <p>
            Créé par Miguel Boka — SmartScaling.dev
          </p>
          <p className="mt-2">
            <a
              href="https://github.com/ton-utilisateur/loveletter-web"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-400"
            >
              GitHub
            </a>{" "}
            •{" "}
            <a
              href="#rules"
              className="underline hover:text-slate-400"
            >
              Règles du jeu
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
