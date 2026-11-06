import { io } from 'socket.io-client';

export const socket = io({ autoConnect: false });
export const username = new URLSearchParams(location.search).get('user') || 'alice';

// Request/response helper for events acknowledged by the server.
export const request = (event, payload = null) => new Promise((resolve) => {
  socket.emit(event, payload, resolve);
});

export const isTyping = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
