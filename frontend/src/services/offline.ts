import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AaradhyaDB extends DBSchema {
  purchases: {
    key: number;
    value: any;
    indexes: { 'by-date': Date };
  };
  dispatches: {
    key: number;
    value: any;
    indexes: { 'by-date': Date };
  };
  bills: {
    key: number;
    value: any;
    indexes: { 'by-date': Date };
  };
  syncQueue: {
    key: number;
    value: {
      id: number;
      type: 'purchase' | 'dispatch' | 'bill';
      data: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let db: IDBPDatabase<AaradhyaDB> | null = null;

export async function initOfflineDB() {
  if (db) return db;

  db = await openDB<AaradhyaDB>('aaradhya-fashion', 1, {
    upgrade(database) {
      // Purchases store
      if (!database.objectStoreNames.contains('purchases')) {
        const purchaseStore = database.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
        purchaseStore.createIndex('by-date', 'created_at');
      }

      // Dispatches store
      if (!database.objectStoreNames.contains('dispatches')) {
        const dispatchStore = database.createObjectStore('dispatches', { keyPath: 'id', autoIncrement: true });
        dispatchStore.createIndex('by-date', 'created_at');
      }

      // Bills store
      if (!database.objectStoreNames.contains('bills')) {
        const billStore = database.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
        billStore.createIndex('by-date', 'created_at');
      }

      // Sync queue store
      if (!database.objectStoreNames.contains('syncQueue')) {
        const syncStore = database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return db;
}

export async function saveToOffline(store: 'purchases' | 'dispatches' | 'bills', data: any) {
  const database = await initOfflineDB();
  await database.add(store, data);
}

export async function getFromOffline(store: 'purchases' | 'dispatches' | 'bills') {
  const database = await initOfflineDB();
  return database.getAll(store);
}

export async function addToSyncQueue(type: 'purchase' | 'dispatch' | 'bill', data: any) {
  const database = await initOfflineDB();
  await database.add('syncQueue', {
    type,
    data,
    timestamp: Date.now(),
  } as any);
}

export async function getSyncQueue() {
  const database = await initOfflineDB();
  return database.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function removeFromSyncQueue(id: number) {
  const database = await initOfflineDB();
  await database.delete('syncQueue', id);
}
