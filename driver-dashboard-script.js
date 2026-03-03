// ============================================
// DASHBOARD REPARTIDOR - ÑAN DELIVERY
// ============================================

let currentDriver = null;
let driverData = null;
let availableOrders = [];
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
            await loadAvailableOrders();
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
        
        // Verificar que esté activo
        if (driverData.status !== 'activo') {
            showMessage('Tu cuenta no está activa. Contacta a soporte.', 'error');
            setTimeout(() => {
                firebase.auth().signOut();
                window.location.href = 'driver-login.html';
            }, 3000);
            return;
        }
        
        // Mostrar información del repartidor
        displayDriverInfo();
        
        // Cargar y mostrar comisiones
        await loadEarnings();
        
        // Actualizar estado online
        await db.collection('repartidores').doc(currentDriver.uid).update({
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Datos del repartidor cargados');
        
    } catch (error) {
        console.error('Error al cargar datos del repartidor:', error);
        showMessage('Error al cargar tus datos', 'error');
    }
}

function displayDriverInfo() {
    // Avatar
    const avatar = document.getElementById('driverAvatar');
    if (driverData.photoURL) {
        avatar.innerHTML = `<img src="${driverData.photoURL}" alt="Avatar">`;
    } else {
        const initial = driverData.nombre ? driverData.nombre.charAt(0).toUpperCase() : '?';
        avatar.innerHTML = `<span style="font-size: 30px; color: white; font-weight: 700;">${initial}</span>`;
    }
    
    // Nombre
    document.getElementById('driverName').textContent = driverData.nombre;
}

// ============================================
// CARGAR COMISIONES
// ============================================

async function loadEarnings() {
    try {
        const db = firebase.firestore();
        const COMISION_POR_PEDIDO = 0.25;
        
        // Obtener pedidos entregados de esta semana
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
        startOfWeek.setHours(0, 0, 0, 0);
        
        const snapshot = await db.collection('orders')
            .where('driverId', '==', currentDriver.uid)
            .where('status', '==', 'entregado')
            .get();
        
        // Filtrar pedidos de esta semana
        let weeklyCount = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.deliveredAt) {
                const deliveredDate = data.deliveredAt.toDate();
                if (deliveredDate >= startOfWeek) {
                    weeklyCount++;
                }
            }
        });
        
        // Calcular comisión
        const weeklyEarnings = weeklyCount * COMISION_POR_PEDIDO;
        
        // Mostrar en la tarjeta de comisión
        document.getElementById('earningsAmount').textContent = `$${weeklyEarnings.toFixed(2)}`;
        
        console.log(`✅ Comisiones: ${weeklyCount} pedidos × $${COMISION_POR_PEDIDO} = $${weeklyEarnings.toFixed(2)}`);
        
    } catch (error) {
        console.error('Error al cargar comisiones:', error);
        document.getElementById('earningsAmount').textContent = '$0.00';
    }
}

// ============================================
// CARGAR PEDIDOS DISPONIBLES
// ============================================

async function loadAvailableOrders() {
    const db = firebase.firestore();
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const ordersList = document.getElementById('ordersList');
    
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    ordersList.innerHTML = '';
    
    try {
        // Escuchar pedidos pendientes en tiempo real (SIN orderBy para evitar error de índice)
        unsubscribe = db.collection('orders')
            .where('status', '==', 'pendiente')
            .onSnapshot((snapshot) => {
                availableOrders = [];
                
                snapshot.forEach((doc) => {
                    availableOrders.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Ordenar manualmente por fecha
                availableOrders.sort((a, b) => {
                    const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                    const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                    return dateB - dateA; // Más recientes primero
                });
                
                console.log('✅ Pedidos disponibles:', availableOrders.length);
                
                loadingState.style.display = 'none';
                renderOrders();
                updateOrdersCount();
                
            }, (error) => {
                console.error('❌ Error al cargar pedidos:', error);
                console.error('Código de error:', error.code);
                console.error('Mensaje:', error.message);
                
                loadingState.style.display = 'none';
                
                if (error.code === 'permission-denied') {
                    showMessage('No tienes permisos para ver pedidos. Verifica que tu cuenta esté activa.', 'error');
                } else if (error.code === 'failed-precondition') {
                    showMessage('Error de configuración. Contacta a soporte.', 'error');
                } else {
                    showMessage('Error al cargar pedidos: ' + error.message, 'error');
                }
            });
        
    } catch (error) {
        console.error('❌ Error:', error);
        loadingState.style.display = 'none';
        showMessage('Error al cargar pedidos', 'error');
    }
}

// ============================================
// RENDERIZAR PEDIDOS
// ============================================

function renderOrders() {
    const ordersList = document.getElementById('ordersList');
    const emptyState = document.getElementById('emptyState');
    
    if (availableOrders.length === 0) {
        ordersList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    ordersList.style.display = 'flex';
    ordersList.innerHTML = '';
    
    availableOrders.forEach((order, index) => {
        const orderCard = createOrderCard(order, index);
        ordersList.appendChild(orderCard);
    });
}

function createOrderCard(order, index) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const orderId = order.id.substring(0, 8).toUpperCase();
    
    // Renderizar items
    const itemsHTML = order.items.slice(0, 3).map(item => `
        <div class="item-row">
            <span class="item-name">${item.name}</span>
            <span class="item-quantity">x${item.quantity}</span>
            <span class="item-price">$${item.subtotal.toFixed(2)}</span>
        </div>
    `).join('');
    
    const moreItems = order.items.length > 3 ? `<div class="item-row"><span class="item-name" style="color: #1976d2;">+${order.items.length - 3} más...</span></div>` : '';
    
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
        
        <div class="order-items">
            <div class="items-list">
                ${itemsHTML}
                ${moreItems}
            </div>
        </div>
        
        <div class="order-details">
            <div class="detail-row">
                <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span class="detail-text">${order.deliveryLocation.address}</span>
            </div>
            ${order.deliveryLocation.notes ? `
            <div class="detail-row">
                <svg class="detail-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                <span class="detail-text">${order.deliveryLocation.notes}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="order-distance">
            <svg class="distance-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
            <span>Aproximadamente 2.5 km</span>
        </div>
        
        <div class="order-actions">
            <button class="action-btn btn-accept" onclick="acceptOrder('${order.id}')">
                Aceptar Pedido
            </button>
            <button class="action-btn btn-view" onclick="viewOrderDetails('${order.id}')">
                Ver Detalles
            </button>
        </div>
    `;
    
    return card;
}

function updateOrdersCount() {
    document.getElementById('ordersCount').textContent = availableOrders.length;
}

// ============================================
// ACEPTAR PEDIDO
// ============================================

window.acceptOrder = async function(orderId) {
    if (!currentDriver || !driverData) {
        showMessage('Error al verificar repartidor', 'error');
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Actualizar pedido
        await db.collection('orders').doc(orderId).update({
            driverId: currentDriver.uid,
            driverName: driverData.nombre,
            driverPhone: driverData.telefono,
            driverVehicle: driverData.tipoVehiculo,
            driverPlate: driverData.placa,
            status: 'aceptado',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Actualizar estadísticas del repartidor
        await db.collection('repartidores').doc(currentDriver.uid).update({
            totalDeliveries: firebase.firestore.FieldValue.increment(1)
        });
        
        showMessage('¡Pedido aceptado! Ve a "Mis Pedidos"', 'success');
        
        console.log('✅ Pedido aceptado:', orderId);
        
        // Redirigir a mis pedidos después de 2 segundos
        setTimeout(() => {
            window.location.href = 'driver-orders.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error al aceptar pedido:', error);
        showMessage('Error al aceptar el pedido. Intenta de nuevo.', 'error');
    }
};

// ============================================
// VER DETALLES DEL PEDIDO
// ============================================

window.viewOrderDetails = function(orderId) {
    const order = availableOrders.find(o => o.id === orderId);
    
    if (!order) return;
    
    // Crear modal con detalles
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'orderDetailsModal';
    
    const itemsHTML = order.items.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5;">
            <span style="flex: 1;">${item.name}</span>
            <span style="margin: 0 10px; color: #9e9e9e;">x${item.quantity}</span>
            <span style="font-weight: 600;">$${item.subtotal.toFixed(2)}</span>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; max-height: 80vh; overflow-y: auto;">
            <h3 style="font-size: 20px; font-weight: 700; color: #2c2c2c; margin-bottom: 20px;">
                Detalles del Pedido
            </h3>
            
            <div style="margin-bottom: 20px;">
                <p style="font-size: 12px; color: #9e9e9e; margin-bottom: 5px;">Cliente</p>
                <p style="font-size: 16px; font-weight: 600; color: #2c2c2c;">${order.customerName}</p>
                <p style="font-size: 14px; color: #5f6368;">${order.customerEmail}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <p style="font-size: 12px; color: #9e9e9e; margin-bottom: 8px;">Productos</p>
                ${itemsHTML}
            </div>
            
            <div style="margin-bottom: 20px;">
                <p style="font-size: 12px; color: #9e9e9e; margin-bottom: 5px;">Ubicación de Entrega</p>
                <p style="font-size: 14px; color: #2c2c2c; line-height: 1.5;">${order.deliveryLocation.address}</p>
                ${order.deliveryLocation.notes ? `<p style="font-size: 13px; color: #5f6368; margin-top: 5px;">Nota: ${order.deliveryLocation.notes}</p>` : ''}
            </div>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #5f6368;">Subtotal</span>
                    <span style="font-weight: 600;">$${order.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #5f6368;">Envío</span>
                    <span style="font-weight: 600;">$${order.deliveryFee.toFixed(2)}</span>
                </div>
                <div style="height: 1px; background: #e0e0e0; margin: 10px 0;"></div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 16px; font-weight: 700;">Total</span>
                    <span style="font-size: 18px; font-weight: 700; color: #1976d2;">$${order.total.toFixed(2)}</span>
                </div>
            </div>
            
            <button 
                onclick="closeModal('orderDetailsModal'); acceptOrder('${order.id}');"
                style="
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
                    border: none;
                    border-radius: 10px;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 10px;
                "
            >
                Aceptar Pedido
            </button>
            
            <button 
                onclick="closeModal('orderDetailsModal')"
                style="
                    width: 100%;
                    padding: 14px;
                    background: #f5f5f5;
                    border: none;
                    border-radius: 10px;
                    color: #5f6368;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                "
            >
                Cerrar
            </button>
        </div>
    `;
    
    // Agregar estilos del modal si no existen
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
    
    document.body.appendChild(modal);
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && modal.parentNode) {
        document.body.removeChild(modal);
    }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

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
window.addEventListener('beforeunload', async () => {
    if (unsubscribe) {
        unsubscribe();
    }
    
    // Actualizar estado offline
    if (currentDriver && driverData) {
        try {
            const db = firebase.firestore();
            await db.collection('repartidores').doc(currentDriver.uid).update({
                isOnline: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error al actualizar estado:', error);
        }
    }
});

console.log('✅ Dashboard de repartidor inicializado');
