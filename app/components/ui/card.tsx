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
    1: 'from-red-500 to-red-700',
    2: 'from-blue-500 to-blue-700',
    3: 'from-yellow-500 to-yellow-700',
    4: 'from-gray-400 to-gray-600',
    5: 'from-green-500 to-green-700',
    6: 'from-purple-500 to-purple-700',
    7: 'from-pink-400 to-pink-600',
    8: 'from-amber-400 to-amber-600',
  };
  return rank ? colors[rank as keyof typeof colors] : 'from-slate-300 to-slate-500';
};

export function Card({ card, isHidden = false, isSelected = false, isPlayable = false, isDiscard = false, onClick }: CardProps) {
  const cardVariants = {
    initial: { rotateY: 180, scale: 1 },
    flipped: { rotateY: 0, scale: isSelected ? 1.05 : 1 },
    selected: { y: -20, scale: 1.05 },
    unselected: { y: 0, scale: 1 },
  };

  return (
    <motion.div
      className={cn(
        'relative w-32 h-48 flex flex-col rounded-lg cursor-pointer perspective-1000',
        isPlayable ? 'cursor-pointer' : 'cursor-default',
        isDiscard ? 'opacity-70' : 'opacity-100'
      )}
      variants={cardVariants}
      initial="initial"
      animate={isHidden ? 'initial' : isSelected ? 'selected' : 'flipped'}
      whileHover={isPlayable ? { scale: 1.05 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={isPlayable ? onClick : undefined}
    >
      {/* Card Back */}
      <div 
        className={cn(
          'absolute inset-0 backface-hidden rounded-lg border-2 bg-gradient-to-br from-slate-700 to-slate-900 border-slate-500 shadow-lg',
          isHidden ? 'z-10' : 'z-0'
        )}
      >
        <div className="absolute inset-4 border-2 border-slate-600 rounded flex items-center justify-center">
          <div className="text-2xl font-bold text-slate-300">Love Letter</div>
        </div>
      </div>

      {/* Card Front */}
      <div 
        className={cn(
          'absolute inset-0 backface-hidden rounded-lg border-2 bg-white shadow-lg overflow-hidden',
          isHidden ? 'z-0' : 'z-10',
          isSelected ? 'border-blue-500' : 'border-slate-200',
        )}
      >
        {card ? (
          <>
            {/* Card Header */}
            <div className={cn(
              'h-10 bg-gradient-to-r border-b border-slate-200 flex items-center justify-between px-3',
              getRankColor(card.rank)
            )}>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-lg">
                {card.rank}
              </div>
              <div className="font-medium text-white truncate">{card.name}</div>
            </div>
            
            {/* Card Body */}
            <div className="flex-1 p-2 flex flex-col">
              <div className="text-xs text-slate-500 mb-1">{card.description}</div>
              <div className="text-xs italic text-slate-400 mb-3">{card.effect}</div>
              <div className="flex-1 flex items-center justify-center">
                {/* Placeholder for image */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-300 flex items-center justify-center">
                  {card.rank}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300">
            Carte vide
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function CardHand({ cards, selectedCardId, onSelectCard, isActive }: { 
  cards: CardType[]; 
  selectedCardId?: string;
  onSelectCard?: (cardId: string) => void;
  isActive?: boolean;
}) {
  return (
    <div className="flex justify-center mt-4">
      <div className="flex space-x-2">
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            isSelected={card.id === selectedCardId}
            isPlayable={isActive}
            onClick={() => onSelectCard?.(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function CardStack({ count = 0, className }: { count: number; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {Array.from({ length: Math.min(count, 5) }).map((_, index) => (
        <div
          key={index}
          className="absolute w-32 h-48 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-slate-500 shadow-md"
          style={{
            transform: `translateY(${-index * 2}px) translateX(${index * 2}px) rotateZ(${(index - 2) * 2}deg)`,
            zIndex: 5 - index,
          }}
        >
          <div className="absolute inset-4 border-2 border-slate-600 rounded flex items-center justify-center">
            <div className="text-xl font-bold text-slate-300">Love Letter</div>
          </div>
        </div>
      ))}
      <div className="absolute left-0 top-0 -mt-6 text-white font-medium">
        {count} cartes
      </div>
    </div>
  );
}

export function DiscardPile({ cards, className }: { cards: CardType[]; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {cards.length > 0 ? (
        <>
          {cards.slice(-3).map((card, index, arr) => (
            <div key={card.id} className="absolute" style={{ zIndex: index }}>
              <Card 
                card={card} 
                isDiscard={true} 
                isPlayable={false}
              />
            </div>
          ))}
          <div className="absolute left-0 top-0 -mt-6 text-white font-medium">
            {cards.length} défausse{cards.length > 1 ? 's' : ''}
          </div>
        </>
      ) : (
        <div className="w-32 h-48 rounded-lg border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-400">
          Aucune défausse
        </div>
      )}
    </div>
  );
}
