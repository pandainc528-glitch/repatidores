// ============================================
// MIS PEDIDOS - ÑAN DELIVERY
// ============================================

let currentUser = null;
let allOrders = [];
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
        window.location.href = 'index.html';
        return;
    }
    
    // Verificar autenticación
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadOrders();
            setupFilterListeners();
        } else {
            window.location.href = 'index.html';
        }
    });
});

// ============================================
// CARGAR PEDIDOS
// ============================================

function loadOrders() {
    console.log('🔍 Iniciando carga de pedidos...');
    console.log('Usuario actual:', currentUser.uid);
    
    const db = firebase.firestore();
    
    // Mostrar loading
    showLoading();
    
    // Primero intentemos una consulta simple sin orderBy
    db.collection('orders')
        .where('userId', '==', currentUser.uid)
        .get()
        .then((snapshot) => {
            console.log('📊 Pedidos encontrados:', snapshot.size);
            
            allOrders = [];
            
            snapshot.forEach((doc) => {
                console.log('📦 Pedido encontrado:', doc.id, doc.data());
                allOrders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Ordenar manualmente por fecha
            allOrders.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                return dateB - dateA;
            });
            
            console.log('✅ Pedidos cargados y ordenados:', allOrders.length);
            
            hideLoading();
            renderOrders();
            
            // Ahora configurar listener en tiempo real
            setupRealtimeListener();
            
        })
        .catch((error) => {
            console.error('❌ Error al cargar pedidos:', error);
            console.error('Código de error:', error.code);
            console.error('Mensaje:', error.message);
            
            hideLoading();
            
            // Mostrar error específico
            if (error.code === 'failed-precondition') {
                console.error('⚠️ Falta crear un índice en Firestore');
                console.error('Solución: Elimina .orderBy() o crea el índice');
            }
            
            showError(error.message);
        });
}

function setupRealtimeListener() {
    const db = firebase.firestore();
    
    // Escuchar cambios en tiempo real
    unsubscribe = db.collection('orders')
        .where('userId', '==', currentUser.uid)
        .onSnapshot((snapshot) => {
            console.log('🔄 Actualización en tiempo real');
            
            allOrders = [];
            
            snapshot.forEach((doc) => {
                allOrders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Ordenar manualmente
            allOrders.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                return dateB - dateA;
            });
            
            renderOrders();
            
        }, (error) => {
            console.error('❌ Error en listener:', error);
        });
}

// ============================================
// RENDERIZAR PEDIDOS
// ============================================

function renderOrders() {
    const ordersSection = document.getElementById('ordersSection');
    const emptyState = document.getElementById('emptyState');
    
    // Filtrar pedidos según el filtro activo
    let filteredOrders = allOrders;
    if (currentFilter !== 'all') {
        filteredOrders = allOrders.filter(order => order.status === currentFilter);
    }
    
    // Si no hay pedidos
    if (filteredOrders.length === 0) {
        ordersSection.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    // Mostrar pedidos
    emptyState.style.display = 'none';
    ordersSection.style.display = 'block';
    ordersSection.innerHTML = '';
    
    filteredOrders.forEach((order, index) => {
        const orderCard = createOrderCard(order, index);
        ordersSection.appendChild(orderCard);
    });
}

function createOrderCard(order, index) {
    const card = document.createElement('div');
    card.className = `order-card status-${order.status}`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Formatear fecha
    const orderDate = order.orderDate ? formatDate(order.orderDate.toDate()) : 'Fecha no disponible';
    
    // ID corto del pedido
    const shortId = order.id.substring(0, 8).toUpperCase();
    
    // Renderizar items
    const itemsHTML = order.items.map(item => `
        <div class="order-item">
            <div class="item-info">
                <p class="item-name">${item.name}</p>
                <p class="item-quantity">${item.quantity}x $${item.price.toFixed(2)}</p>
            </div>
            <p class="item-price">$${item.subtotal.toFixed(2)}</p>
        </div>
    `).join('');
    
    // Estado en español
    const statusText = getStatusText(order.status);
    
    card.innerHTML = `
        <div class="order-header">
            <div>
                <p class="order-number">Pedido #${shortId}</p>
                <p class="order-date">${orderDate}</p>
            </div>
            <span class="order-status status-badge ${order.status}">${statusText}</span>
        </div>
        
        <div class="order-items">
            ${itemsHTML}
        </div>
        
        <div class="order-location">
            <svg class="location-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <p class="location-text">${order.deliveryLocation.address}</p>
        </div>
        
        <div class="order-footer">
            <span class="order-total-label">Total</span>
            <span class="order-total-value">$${order.total.toFixed(2)}</span>
        </div>
        
        ${getOrderActions(order)}
    `;
    
    return card;
}

function getOrderActions(order) {
    // Acciones según el estado del pedido
    switch(order.status) {
        case 'pendiente':
            return `
                <div class="order-actions">
                    <button class="action-btn action-btn-secondary" onclick="cancelOrder('${order.id}')">
                        Cancelar
                    </button>
                </div>
            `;
        case 'aceptado':
        case 'en_camino':
            return `
                <div class="order-actions">
                    <button class="action-btn action-btn-primary" onclick="trackOrder('${order.id}')">
                        Rastrear pedido
                    </button>
                </div>
            `;
        case 'entregado':
            return `
                <div class="order-actions">
                    <button class="action-btn action-btn-primary" onclick="reorder('${order.id}')">
                        Volver a pedir
                    </button>
                </div>
            `;
        default:
            return '';
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function getStatusText(status) {
    const statusMap = {
        'pendiente': 'Pendiente',
        'aceptado': 'Aceptado',
        'en_camino': 'En Camino',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        }
        return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else if (days === 1) {
        return 'Ayer';
    } else if (days < 7) {
        return `Hace ${days} días`;
    } else {
        return date.toLocaleDateString('es-EC', { 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
        });
    }
}

// ============================================
// FILTROS
// ============================================

function setupFilterListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover active de todos
            filterBtns.forEach(b => b.classList.remove('active'));
            
            // Agregar active al seleccionado
            this.classList.add('active');
            
            // Actualizar filtro
            currentFilter = this.getAttribute('data-status');
            
            // Renderizar pedidos filtrados
            renderOrders();
        });
    });
}

// ============================================
// ACCIONES DE PEDIDOS
// ============================================

window.cancelOrder = async function(orderId) {
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) {
        return;
    }
    
    try {
        const db = firebase.firestore();
        await db.collection('orders').doc(orderId).update({
            status: 'cancelado',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Pedido cancelado');
        
    } catch (error) {
        console.error('Error al cancelar pedido:', error);
        showToast('Error al cancelar el pedido');
    }
};

window.trackOrder = function(orderId) {
    // Redirigir a página de rastreo (por implementar)
    showToast('Función de rastreo próximamente');
};

window.reorder = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    
    if (order) {
        // Agregar items al carrito
        const cart = order.items.map(item => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category,
            image: item.image
        }));
        
        localStorage.setItem('nanAppCart', JSON.stringify(cart));
        
        // Redirigir al carrito
        window.location.href = 'cart.html';
    }
};

// ============================================
// UI HELPERS
// ============================================

function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('ordersSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('ordersSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    
    const emptyIcon = document.querySelector('.empty-icon');
    const emptyTitle = document.querySelector('.empty-title');
    const emptyText = document.querySelector('.empty-text');
    
    emptyIcon.textContent = '⚠️';
    emptyTitle.textContent = 'Error al cargar pedidos';
    emptyText.textContent = message || 'Por favor intenta nuevamente más tarde';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideUp 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `;
    
    if (!document.head.querySelector('style[data-toast]')) {
        style.setAttribute('data-toast', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

// Limpiar listener al salir
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

console.log('✅ Página de mis pedidos inicializada');
