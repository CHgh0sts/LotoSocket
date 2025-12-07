'use client';

import { useState, useEffect } from 'react';
import { X, BarChart3, Users, Target, Trophy, Clock } from 'lucide-react';

const StatsModal = ({ isOpen, onClose, gameId, players, cartons, partyInfos, gameType }) => {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalCartons: 0,
    numbersDrawn: 0,
    gameStartTime: null,
    playersWithWin: 0,
    averageCartonsPerPlayer: 0,
    mostActivePlayer: null,
    gameProgress: 0
  });

  useEffect(() => {
    if (isOpen) {
      calculateStats();
    }
  }, [isOpen, players, cartons, partyInfos]);

  const calculateStats = () => {
    const totalPlayers = players.length;
    const totalCartons = cartons.length;
    const numbersDrawn = partyInfos.numbers ? partyInfos.numbers.length : 0;
    const gameProgress = Math.round((numbersDrawn / 90) * 100);

    // Calculer les joueurs avec des cartons
    const playersWithCartons = players.filter(player => cartons.some(carton => carton.userId === player.id));

    // Calculer la moyenne de cartons par joueur
    const averageCartonsPerPlayer = totalPlayers > 0 ? (totalCartons / totalPlayers).toFixed(1) : 0;

    // Trouver le joueur le plus actif (avec le plus de cartons)
    let mostActivePlayer = null;
    let maxCartons = 0;
    players.forEach(player => {
      const playerCartons = cartons.filter(carton => carton.userId === player.id).length;
      if (playerCartons > maxCartons) {
        maxCartons = playerCartons;
        mostActivePlayer = { ...player, cartonsCount: playerCartons };
      }
    });

    // Calculer les gagnants potentiels (selon le type de jeu)
    const playersWithWin = calculateWinners();

    setStats({
      totalPlayers,
      totalCartons,
      numbersDrawn,
      gameStartTime: partyInfos.createdAt,
      playersWithWin,
      averageCartonsPerPlayer,
      mostActivePlayer,
      gameProgress
    });
  };

  const calculateWinners = () => {
    // Logic similaire à useWinnerDetection mais simplifiée pour les stats
    let winners = 0;
    const drawnNumbers = partyInfos.numbers || [];

    cartons.forEach(carton => {
      const cartonNumbers = carton.numbers || [];

      // Créer les lignes (3 lignes de 9 cases chacune)
      const lines = [
        cartonNumbers.slice(0, 9), // Ligne 1
        cartonNumbers.slice(9, 18), // Ligne 2
        cartonNumbers.slice(18, 27) // Ligne 3
      ];

      let completedLines = 0;
      lines.forEach(line => {
        const validNumbers = line.filter(num => num > 0);
        const matchedNumbers = validNumbers.filter(num => drawnNumbers.includes(num));
        if (validNumbers.length === matchedNumbers.length && validNumbers.length === 5) {
          completedLines++;
        }
      });

      // Vérifier selon le type de jeu
      if (gameType === '1Ligne' && completedLines >= 1) {
        winners++;
      } else if (gameType === '2Lignes' && completedLines >= 2) {
        winners++;
      } else if (gameType === 'CartonPlein' && completedLines === 3) {
        winners++;
      }
    });

    return winners;
  };

  const getGameDuration = () => {
    if (!partyInfos.createdAt) return 'N/A';

    const startTime = new Date(partyInfos.createdAt);
    const now = new Date();
    const diffMs = now - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const getPlayerStats = () => {
    return players
      .map(player => {
        const playerCartons = cartons.filter(carton => carton.userId === player.id);
        const cartonsCount = playerCartons.length;

        // Calculer le meilleur score du joueur
        let bestScore = 0;
        playerCartons.forEach(carton => {
          const cartonNumbers = carton.numbers || [];
          const matchedNumbers = cartonNumbers.filter(num => num > 0 && (partyInfos.numbers || []).includes(num)).length;
          bestScore = Math.max(bestScore, matchedNumbers);
        });

        return {
          ...player,
          cartonsCount,
          bestScore,
          completion: playerCartons.length > 0 ? Math.round((bestScore / 15) * 100) : 0
        };
      })
      .sort((a, b) => b.bestScore - a.bestScore);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Statistiques de la Partie
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats générales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-600 rounded-lg p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-white" />
            <div className="text-2xl font-bold text-white">{stats.totalPlayers}</div>
            <div className="text-blue-100 text-sm">Joueurs</div>
          </div>

          <div className="bg-green-600 rounded-lg p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-white" />
            <div className="text-2xl font-bold text-white">{stats.totalCartons}</div>
            <div className="text-green-100 text-sm">Cartons</div>
          </div>

          <div className="bg-yellow-600 rounded-lg p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-white" />
            <div className="text-2xl font-bold text-white">{stats.numbersDrawn}/90</div>
            <div className="text-yellow-100 text-sm">Numéros tirés</div>
          </div>

          <div className="bg-purple-600 rounded-lg p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-white" />
            <div className="text-2xl font-bold text-white">{getGameDuration()}</div>
            <div className="text-purple-100 text-sm">Durée</div>
          </div>
        </div>

        {/* Progression du jeu */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Progression du jeu</h3>
          <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${stats.gameProgress}%` }}></div>
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>0 numéros</span>
            <span className="text-blue-400">{stats.gameProgress}% complété</span>
            <span>90 numéros</span>
          </div>
        </div>

        {/* Stats supplémentaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Informations de jeu</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Type de partie:</span>
                <span className="text-white font-medium">{gameType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cartons par joueur (moy.):</span>
                <span className="text-white font-medium">{stats.averageCartonsPerPlayer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Gagnants potentiels:</span>
                <span className="text-white font-medium">{stats.playersWithWin}</span>
              </div>
            </div>
          </div>

          {stats.mostActivePlayer && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">Joueur le plus actif</h3>
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-white font-medium">{stats.mostActivePlayer.name}</div>
                  <div className="text-gray-300 text-sm">{stats.mostActivePlayer.cartonsCount} cartons</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Classement des joueurs */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4">Classement des joueurs</h3>
          <div className="space-y-2">
            {getPlayerStats().map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-500 text-gray-900' : index === 1 ? 'bg-gray-400 text-gray-900' : index === 2 ? 'bg-orange-600 text-white' : 'bg-gray-500 text-gray-300'}`}>{index + 1}</div>
                  <div>
                    <div className="text-white font-medium">{player.name}</div>
                    <div className="text-gray-300 text-xs">{player.cartonsCount} cartons</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{player.bestScore}/15</div>
                  <div className="text-gray-300 text-xs">{player.completion}% complété</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
