import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Get WebSocket URL based on current hostname
const getWebSocketURL = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
    
    return 'ws://localhost:3001';
  }
  return 'ws://localhost:3001';
};

export function connectWebSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const wsURL = getWebSocketURL();
  if (import.meta?.env?.DEV) console.log('WebSocket connecting to', wsURL);

  socket = io(wsURL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 20000,
    forceNew: false,
  });

  socket.on('connect', () => {
    if (import.meta?.env?.DEV) console.log('WebSocket connected');
  });

  socket.on('disconnect', (reason) => {
    if (import.meta?.env?.DEV) console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    if (import.meta?.env?.DEV) console.error('WebSocket error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    if (import.meta?.env?.DEV) console.log('WebSocket reconnected after', attemptNumber);
  });

  socket.on('reconnect_attempt', () => {});

  socket.on('reconnect_failed', () => {
    console.error('❌ WebSocket reconnection failed after all attempts');
  });

  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// Event listener helpers
export function onPurchaseCreated(callback: (purchase: any) => void) {
  if (socket) {
    socket.on('purchase:created', callback);
  }
}

export function onInventoryUpdated(callback: (product: any) => void) {
  if (socket) {
    socket.on('inventory:updated', callback);
  }
}

export function onInventoryDeleted(callback: (data: { id: number }) => void) {
  if (socket) {
    socket.on('inventory:deleted', callback);
  }
}

export function onBillCreated(callback: (bill: any) => void) {
  if (socket) {
    socket.on('bill:created', callback);
  }
}

export function onBillUpdated(callback: (bill: any) => void) {
  if (socket) {
    socket.on('bill:updated', callback);
  }
}

export function onDispatchCreated(callback: (dispatch: any) => void) {
  if (socket) {
    socket.on('dispatch:created', callback);
  }
}

export function onPartyCreated(callback: (party: any) => void) {
  if (socket) {
    socket.on('party:created', callback);
  }
}

export function onPartyUpdated(callback: (party: any) => void) {
  if (socket) {
    socket.on('party:updated', callback);
  }
}

export function onPartyDeleted(callback: (data: { id: number }) => void) {
  if (socket) {
    socket.on('party:deleted', callback);
  }
}

export function onStaffCreated(callback: (staff: any) => void) {
  if (socket) {
    socket.on('staff:created', callback);
  }
}

export function onStaffUpdated(callback: (staff: any) => void) {
  if (socket) {
    socket.on('staff:updated', callback);
  }
}

export function onStaffDeleted(callback: (data: { id: number }) => void) {
  if (socket) {
    socket.on('staff:deleted', callback);
  }
}

// Remove event listeners
export function offPurchaseCreated(callback: (purchase: any) => void) {
  if (socket) {
    socket.off('purchase:created', callback);
  }
}

export function offInventoryUpdated(callback: (product: any) => void) {
  if (socket) {
    socket.off('inventory:updated', callback);
  }
}

export function offInventoryDeleted(callback: (data: { id: number }) => void) {
  if (socket) {
    socket.off('inventory:deleted', callback);
  }
}

export function offBillCreated(callback: (bill: any) => void) {
  if (socket) {
    socket.off('bill:created', callback);
  }
}

export function offBillUpdated(callback: (bill: any) => void) {
  if (socket) {
    socket.off('bill:updated', callback);
  }
}

export function offDispatchCreated(callback: (dispatch: any) => void) {
  if (socket) {
    socket.off('dispatch:created', callback);
  }
}

export function offPartyCreated(callback: (party: any) => void) {
  if (socket) {
    socket.off('party:created', callback);
  }
}

export function offPartyUpdated(callback: (party: any) => void) {
  if (socket) {
    socket.off('party:updated', callback);
  }
}

export function offPartyDeleted(callback: (data: { id: number }) => void) {
  if (socket) {
    socket.off('party:deleted', callback);
  }
}

export function offStaffCreated(callback: (staff: any) => void) {
  if (socket) {
    socket.off('staff:created', callback);
  }
}

export function offStaffUpdated(callback: (staff: any) => void) {
  if (socket) {
    socket.off('staff:updated', callback);
  }
}

export function offStaffDeleted(callback: (data: { id: number }) => void) {
  if (socket) {
    socket.off('staff:deleted', callback);
  }
}
