'use client';
import { GlobalContext } from '@/contexts/GlobalState';
import { useContext, useState, useEffect } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Edit, Trash2 } from 'lucide-react';

export default function Carton({ height = 'auto', cartonInitial = { listNumber: Array(27).fill('*') }, mode = 'view', addCartonInit = false, onAddCarton, onDelete, onEdit, onValidationError, onValidationChange, isEditMode = false }) {
  const { partyInfos } = useContext(GlobalContext);
  const [carton, setCarton] = useState(cartonInitial);
  const [tempInputs, setTempInputs] = useState({});

  // Mapping des caractères français vers les chiffres
  const charToNumber = {
    '&': '1',
    é: '2',
    '"': '3',
    "'": '4',
    '(': '5',
    '§': '6',
    è: '7',
    '!': '8',
    ç: '9',
    à: '0'
  };

  // Fonction pour convertir les caractères français en chiffres
  const convertFrenchCharsToNumbers = text => {
    return text
      .split('')
      .map(char => charToNumber[char] || char)
      .join('');
  };

  const isValidNumber = (value, j) => {
    if (!value || value === '*') return true;
    const num = parseInt(value);
    const min = j === 0 ? 1 : j * 10;
    const max = j === 8 ? 90 : (j + 1) * 10 - 1;
    return num >= min && num <= max;
  };

  const countNumbersInRow = (carton, i) => carton.listNumber.slice(i * 9, (i + 1) * 9).filter(num => num !== '*').length;

  const handleChange = (e, i, j) => {
    const rawValue = e.target.value;
    // Convertir les caractères français en chiffres
    const convertedValue = convertFrenchCharsToNumbers(rawValue);
    setTempInputs(prev => ({ ...prev, [`${i}-${j}`]: convertedValue }));
  };

  const handleBlur = (e, i, j) => {
    const rawValue = e.target.value.trim();
    // Convertir les caractères français en chiffres
    const value = convertFrenchCharsToNumbers(rawValue);

    if (!isNaN(value) && value !== '') {
      if (isValidNumber(value, j)) {
        const currentCount = countNumbersInRow(carton, i);
        if (currentCount >= 5 && carton.listNumber[i * 9 + j] === '*') {
          setCarton(cart => {
            const newCart = { ...cart };
            newCart.listNumber[i * 9 + j] = '*';
            return newCart;
          });
        } else {
          setCarton(cart => {
            const newCart = { ...cart };
            newCart.listNumber[i * 9 + j] = value;
            return newCart;
          });
        }
      } else {
        setCarton(cart => {
          const newCart = { ...cart };
          newCart.listNumber[i * 9 + j] = '*';
          return newCart;
        });
      }
    } else {
      setCarton(cart => {
        const newCart = { ...cart };
        newCart.listNumber[i * 9 + j] = '*';
        return newCart;
      });
    }
    setTempInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[`${i}-${j}`];
      return newInputs;
    });
  };

  const handleDelete = () => {
    onDelete && onDelete(carton);
  };

  // Fonction pour obtenir la valeur actuelle d'une cellule (carton ou tempInputs)
  const getCurrentCellValue = (i, j) => {
    const tempValue = tempInputs[`${i}-${j}`];
    if (tempValue !== undefined) {
      return tempValue;
    }
    const cartonValue = carton.listNumber[i * 9 + j];
    return cartonValue === '*' ? '' : cartonValue;
  };

  // Fonction pour valider le carton selon les règles du loto
  const validateCarton = () => {
    const errors = [];
    let totalNumbers = 0;

    // Créer un tableau avec les valeurs actuelles (carton + tempInputs)
    const currentValues = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 9; j++) {
        currentValues.push(getCurrentCellValue(i, j));
      }
    }

    // Vérifier chaque ligne
    for (let i = 0; i < 3; i++) {
      const row = currentValues.slice(i * 9, (i + 1) * 9);
      const numbersInRow = row.filter(num => !isNaN(num) && num !== '*' && num !== '');

      if (numbersInRow.length !== 5) {
        errors.push(`Ligne ${i + 1}: ${numbersInRow.length}/5 nombres (il faut exactement 5 nombres par ligne)`);
      }

      totalNumbers += numbersInRow.length;
    }

    // Vérifier le total
    if (totalNumbers !== 15) {
      errors.push(`Total: ${totalNumbers}/15 nombres (il faut exactement 15 nombres au total)`);
    }

    // Vérifier les doublons
    const allNumbers = currentValues.filter(num => !isNaN(num) && num !== '*' && num !== '');
    const uniqueNumbers = [...new Set(allNumbers)];
    if (allNumbers.length !== uniqueNumbers.length) {
      errors.push('Il y a des nombres en double dans le carton');
    }

    // Vérifier que chaque colonne a des nombres dans la bonne plage
    for (let j = 0; j < 9; j++) {
      const columnNumbers = [];
      for (let i = 0; i < 3; i++) {
        const num = currentValues[i * 9 + j];
        if (!isNaN(num) && num !== '*' && num !== '') {
          columnNumbers.push(parseInt(num));
        }
      }

      if (columnNumbers.length > 0) {
        const min = j === 0 ? 1 : j * 10;
        const max = j === 8 ? 90 : (j + 1) * 10 - 1;
        const invalidNumbers = columnNumbers.filter(num => num < min || num > max);
        if (invalidNumbers.length > 0) {
          errors.push(`Colonne ${j + 1}: nombres ${invalidNumbers.join(', ')} hors plage (${min}-${max})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      totalNumbers: totalNumbers
    };
  };

  useEffect(() => {
    if (addCartonInit) {
      const validation = validateCarton();

      if (validation.isValid) {
        onAddCarton(carton.listNumber);
      } else {
        // Afficher les erreurs de validation
        console.log('Erreurs de validation du carton:', validation.errors);

        if (onValidationError) {
          onValidationError(validation.errors);
        } else {
          // Fallback: alert pour les erreurs
          alert('Carton invalide:\n' + validation.errors.join('\n'));
        }
      }
    }
  }, [addCartonInit, carton.listNumber, onAddCarton, onValidationError]);

  // Surveiller les changements du carton pour la validation en temps réel
  useEffect(() => {
    if (mode === 'create' && onValidationChange) {
      const validation = validateCarton();

      onValidationChange({
        isValid: validation.isValid,
        errors: validation.errors,
        totalNumbers: validation.totalNumbers
      });
    }
  }, [carton.listNumber, tempInputs, mode, onValidationChange]);

  return (
    <div className="relative w-fit h-fit">
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="Carton" style={height ? { '--height': height } : {}}>
            {/* Header du carton avec info utilisateur si disponible */}
            {carton.user && mode === 'view' && (
              <div className="absolute -top-8 left-0 right-0 text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1 text-sm text-white/80">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">
                    {carton.user.nom} {carton.user.prenom}
                  </span>
                  {carton.group && <span className="text-blue-300">• {carton.group.name}</span>}
                </div>
              </div>
            )}

            {[...Array(3)].map((_, i) => (
              <div key={i} className="Carton-row">
                {[...Array(9)].map((_, j) => {
                  const number = parseInt(carton.listNumber[i * 9 + j] || '*');
                  const isSelected = partyInfos.numbers.includes(number);
                  const tempValue = tempInputs[`${i}-${j}`];
                  const isEmpty = carton.listNumber[i * 9 + j] === '*';

                  return (
                    <div key={`${i}-${j}`} className={`Carton-cell relative w-[calc(100%/9)] h-[(${height}/3)] ${isEmpty ? 'vide' : ''} ${isSelected ? 'selected-cell' : ''}`}>
                      {mode === 'create' ? (
                        <input onChange={e => handleChange(e, i, j)} onBlur={e => handleBlur(e, i, j)} type="text" className="w-full h-full bg-transparent text-white text-center font-semibold placeholder-white/30 focus:placeholder-white/50 transition-all duration-200" pattern="\d*" maxLength="2" value={tempValue !== undefined ? tempValue : carton.listNumber[i * 9 + j] === '*' ? '' : carton.listNumber[i * 9 + j]} />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center relative ${isSelected ? 'isSelected' : ''}`}>
                          <span className={`font-bold text-lg ${isSelected ? 'text-white z-10' : 'text-white/90'} transition-all duration-300`}>{number || ''}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Progress indicator pour le mode création */}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 bg-black/90 backdrop-blur-md border border-white/20">
          <ContextMenuItem className="flex items-center cursor-pointer text-white hover:bg-white/10 focus:bg-white/10" onClick={() => onEdit && onEdit(carton)}>
            <Edit className="w-4 h-4 mr-2" />
            <span>Modifier</span>
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center cursor-pointer text-red-400 hover:bg-red-600/20 focus:bg-red-600/20" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Supprimer</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isEditMode && mode === 'view' && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex gap-2">
          <button onClick={() => onEdit && onEdit(carton)} className="bg-blue-500/90 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110" title="Éditer le carton">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} className="bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full shadow-lg backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110" title="Supprimer le carton">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
