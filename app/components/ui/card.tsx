import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Card as CardType } from '@/app/utils/gameEngine';

interface CardProps {
  card?: CardType;
  isHidden?: boolean;
  isSelected?: boolean;
  isPlayable?: boolean;
  isDiscard?: boolean;
  onClick?: () => void;
}

const getRankColor = (rank?: number) => {
  const colors = {
    1: 'from-rose-600 to-red-800',
    2: 'from-blue-500 to-indigo-800',
    3: 'from-amber-500 to-yellow-700',
    4: 'from-slate-400 to-slate-700',
    5: 'from-emerald-500 to-green-800',
    6: 'from-purple-500 to-violet-800',
    7: 'from-pink-500 to-pink-800',
    8: 'from-yellow-400 to-amber-700',
  };
  return rank ? colors[rank as keyof typeof colors] : 'from-slate-300 to-slate-500';
};

const getRankSymbol = (rank?: number) => {
  const symbols = {
    1: '👮‍♂️', // Garde - policier/garde
    2: '🧙‍♂️', // Prêtre - magicien/sage qui voit
    3: '⚔️',   // Baron - épées croisées pour duel
    4: '🛡️',   // Servante - bouclier pour protection
    5: '🤴',   // Prince - prince
    6: '👑',   // Roi - couronne
    7: '👵',   // Comtesse - femme âgée/noble
    8: '👸',   // Princesse - princesse
  };
  return rank ? symbols[rank as keyof typeof symbols] : '❓';
};

const getCardDescription = (rank?: number) => {
  if (!rank) return "";
  
  const descriptions = {
    1: "Devinez la main d'un adversaire",
    2: "Regardez la main d'un adversaire",
    3: "Comparez votre main avec un adversaire",
    4: "Protection jusqu'à votre prochain tour",
    5: "Forcez un joueur à défausser sa main",
    6: "Échangez votre main avec un autre joueur",
    7: "Doit être défaussée si vous avez Roi ou Prince",
    8: "Vous perdez si vous la défaussez",
  };
  
  return descriptions[rank as keyof typeof descriptions];
};

export function Card({ card, isHidden = false, isSelected = false, isPlayable = false, isDiscard = false, onClick }: CardProps) {
  const cardVariants = {
    initial: { rotateY: 180, scale: 1, y: 0 },
    flipped: { rotateY: 0, scale: 1, y: 0 },
    selected: { rotateY: 0, y: -30, scale: 1.1 },
    hover: { y: -15, scale: 1.05, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      className={cn(
        'relative h-48 w-32 perspective-1000 cursor-pointer',
        isPlayable ? 'cursor-pointer' : 'cursor-default',
        isDiscard ? 'opacity-80' : 'opacity-100'
      )}
      variants={cardVariants}
      initial="initial"
      animate={isHidden ? 'initial' : isSelected ? 'selected' : 'flipped'}
      whileHover={isPlayable ? 'hover' : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={isPlayable ? onClick : undefined}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Dos de la carte avec motif royal */}
      <motion.div 
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-rose-800 to-red-950 rounded-xl p-1",
          "flex items-center justify-center shadow-xl"
        )}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: isHidden ? 0 : 180 }}
        transition={{ duration: 0.6 }}
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ 
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "24px 24px"
          }}/>
        </div>
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-4xl">💌</span>
        </div>
        <div className="absolute bottom-3 text-white/80 text-xs font-medium">Love Letter</div>
      </motion.div>

      {/* Face de la carte */}
      <motion.div 
        className={cn(
          'absolute inset-0 overflow-hidden rounded-xl border-4 bg-white shadow-xl',
          isSelected ? 'border-red-600' : 'border-slate-300',
        )}
        style={{ backfaceVisibility: 'hidden' }}
      >
        {card ? (
          <>
            {/* En-tête de la carte avec effet de lumière */}
            <div className={cn(
              'relative h-12 bg-gradient-to-r flex items-center justify-between px-3 border-b-2 border-slate-200',
              getRankColor(card.rank)
            )}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-bold text-lg shadow-inner">
                {card.rank}
              </div>
              <div className="font-medium text-white text-shadow drop-shadow-md">{card.name}</div>
            </div>
            
            {/* Corps de la carte avec mise en page améliorée */}
            <div className="flex flex-1 flex-col p-2">
              <div className="text-xs text-slate-600 mb-1 font-medium">{getCardDescription(card.rank)}</div>
              <div className="text-xs italic text-slate-500 mb-3">{card.effect}</div>
              
              {/* Illustration/symbole de la carte avec animation */}
              <motion.div 
                className="flex-1 flex items-center justify-center"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1, rotate: [0, 2, 0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              >
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-slate-50 to-slate-200 shadow-inner">
                  <span className="text-5xl">{getRankSymbol(card.rank)}</span>
                  
                  {/* Effet de lumière subtil en fonction du rang de la carte */}
                  <motion.div 
                    className={cn(
                      "absolute inset-0 rounded-full opacity-50 blur-md",
                      `bg-gradient-to-r ${getRankColor(card.rank)}`
                    )}
                    animate={{ opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>
              
              {/* Pied de page de la carte avec rang */}
              <div className="mt-2 text-center">
                <span className="text-xs font-semibold text-slate-600">Valeur: {card.rank}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300">
            Carte vide
          </div>
        )}
      </motion.div>

      {/* Effet de lumière lorsque la carte est sélectionnée */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 -z-10 rounded-xl bg-red-500 blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
}

interface CardHandProps {
  cards: CardType[];
  onSelectCard?: (cardId: string) => void;
  selectedCardId?: string;
  isActive?: boolean;
}

export function CardHand({ 
  cards, 
  onSelectCard, 
  selectedCardId, 
  isActive = false 
}: CardHandProps) {
  return (
    <motion.div 
      className="flex justify-center" 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {cards.map((card, index) => {
        const isSelected = card.id === selectedCardId;
        // Enregistrer dans la console lorsqu'une carte est cliquée
        const handleCardClick = () => {
          console.log("Card clicked:", card);
          if (onSelectCard) {
            onSelectCard(card.id);
          }
        };
        
        return (
          <motion.div
            key={card.id}
            className="mx-1"
            animate={{ 
              x: index * 60 - (cards.length - 1) * 30,
              rotate: index * 5 - (cards.length - 1) * 2.5,
              y: isSelected ? -20 : 0,
              zIndex: isSelected ? 10 : index
            }}
            whileHover={{ y: -10, zIndex: 20 }}
            style={{ originX: 0.5, originY: 1 }}
          >
            <Card 
              card={card} 
              isSelected={isSelected} 
              isPlayable={isActive}
              onClick={handleCardClick}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function CardStack({ count = 0, className }: { count: number; className?: string }) {
  return (
    <div className={cn("relative h-48 w-32", className)}>
      {Array.from({ length: Math.min(count, 5) }).map((_, index) => (
        <motion.div
          key={index}
          className="absolute w-full h-full"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: index * 2, opacity: 1 }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
        >
          <div
            className="absolute w-32 h-48 rounded-xl border-4 border-slate-600 bg-gradient-to-br from-indigo-900 to-slate-900 shadow-lg"
            style={{
              transform: `rotate(${(index - 2) * 3}deg)`,
            }}
          >
            <div className="absolute inset-4 flex items-center justify-center rounded-lg border-2 border-slate-600/50 bg-opacity-20 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
              <div className="text-xl font-bold text-red-500 drop-shadow-glow">Love Letter</div>
            </div>
          </div>
        </motion.div>
      ))}
      
      <motion.div 
        className="absolute left-0 top-0 -mt-6 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
      >
        {count} cartes
      </motion.div>
    </div>
  );
}

export function DiscardPile({ cards, className }: { cards: CardType[]; className?: string }) {
  return (
    <div className={cn("relative h-48 w-32", className)}>
      {cards.length > 0 ? (
        <>
          {cards.slice(-3).map((card, index) => (
            <motion.div 
              key={card.id} 
              className="absolute"
              initial={{ y: -30, opacity: 0, rotateZ: 0 }}
              animate={{ 
                y: 0, 
                opacity: 1, 
                rotateZ: (index - 1) * 5,
                zIndex: index 
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{ zIndex: index }}
            >
              <Card 
                card={card} 
                isDiscard={true} 
                isPlayable={false}
              />
            </motion.div>
          ))}
          <motion.div 
            className="absolute left-0 top-0 -mt-6 rounded-full bg-slate-700 px-2 py-1 text-xs font-bold text-white shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {cards.length} défausse{cards.length > 1 ? 's' : ''}
          </motion.div>
        </>
      ) : (
        <div className="w-32 h-48 rounded-xl border-4 border-dashed border-slate-500/30 flex items-center justify-center text-slate-400">
          <motion.div 
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            Défausse vide
          </motion.div>
        </div>
      )}
    </div>
  );
}
