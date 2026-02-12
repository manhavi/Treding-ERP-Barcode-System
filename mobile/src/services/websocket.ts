import { io, Socket } from 'socket.io-client';
import { getWebSocketURL } from './api';

let socket: Socket | null = null;

export async function connectWebSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  const url = getWebSocketURL();
  
  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
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
