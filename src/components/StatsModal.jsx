'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, Users, Target, Trophy, Clock, Flame, Database } from 'lucide-react';
import Cookies from 'js-cookie';

const StatsModal = ({ isOpen, onClose, gameId, players, cartons, partyInfos, gameType, onHeatmapChange }) => {
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
  const [probaGameType, setProbaGameType] = useState(gameType || '1Ligne');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [historicalStats, setHistoricalStats] = useState(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);

  useEffect(() => {
    if (isOpen) calculateStats();
  }, [isOpen, players, cartons, partyInfos]);

  useEffect(() => {
    setProbaGameType(gameType);
  }, [gameType]);

  // Charger les stats historiques quand le modal s'ouvre, le type change,
  // ou quand la heatmap est active et le gameType change depuis la sidebar
  useEffect(() => {
    if (!isOpen && !heatmapEnabled) return;
    const fetchHistorical = async () => {
      setHistoricalLoading(true);
      try {
        const token = Cookies.get('token');
        if (!token) return;
        const res = await fetch(`/api/game/stats?gameType=${probaGameType}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setHistoricalStats(data);
        }
      } catch (err) {
        console.log('Erreur chargement stats historiques:', err);
      } finally {
        setHistoricalLoading(false);
      }
    };
    fetchHistorical();
  }, [isOpen, probaGameType, heatmapEnabled]);

  const calculateStats = () => {
    const totalPlayers = players.length;
    const totalCartons = cartons.length;
    const numbersDrawn = partyInfos.numbers ? partyInfos.numbers.length : 0;
    const gameProgress = Math.round((numbersDrawn / 90) * 100);
    const averageCartonsPerPlayer = totalPlayers > 0 ? (totalCartons / totalPlayers).toFixed(1) : 0;

    let mostActivePlayer = null;
    let maxCartons = 0;
    players.forEach(player => {
      const playerCartons = cartons.filter(c => c.userId === player.id).length;
      if (playerCartons > maxCartons) {
        maxCartons = playerCartons;
        mostActivePlayer = { ...player, cartonsCount: playerCartons };
      }
    });

    const playersWithWin = calculateWinners();

    setStats({
      totalPlayers, totalCartons, numbersDrawn,
      gameStartTime: partyInfos.createdAt,
      playersWithWin, averageCartonsPerPlayer,
      mostActivePlayer, gameProgress
    });
  };

  const calculateWinners = () => {
    let winners = 0;
    const drawnNumbers = partyInfos.numbers || [];
    cartons.forEach(carton => {
      const nums = carton.numbers || [];
      const lines = [nums.slice(0, 9), nums.slice(9, 18), nums.slice(18, 27)];
      let completedLines = 0;
      lines.forEach(line => {
        const valid = line.filter(n => n > 0);
        const matched = valid.filter(n => drawnNumbers.includes(n));
        if (valid.length === matched.length && valid.length === 5) completedLines++;
      });
      if (gameType === '1Ligne' && completedLines >= 1) winners++;
      else if (gameType === '2Lignes' && completedLines >= 2) winners++;
      else if (gameType === 'CartonPlein' && completedLines === 3) winners++;
    });
    return winners;
  };

  // Probabilités combinées : historique (fréquence de sortie sur toutes les parties)
  // + contexte actuel (présence dans les cartons actifs avec pondération par complétion)
  const numberProbabilities = useMemo(() => {
    const drawnNumbers = new Set(partyInfos.numbers || []);
    const probMap = {};
    for (let n = 1; n <= 90; n++) probMap[n] = 0;

    // Composante historique : earlyRate = % de parties passées où ce numéro est sorti tôt
    if (historicalStats?.stats) {
      for (let n = 1; n <= 90; n++) {
        if (drawnNumbers.has(n)) continue;
        const s = historicalStats.stats[n];
        if (s) {
          // earlyRate (0-100) normalisé + frequencyPct comme boost
          probMap[n] += (s.earlyRate / 100) * 0.5 + (s.frequencyPct / 100) * 0.3;
          // Bonus si le numéro sort en moyenne tôt (position basse)
          if (s.avgPosition && s.avgPosition > 0) {
            probMap[n] += Math.max(0, (1 - s.avgPosition / 90)) * 0.2;
          }
        }
      }
    }

    // Composante contextuelle : présence dans les cartons actifs
    if (cartons.length > 0) {
      const contextMap = {};
      for (let n = 1; n <= 90; n++) contextMap[n] = 0;

      cartons.forEach(carton => {
        const nums = carton.numbers || [];
        const lines = [nums.slice(0, 9), nums.slice(9, 18), nums.slice(18, 27)];

        const lineStates = lines.map(line => {
          const valid = line.filter(n => n > 0);
          const matched = valid.filter(n => drawnNumbers.has(n));
          return {
            valid, matched,
            remaining: valid.filter(n => !drawnNumbers.has(n)),
            complete: valid.length === matched.length && valid.length === 5
          };
        });

        let targetLines = [];
        if (probaGameType === '1Ligne') {
          targetLines = lineStates.filter(l => !l.complete);
        } else if (probaGameType === '2Lignes') {
          const completedCount = lineStates.filter(l => l.complete).length;
          if (completedCount < 2) targetLines = lineStates.filter(l => !l.complete);
        } else {
          targetLines = lineStates.filter(l => !l.complete);
        }

        targetLines.forEach(line => {
          const weight = line.valid.length > 0 ? (line.matched.length / line.valid.length) : 0;
          const boost = 1 + weight * 3;
          line.remaining.forEach(n => { contextMap[n] += boost; });
        });
      });

      // Normaliser le contexte entre 0 et 1
      const contextValues = Object.values(contextMap);
      const contextMax = Math.max(...contextValues);
      if (contextMax > 0) {
        for (let n = 1; n <= 90; n++) {
          probMap[n] += (contextMap[n] / contextMax) * 0.5;
        }
      }
    }

    // Normaliser le résultat final entre 0 et 1
    const values = Object.values(probMap);
    const maxVal = Math.max(...values);
    if (maxVal > 0) {
      for (const n of Object.keys(probMap)) {
        probMap[n] = probMap[n] / maxVal;
      }
    }

    return probMap;
  }, [cartons, partyInfos.numbers, probaGameType, historicalStats]);

  // Transmettre les données de heatmap au parent
  useEffect(() => {
    if (onHeatmapChange) {
      onHeatmapChange(heatmapEnabled ? numberProbabilities : null);
    }
  }, [heatmapEnabled, numberProbabilities, onHeatmapChange]);

  const getGameDuration = () => {
    if (!partyInfos.createdAt) return 'N/A';
    const diffMs = new Date() - new Date(partyInfos.createdAt);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  const getPlayerStats = () => {
    return players
      .map(player => {
        const playerCartons = cartons.filter(c => c.userId === player.id);
        let bestScore = 0;
        playerCartons.forEach(carton => {
          const matched = (carton.numbers || []).filter(n => n > 0 && (partyInfos.numbers || []).includes(n)).length;
          bestScore = Math.max(bestScore, matched);
        });
        return {
          ...player,
          cartonsCount: playerCartons.length,
          bestScore,
          completion: playerCartons.length > 0 ? Math.round((bestScore / 15) * 100) : 0
        };
      })
      .sort((a, b) => b.bestScore - a.bestScore);
  };

  // Dégradé 4 stops : vert (0) → jaune (0.33) → orange (0.66) → rouge (1)
  const getProbaStyle = (value) => {
    if (value === 0) return { bg: 'rgb(55, 65, 81)', color: 'rgb(156, 163, 175)', shadow: 'none' };
    const stops = [
      { t: 0,    r: 34,  g: 197, b: 94  }, // vert
      { t: 0.33, r: 234, g: 179, b: 8   }, // jaune
      { t: 0.66, r: 249, g: 115, b: 22  }, // orange
      { t: 1,    r: 239, g: 42,  b: 42  }, // rouge
    ];
    let i = 0;
    while (i < stops.length - 2 && value > stops[i + 1].t) i++;
    const a = stops[i], bStop = stops[i + 1];
    const local = (value - a.t) / (bStop.t - a.t);
    const r = Math.round(a.r + local * (bStop.r - a.r));
    const g = Math.round(a.g + local * (bStop.g - a.g));
    const b = Math.round(a.b + local * (bStop.b - a.b));
    const alpha = 0.4 + value * 0.6;
    const textAlpha = 0.6 + value * 0.4;
    return {
      bg: `rgba(${r}, ${g}, ${b}, ${alpha})`,
      color: `rgba(255, ${Math.round(255 - value * 40)}, ${Math.round(255 - value * 40)}, ${textAlpha})`,
      shadow: value > 0.5 ? `0 0 ${Math.round(value * 10)}px rgba(${r}, ${g}, ${b}, ${value * 0.4})` : 'none'
    };
  };

  // Top 10 numéros les plus probables (non tirés)
  const topNumbers = useMemo(() => {
    const drawnSet = new Set(partyInfos.numbers || []);
    return Object.entries(numberProbabilities)
      .filter(([n]) => !drawnSet.has(parseInt(n)))
      .map(([n, p]) => ({ number: parseInt(n), probability: p }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);
  }, [numberProbabilities, partyInfos.numbers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

        {/* Section Probabilités */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              Probabilités de sortie
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {['1Ligne', '2Lignes', 'CartonPlein'].map(type => (
                  <button
                    key={type}
                    onClick={() => setProbaGameType(type)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      probaGameType === type
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Source des données */}
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-blue-400" />
            {historicalLoading ? (
              <span className="text-gray-400 text-xs">Chargement des données historiques...</span>
            ) : historicalStats ? (
              <span className="text-blue-300 text-xs">
                Basé sur <span className="font-bold text-blue-200">{historicalStats.totalParties}</span> partie{historicalStats.totalParties > 1 ? 's' : ''} en {probaGameType} + cartons actuels
              </span>
            ) : (
              <span className="text-gray-400 text-xs">Données historiques non disponibles — basé sur les cartons actuels</span>
            )}
          </div>

          {/* Checkbox Heatmap */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={heatmapEnabled}
              onChange={(e) => setHeatmapEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-500 text-red-600 focus:ring-red-500 bg-gray-600"
            />
            <span className="text-gray-300 text-sm">
              Afficher la heatmap sur la grille de jeu
            </span>
            {heatmapEnabled && (
              <span className="text-red-400 text-xs">(actif)</span>
            )}
          </label>

          {/* Top 10 */}
          {topNumbers.length > 0 && (
            <div className="mb-4">
              <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Top 10 — numéros les plus probables</div>
              <div className="flex flex-wrap gap-2">
                {topNumbers.map(({ number, probability }, idx) => (
                  <div
                    key={number}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border transition-all"
                    style={{
                      backgroundColor: `rgba(239, 68, 68, ${0.15 + probability * 0.6})`,
                      borderColor: `rgba(239, 68, 68, ${0.3 + probability * 0.5})`
                    }}
                  >
                    <span className="text-xs text-gray-400 font-mono w-4">#{idx + 1}</span>
                    <span className="text-white font-bold text-sm">{number}</span>
                    <span className="text-red-300 text-xs">{Math.round(probability * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grille complète 1-90 avec couleurs de probabilité */}
          <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Tous les numéros</div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 90 }, (_, i) => i + 1).map(number => {
              const isDrawn = (partyInfos.numbers || []).includes(number);
              const proba = numberProbabilities[number] || 0;
              const hist = historicalStats?.stats?.[number];
              const tooltip = isDrawn
                ? `${number} — déjà tiré`
                : `${number} — proba: ${Math.round(proba * 100)}%${hist ? ` | sorti ${hist.frequencyPct}% des parties | pos. moy: ${hist.avgPosition ?? '—'}` : ''}`;
              const pStyle = isDrawn ? null : getProbaStyle(proba);
              return (
                <div
                  key={number}
                  className={`flex items-center justify-center rounded text-xs font-medium w-full aspect-square transition-all ${
                    isDrawn ? 'bg-yellow-500/40 text-yellow-300 line-through opacity-50' : ''
                  }`}
                  style={pStyle ? {
                    backgroundColor: pStyle.bg,
                    color: pStyle.color,
                    boxShadow: pStyle.shadow
                  } : undefined}
                  title={tooltip}
                >
                  {number}
                </div>
              );
            })}
          </div>
          {/* Légende dégradé continu */}
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <span>Faible</span>
            <div className="flex gap-0">
              {Array.from({ length: 20 }, (_, i) => {
                const v = i / 19;
                const s = getProbaStyle(v);
                return <div key={i} className="w-2.5 h-3" style={{ backgroundColor: s.bg }}></div>;
              })}
            </div>
            <span>Élevée</span>
            <span className="ml-2 text-yellow-400">■ Déjà tiré</span>
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
