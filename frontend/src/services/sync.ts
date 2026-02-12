import api from './api';
import { getSyncQueue, removeFromSyncQueue } from './offline';

export async function syncOfflineData() {
  if (!navigator.onLine) {
    return;
  }

  try {
    const queue = await getSyncQueue();
    
    for (const item of queue) {
      try {
        switch (item.type) {
          case 'purchase':
            await api.post('/purchases', item.data);
            break;
          case 'dispatch':
            await api.post('/dispatch', item.data);
            break;
          case 'bill':
            await api.post('/bills', item.data);
            break;
        }
        await removeFromSyncQueue(item.id);
      } catch (err) {
        console.error(`Failed to sync ${item.type}:`, err);
        // Keep item in queue for retry
      }
    }
  } catch (err) {
    console.error('Failed to sync offline data:', err);
  }
}

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineData();
  });
}
