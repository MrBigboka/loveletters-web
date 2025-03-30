import { io, Socket } from 'socket.io-client';

// URL du serveur Socket.IO déployé sur Render
const SOCKET_SERVER_URL = 'https://loveletters-web.onrender.com';

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('Connecté au serveur Socket.IO avec ID:', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Erreur de connexion Socket.IO:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Déconnecté du serveur Socket.IO:', reason);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;
  
  if (!socket) {
    return initializeSocket();
  }
  
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
