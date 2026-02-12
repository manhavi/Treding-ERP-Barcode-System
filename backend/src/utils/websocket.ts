import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer | HTTPSServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocket first.');
  }
  return io;
}

// Helper functions to emit events
export function emitPurchaseCreated(purchase: any) {
  if (io) {
    io.emit('purchase:created', purchase);
  }
}

export function emitPurchaseUpdated(purchase: any) {
  if (io) {
    io.emit('purchase:updated', purchase);
  }
}

export function emitInventoryUpdated(product: any) {
  if (io) {
    io.emit('inventory:updated', product);
  }
}

export function emitInventoryDeleted(productId: number) {
  if (io) {
    io.emit('inventory:deleted', { id: productId });
  }
}

export function emitBillCreated(bill: any) {
  if (io) {
    io.emit('bill:created', bill);
  }
}

export function emitBillUpdated(bill: any) {
  if (io) {
    io.emit('bill:updated', bill);
  }
}

export function emitDispatchCreated(dispatch: any) {
  if (io) {
    io.emit('dispatch:created', dispatch);
  }
}

export function emitPartyCreated(party: any) {
  if (io) {
    io.emit('party:created', party);
  }
}

export function emitPartyUpdated(party: any) {
  if (io) {
    io.emit('party:updated', party);
  }
}

export function emitPartyDeleted(partyId: number) {
  if (io) {
    io.emit('party:deleted', { id: partyId });
  }
}

export function emitStaffCreated(staff: any) {
  if (io) {
    io.emit('staff:created', staff);
  }
}

export function emitStaffUpdated(staff: any) {
  if (io) {
    io.emit('staff:updated', staff);
  }
}

export function emitStaffDeleted(staffId: number) {
  if (io) {
    io.emit('staff:deleted', { id: staffId });
  }
}
