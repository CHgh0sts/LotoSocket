'use client';
import { useState, useEffect } from 'react';
import { Trophy, Crown } from 'lucide-react';
import Carton from './game/Carton';

const WinnerModal = ({ isVisible, onClose, winners = [], gameType = '1Ligne' }) => {
  if (!isVisible || winners.length === 0) return null;

  const getGameTypeText = type => {
    switch (type) {
      case '1Ligne':
        return '1 Ligne';
      case '2Lignes':
        return '2 Lignes';
      case 'CartonPlein':
        return 'Carton Plein';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl p-8 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto relative border-4 border-yellow-300 shadow-2xl">
        {/* Bouton fermer */}
        <button onClick={onClose} className="absolute top-4 right-4 text-yellow-900 hover:text-yellow-700 text-3xl font-bold z-10">
          ×
        </button>

        {/* Animation de confettis (CSS) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="confetti"></div>
        </div>

        {/* Header avec trophée */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-4 mb-4">
            <Trophy className="w-16 h-16 text-yellow-900 animate-bounce" />
            <h1 className="text-4xl font-bold text-yellow-900">{winners.length === 1 ? 'GAGNANT !' : 'GAGNANTS !'}</h1>
            <Trophy className="w-16 h-16 text-yellow-900 animate-bounce" />
          </div>
          <div className="bg-yellow-300 rounded-lg px-6 py-2 inline-block">
            <span className="text-yellow-900 font-semibold text-xl">Mode: {getGameTypeText(gameType)}</span>
          </div>
        </div>

        {/* Liste des gagnants */}
        <div className="space-y-6">
          {winners.map((winner, index) => (
            <div key={winner.cartonId} className="bg-white rounded-xl p-6 shadow-lg border-2 border-yellow-300">
              {/* Info du joueur */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <Crown className="w-8 h-8 text-yellow-600" />
                <h2 className="text-2xl font-bold text-gray-800">{winner.playerName}</h2>
                <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">Carton {winner.cartonIndex + 1}</span>
              </div>

              {/* Détails de la victoire */}
              <div className="text-center mb-4">
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg inline-block">
                  <span className="font-semibold">
                    {gameType === '1Ligne' && '✅ 1 ligne complète !'}
                    {gameType === '2Lignes' && `✅ ${winner.completedLines?.length || 2} lignes complètes !`}
                    {gameType === 'CartonPlein' && '✅ Carton complet !'}
                  </span>
                  {winner.completedLines && winner.completedLines.length > 0 && <div className="text-sm mt-1">Ligne(s): {winner.completedLines.map(line => line + 1).join(', ')}</div>}
                </div>
              </div>

              {/* Affichage du carton gagnant */}
              <div className="flex justify-center">
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <Carton cartonInitial={{ listNumber: winner.cartonData }} mode="view" height="200px" />
                </div>
              </div>

              {/* Badge de position si plusieurs gagnants */}
              {winners.length > 1 && (
                <div className="text-center mt-4">
                  <span className="bg-yellow-500 text-white px-4 py-2 rounded-full font-bold text-lg">#{index + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <button onClick={onClose} className="bg-yellow-800 hover:bg-yellow-900 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors">
            Continuer la partie
          </button>
        </div>
      </div>

      <style jsx>{`
        .confetti {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
          background-size: 10px 10px;
          opacity: 0.3;
          animation: confetti-fall 3s ease-in-out infinite;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default WinnerModal;
