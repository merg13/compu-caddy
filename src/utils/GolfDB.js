// IndexedDB wrapper for offline storage
class GolfDB {
  constructor() {
    this.dbName = 'GolfStatsDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('courses')) {
          const courseStore = db.createObjectStore('courses', { keyPath: 'id' });
          courseStore.createIndex('name', 'name', { unique: false });
          courseStore.createIndex('isHomeCourse', 'isHomeCourse', { unique: false });
        }

        if (!db.objectStoreNames.contains('rounds')) {
          const roundStore = db.createObjectStore('rounds', { keyPath: 'id' });
          roundStore.createIndex('courseId', 'courseId', { unique: false });
          roundStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('holeScores')) {
          const holeStore = db.createObjectStore('holeScores', { keyPath: 'id' });
          holeStore.createIndex('roundId', 'roundId', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // New stores for offline features
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictStore.createIndex('storeName', 'storeName', { unique: false });
          conflictStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('storeName', 'storeName', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async add(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Conflict resolution methods for multi-device sync
  async detectConflicts(storeName, remoteData) {
    const localData = await this.getAll(storeName);
    const conflicts = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find(item => item.id === remoteItem.id);

      if (localItem) {
        // Check for conflicts based on lastModified timestamp
        if (remoteItem.lastModified && localItem.lastModified) {
          if (remoteItem.lastModified > localItem.lastModified) {
            conflicts.push({
              type: 'server_newer',
              local: localItem,
              remote: remoteItem
            });
          } else if (remoteItem.lastModified < localItem.lastModified) {
            conflicts.push({
              type: 'local_newer',
              local: localItem,
              remote: remoteItem
            });
          } else {
            // Same timestamp, check for actual differences
            if (JSON.stringify(remoteItem) !== JSON.stringify(localItem)) {
              conflicts.push({
                type: 'content_conflict',
                local: localItem,
                remote: remoteItem
              });
            }
          }
        } else {
          // No timestamps, assume content conflict
          if (JSON.stringify(remoteItem) !== JSON.stringify(localItem)) {
            conflicts.push({
              type: 'content_conflict',
              local: localItem,
              remote: remoteItem
            });
          }
        }
      } else {
        // New item from server
        conflicts.push({
          type: 'server_only',
          local: null,
          remote: remoteItem
        });
      }
    }

    // Check for local-only items
    for (const localItem of localData) {
      const remoteItem = remoteData.find(item => item.id === localItem.id);
      if (!remoteItem) {
        conflicts.push({
          type: 'local_only',
          local: localItem,
          remote: null
        });
      }
    }

    return conflicts;
  }

  async resolveConflict(storeName, conflict, resolution) {
    const { local, remote } = conflict;

    switch (resolution.strategy) {
      case 'use_local':
        // Keep local version, update timestamp
        await this.put(storeName, {
          ...local,
          lastModified: Date.now(),
          synced: false
        });
        break;

      case 'use_remote':
        // Use remote version
        await this.put(storeName, {
          ...remote,
          synced: true
        });
        break;

      case 'merge':
        // Merge the data (custom logic based on data type)
        const merged = await this.mergeData(storeName, local, remote, resolution.mergeRules);
        await this.put(storeName, {
          ...merged,
          lastModified: Date.now(),
          synced: false
        });
        break;

      case 'manual':
        // Store conflict for manual resolution
        await this.storeConflict(storeName, conflict);
        break;
    }
  }

  async mergeData(storeName, local, remote, mergeRules) {
    const merged = { ...local };

    // Apply merge rules
    for (const [field, rule] of Object.entries(mergeRules || {})) {
      switch (rule) {
        case 'use_remote':
          merged[field] = remote[field];
          break;
        case 'use_local':
          // Keep local value
          break;
        case 'combine':
          if (Array.isArray(local[field]) && Array.isArray(remote[field])) {
            // Combine arrays, remove duplicates
            merged[field] = [...new Set([...local[field], ...remote[field]])];
          }
          break;
        case 'latest':
          // Use the more recent value based on some criteria
          merged[field] = remote[field]; // Assume remote is newer
          break;
      }
    }

    return merged;
  }

  async storeConflict(storeName, conflict) {
    // Store unresolved conflicts for manual resolution
    const conflictData = {
      id: `conflict-${Date.now()}`,
      storeName,
      conflict,
      timestamp: Date.now()
    };

    // Use a conflicts store if it exists, otherwise create one
    try {
      await this.add('conflicts', conflictData);
    } catch (error) {
      // Conflicts store doesn't exist, create it
      console.log('Conflicts store not available, conflict stored locally');
    }
  }

  async getPendingConflicts() {
    try {
      return await this.getAll('conflicts');
    } catch (error) {
      return [];
    }
  }

  async resolveStoredConflict(conflictId, resolution) {
    const conflict = await this.get('conflicts', conflictId);
    if (conflict) {
      await this.resolveConflict(conflict.storeName, conflict.conflict, resolution);
      await this.delete('conflicts', conflictId);
    }
  }

  // Data synchronization queue methods
  async addToSyncQueue(storeName, operation, data) {
    const syncItem = {
      id: `sync-${Date.now()}-${Math.random()}`,
      storeName,
      operation, // 'add', 'put', 'delete'
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    try {
      await this.add('syncQueue', syncItem);
    } catch (error) {
      // Sync queue store doesn't exist
      console.log('Sync queue not available');
    }
  }

  async getSyncQueue() {
    try {
      return await this.getAll('syncQueue');
    } catch (error) {
      return [];
    }
  }

  async markSyncItemComplete(syncId) {
    const item = await this.get('syncQueue', syncId);
    if (item) {
      item.status = 'completed';
      await this.put('syncQueue', item);
    }
  }

  async removeFromSyncQueue(syncId) {
    await this.delete('syncQueue', syncId);
  }

  async retrySyncItem(syncId) {
    const item = await this.get('syncQueue', syncId);
    if (item) {
      item.retries += 1;
      item.status = 'pending';
      await this.put('syncQueue', item);
    }
  }
}

export default GolfDB;