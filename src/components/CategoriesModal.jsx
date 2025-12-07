'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye, FolderOpen, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const CategoriesModal = ({ isOpen, onClose, gameId }) => {
  const [categories, setCategories] = useState([]);
  const [cartons, setCartons] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Charger les catégories et cartons
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadCartons();
    }
  }, [isOpen, gameId]);

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

  const loadCartons = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/game/${gameId}/cartons`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCartons(data.cartons || []);
      }
    } catch (error) {
      console.log('Erreur lors du chargement des cartons:', error);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }

    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/game/${gameId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategoryName.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(prev => [...prev, data.category]);
        setNewCategoryName('');
        toast.success('Catégorie créée avec succès');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.log('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCategory = async categoryId => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return;
    }

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/game/${gameId}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        toast.success('Catégorie supprimée');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.log('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const getCartonsForCategory = categoryId => {
    return cartons.filter(carton => carton.categoryId === categoryId);
  };

  const getCartonsWithoutCategory = () => {
    return cartons.filter(carton => !carton.categoryId);
  };

  const updateCartonCategory = async (cartonId, newCategoryId) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/game/${gameId}/cartons/${cartonId}/category`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          categoryId: newCategoryId || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Mettre à jour le carton dans la liste
        setCartons(prev => prev.map(carton => (carton.id === cartonId ? data.carton : carton)));
        toast.success('Carton déplacé avec succès');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors du déplacement');
      }
    } catch (error) {
      console.log('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  const toggleCategoryActivation = async (categoryId, currentStatus) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/game/${gameId}/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          activated: !currentStatus
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Mettre à jour la catégorie dans la liste
        setCategories(prev => prev.map(cat => (cat.id === categoryId ? data.category : cat)));
        toast.success(data.message || (data.category.activated ? 'Catégorie activée' : 'Catégorie désactivée'));
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.log('Erreur:', error);
      toast.error('Erreur de connexion');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            Gestion des Catégories
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Créer une nouvelle catégorie */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Créer une nouvelle catégorie</h3>
          <div className="flex gap-3">
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nom de la catégorie" className="flex-1 bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none" onKeyPress={e => e.key === 'Enter' && createCategory()} />
            <button onClick={createCategory} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {isLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>

        {/* Liste des catégories */}
        <div className="space-y-4">
          <h3 className="text-white font-medium">Catégories existantes</h3>

          {categories.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune catégorie créée</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {categories.map(category => {
                const categoryCartons = getCartonsForCategory(category.id);
                return (
                  <div key={category.id} className={`bg-gray-700 rounded-lg p-4 ${!category.activated ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className={`font-medium ${category.activated ? 'text-white' : 'text-gray-400'}`}>{category.name}</h4>
                        <span className={`text-white text-xs px-2 py-1 rounded ${category.activated ? 'bg-blue-600' : 'bg-gray-600'}`}>
                          {categoryCartons.length} carton{categoryCartons.length > 1 ? 's' : ''}
                        </span>
                        {!category.activated && <span className="bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded">Désactivée</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleCategoryActivation(category.id, category.activated)} className={`${category.activated ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-green-400'}`} title={category.activated ? 'Désactiver la catégorie' : 'Activer la catégorie'}>
                          <Power className={`w-4 h-4 ${category.activated ? '' : 'opacity-50'}`} />
                        </button>
                        <button onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)} className="text-blue-400 hover:text-blue-300" title="Voir les cartons">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteCategory(category.id)} className="text-red-400 hover:text-red-300" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {selectedCategory === category.id && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-gray-300 text-sm mb-2">Cartons dans cette catégorie :</p>
                        {categoryCartons.length === 0 ? (
                          <p className="text-gray-400 text-xs">Aucun carton dans cette catégorie</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryCartons.map(carton => (
                              <div key={carton.id} className="bg-gray-600 rounded p-2 relative group">
                                <p className="text-white text-xs">Carton {carton.id.slice(-8)}</p>
                                <p className="text-gray-300 text-xs">Joueur: {carton.user?.name || 'Inconnu'}</p>
                                <div className="mt-2">
                                  <select value={carton.categoryId || ''} onChange={e => updateCartonCategory(carton.id, e.target.value || null)} className="w-full bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none" onClick={e => e.stopPropagation()}>
                                    <option value="">Aucune catégorie</option>
                                    {categories.map(cat => (
                                      <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cartons sans catégorie */}
          {getCartonsWithoutCategory().length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-white font-medium">Cartons sans catégorie</h4>
                <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded">
                  {getCartonsWithoutCategory().length} carton{getCartonsWithoutCategory().length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {getCartonsWithoutCategory().map(carton => (
                  <div key={carton.id} className="bg-gray-600 rounded p-2">
                    <p className="text-white text-xs">Carton {carton.id.slice(-8)}</p>
                    <p className="text-gray-300 text-xs">Joueur: {carton.user?.name || 'Inconnu'}</p>
                    <div className="mt-2">
                      <select value="" onChange={e => updateCartonCategory(carton.id, e.target.value || null)} className="w-full bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none" onClick={e => e.stopPropagation()}>
                        <option value="">Aucune catégorie</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesModal;
