// ============================================
// MIS PEDIDOS - REPARTIDOR
// ============================================

let currentDriver = null;
let driverData = null;
let myOrders = [];
let filteredOrders = [];
let currentFilter = 'all';
let unsubscribe = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    
    // Inicializar Firebase
    const firebaseInitialized = initializeFirebase();
    
    if (!firebaseInitialized) {
        console.error('Error al inicializar Firebase');
        showMessage('Error al conectar con el servidor', 'error');
        return;
    }
    
    // Verificar autenticación
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentDriver = user;
            await loadDriverData();
            await loadMyOrders();
        } else {
            window.location.href = 'driver-login.html';
        }
    });
});

// ============================================
// CARGAR DATOS DEL REPARTIDOR
// ============================================

async function loadDriverData() {
    try {
        const db = firebase.firestore();
        const driverDoc = await db.collection('repartidores').doc(currentDriver.uid).get();
        
        if (!driverDoc.exists) {
            showMessage('No se encontraron datos del repartidor', 'error');
            setTimeout(() => {
                window.location.href = 'driver-login.html';
            }, 2000);
            return;
        }
        
        driverData = driverDoc.data();
        console.log('✅ Datos del repartidor cargados');
        
    } catch (error) {
        console.error('Error al cargar datos del repartidor:', error);
        showMessage('Error al cargar tus datos', 'error');
    }
}

// ============================================
// CARGAR MIS PEDIDOS
// ============================================

async function loadMyOrders() {
    const db = firebase.firestore();
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const ordersList = document.getElementById('ordersList');
    
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    ordersList.innerHTML = '';
    
    try {
        // Escuchar pedidos asignados a este repartidor en tiempo real
        unsubscribe = db.collection('orders')
            .where('driverId', '==', currentDriver.uid)
            .onSnapshot((snapshot) => {
                myOrders = [];
                
                snapshot.forEach((doc) => {
                    myOrders.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Ordenar manualmente por fecha
                myOrders.sort((a, b) => {
                    const dateA = a.acceptedAt ? a.acceptedAt.toMillis() : 0;
                    const dateB = b.acceptedAt ? b.acceptedAt.toMillis() : 0;
                    return dateB - dateA;
                });
                
                console.log('✅ Mis pedidos cargados:', myOrders.length);
                
                loadingState.style.display = 'none';
                applyFilter();
                updateStats();
                
            }, (error) => {
                console.error('❌ Error al cargar pedidos:', error);
                loadingState.style.display = 'none';
                showMessage('Error al cargar pedidos', 'error');
            });
        
    } catch (error) {
        console.error('Error:', error);
        loadingState.style.display = 'none';
        showMessage('Error al cargar pedidos', 'error');
    }
}

// ============================================
// FILTRAR PEDIDOS
// ============================================

window.filterByStatus = function(status) {
    currentFilter = status;
    
    // Actualizar botones
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-status="${status}"]`).classList.add('active');
    
    applyFilter();
};

function applyFilter() {
    if (currentFilter === 'all') {
        filteredOrders = myOrders;
    } else {
        filteredOrders = myOrders.filter(order => order.status === currentFilter);
    }
    
    renderOrders();
}

// ============================================
// RENDERIZAR PEDIDOS
// ============================================

function renderOrders() {
    const ordersList = document.getElementById('ordersList');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredOrders.length === 0) {
        ordersList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    ordersList.style.display = 'flex';
    ordersList.innerHTML = '';
    
    filteredOrders.forEach((order, index) => {
        const orderCard = createOrderCard(order, index);
        ordersList.appendChild(orderCard);
    });
}

function createOrderCard(order, index) {
    const card = document.createElement('div');
    card.className = `order-card ${order.status}`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    const orderId = order.id.substring(0, 8).toUpperCase();
    const statusConfig = getStatusConfig(order.status);
    
    // Botones según el estado
    let actionsHTML = '';
    
    if (order.status === 'aceptado') {
        actionsHTML = `
            <div class="order-actions">
                <button class="action-btn btn-call" onclick="callCustomer('${order.customerPhone || order.customerEmail}')">
                    📞 Llamar
                </button>
                <button class="action-btn btn-primary" onclick="startDelivery('${order.id}')">
                    🚗 En Camino
                </button>
            </div>
        `;
    } else if (order.status === 'en_camino') {
        actionsHTML = `
            <div class="order-actions">
                <button class="action-btn btn-call" onclick="callCustomer('${order.customerPhone || order.customerEmail}')">
                    📞 Llamar
                </button>
                <button class="action-btn btn-primary" onclick="openMap('${order.id}')">
                    🗺️ Ver Mapa
                </button>
            </div>
            <div style="margin-top: 10px;">
                <button class="action-btn btn-success" onclick="completeDelivery('${order.id}')" style="width: 100%;">
                    ✓ Marcar Entregado
                </button>
            </div>
        `;
    } else if (order.status === 'entregado') {
        const deliveredTime = order.deliveredAt ? formatTimeAgo(order.deliveredAt.toDate()) : 'Hace un momento';
        actionsHTML = `
            <div style="padding: 10px; background: #e8f5e9; border-radius: 8px; text-align: center;">
                <span style="color: #4CAF50; font-size: 13px; font-weight: 600;">
                    ✓ Entregado ${deliveredTime}
                </span>
            </div>
        `;
    }
    
    // Vista previa de items
    const itemsPreview = order.items.slice(0, 2).map(item => `
        <div class="item-preview">
            <span class="item-name">${item.name}</span>
            <span class="item-quantity">x${item.quantity}</span>
        </div>
    `).join('');
    
    const moreItems = order.items.length > 2 ? `<div class="item-preview"><span class="item-name" style="color: #1976d2;">${order.items.length - 2} más...</span></div>` : '';
    
    card.innerHTML = `
        <div class="order-header">
            <div>
                <p class="order-id">Pedido #${orderId}</p>
                <h3 class="order-customer">${order.customerName}</h3>
            </div>
            <div class="order-total">
                <p class="total-label">Total</p>
                <p class="total-amount">$${order.total.toFixed(2)}</p>
            </div>
        </div>
        
        <div class="order-status ${statusConfig.class}">
            <span class="status-icon"></span>
            ${statusConfig.label}
        </div>
        
        <div class="order-items-summary">
            <p class="items-count">${order.items.length} producto${order.items.length > 1 ? 's' : ''}</p>
            <div class="items-preview">
                ${itemsPreview}
                ${moreItems}
            </div>
        </div>
        
        <div class="order-address">
            <svg class="address-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div class="address-text">
                ${order.deliveryLocation.address}
                ${order.deliveryLocation.notes ? `<div style="font-size: 12px; color: #9e9e9e; margin-top: 4px;">Nota: ${order.deliveryLocation.notes}</div>` : ''}
            </div>
        </div>
        
        ${actionsHTML}
    `;
    
    return card;
}

function getStatusConfig(status) {
    const configs = {
        'aceptado': {
            label: 'Aceptado',
            class: 'status-aceptado',
            color: '#2196F3'
        },
        'en_camino': {
            label: 'En Camino',
            class: 'status-en_camino',
            color: '#9c27b0'
        },
        'entregado': {
            label: 'Entregado',
            class: 'status-entregado',
            color: '#4CAF50'
        }
    };
    
    return configs[status] || configs['aceptado'];
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================

function updateStats() {
    // Pedidos activos (aceptado + en_camino)
    const activeCount = myOrders.filter(o => 
        o.status === 'aceptado' || o.status === 'en_camino'
    ).length;
    document.getElementById('activeOrders').textContent = activeCount;
    
    // Completados hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = myOrders.filter(o => {
        if (o.status !== 'entregado' || !o.deliveredAt) return false;
        const deliveredDate = o.deliveredAt.toDate();
        return deliveredDate >= today;
    }).length;
    document.getElementById('completedToday').textContent = completedToday;
    
    // Ganancia del día ($0.25 por pedido entregado)
    const COMISION_POR_PEDIDO = 0.25;
    const earningsToday = completedToday * COMISION_POR_PEDIDO;
    document.getElementById('earningsToday').textContent = `$${earningsToday.toFixed(2)}`;
}

// ============================================
// ACCIONES DE PEDIDOS
// ============================================

window.startDelivery = async function(orderId) {
    try {
        const db = firebase.firestore();
        
        await db.collection('orders').doc(orderId).update({
            status: 'en_camino',
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('Estado actualizado: En camino', 'success');
        
        // Abrir mapa automáticamente
        setTimeout(() => {
            openMap(orderId);
        }, 1000);
        
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        showMessage('Error al actualizar el estado', 'error');
    }
};

window.openMap = function(orderId) {
    window.location.href = `driver-map.html?orderId=${orderId}`;
};

window.completeDelivery = function(orderId) {
    // Confirmar entrega
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'confirmDeliveryModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 350px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 15px;">✓</div>
            <h3 style="font-size: 20px; font-weight: 700; color: #2c2c2c; margin-bottom: 10px;">
                ¿Confirmar Entrega?
            </h3>
            <p style="font-size: 14px; color: #5f6368; margin-bottom: 25px;">
                ¿El pedido fue entregado correctamente al cliente?
            </p>
            
            <div style="display: flex; gap: 10px;">
                <button 
                    onclick="closeModal('confirmDeliveryModal')"
                    style="
                        flex: 1;
                        padding: 12px;
                        background: #f5f5f5;
                        border: none;
                        border-radius: 10px;
                        color: #5f6368;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                    "
                >
                    Cancelar
                </button>
                <button 
                    onclick="confirmComplete('${orderId}')"
                    style="
                        flex: 1;
                        padding: 12px;
                        background: linear-gradient(135deg, #4CAF50 0%, #43a047 100%);
                        border: none;
                        border-radius: 10px;
                        color: white;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
                    "
                >
                    Confirmar
                </button>
            </div>
        </div>
    `;
    
    addModalStyles();
    document.body.appendChild(modal);
};

window.confirmComplete = async function(orderId) {
    closeModal('confirmDeliveryModal');
    
    try {
        const db = firebase.firestore();
        
        await db.collection('orders').doc(orderId).update({
            status: 'entregado',
            deliveredAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('¡Pedido completado! 🎉', 'success');
        
    } catch (error) {
        console.error('Error al completar pedido:', error);
        showMessage('Error al completar el pedido', 'error');
    }
};

window.callCustomer = function(contact) {
    // Intentar llamar si es un número, sino mostrar contacto
    if (contact && contact.match(/^\d{10}$/)) {
        window.location.href = `tel:${contact}`;
    } else {
        showMessage(`Contacto: ${contact}`, 'info');
    }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function formatTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // segundos
    
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} días`;
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && modal.parentNode) {
        document.body.removeChild(modal);
    }
};

function addModalStyles() {
    if (!document.head.querySelector('style[data-modal]')) {
        const modalStyles = document.createElement('style');
        modalStyles.setAttribute('data-modal', 'true');
        modalStyles.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 3000;
                animation: fadeIn 0.3s ease;
                padding: 20px;
            }
            .modal-content {
                background: #ffffff;
                border-radius: 20px;
                padding: 25px;
                width: 100%;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(modalStyles);
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 25px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        animation: slideDown 0.3s ease;
        font-size: 14px;
        font-weight: 500;
        max-width: 90%;
        text-align: center;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            document.body.removeChild(messageDiv);
        }
    }, 3000);
}

// Limpiar listener al salir
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

console.log('✅ Mis pedidos inicializado');
