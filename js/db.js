// Sticks - IndexedDB Database Module
const DB_NAME = 'sticks_db';
const DB_VERSION = 1;

class SticksDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          const templates = db.createObjectStore('templates', { keyPath: 'id', autoIncrement: true });
          templates.createIndex('name', 'name', { unique: false });
          templates.createIndex('category', 'category', { unique: false });
        }
        
        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const products = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
          products.createIndex('sku', 'sku', { unique: true });
          products.createIndex('barcode', 'barcode', { unique: false });
        }
        
        // Print jobs store
        if (!db.objectStoreNames.contains('printJobs')) {
          const printJobs = db.createObjectStore('printJobs', { keyPath: 'id', autoIncrement: true });
          printJobs.createIndex('date', 'date', { unique: false });
          printJobs.createIndex('status', 'status', { unique: false });
        }
        
        // AI training data store
        if (!db.objectStoreNames.contains('aiData')) {
          const aiData = db.createObjectStore('aiData', { keyPath: 'id', autoIncrement: true });
          aiData.createIndex('type', 'type', { unique: false });
          aiData.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Locations store (for map)
        if (!db.objectStoreNames.contains('locations')) {
          const locations = db.createObjectStore('locations', { keyPath: 'id', autoIncrement: true });
          locations.createIndex('type', 'type', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Generic CRUD
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async query(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Settings helpers
  async getSetting(key, defaultValue = null) {
    const result = await this.get('settings', key);
    return result ? result.value : defaultValue;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  // Export/Import
  async exportAll() {
    const data = {
      templates: await this.getAll('templates'),
      products: await this.getAll('products'),
      printJobs: await this.getAll('printJobs'),
      aiData: await this.getAll('aiData'),
      locations: await this.getAll('locations'),
      settings: await this.getAll('settings'),
      exportDate: new Date().toISOString()
    };
    return data;
  }

  async importAll(data) {
    const tx = this.db.transaction(['templates', 'products', 'printJobs', 'aiData', 'locations', 'settings'], 'readwrite');
    
    for (const template of data.templates || []) {
      tx.objectStore('templates').put(template);
    }
    for (const product of data.products || []) {
      tx.objectStore('products').put(product);
    }
    for (const job of data.printJobs || []) {
      tx.objectStore('printJobs').put(job);
    }
    for (const item of data.aiData || []) {
      tx.objectStore('aiData').put(item);
    }
    for (const loc of data.locations || []) {
      tx.objectStore('locations').put(loc);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

window.SticksDB = SticksDB;