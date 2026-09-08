/**
 * Mock implementation of localforage for testing in Node.js environment
 * Provides in-memory storage without requiring IndexedDB or localStorage
 */

class MockLocalForageInstance {
    constructor(config = {}) {
        this.config = config;
        this._store = new Map();
        this.name = config.name || 'default';
        this.storeName = config.storeName || 'default';
    }

    async getItem(key) {
        return this._store.get(key) ?? null;
    }

    async setItem(key, value) {
        this._store.set(key, value);
        return value;
    }

    async removeItem(key) {
        this._store.delete(key);
        return undefined;
    }

    async clear() {
        this._store.clear();
        return undefined;
    }

    async key(index) {
        const keys = Array.from(this._store.keys());
        return keys[index] ?? null;
    }

    async keys() {
        return Array.from(this._store.keys());
    }

    async length() {
        return this._store.size;
    }

    async iterate(callback) {
        for (const [key, value] of this._store.entries()) {
            const result = callback(value, key, this);
            if (result === false) {
                break;
            }
        }
    }
}

const mockLocalforage = {
    INDEXEDDB: 'asyncStorage',
    LOCALSTORAGE: 'localStorage',
    WEBSQL: 'webSQLStorage',

    _instances: new Map(),

    createInstance(config = {}) {
        const instance = new MockLocalForageInstance(config);
        const key = config.name || 'default';
        this._instances.set(key, instance);
        return instance;
    },

    async getItem(key) {
        // Default instance
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').getItem(key);
    },

    async setItem(key, value) {
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').setItem(key, value);
    },

    async removeItem(key) {
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').removeItem(key);
    },

    async clear() {
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').clear();
    },

    async key(index) {
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').key(index);
    },

    async keys() {
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').keys();
    },

    async length() {
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').length();
    },

    async iterate(callback) {
        if (!this._instances.has('default')) {
            this._instances.set('default', new MockLocalForageInstance());
        }
        return this._instances.get('default').iterate(callback);
    },

    setDriver(drivers) {
        // No-op in mock
    },

    driver() {
        return 'asyncStorage';
    },

    ready() {
        return Promise.resolve();
    },

    supports(driver) {
        return true;
    },
};

export default mockLocalforage;
