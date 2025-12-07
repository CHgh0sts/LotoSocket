# LotoSocket - Application avec Socket.IO

Cette application utilise Socket.IO pour la communication en temps réel entre les clients et le serveur.

## 🚀 Démarrage rapide

### Installation des dépendances

```bash
npm install
```

### Démarrage en développement

```bash
npm run dev
```

Cette commande démarre le serveur Socket.IO intégré avec Next.js sur le port 3000.

### Démarrage en production

```bash
npm run build
npm start
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
NODE_ENV=development
HOSTNAME=localhost
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📡 Fonctionnalités Socket.IO

### Événements disponibles

#### Côté client → serveur

- `join_project` : Rejoindre un projet
- `leave_project` : Quitter un projet
- `test_message` : Envoyer un message de test
- `joinGame` : Rejoindre un jeu
- `updateNumber` : Mettre à jour des nombres
- `updateTypeParty` : Mettre à jour le type de partie
- `newParty` : Créer une nouvelle partie
- `updateListUsers` : Mettre à jour la liste des utilisateurs
- `updateCartons` : Mettre à jour les cartons
- `userAccountMerged` : Fusionner des comptes utilisateur

#### Côté serveur → client

- `test_message` : Message de test reçu
- `project_updated` : Projet mis à jour
- `todo_created` : Todo créé
- `todo_updated` : Todo mis à jour
- `todo_deleted` : Todo supprimé
- `invitation_received` : Invitation reçue
- `notification_received` : Notification reçue
- `collaborator_added` : Collaborateur ajouté
- `collaborator_removed` : Collaborateur supprimé

### Utilisation dans les composants

```javascript
import { useSocket } from '@/contexts/SocketContext';

function MonComposant() {
  const { socket, isConnected, joinProject, leaveProject } = useSocket();

  const handleJoinProject = () => {
    if (isConnected) {
      joinProject('project-id');
    }
  };

  const sendMessage = () => {
    if (socket && isConnected) {
      socket.emit('test_message', { message: 'Hello!' });
    }
  };

  return (
    <div>
      <p>Statut: {isConnected ? 'Connecté' : 'Déconnecté'}</p>
      <button onClick={handleJoinProject}>Rejoindre le projet</button>
      <button onClick={sendMessage}>Envoyer message</button>
    </div>
  );
}
```

## 🛠️ Diagnostic

L'application inclut un composant de diagnostic Socket.IO qui s'affiche en mode développement. Il permet de :

- Voir le statut de connexion
- Afficher les logs d'événements
- Tester les connexions
- Vérifier les transports utilisés

## 🔍 Dépannage

### Problèmes courants

1. **Socket non connecté**

   - Vérifiez que le serveur tourne sur le bon port (3000)
   - Vérifiez les logs du serveur pour les erreurs CORS
   - Assurez-vous que l'utilisateur est authentifié

2. **Erreurs CORS**

   - Le serveur est configuré pour accepter les connexions depuis `localhost:3000`
   - Vérifiez que vous accédez à l'application via `http://localhost:3000`

3. **Messages non reçus**
   - Vérifiez que vous écoutez les bons événements
   - Assurez-vous que le socket est connecté avant d'envoyer des messages

### Logs utiles

Le serveur affiche dans la console :

- Connexions/déconnexions des utilisateurs
- Messages de test reçus
- Rejoindre/quitter des projets

Le client affiche dans la console :

- État de la connexion Socket.IO
- Erreurs de connexion
- Tentatives de reconnexion

## 📁 Structure du projet

```
lotoSocket/
├── server.mjs              # Serveur Socket.IO intégré
├── src/
│   ├── contexts/
│   │   └── SocketContext.js # Contexte Socket.IO
│   ├── components/
│   │   └── SocketDiagnostic.js # Composant de diagnostic
│   └── app/
│       └── page.js         # Page de test
└── package.json
```

## 🎯 Prochaines étapes

- Ajouter l'authentification JWT pour les sockets
- Implémenter les événements spécifiques à votre application
- Ajouter la gestion des erreurs avancée
- Optimiser les performances avec la compression
