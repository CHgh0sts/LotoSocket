'use client';
import { useState, useEffect, useMemo } from 'react';
import { Users, Trophy, Target, Info, ChevronDown, ChevronUp } from 'lucide-react';
import Carton from './game/Carton';

const PlayersCartonsList = ({ players = [], cartons = [], drawnNumbers = [], gameType = '1Ligne' }) => {
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  // Calculer le nombre de numéros manquants pour gagner pour chaque carton
  const calculateMissingNumbers = (cartonNumbers, drawnNumbers, gameType) => {
    if (!cartonNumbers || !drawnNumbers) return 99;

    // Convertir les données du carton (0 = case vide, nombre = valeur)
    const cartonData = cartonNumbers.map(number => (number === 0 ? '*' : number.toString()));

    const linesStatus = [];

    // Vérifier chaque ligne (3 lignes par carton)
    for (let lineIndex = 0; lineIndex < 3; lineIndex++) {
      const lineStart = lineIndex * 9;
      const lineEnd = lineStart + 9;
      const line = cartonData.slice(lineStart, lineEnd);

      // Compter les numéros de la ligne qui ont été tirés
      let numbersInLine = 0;
      let drawnInLine = 0;
      const lineNumbers = [];
      const drawnInLineNumbers = [];

      for (let i = 0; i < 9; i++) {
        const number = parseInt(line[i]);
        if (!isNaN(number) && number > 0) {
          numbersInLine++;
          lineNumbers.push(number);
          if (drawnNumbers.includes(number)) {
            drawnInLine++;
            drawnInLineNumbers.push(number);
          }
        }
      }

      // Une ligne a exactement 5 numéros
      const missingInLine = numbersInLine === 5 ? Math.max(0, 5 - drawnInLine) : 99;
      linesStatus.push({
        lineIndex,
        total: numbersInLine,
        drawn: drawnInLine,
        missing: missingInLine,
        isComplete: missingInLine === 0 && numbersInLine === 5,
        lineNumbers: lineNumbers,
        drawnInLineNumbers: drawnInLineNumbers
      });
    }

    // Debug pour développement
    if (process.env.NODE_ENV === 'development') {
      console.log('DEBUG Carton:', {
        cartonNumbers,
        cartonData,
        drawnNumbers,
        linesStatus,
        gameType,
        finalMissingNumber: (() => {
          switch (gameType) {
            case '1Ligne':
              return Math.min(...linesStatus.map(line => line.missing));
            case '2Lignes':
              const completedLinesCount = linesStatus.filter(line => line.missing === 0).length;
              if (completedLinesCount >= 2) return 0;
              else if (completedLinesCount === 1) {
                const incompleteLinesFor2Lignes = linesStatus.filter(line => line.missing > 0);
                return Math.min(...incompleteLinesFor2Lignes.map(line => line.missing));
              } else {
                const sortedLines = linesStatus.sort((a, b) => a.missing - b.missing);
                const firstLine = sortedLines[0].missing;
                const secondLine = sortedLines[1].missing;
                return firstLine + secondLine;
              }
            case 'CartonPlein':
              const totalMissing = linesStatus.reduce((total, line) => total + line.missing, 0);
              return totalMissing;
            default:
              return 99;
          }
        })()
      });
    }

    // Calculer selon le mode de jeu
    switch (gameType) {
      case '1Ligne':
        // Il faut au moins 1 ligne complète
        return Math.min(...linesStatus.map(line => line.missing));

      case '2Lignes':
        // Il faut au moins 2 lignes complètes
        const completedLinesCount = linesStatus.filter(line => line.missing === 0).length;

        if (completedLinesCount >= 2) {
          // Déjà gagnant
          return 0;
        } else if (completedLinesCount === 1) {
          // Une ligne complète, il faut compléter une autre ligne
          const incompleteLinesFor2Lignes = linesStatus.filter(line => line.missing > 0);
          return Math.min(...incompleteLinesFor2Lignes.map(line => line.missing));
        } else {
          // Aucune ligne complète, prendre les 2 lignes avec le moins de numéros manquants
          const sortedLines = linesStatus.sort((a, b) => a.missing - b.missing);
          const firstLine = sortedLines[0].missing;
          const secondLine = sortedLines[1].missing;
          // Retourner la somme des deux meilleures lignes (car il faut compléter les deux)
          return firstLine + secondLine;
        }

      case 'CartonPlein':
        // Il faut les 3 lignes complètes - compter tous les numéros manquants
        const totalMissing = linesStatus.reduce((total, line) => total + line.missing, 0);
        return totalMissing;

      default:
        return 99;
    }
  };

  // Regrouper les cartons par joueur et calculer le minimum de numéros manquants
  const playersWithCartons = useMemo(() => {
    const playerMap = new Map();

    // Initialiser avec tous les joueurs qui ont des cartons
    cartons.forEach(carton => {
      const player = players.find(p => p.id === carton.userId);
      if (!player) return;

      if (!playerMap.has(carton.userId)) {
        playerMap.set(carton.userId, {
          id: carton.userId,
          name: player.name,
          cartons: [],
          minMissing: 99,
          bestCarton: null
        });
      }

      const missing = calculateMissingNumbers(carton.numbers, drawnNumbers, gameType);
      const playerData = playerMap.get(carton.userId);

      // Debug spécifique par joueur
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 Carton de ${player.name}:`, {
          cartonId: carton.id,
          numbers: carton.numbers,
          missingCalculated: missing,
          gameType: gameType
        });
      }

      playerData.cartons.push({
        id: carton.id,
        missing: missing,
        numbers: carton.numbers
      });

      // Mettre à jour le minimum de numéros manquants et garder le carton correspondant
      if (missing < playerData.minMissing) {
        playerData.minMissing = missing;
        playerData.bestCarton = carton.numbers;
      }
    });

    // Convertir en array et trier par nombre de numéros manquants (croissant)
    return Array.from(playerMap.values()).sort((a, b) => {
      // D'abord par nombre minimum manquant
      if (a.minMissing !== b.minMissing) {
        return a.minMissing - b.minMissing;
      }
      // Puis par nom
      return a.name.localeCompare(b.name);
    });
  }, [players, cartons, drawnNumbers, gameType]);

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

  const getMissingText = missing => {
    if (missing === 0) return 'GAGNANT !';
    if (missing === 99) return 'Aucune ligne valide';
    if (missing === 1) return '1 numéro manquant';
    return `${missing} numéros manquants`;
  };

  const getMissingColor = missing => {
    if (missing === 0) return 'text-green-400 font-bold';
    if (missing <= 2) return 'text-yellow-400';
    if (missing <= 4) return 'text-orange-400';
    return 'text-gray-400';
  };

  return (
    <div className={`absolute bottom-4 left-2 w-64 z-10 ${isCollapsed ? 'h-9' : 'h-auto max-h-80'}`}>
      <div className={`bg-gray-800 rounded-lg p-3 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className={`flex items-center gap-2 border-b border-gray-600 ${isCollapsed ? 'justify-center border-b-0 mb-0 pb-0' : 'mb-3 pb-2'}`}>
          <Users className={`w-4 h-4 text-blue-400`} />
          <h3 className="text-white font-medium text-sm">Classement</h3>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto text-gray-400 hover:text-white transition-colors" title="Réduire">
            <ChevronUp className={`w-5 h-5 ${isCollapsed ? 'hidden' : ''}`} />
            <ChevronDown className={`w-5 h-5 ${isCollapsed ? '' : 'hidden'}`} />
          </button>
        </div>

        {/* Liste des joueurs */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto space-y-1 max-h-full">
            {playersWithCartons.length === 0 ? (
              <div className="text-gray-400 text-center py-4">
                <Users className="w-8 h-8 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Aucun joueur avec des cartons</p>
              </div>
            ) : (
              playersWithCartons.map((player, index) => (
                <div key={player.id} className={`relative p-1.5 rounded border transition-all ${player.minMissing === 0 ? 'bg-green-900/30 border-green-500' : player.minMissing <= 2 ? 'bg-yellow-900/20 border-yellow-600' : 'bg-gray-700 border-gray-600'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Position */}
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 && player.minMissing === 0 ? 'bg-green-500 text-white' : index === 0 ? 'bg-yellow-500 text-gray-900' : index === 1 ? 'bg-gray-400 text-gray-900' : index === 2 ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-300'}`}>{player.minMissing === 0 ? <Trophy className="w-2 h-2" /> : index + 1}</div>

                      {/* Nom du joueur */}
                      <span className="text-white font-medium text-xs">{player.name}</span>
                    </div>

                    {/* Nombre manquant avec icône info */}
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-medium ${getMissingColor(player.minMissing)}`}>{player.minMissing === 0 ? 'WIN!' : player.minMissing === 99 ? '∞' : `${player.minMissing}`}</span>
                      {player.bestCarton && player.minMissing > 0 && player.minMissing < 99 && (
                        <div className="relative" onMouseEnter={() => setHoveredPlayer(player.id)} onMouseLeave={() => setHoveredPlayer(null)}>
                          <Info className="w-3 h-3 text-gray-400 hover:text-blue-400 cursor-help" />

                          {/* Tooltip avec carton */}
                          {hoveredPlayer === player.id && (
                            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 99999 }}>
                              <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-2xl">
                                <div className="text-white text-xs mb-3 text-center">
                                  Meilleur carton de {player.name} ({player.minMissing} manquant{player.minMissing > 1 ? 's' : ''})
                                </div>
                                <div className="w-96 h-36 flex items-center justify-center overflow-hidden">
                                  <div className="scale-75 origin-center">
                                    <Carton
                                      cartonInitial={{
                                        listNumber: player.bestCarton.map(number => (number === 0 ? '*' : number.toString()))
                                      }}
                                      mode="view"
                                      height="180px"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer avec stats */}
        {!isCollapsed && playersWithCartons.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 text-center">
              {playersWithCartons.length} joueur{playersWithCartons.length > 1 ? 's' : ''} • {playersWithCartons.reduce((total, player) => total + player.cartons.length, 0)} cartons
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayersCartonsList;
