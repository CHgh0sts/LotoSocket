'use client';

import { useState, useEffect } from 'react';
import { X, Lock, LockOpen, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const RoomSettingsDialog = ({ isOpen, onClose, roomData, onUpdate }) => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser les valeurs quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen && roomData) {
      setIsPrivate(roomData.isPrivate || false);
      setPassword(roomData.password || '');
    }
  }, [isOpen, roomData]);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const token = Cookies.get('token');
      if (!token) {
        toast.error('Vous devez être connecté pour modifier les paramètres');
        return;
      }

      const response = await fetch(`/api/game/${roomData.code}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isPrivate,
          password: isPrivate ? password : null
        })
      });

      if (response.ok) {
        const updatedRoom = await response.json();
        onUpdate(updatedRoom);
        toast.success('Paramètres mis à jour avec succès');
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
       console.log('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivateToggle = newIsPrivate => {
    setIsPrivate(newIsPrivate);
    if (!newIsPrivate) {
      setPassword(''); // Effacer le mot de passe si on passe en public
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-11/12 max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Paramètres de la partie
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Visibilité */}
          <div>
            <h3 className="text-white font-medium mb-3">Visibilité de la partie</h3>
            <div className="space-y-2">
              <button onClick={() => handlePrivateToggle(false)} className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${!isPrivate ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                <LockOpen className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Publique</div>
                  <div className="text-sm opacity-75">Visible par tous les joueurs</div>
                </div>
              </button>

              <button onClick={() => handlePrivateToggle(true)} className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${isPrivate ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                <Lock className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Privée</div>
                  <div className="text-sm opacity-75">Accessible uniquement avec le code</div>
                </div>
              </button>
            </div>
          </div>

          {/* Mot de passe (si privé) */}
          {isPrivate && (
            <div>
              <h3 className="text-white font-medium mb-3">Mot de passe (optionnel)</h3>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Entrez un mot de passe (optionnel)" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-2">Si aucun mot de passe n'est défini, seul le code de la partie sera nécessaire.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors">
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSettingsDialog;
