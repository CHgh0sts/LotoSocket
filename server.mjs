import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map pour suivre les joueurs connectés par room
const connectedPlayersByRoom = new Map();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handle);
    
    // Configuration Socket.IO avec CORS
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Fonction pour mettre à jour le compteur de joueurs connectés
    const updateConnectedPlayersCount = async (gameId) => {
        try {
            // Compter les sessions actives pour cette room
            const activeSessions = await prisma.activeSession.count({
                where: {
                    roomCode: gameId,
                    isActive: true
                }
            });
            
            connectedPlayersByRoom.set(gameId, activeSessions);
            console.log(`----- Room ${gameId}: ${activeSessions} joueurs connectés`);
            
            // Émettre la mise à jour à tous les clients abonnés
            io.emit('active_players_updated', {
                roomCode: gameId,
                activeCount: activeSessions
            });
        } catch (error) {
            console.log('Erreur lors de la mise à jour du compteur:', error);
        }
    };

    // Fonction pour émettre les mises à jour des joueurs actifs
    const emitActivePlayersUpdate = async (gameId) => {
        try {
            const activeSessions = await prisma.activeSession.count({
                where: {
                    roomCode: gameId,
                    isActive: true
                }
            });
            
            io.emit('active_players_updated', {
                roomCode: gameId,
                activeCount: activeSessions
            });
        } catch (error) {
            console.log('Erreur lors de l\'émission des joueurs actifs:', error);
        }
    };

    io.on('connection', (socket) => {
        console.log(`Un utilisateur est connecté ${socket.id}`);

        // Événements pour les projets
        socket.on('join_project', (projectId) => {
            socket.join(projectId);
            console.log(`Utilisateur ${socket.id} a rejoint le projet ${projectId}`);
        });

        socket.on('leave_project', (projectId) => {
            socket.leave(projectId);
            console.log(`Utilisateur ${socket.id} a quitté le projet ${projectId}`);
        });

        // Événements pour les jeux (garder la compatibilité)
        socket.on('joinGame', ({ gameId, user }) => {
            socket.join(gameId);
            socket.gameId = gameId;
            socket.to(gameId).emit('userJoined', user);
        });

        socket.on('updateNumber', ({ gameId, data }) => {
            socket.to(gameId).emit('numbersUpdated', data);
        });

        socket.on('updateTypeParty', ({ gameId, partyId, typePartyId }) => {
            console.log('updateTypeParty', partyId, typePartyId);

        socket.on('creator_transferred', ({ gameId, newCreatorId, newCreatorName }) => {
            console.log(`Créateur transféré dans la room ${gameId} vers ${newCreatorName} (${newCreatorId})`);
            socket.to(gameId).emit('creator_transferred', {
                gameId,
                newCreatorId,
                newCreatorName
            });
        });
            socket.to(gameId).emit('typePartyUpdated', { partyId, typePartyId });
        });

        socket.on('newParty', ({ party, gameId }) => {
            socket.to(gameId).emit('newPartyCreated', { party });
        });

        socket.on('updateListUsers', ({ gameId, listUsers }) => {
            socket.to(gameId).emit('listUsersUpdated', { listUsers: listUsers });
        });

        socket.on('updateCartons', ({ gameId, listCartons }) => {
            socket.to(gameId).emit('listCartonsUpdated', { listCartons: listCartons });
        });

        socket.on('userAccountMerged', ({ gameId, oldUserId, newUserId }) => {
            socket.to(gameId).emit('accountMerged', { oldUserId, newUserId });
        });

        socket.on('join_party', ({ partyId }) => {
            socket.join(partyId);
        });

        // Nouveaux événements pour les joueurs actifs
        socket.on('request_active_players', async ({ roomCode }) => {
            try {
                const activeSessions = await prisma.activeSession.count({
                    where: {
                        roomCode: roomCode,
                        isActive: true
                    }
                });
                
                socket.emit('active_players_updated', {
                    roomCode: roomCode,
                    activeCount: activeSessions
                });
            } catch (error) {
                console.log('Erreur lors de la demande de joueurs actifs:', error);
            }
        });

        socket.on('subscribe_to_active_players', ({ roomCode }) => {
            socket.join(`active_players_${roomCode}`);
            console.log(`Socket ${socket.id} s'est abonné aux mises à jour des joueurs actifs pour la room ${roomCode}`);
        });

        // Événements pour les jeux de loto avec Prisma
        socket.on('ban_player', async ({ gameId, playerId }) => {
            try {
                console.log(`----- ÉVÉNEMENT BAN_PLAYER RECU: ${playerId} de la room ${gameId}`);
                console.log(`----- Socket ID: ${socket.id}, User ID: ${socket.userId}`);
                
                // Émettre l'événement de bannissement à tous les clients dans la room
                console.log(`----- Émission de l'événement player_banned pour ${playerId} à tous les clients`);
                io.to(gameId).emit('player_banned', { playerId });
                
                // Déconnecter le joueur banni s'il est connecté
                const connectedSockets = await io.in(gameId).fetchSockets();
                console.log(`----- Sockets connectés dans la room: ${connectedSockets.length}`);
                console.log(`----- User IDs connectés: ${connectedSockets.map(s => s.userId).filter(id => id)}`);
                
                const bannedSocket = connectedSockets.find(s => s.userId === playerId);
                if (bannedSocket) {
                    console.log(`----- Déconnexion du joueur banni ${playerId}`);
                    bannedSocket.emit('game_joined', { 
                        gameId, 
                        success: false, 
                        error: 'Vous êtes banni de cette room' 
                    });
                    bannedSocket.leave(gameId);
                } else {
                    console.log(`----- Joueur banni ${playerId} non trouvé dans les sockets connectés`);
                }
                
                // Mettre à jour la liste des joueurs connectés
                const remainingSockets = await io.in(gameId).fetchSockets();
                const remainingUsers = remainingSockets.map(s => s.userId).filter(id => id);
                
                // Récupérer la room mise à jour
                const room = await prisma.room.findUnique({
                    where: { code: gameId },
                    include: {
                        players: {
                            select: {
                                id: true,
                                name: true,
                                tempCreateRoom: true
                            }
                        }
                    }
                });
                
                if (room) {
                    // Filtrer les joueurs qui sont actuellement connectés
                    const activePlayers = room.players.filter(player => 
                        remainingUsers.includes(player.id)
                    );
                    
                    console.log(`----- Mise à jour après bannissement: ${activePlayers.length} joueurs actifs`);
                    
                    // Émettre la mise à jour des joueurs
                    io.to(gameId).emit('players_updated', {
                        players: activePlayers.map(player => ({ 
                            id: player.id, 
                            username: player.name,
                            tempCreateRoom: player.tempCreateRoom,
                            isConnected: true
                        })),
                        count: activePlayers.length
                    });
                }
            } catch (error) {
                console.log('Erreur lors du bannissement:', error);
            }
        });

        socket.on('join_game', async ({ gameId, userId }) => {
            try {
                socket.join(gameId);
                socket.gameId = gameId;
                socket.userId = userId; // Stocker l'userId pour la déconnexion
                console.log(`Utilisateur ${socket.id} a rejoint le jeu ${gameId}`);
                
                // Désactiver les sessions existantes pour le même utilisateur dans la même room
                if (userId) {
                    await prisma.activeSession.updateMany({
                        where: {
                            userId: userId,
                            roomCode: gameId,
                            isActive: true
                        },
                        data: {
                            isActive: false
                        }
                    });
                    console.log(`----- Sessions existantes désactivées pour l'utilisateur ${userId} dans la room ${gameId}`);
                }
                
                // Créer une session active pour ce socket
                await prisma.activeSession.create({
                    data: {
                        socketId: socket.id,
                        userId: userId,
                        roomCode: gameId,
                        isActive: true
                    }
                });
                console.log(`----- Session active créée pour ${socket.id} dans la room ${gameId}`);
                
                // Vérifier si la room existe dans la base de données par son code
                const room = await prisma.room.findUnique({
                    where: { code: gameId },
                    include: {
                        creator: true,
                        players: true,
                        Party: {
                            orderBy: { createdAt: 'desc' }
                        },
                    },
                });

                if (room) {
                    // Vérifier si l'utilisateur est banni de cette room
                    if (userId) {
                        const ban = await prisma.ban.findUnique({
                            where: {
                                userId_roomId: {
                                    userId: userId,
                                    roomId: room.id
                                }
                            }
                        });

                        if (ban) {
                            console.log(`----- Utilisateur ${userId} banni de la room ${gameId}`);
                            socket.emit('game_joined', { 
                                gameId, 
                                success: false, 
                                error: 'Vous êtes banni de cette room' 
                            });
                            socket.leave(gameId);
                            return;
                        }
                    }

                    // Si un userId est fourni, ajouter l'utilisateur à la room
                    if (userId) {
                        try {
                            await prisma.room.update({
                                where: { id: room.id },
                                data: {
                                    players: {
                                        connect: { id: userId }
                                    }
                                }
                            });
                            console.log(`----- Utilisateur ${userId} ajouté à la room ${gameId}`);
                            
                            // Récupérer la room mise à jour pour avoir la liste complète des joueurs
                            const updatedRoom = await prisma.room.findUnique({
                                where: { id: room.id },
                                include: {
                                    players: {
                                        select: {
                                            id: true,
                                            name: true
                                        }
                                    }
                                }
                            });
                            
                            if (updatedRoom) {
                                room.players = updatedRoom.players;
                                console.log(`----- Room mise à jour: ${updatedRoom.players.length} joueurs dans la room`);
                                
                                // Émettre un événement spécifique pour notifier qu'un nouveau joueur a rejoint
                                const newPlayer = updatedRoom.players.find(p => p.id === userId);
                                if (newPlayer) {
                                    io.emit('player_joined', {
                                        playerId: userId,
                                        playerName: newPlayer.name,
                                        tempCreateRoom: newPlayer.tempCreateRoom,
                                        isCreator: newPlayer.id === room.creatorId,
                                        totalPlayers: updatedRoom.players.length,
                                        roomCode: gameId
                                    });
                                    
                                    // Émettre la mise à jour des joueurs actifs
                                    await emitActivePlayersUpdate(gameId);
                                }
                            }
                        } catch (error) {
                            console.log(`----- Utilisateur ${userId} déjà dans la room ou erreur:`, error.message);
                        }
                    } else {
                        console.log(`----- Aucun userId fourni pour la room ${gameId}`);
                    }
                    
                    const latestParty = room.Party[0];
                    const numbers = latestParty ? latestParty.listNumbers : [];
                    
                    // Envoyer les informations de la room
                    socket.emit('game_joined', { 
                        gameId, 
                        success: true,
                        game: {
                            id: room.id,
                            listUsers: room.players.map(player => ({ id: player.id, username: player.name })),
                            code: room.code,
                            gameType: latestParty ? latestParty.gameType : '1Ligne',
                            numbers: numbers,
                            currentNumber: numbers.length > 0 ? numbers[numbers.length - 1] : 0,
                        }
                    });
                    
                    // Compter les utilisateurs actuellement connectés dans cette room
                    const connectedSockets = await io.in(gameId).fetchSockets();
                    const connectedUsers = connectedSockets.map(s => s.userId).filter(id => id);
                    
                    console.log(`----- Debug: Room ${gameId} - Connected sockets: ${connectedSockets.length}`);
                    console.log(`----- Debug: Connected users: ${JSON.stringify(connectedUsers)}`);
                    console.log(`----- Debug: Room players: ${JSON.stringify(room.players.map(p => p.id))}`);
                    
                    // Filtrer les joueurs qui sont actuellement connectés
                    const activePlayers = room.players.filter(player => 
                        connectedUsers.includes(player.id)
                    );
                    
                    console.log(`----- Debug: Active players: ${activePlayers.length}`);
                    
                    // Émettre la mise à jour des joueurs à tous les clients dans la room
                    io.to(gameId).emit('players_updated', {
                        players: activePlayers.map(player => ({ 
                            id: player.id, 
                            username: player.name,
                            tempCreateRoom: player.tempCreateRoom,
                            isConnected: true
                        })),
                        count: activePlayers.length
                    });
                    
                    // Mettre à jour le compteur de joueurs connectés
                    await updateConnectedPlayersCount(gameId);
                } else {
                    socket.emit('game_joined', { gameId, success: false, error: 'Room non trouvée' });
                }
            } catch (error) {
                console.log('Erreur lors de la récupération du jeu:', error);
                socket.emit('game_joined', { gameId, success: false, error: 'Erreur serveur' });
            }
        });

        socket.on('add_number_to_carton', async ({ gameId, number }) => {
            try {
                console.log(`Toggle du numéro ${number} au jeu ${gameId}`);
                
                // Trouver la room par son code
                const room = await prisma.room.findUnique({
                    where: { code: gameId }
                });
                
                if (!room) {
                    console.log('Room non trouvée');
                    return;
                }
                
                // Trouver la première partie de cette room pour ajouter le numéro
                const party = await prisma.party.findFirst({
                    where: { roomId: room.id },
                    orderBy: { createdAt: 'desc' }
                });
                
                if (!party) {
                    console.log('Aucune partie trouvée pour cette room');
                    return;
                }
                
                // Logique de toggle : si le numéro existe, le supprimer, sinon l'ajouter
                const currentNumbers = party.listNumbers || [];
                let newNumbers;
                let action;
                
                if (currentNumbers.includes(number)) {
                    // Le numéro existe, le supprimer
                    newNumbers = currentNumbers.filter(n => n !== number);
                    action = 'removed';
                    console.log(`Numéro ${number} supprimé du jeu ${gameId}`);
                } else {
                    // Le numéro n'existe pas, l'ajouter
                    newNumbers = [...currentNumbers, number];
                    action = 'added';
                    console.log(`Numéro ${number} ajouté au jeu ${gameId}`);
                }
                
                // Mettre à jour la liste des numéros
                await prisma.party.update({
                    where: { id: party.id },
                    data: {
                        listNumbers: newNumbers
                    }
                });
                
                // Émettre l'événement avec l'action effectuée
                io.to(gameId).emit('numberToggled', { number, action, allNumbers: newNumbers });
                io.to(gameId).emit('game_number_changed', { gameNumber: newNumbers.length > 0 ? newNumbers[newNumbers.length - 1] : 0 });
            } catch (error) {
                console.log('Erreur lors du toggle du numéro:', error);
            }
        });

        socket.on('change_game_type', async ({ gameId, gameType }) => {
            try {
                console.log(`Changement de type de jeu: ${gameId} -> ${gameType}`);
                
                // Trouver la room par son code
                const room = await prisma.room.findUnique({
                    where: { code: gameId }
                });
                
                if (!room) {
                    console.log('Room non trouvée');
                    socket.emit('game_type_change_error', { 
                        error: 'Room non trouvée'
                    });
                    return;
                }
                
                // Trouver la partie la plus récente et mettre à jour son gameType
                const party = await prisma.party.findFirst({
                    where: { roomId: room.id },
                    orderBy: { createdAt: 'desc' }
                });
                
                if (!party) {
                    console.log('Aucune partie trouvée pour cette room');
                    socket.emit('game_type_change_error', { 
                        error: 'Aucune partie trouvée pour cette room'
                    });
                    return;
                }
                
                // Mettre à jour le gameType de la partie
                await prisma.party.update({
                    where: { id: party.id },
                    data: { gameType }
                });
                
                // Émettre à tous les clients dans la room (y compris l'émetteur)
                io.to(gameId).emit('game_type_changed', { gameType: gameType });
                
                // Confirmer le changement à l'émetteur
                socket.emit('game_type_change_confirmed', { gameType: gameType });
                
                console.log(`Type de jeu mis à jour avec succès: ${gameId} -> ${gameType}`);
            } catch (error) {
                console.log('Erreur lors du changement de type de jeu:', error);
                socket.emit('game_type_change_error', { 
                    error: 'Erreur lors du changement de type de jeu',
                    details: error.message 
                });
            }
        });

        socket.on('add_number', async ({ number, gameId }) => {
            try {
                console.log(`Toggle du numéro ${number} au jeu ${gameId}`);
                
                // Trouver la room par son code
                const room = await prisma.room.findUnique({
                    where: { code: gameId }
                });
                
                if (!room) {
                    console.log('Room non trouvée');
                    return;
                }
                
                // Trouver la première partie de cette room pour ajouter le numéro
                const party = await prisma.party.findFirst({
                    where: { roomId: room.id },
                    orderBy: { createdAt: 'desc' }
                });
                
                if (!party) {
                    console.log('Aucune partie trouvée pour cette room');
                    return;
                }
                
                // Logique de toggle : si le numéro existe, le supprimer, sinon l'ajouter
                const currentNumbers = party.listNumbers || [];
                let newNumbers;
                let action;
                
                if (currentNumbers.includes(number)) {
                    // Le numéro existe, le supprimer
                    newNumbers = currentNumbers.filter(n => n !== number);
                    action = 'removed';
                    console.log(`Numéro ${number} supprimé du jeu ${gameId}`);
                } else {
                    // Le numéro n'existe pas, l'ajouter
                    newNumbers = [...currentNumbers, number];
                    action = 'added';
                    console.log(`Numéro ${number} ajouté au jeu ${gameId}`);
                }
                
                // Mettre à jour la liste des numéros
                await prisma.party.update({
                    where: { id: party.id },
                    data: {
                        listNumbers: newNumbers
                    }
                });
                
                // Émettre l'événement avec l'action effectuée
                io.to(gameId).emit('numberToggled', { number, action, allNumbers: newNumbers });
                io.to(gameId).emit('game_number_changed', { gameNumber: newNumbers.length > 0 ? newNumbers[newNumbers.length - 1] : 0 });
                
                console.log(`Numéro ${number} togglé avec succès au jeu ${gameId}`);
            } catch (error) {
                console.log('Erreur lors du toggle du numéro:', error);
                socket.emit('number_add_error', { 
                    error: 'Erreur lors du toggle du numéro',
                    details: error.message 
                });
            }
        });

        // Événements de test
        socket.on('test_message', (data) => {
            console.log('Message de test reçu:', data);
            // Renvoyer le message à tous les clients connectés
            io.emit('test_message', { 
                message: 'Test message reçu par le serveur',
                originalData: data,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('end_party', async ({ gameId, typeGame, clearNumbers }) => {
            try {
                const TypeGame = ['1Ligne', '2Lignes', 'CartonPlein']
                let posTypeGame = TypeGame.indexOf(typeGame)
                if(posTypeGame === 2) posTypeGame = -1
                
                console.log(`Terminaison de la partie ${gameId}`);
                
                // Trouver la room par son code
                const room = await prisma.room.findUnique({
                    where: { code: gameId },
                    include: {
                        Party: {
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                });
                
                if (!room) {
                    console.log('Room non trouvée');
                    socket.emit('end_party_error', { error: 'Room non trouvée' });
                    return;
                }
                
                // Créer une nouvelle partie
                const party = await prisma.party.create({
                    data: {
                        roomId: room.id, // Utiliser l'ID de la room, pas le code
                        gameType: TypeGame[posTypeGame + 1],
                        listNumbers: clearNumbers ? [] : room.Party[0].listNumbers
                    }
                });
                
                console.log(`Nouvelle partie créée: ${party.id}`);
                io.to(gameId).emit('newParty', { party: party });
            } catch (error) {
                console.log('Erreur lors de la création de la nouvelle partie:', error);
                socket.emit('end_party_error', { 
                    error: 'Erreur lors de la création de la nouvelle partie',
                    details: error.message 
                });
            }
        });

        socket.on('disconnect', async () => {
            console.log(`Un utilisateur est déconnecté ${socket.id}`);
            
            // Marquer la session comme inactive
            try {
                await prisma.activeSession.updateMany({
                    where: {
                        socketId: socket.id,
                        isActive: true
                    },
                    data: {
                        isActive: false
                    }
                });
                console.log(`----- Session inactive marquée pour ${socket.id}`);
            } catch (error) {
                console.log('Erreur lors de la désactivation de la session:', error);
            }
            
            // Si le socket était dans une room de jeu, mettre à jour le nombre de joueurs
            if (socket.gameId) {
                try {
                    // Compter les sessions actives pour cette room
                    const activeSessions = await prisma.activeSession.count({
                        where: {
                            roomCode: socket.gameId,
                            isActive: true
                        }
                    });
                    
                    console.log(`----- Room ${socket.gameId}: ${activeSessions} joueurs connectés après déconnexion`);
                    
                    // Récupérer la room pour obtenir les informations des joueurs
                    const room = await prisma.room.findUnique({
                        where: { code: socket.gameId },
                        include: {
                            players: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    });
                    
                    if (room) {
                        // Émettre un événement spécifique pour notifier qu'un joueur a quitté
                        if (socket.userId) {
                            const leavingPlayer = room.players.find(p => p.id === socket.userId);
                            if (leavingPlayer) {
                                io.emit('player_left', {
                                    playerId: socket.userId,
                                    playerName: leavingPlayer.name,
                                    totalPlayers: activeSessions,
                                    roomCode: socket.gameId
                                });
                            }
                        }
                        
                        // Émettre la mise à jour du nombre de joueurs
                        io.to(socket.gameId).emit('players_updated', {
                            count: activeSessions
                        });
                        
                        // Mettre à jour le compteur de joueurs connectés et émettre les mises à jour
                        await updateConnectedPlayersCount(socket.gameId);
                        
                        console.log(`----- Mise à jour des joueurs connectés: ${activeSessions} joueurs actifs`);
                    }
                } catch (error) {
                    console.log('Erreur lors de la mise à jour des joueurs après déconnexion:', error);
                }
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.IO server running on port ${port}`);
        console.log(`> Prisma connected to PostgreSQL`);
    });
});