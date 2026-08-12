import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;
  if (!socketInstance) {
    const token = localStorage.getItem('autowork_jwt_token');
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socketInstance;
};
