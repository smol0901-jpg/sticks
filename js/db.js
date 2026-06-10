// Sticks - Database Module (IndexedDB wrapper)
const DB_NAME = 'sticks_db';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('DB open error:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        console.log('DB opened');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('DB upgrade needed');
        
        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
        
        // Products store
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        
        // Print jobs store
        if (!db.objectStoreNames.contains('prints')) {
          db.createObjectStore('prints', { keyPath: 'id' });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // AI data store
        if (!db.objectStoreNames.contains('aiData')) {
          db.createObjectStore('aiData', { keyPath: 'id' });
        }
      };
    });
  }

  // Add record
  async add(store, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const objStore = tx.objectStore(store);
      const request = objStore.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Put record (add or update)
  async put(store, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const objStore = tx.objectStore(store);
      const request = objStore.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get record by key
  async get(store, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const objStore = tx.objectStore(store);
      const request = objStore.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all records
  async getAll(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const objStore = tx.objectStore(store);
      const request = objStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete record
  async delete(store, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const objStore = tx.objectStore(store);
      const request = objStore.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear store
  async clearStore(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const objStore = tx.objectStore(store);
      const request = objStore.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all stores
  async clear() {
    await this.clearStore('templates');
    await this.clearStore('products');
    await this.clearStore('prints');
    await this.clearStore('settings');
    await this.clearStore('aiData');
  }

  // Count records
  async count(store) {
    const items = await this.getAll(store);
    return items.length;
  }

  // Get setting
  async getSetting(key, defaultValue = null) {
    const setting = await this.get('settings', key);
    return setting ? setting.value : defaultValue;
  }

  // Set setting
  async setSetting(key, value) {
    await this.put('settings', { key, value });
  }

  // Import all data
  async importAll(data) {
    if (data.templates) {
      for (const item of data.templates) {
        await this.put('templates', item);
      }
    }
    if (data.products) {
      for (const item of data.products) {
        await this.put('products', item);
      }
    }
    if (data.prints) {
      for (const item of data.prints) {
        await this.put('prints', item);
      }
    }
    if (data.settings) {
      for (const item of data.settings) {
        await this.put('settings', item);
      }
    }
  }
}

// Alias for compatibility
window.SticksDB = Database;
window.Database = Database;