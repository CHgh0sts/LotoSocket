# Système de Rooms Publiques et Privées

## Vue d'ensemble

Le système de rooms a été étendu pour supporter les rooms publiques et privées avec les fonctionnalités suivantes :

### Fonctionnalités ajoutées

1. **Rooms publiques** : Visibles par tous les utilisateurs, accessibles sans mot de passe
2. **Rooms privées** : Accessibles uniquement avec un code et optionnellement un mot de passe
3. **Interface utilisateur améliorée** : Modales pour la création et la jointure de rooms
4. **Liste des rooms publiques** : Affichage en temps réel des rooms publiques disponibles

## Modifications du schéma de base de données

### Table `rooms`

Nouveaux champs ajoutés :

- `isPublic` (Boolean) : Détermine si la room est publique ou privée
- `password` (String, optionnel) : Mot de passe pour les rooms privées

```sql
ALTER TABLE rooms ADD COLUMN isPublic BOOLEAN DEFAULT true;
ALTER TABLE rooms ADD COLUMN password TEXT;
```

## APIs modifiées/créées

### 1. API de création de room (`/api/game/create`)

**Paramètres ajoutés :**

- `isPublic` : Boolean (défaut: true)
- `password` : String (optionnel, pour les rooms privées)

**Exemple de requête :**

```json
{
  "gameType": "1Ligne",
  "roomName": "Ma partie privée",
  "isPublic": false,
  "password": "secret123"
}
```

### 2. API de jointure de room (`/api/game/join`)

**Paramètres ajoutés :**

- `password` : String (requis pour les rooms privées)

**Exemple de requête :**

```json
{
  "roomCode": "123456",
  "password": "secret123"
}
```

### 3. Nouvelle API : Liste des rooms publiques (`/api/game/public-rooms`)

**Méthode :** GET

**Réponse :**

```json
{
  "success": true,
  "rooms": [
    {
      "id": "room-id",
      "code": "123456",
      "name": "Partie publique",
      "isPublic": true,
      "createdAt": "2025-07-29T12:00:00.000Z",
      "creator": {
        "id": "user-id",
        "name": "Nom du créateur"
      },
      "playerCount": 2,
      "players": [...]
    }
  ]
}
```

### 4. Nouvelle API : Vérification de room (`/api/game/check-room`)

**Méthode :** POST

**Paramètres :**

```json
{
  "roomCode": "123456"
}
```

**Réponse :**

```json
{
  "success": true,
  "room": {
    "id": "room-id",
    "code": "123456",
    "name": "Nom de la room",
    "isPublic": false,
    "hasPassword": true,
    "creator": {...},
    "playerCount": 0,
    "createdAt": "2025-07-29T12:00:00.000Z"
  }
}
```

## Interface utilisateur

### Page d'accueil modifiée

1. **Section "Commencer à jouer"** :

   - Bouton "Créer une nouvelle partie" → Ouvre une modale de création
   - Bouton "Rejoindre une partie privée" → Ouvre une modale de jointure

2. **Section "Rooms publiques disponibles"** :
   - Liste en temps réel des rooms publiques
   - Affichage du nom, code, créateur et nombre de joueurs
   - Bouton "Rejoindre" pour chaque room

### Modales

#### Modale de création de room

- Champ "Nom de la partie"
- Switch "Room publique/privée" avec icônes
- Champ "Mot de passe" (optionnel, visible seulement pour les rooms privées)

#### Modale de jointure de room privée

- Champ "Code de la room" (6 chiffres)
- Champ "Mot de passe" (optionnel)

## Indicateurs visuels

- 🌐 **Icône Globe** : Rooms publiques
- 🔒 **Icône Lock** : Rooms privées
- **Badges colorés** : Vert pour public, Orange pour privé

## Scripts de test

### Création de rooms de test

```bash
node scripts/test-rooms.js
```

Ce script crée :

- 2 rooms publiques (codes: 123456, 234567)
- 2 rooms privées (codes: 345678, 456789) avec mots de passe

## Migration

Pour appliquer les changements de base de données :

```bash
npx prisma migrate dev --name add_room_visibility
```

## Tests

### Test des APIs

1. **Créer une room publique :**

```bash
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"roomName":"Test Public","isPublic":true}'
```

2. **Créer une room privée :**

```bash
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"roomName":"Test Private","isPublic":false,"password":"secret123"}'
```

3. **Lister les rooms publiques :**

```bash
curl -X GET http://localhost:3000/api/game/public-rooms
```

4. **Vérifier une room :**

```bash
curl -X POST http://localhost:3000/api/game/check-room \
  -H "Content-Type: application/json" \
  -d '{"roomCode":"123456"}'
```

## Sécurité

- Les rooms privées nécessitent un mot de passe pour être rejointes
- Les mots de passe sont stockés en base de données (à hasher en production)
- Validation des codes de room (6 chiffres exactement)
- Vérification de l'existence et de l'état actif des rooms
