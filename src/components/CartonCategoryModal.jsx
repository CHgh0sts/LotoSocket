'use client';

import { useState, useEffect } from 'react';
import { X, FolderOpen, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const CartonCategoryModal = ({ isOpen, onClose, carton, gameId, onUpdate }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && carton) {
      setSelectedCategoryId(carton.categoryId);
      loadCategories();
    }
  }, [isOpen, carton]);

  const loadCategories = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/game/${gameId}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.log('Erreur lors du chargement des catégories:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!carton) return;

    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/game/${gameId}/cartons/${carton.id}/category`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          categoryId: selectedCategoryId
        })
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.carton);
        toast.success('Catégorie mise à jour avec succès');
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

  if (!isOpen || !carton) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Éditer la catégorie
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info carton */}
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          <p className="text-gray-300 text-sm">Carton:</p>
          <p className="text-white font-medium">#{carton.id.slice(-8)}</p>
          {carton.user && (
            <>
              <p className="text-gray-300 text-sm mt-2">Joueur:</p>
              <p className="text-white font-medium">{carton.user.name}</p>
            </>
          )}
        </div>

        {/* Sélection de catégorie */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Choisir une catégorie</h3>

          {/* Option "Aucune catégorie" */}
          <label className="flex items-center p-3 bg-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-gray-600 transition-colors">
            <input type="radio" name="category" value="" checked={selectedCategoryId === null} onChange={() => setSelectedCategoryId(null)} className="mr-3 text-blue-600" />
            <div>
              <div className="text-white font-medium">Aucune catégorie</div>
              <div className="text-gray-300 text-sm">Retirer le carton de toute catégorie</div>
            </div>
          </label>

          {/* Catégories disponibles */}
          {categories.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune catégorie disponible</p>
              <p className="text-xs mt-1">Créez d'abord des catégories dans le gestionnaire de catégories</p>
            </div>
          ) : (
            categories.map(category => (
              <label key={category.id} className="flex items-center p-3 bg-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-gray-600 transition-colors">
                <input type="radio" name="category" value={category.id} checked={selectedCategoryId === category.id} onChange={() => setSelectedCategoryId(category.id)} className="mr-3 text-blue-600" />
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-white font-medium">{category.name}</div>
                    <div className="text-gray-300 text-sm">Créée le {new Date(category.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
            Annuler
          </button>
          <button onClick={handleUpdateCategory} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors">
            {isLoading ? 'Mise à jour...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartonCategoryModal;

