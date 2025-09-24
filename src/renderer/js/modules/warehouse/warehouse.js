// Warehouse module

class WarehouseModule {
    constructor(options = {}) {
        this.moduleId = options.moduleId || 'warehouse';
        this.meta = options.meta || {};
        this.loader = options.loader || null;
        
        this.db = null;
        this.currentItem = null;
        this._initialized = false;
        
        console.log(`[${this.moduleId}] Module constructor executed`);
    }

    async init() {
        if (this._initialized) return;
        
        try {
            console.log(`[${this.moduleId}] Starting module initialization`);
            
            await this.initDatabase();
            this.render();
            this.setupEventListeners();
            await this.loadInventory();
            
            this._initialized = true;
            console.log(`[${this.moduleId}] Module successfully initialized`);
        } catch (error) {
            console.error(`[${this.moduleId}] Initialization error:`, error);
            throw error;
        }
    }

    async initDatabase() {
        try {
            // Check for global Database instance
            if (window.Database) {
                this.db = new window.Database();
            } else {
                // Fallback: import Database if available
                const { Database } = await import('../../utils/database.js');
                this.db = new Database();
            }
            
            console.log(`[${this.moduleId}] Database initialized`);
            
        } catch (error) {
            console.warn(`[${this.moduleId}] Database initialization error:`, error);
            // Create a stub for working without DB
            this.db = {
                getInventory: () => Promise.resolve([]),
                addInventoryItem: () => Promise.resolve({ success: true }),
                deleteInventoryItem: () => Promise.resolve({ success: true })
            };
        }
    }

    render() {
        const moduleElement = document.getElementById('warehouse-module');
        moduleElement.innerHTML = `
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-semibold text-white">Warehouse Module</h1>
                        <p class="text-white/60">Material accounting, balances, invoices</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="add-inventory-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            + Receipt
                        </button>
                        <button id="create-invoice-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            + Invoice
                        </button>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Total positions</div>
                        <div class="mt-2 text-2xl font-semibold text-white" id="total-items">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Critical balance</div>
                        <div class="mt-2 text-2xl font-semibold text-red-400" id="critical-items">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Expected delivery</div>
                        <div class="mt-2 text-2xl font-semibold text-amber-400" id="pending-delivery">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Warehouse value</div>
                        <div class="mt-2 text-2xl font-semibold text-green-400" id="total-value">₽0</div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Inventory List -->
                    <div class="lg:col-span-1">
                        <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-medium text-white">Warehouse positions</h3>
                                <input type="text" id="inventory-search" placeholder="Search..." 
                                       class="h-8 px-3 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-white/40">
                            </div>
                            <div id="inventory-list" class="space-y-2 max-h-96 overflow-y-auto">
                                <!-- Inventory items will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Item Details -->
                    <div class="lg:col-span-2">
                        <div id="item-details" class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="text-center text-white/40 py-8">
                                Select a position to view details
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Transactions -->
                <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                    <h3 class="text-lg font-medium text-white mb-4">Recent transactions</h3>
                    <div id="transactions-list" class="space-y-3">
                        <!-- Transactions will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add inventory button
        document.getElementById('add-inventory-btn')?.addEventListener('click', () => {
            this.showAddInventoryModal();
        });

        // Create invoice button
        document.getElementById('create-invoice-btn')?.addEventListener('click', () => {
            this.showCreateInvoiceModal();
        });

        // Inventory search
        document.getElementById('inventory-search')?.addEventListener('input', (e) => {
            this.filterInventory(e.target.value);
        });
    }

    async loadInventory() {
        try {
            const inventory = await this.db.getInventory();
            this.renderInventoryList(inventory);
            this.updateStatistics(inventory);
        } catch (error) {
            console.error('Error loading warehouse data:', error);
        }
    }

    renderInventoryList(inventory) {
        const listElement = document.getElementById('inventory-list');
        if (!listElement) return;

        if (inventory.length === 0) {
            listElement.innerHTML = '<div class="text-center text-white/40 py-4">No warehouse positions</div>';
            return;
        }

        listElement.innerHTML = inventory.map(item => {
            const stockLevel = this.getStockLevel(item.quantity, item.minQuantity);
            const stockClass = stockLevel === 'critical' ? 'text-red-400' : 
                              stockLevel === 'low' ? 'text-amber-400' : 'text-green-400';
            
            return `
                <div class="inventory-item p-3 rounded-lg border border-white/5 hover:border-white/15 hover:bg-white/5 cursor-pointer transition-colors" 
                     data-item-id="${item.id}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="font-medium text-white">${item.name}</div>
                            <div class="text-sm text-white/60">${item.code}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm ${stockClass} font-medium">${item.quantity} ${item.unit}</div>
                            <div class="text-xs text-white/40">мин: ${item.minQuantity}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        listElement.querySelectorAll('.inventory-item').forEach(item => {
            item.addEventListener('click', () => {
                const itemId = item.dataset.itemId;
                this.selectInventoryItem(itemId);
            });
        });
    }

    getStockLevel(quantity, minQuantity) {
        if (quantity <= minQuantity * 0.5) return 'critical';
        if (quantity <= minQuantity) return 'low';
        return 'normal';
    }

    updateStatistics(inventory) {
        const totalItems = inventory.length;
        const criticalItems = inventory.filter(item => 
            this.getStockLevel(item.quantity, item.minQuantity) === 'critical'
        ).length;
        const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('critical-items').textContent = criticalItems;
        document.getElementById('total-value').textContent = `₽${totalValue.toLocaleString()}`;
    }

    async selectInventoryItem(itemId) {
        try {
            const item = await this.db.getInventoryItem(itemId);
            this.currentItem = item;
            this.renderItemDetails(item);
            
            // Update active state
            document.querySelectorAll('.inventory-item').forEach(item => {
                item.classList.remove('border-white/20', 'bg-white/10');
            });
            document.querySelector(`[data-item-id="${itemId}"]`)?.classList.add('border-white/20', 'bg-white/10');
        } catch (error) {
            console.error('Error loading position:', error);
        }
    }

    renderItemDetails(item) {
        const detailsElement = document.getElementById('item-details');
        if (!detailsElement) return;

        const stockLevel = this.getStockLevel(item.quantity, item.minQuantity);
        const stockClass = stockLevel === 'critical' ? 'text-red-400' : 
                          stockLevel === 'low' ? 'text-amber-400' : 'text-green-400';

        detailsElement.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-white">${item.name}</h3>
                    <div class="flex gap-2">
                        <button onclick="window.app.modules.warehouse.adjustStock('${item.id}')" 
                                class="h-8 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            Adjustment
                        </button>
                        <button onclick="window.app.modules.warehouse.deleteItem('${item.id}')" 
                                class="h-8 px-3 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/10 text-sm text-red-400">
                            Delete
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-white/60">Код</label>
                        <div class="text-white">${item.code}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Категория</label>
                        <div class="text-white">${item.category}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Количество</label>
                        <div class="text-lg ${stockClass} font-semibold">${item.quantity} ${item.unit}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Минимальный остаток</label>
                        <div class="text-white">${item.minQuantity} ${item.unit}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Цена за единицу</label>
                        <div class="text-white">₽${item.price?.toLocaleString() || '0'}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Total cost</label>
                        <div class="text-white">₽${(item.quantity * (item.price || 0)).toLocaleString()}</div>
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Description</label>
                    <div class="text-white mt-1">${item.description || 'No description'}</div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Warehouse location</label>
                    <div class="text-white mt-1">${item.location || 'Not specified'}</div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Transaction history</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderTransactionHistory(item.transactions)}
                    </div>
                </div>
            </div>
        `;
    }

    renderTransactionHistory(transactions) {
        if (!transactions || transactions.length === 0) {
            return '<div class="text-white/40">No transaction history</div>';
        }

        return transactions.slice(0, 5).map(transaction => `
            <div class="flex justify-between items-center p-2 rounded-lg border border-white/5">
                <div>
                    <span class="text-white">${transaction.type === 'in' ? 'Receipt' : 'Expense'}</span>
                    <span class="text-white/60 text-sm ml-2">${transaction.quantity} ${transaction.unit}</span>
                </div>
                <div class="text-white/40 text-sm">${new Date(transaction.date).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    filterInventory(searchTerm) {
        const items = document.querySelectorAll('.inventory-item');
        items.forEach(item => {
            const itemName = item.querySelector('.font-medium').textContent.toLowerCase();
            const itemCode = item.querySelector('.text-sm').textContent.toLowerCase();
            const matches = itemName.includes(searchTerm.toLowerCase()) || 
                           itemCode.includes(searchTerm.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    showAddInventoryModal() {
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-white">Warehouse Receipt</h3>
                <form id="add-inventory-form" class="space-y-3">
                    <div>
                        <label class="text-sm text-white/60">Name</label>
                        <input type="text" name="name" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Код</label>
                        <input type="text" name="code" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-sm text-white/60">Количество</label>
                            <input type="number" name="quantity" required min="0" step="0.01"
                                   class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                        </div>
                        <div>
                            <label class="text-sm text-white/60">Unit of measure</label>
                            <select name="unit" required 
                                    class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                                <option value="">Select</option>
                                <option value="шт">pcs</option>
                                <option value="кг">kg</option>
                                <option value="м">m</option>
                                <option value="л">l</option>
                                <option value="м²">m²</option>
                                <option value="м³">m³</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-sm text-white/60">Минимальный остаток</label>
                            <input type="number" name="minQuantity" required min="0" step="0.01"
                                   class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                        </div>
                        <div>
                            <label class="text-sm text-white/60">Цена за единицу</label>
                            <input type="number" name="price" min="0" step="0.01"
                                   class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                        </div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Категория</label>
                        <select name="category" required 
                                class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                            <option value="">Select category</option>
                            <option value="materials">Materials</option>
                            <option value="tools">Tools</option>
                            <option value="equipment">Equipment</option>
                            <option value="consumables">Consumables</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Location</label>
                        <input type="text" name="location" 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Description</label>
                        <textarea name="description" rows="3" 
                                  class="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white"></textarea>
                    </div>
                </form>
                <div class="flex justify-end gap-2">
                    <button onclick="window.app.closeModal()" 
                            class="h-9 px-4 rounded-lg border border-white/10 hover:bg-white/5 text-sm">
                        Cancel
                    </button>
                    <button onclick="window.app.modules.warehouse.saveInventory()" 
                            class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                        Save
                    </button>
                </div>
            </div>
        `;
        
        window.app.showModal(modalContent);
    }

    async saveInventory() {
        const form = document.getElementById('add-inventory-form');
        const formData = new FormData(form);
        
        const inventoryData = {
            name: formData.get('name'),
            code: formData.get('code'),
            quantity: parseFloat(formData.get('quantity')),
            unit: formData.get('unit'),
            minQuantity: parseFloat(formData.get('minQuantity')),
            price: parseFloat(formData.get('price')) || 0,
            category: formData.get('category'),
            location: formData.get('location'),
            description: formData.get('description'),
            createdAt: new Date().toISOString(),
            transactions: [{
                type: 'in',
                quantity: parseFloat(formData.get('quantity')),
                unit: formData.get('unit'),
                date: new Date().toISOString(),
                description: 'Initial receipt'
            }]
        };

        try {
            await this.db.addInventoryItem(inventoryData);
            window.app.closeModal();
            this.loadInventory();
            window.app.showMessage('Position successfully added to warehouse', 'success');
        } catch (error) {
            console.error('Error saving position:', error);
            window.app.showMessage('Error saving position', 'error');
        }
    }

    showCreateInvoiceModal() {
        // Implementation for creating warehouse invoices
        console.log('Create invoice modal window');
    }

    async adjustStock(itemId) {
        // Implementation for stock adjustment
        console.log('Stock adjustment for position:', itemId);
    }

    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this position?')) {
            try {
                await this.db.deleteInventoryItem(itemId);
                this.loadInventory();
                document.getElementById('item-details').innerHTML = `
                    <div class="text-center text-white/40 py-8">
                        Select a position to view details
                    </div>
                `;
                window.app.showMessage('Position deleted', 'success');
            } catch (error) {
                console.error('Error deleting position:', error);
                window.app.showMessage('Error deleting position', 'error');
            }
        }
    }

    async destroy() {
        try {
            console.log(`[${this.moduleId}] Module destruction`);
            
            // Cleaning up event handlers
            // (in a real application, references to handlers should be saved for removal)
            
            // Releasing resources
            this.db = null;
            this.currentItem = null;
            this._initialized = false;
            
            console.log(`[${this.moduleId}] Module destroyed`);
            
        } catch (error) {
            console.error(`[${this.moduleId}] Error during module destruction:`, error);
        }
    }

    /**
     * Static module metadata (alternative to .meta.json)
     * Used by loader if no .meta.json file exists
     */
    static get meta() {
        return {
            moduleId: 'warehouse',
            moduleName: 'Warehouse Module',
            version: '1.0.0',
            description: 'Module for warehouse management and inventory',
            dependencies: ['database'],
            author: 'ProcessCraft Team',
            enabled: true
        };
    }
}

// Module export for ES6 import
export default WarehouseModule;

// Global availability for compatibility with existing code
window.WarehouseModule = WarehouseModule;
