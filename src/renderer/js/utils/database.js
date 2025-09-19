// Класс для работы с JSON файлами в качестве базы данных

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
    constructor() {
        this.dataPath = path.join(process.env.APPDATA || process.env.HOME, '.processcraft');
        this.dbPath = path.join(this.dataPath, 'database');
        this.init();
    }

    init() {
        // Создаем директории если их нет
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }

        // Инициализируем файлы базы данных
        this.initCollection('orders');
        this.initCollection('customers');
        this.initCollection('materials');
        this.initCollection('tasks');
        this.initCollection('notifications');
        this.initCollection('documents');
        this.initCollection('warehouse');
        this.initCollection('production');
        this.initCollection('maintenance');
        this.initCollection('analytics');
        this.initCollection('molds');
    }

    initCollection(collectionName) {
        const filePath = path.join(this.dbPath, `${collectionName}.json`);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        }
    }

    getCollectionPath(collectionName) {
        return path.join(this.dbPath, `${collectionName}.json`);
    }

    readCollection(collectionName) {
        try {
            const filePath = this.getCollectionPath(collectionName);
            let data = fs.readFileSync(filePath, 'utf8');
            // Remove BOM (Byte Order Mark) if present
            data = data.replace(/^\uFEFF/, '');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Ошибка чтения коллекции ${collectionName}:`, error);
            return [];
        }
    }

    writeCollection(collectionName, data) {
        try {
            const filePath = this.getCollectionPath(collectionName);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Ошибка записи коллекции ${collectionName}:`, error);
            return false;
        }
    }

    // Методы для работы с заказами
    async getOrders(filter = {}) {
        const orders = this.readCollection('orders');
        return this.filterData(orders, filter);
    }

    async createOrder(orderData) {
        const orders = this.readCollection('orders');
        const newOrder = {
            id: uuidv4(),
            ...orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: orderData.status || 'new'
        };
        orders.push(newOrder);
        this.writeCollection('orders', orders);
        return newOrder;
    }

    async updateOrder(orderId, updateData) {
        const orders = this.readCollection('orders');
        const orderIndex = orders.findIndex(order => order.id === orderId);
        if (orderIndex !== -1) {
            orders[orderIndex] = {
                ...orders[orderIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            this.writeCollection('orders', orders);
            return orders[orderIndex];
        }
        return null;
    }

    async deleteOrder(orderId) {
        const orders = this.readCollection('orders');
        const filteredOrders = orders.filter(order => order.id !== orderId);
        this.writeCollection('orders', filteredOrders);
        return true;
    }

    // Методы для работы с клиентами
    async getCustomers(filter = {}) {
        const customers = this.readCollection('customers');
        return this.filterData(customers, filter);
    }

    async createCustomer(customerData) {
        const customers = this.readCollection('customers');
        const newCustomer = {
            id: uuidv4(),
            ...customerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        customers.push(newCustomer);
        this.writeCollection('customers', customers);
        return newCustomer;
    }

    // Методы для работы с материалами
    async getMaterials(filter = {}) {
        const materials = this.readCollection('materials');
        return this.filterData(materials, filter);
    }

    async createMaterial(materialData) {
        const materials = this.readCollection('materials');
        const newMaterial = {
            id: uuidv4(),
            ...materialData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        materials.push(newMaterial);
        this.writeCollection('materials', materials);
        return newMaterial;
    }

    async addMaterial(materialData) {
        return await this.createMaterial(materialData);
    }

    async getMaterial(materialId) {
        const materials = this.readCollection('materials');
        return materials.find(material => material.id === materialId) || null;
    }

    async updateMaterial(materialId, updateData) {
        const materials = this.readCollection('materials');
        const materialIndex = materials.findIndex(material => material.id === materialId);
        if (materialIndex !== -1) {
            materials[materialIndex] = {
                ...materials[materialIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            this.writeCollection('materials', materials);
            return materials[materialIndex];
        }
        return null;
    }

    async deleteMaterial(materialId) {
        const materials = this.readCollection('materials');
        const filteredMaterials = materials.filter(material => material.id !== materialId);
        this.writeCollection('materials', filteredMaterials);
        return true;
    }

    // Методы для работы с задачами
    async getTasks(filter = {}) {
        const tasks = this.readCollection('tasks');
        return this.filterData(tasks, filter);
    }

    async createTask(taskData) {
        const tasks = this.readCollection('tasks');
        const newTask = {
            id: uuidv4(),
            ...taskData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: taskData.status || 'pending'
        };
        tasks.push(newTask);
        this.writeCollection('tasks', tasks);
        return newTask;
    }

    // Методы для работы с проектами форм (molds)
    async getMoldProjects(filter = {}) {
        const projects = this.readCollection('molds');
        return this.filterData(projects, filter);
    }

    async getMoldProject(projectId) {
        const projects = this.readCollection('molds');
        return projects.find(project => project.id === projectId) || null;
    }

    async addMoldProject(projectData) {
        const projects = this.readCollection('molds');
        const newProject = {
            id: uuidv4(),
            ...projectData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        projects.push(newProject);
        this.writeCollection('molds', projects);
        return newProject;
    }

    async updateMoldProject(projectId, updateData) {
        const projects = this.readCollection('molds');
        const projectIndex = projects.findIndex(project => project.id === projectId);
        if (projectIndex !== -1) {
            projects[projectIndex] = {
                ...projects[projectIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            this.writeCollection('molds', projects);
            return projects[projectIndex];
        }
        return null;
    }

    async deleteMoldProject(projectId) {
        const projects = this.readCollection('molds');
        const filteredProjects = projects.filter(project => project.id !== projectId);
        this.writeCollection('molds', filteredProjects);
        return true;
    }

    // Методы для работы с уведомлениями
    async getNotifications(filter = {}) {
        const notifications = this.readCollection('notifications');
        return this.filterData(notifications, filter);
    }

    async createNotification(notificationData) {
        const notifications = this.readCollection('notifications');
        const newNotification = {
            id: uuidv4(),
            ...notificationData,
            createdAt: new Date().toISOString(),
            read: false
        };
        notifications.unshift(newNotification);
        this.writeCollection('notifications', notifications);
        return newNotification;
    }

    async updateNotification(notificationId, updateData) {
        const notifications = this.readCollection('notifications');
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
            notifications[notificationIndex] = {
                ...notifications[notificationIndex],
                ...updateData
            };
            this.writeCollection('notifications', notifications);
            return notifications[notificationIndex];
        }
        return null;
    }

    // Методы для работы с документами
    async getDocuments(filter = {}) {
        const documents = this.readCollection('documents');
        return this.filterData(documents, filter);
    }

    async createDocument(documentData) {
        const documents = this.readCollection('documents');
        const newDocument = {
            id: uuidv4(),
            ...documentData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: documentData.version || 1
        };
        documents.push(newDocument);
        this.writeCollection('documents', documents);
        return newDocument;
    }

    // Методы для работы со складом
    async getWarehouseItems(filter = {}) {
        const warehouse = this.readCollection('warehouse');
        return this.filterData(warehouse, filter);
    }

    async getInventory(filter = {}) {
        const warehouse = this.readCollection('warehouse');
        return this.filterData(warehouse, filter);
    }

    async addInventoryItem(itemData) {
        const warehouse = this.readCollection('warehouse');
        const newItem = {
            id: uuidv4(),
            ...itemData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        warehouse.push(newItem);
        this.writeCollection('warehouse', warehouse);
        return newItem;
    }

    async updateWarehouseItem(itemId, updateData) {
        const warehouse = this.readCollection('warehouse');
        const itemIndex = warehouse.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            warehouse[itemIndex] = {
                ...warehouse[itemIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            this.writeCollection('warehouse', warehouse);
            return warehouse[itemIndex];
        }
        return null;
    }

    async deleteInventoryItem(itemId) {
        const warehouse = this.readCollection('warehouse');
        const filteredWarehouse = warehouse.filter(item => item.id !== itemId);
        this.writeCollection('warehouse', filteredWarehouse);
        return true;
    }

    // Методы для работы с производством
    async getProductionData(filter = {}) {
        const production = this.readCollection('production');
        return this.filterData(production, filter);
    }

    async createProductionRecord(recordData) {
        const production = this.readCollection('production');
        const newRecord = {
            id: uuidv4(),
            ...recordData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        production.push(newRecord);
        this.writeCollection('production', production);
        return newRecord;
    }

    // Методы для работы с РММ
    async getMaintenanceRecords(filter = {}) {
        const maintenance = this.readCollection('maintenance');
        return this.filterData(maintenance, filter);
    }

    async getMaintenanceTasks(filter = {}) {
        const tasks = this.readCollection('maintenance');
        return this.filterData(tasks, filter);
    }

    async createMaintenanceRecord(recordData) {
        const maintenance = this.readCollection('maintenance');
        const newRecord = {
            id: uuidv4(),
            ...recordData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        maintenance.push(newRecord);
        this.writeCollection('maintenance', maintenance);
        return newRecord;
    }

    // Методы для работы с пресс-формами
    async getMoldProjects(filter = {}) {
        const molds = this.readCollection('molds');
        return this.filterData(molds, filter);
    }

    async createMoldProject(projectData) {
        const molds = this.readCollection('molds');
        const newProject = {
            id: uuidv4(),
            ...projectData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: projectData.status || 'planning'
        };
        molds.push(newProject);
        this.writeCollection('molds', molds);
        return newProject;
    }

    async updateMoldProject(projectId, updateData) {
        const molds = this.readCollection('molds');
        const projectIndex = molds.findIndex(project => project.id === projectId);
        if (projectIndex !== -1) {
            molds[projectIndex] = {
                ...molds[projectIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            this.writeCollection('molds', molds);
            return molds[projectIndex];
        }
        return null;
    }

    async deleteMoldProject(projectId) {
        const molds = this.readCollection('molds');
        const filteredMolds = molds.filter(project => project.id !== projectId);
        this.writeCollection('molds', filteredMolds);
        return true;
    }
    async getAnalyticsData(filter = {}) {
        const analytics = this.readCollection('analytics');
        return this.filterData(analytics, filter);
    }

    async saveAnalyticsData(data) {
        const analytics = this.readCollection('analytics');
        const newData = {
            id: uuidv4(),
            ...data,
            createdAt: new Date().toISOString()
        };
        analytics.push(newData);
        this.writeCollection('analytics', analytics);
        return newData;
    }

    // Утилиты
    filterData(data, filter) {
        return data.filter(item => {
            for (const [key, value] of Object.entries(filter)) {
                if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }

    // Резервное копирование
    async backup() {
        const backupPath = path.join(this.dataPath, `backup_${Date.now()}.zip`);
        // Здесь будет логика создания резервной копии
        console.log('Создание резервной копии:', backupPath);
        return backupPath;
    }

    // Восстановление из резервной копии
    async restore(backupPath) {
        // Здесь будет логика восстановления из резервной копии
        console.log('Восстановление из резервной копии:', backupPath);
        return true;
    }

    // Экспорт данных
    async exportData(collectionName, format = 'json') {
        const data = this.readCollection(collectionName);
        const exportPath = path.join(this.dataPath, `${collectionName}_export_${Date.now()}.${format}`);
        
        if (format === 'json') {
            fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
        } else if (format === 'csv') {
            // Здесь будет логика экспорта в CSV
        }
        
        return exportPath;
    }

    // Импорт данных
    async importData(collectionName, filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const importedData = JSON.parse(data);
            this.writeCollection(collectionName, importedData);
            return true;
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            return false;
        }
    }

    // Методы для аналитики
    async getAnalyticsData(filter = {}) {
        const analytics = this.readCollection('analytics');
        return this.filterData(analytics, filter);
    }

    async saveAnalyticsData(data) {
        const analytics = this.readCollection('analytics');
        const newData = {
            id: uuidv4(),
            ...data,
            createdAt: new Date().toISOString()
        };
        analytics.push(newData);
        this.writeCollection('analytics', analytics);
        return newData;
    }
}

// CommonJS export for Node.js/Electron
module.exports = Database;

// ES6 export for browser modules
if (typeof window !== 'undefined') {
    window.Database = Database;
}

// Try to export as ES6 module if possible
if (typeof module === 'undefined') {
    // Browser environment - make it globally available
    window.Database = Database;
} else {
    // Node.js environment
    module.exports = Database;
}


