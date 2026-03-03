// ============================================
// SELECCIÓN DE UBICACIÓN - ÑAN DELIVERY
// ============================================

let map;
let currentUser = null;
let cart = [];
let selectedLocation = {
    lat: 0.3346056, // Atuntaqui, Ecuador
    lng: -78.2185059
};
const DELIVERY_FEE = 1.00;

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
            loadCart();
            updateOrderSummary();
            initializeMap();
        } else {
            window.location.href = 'index.html';
        }
    });
    
    // Event listeners
    document.getElementById('myLocationBtn').addEventListener('click', getUserLocation);
    document.getElementById('confirmOrderBtn').addEventListener('click', confirmOrder);
});

// ============================================
// CARGAR CARRITO
// ============================================

function loadCart() {
    const savedCart = localStorage.getItem('nanAppCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        console.log('✅ Carrito cargado:', cart);
    } else {
        // Si no hay carrito, redirigir al home
        window.location.href = 'home.html';
    }
}

function updateOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + DELIVERY_FEE;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('deliveryFee').textContent = `$${DELIVERY_FEE.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// ============================================
// INICIALIZAR MAPA
// ============================================

function initializeMap() {
    // Crear mapa centrado en Atuntaqui, Ecuador
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([selectedLocation.lat, selectedLocation.lng], 15);
    
    // Agregar tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);
    
    // Actualizar coordenadas cuando se mueve el mapa
    map.on('moveend', function() {
        const center = map.getCenter();
        selectedLocation = {
            lat: center.lat,
            lng: center.lng
        };
        updateCoordinatesDisplay();
    });
    
    // Actualizar coordenadas iniciales
    updateCoordinatesDisplay();
    
    console.log('✅ Mapa inicializado');
}

function updateCoordinatesDisplay() {
    const coordsElement = document.getElementById('coordinates');
    coordsElement.textContent = `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`;
}

// ============================================
// OBTENER UBICACIÓN DEL USUARIO
// ============================================

function getUserLocation() {
    const btn = document.getElementById('myLocationBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 3px;"></div> Obteniendo ubicación...';
    
    if (!navigator.geolocation) {
        showToast('Tu navegador no soporta geolocalización');
        resetLocationButton();
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Actualizar ubicación seleccionada
            selectedLocation = { lat, lng };
            
            // Centrar mapa en la ubicación del usuario
            map.setView([lat, lng], 17);
            
            updateCoordinatesDisplay();
            showToast('Ubicación obtenida correctamente');
            resetLocationButton();
        },
        (error) => {
            console.error('Error al obtener ubicación:', error);
            let message = 'No se pudo obtener tu ubicación';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Permiso de ubicación denegado';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Ubicación no disponible';
                    break;
                case error.TIMEOUT:
                    message = 'Tiempo de espera agotado';
                    break;
            }
            
            showToast(message);
            resetLocationButton();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function resetLocationButton() {
    const btn = document.getElementById('myLocationBtn');
    btn.disabled = false;
    btn.innerHTML = `
        <svg class="location-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
        </svg>
        Usar mi ubicación actual
    `;
}

// ============================================
// CONFIRMAR PEDIDO
// ============================================

async function confirmOrder() {
    const addressReference = document.getElementById('addressReference').value.trim();
    const deliveryNotes = document.getElementById('deliveryNotes').value.trim();
    
    // Validar dirección
    if (!addressReference) {
        showToast('Por favor ingresa una dirección o referencia');
        document.getElementById('addressReference').focus();
        return;
    }
    
    // Mostrar loading
    showLoadingOverlay('Creando pedido...');
    
    try {
        // Crear pedido en Firestore
        const orderId = await createOrder(addressReference, deliveryNotes);
        
        // Limpiar carrito
        cart = [];
        localStorage.removeItem('nanAppCart');
        
        // Ocultar loading
        hideLoadingOverlay();
        
        // Mostrar modal de éxito
        showSuccessModal(orderId);
        
    } catch (error) {
        console.error('Error al crear pedido:', error);
        hideLoadingOverlay();
        showToast('Error al procesar el pedido. Intenta nuevamente.');
    }
}

async function createOrder(addressReference, deliveryNotes) {
    const db = firebase.firestore();
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + DELIVERY_FEE;
    
    const orderData = {
        // Información del cliente
        userId: currentUser.uid,
        customerName: currentUser.displayName || 'Usuario',
        customerEmail: currentUser.email,
        customerPhone: '', // Se puede agregar desde el perfil
        
        // Productos
        items: cart.map(item => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
            category: item.category,
            image: item.image
        })),
        
        // Totales
        subtotal: subtotal,
        deliveryFee: DELIVERY_FEE,
        total: total,
        
        // Ubicación de entrega
        deliveryLocation: {
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            address: addressReference,
            notes: deliveryNotes || ''
        },
        
        // Estado y método de pago
        status: 'pendiente', // pendiente, aceptado, en_camino, entregado, cancelado
        paymentMethod: 'efectivo',
        paymentStatus: 'pendiente',
        
        // Fechas
        orderDate: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        
        // Repartidor (se asignará después)
        driverId: null,
        driverName: null,
        estimatedDeliveryTime: null,
        actualDeliveryTime: null
    };
    
    const orderRef = await db.collection('orders').add(orderData);
    console.log('✅ Pedido creado:', orderRef.id);
    
    return orderRef.id;
}

// ============================================
// UI HELPERS
// ============================================

function showLoadingOverlay(message) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-text">${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

function showSuccessModal(orderId) {
    const modal = document.createElement('div');
    modal.className = 'loading-overlay';
    modal.innerHTML = `
        <div class="loading-content" style="padding: 40px 30px; max-width: 320px;">
            <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
            <h3 style="font-size: 22px; font-weight: 700; color: #2c2c2c; margin-bottom: 10px;">
                ¡Pedido Realizado!
            </h3>
            <p style="font-size: 14px; color: #5f6368; margin-bottom: 25px; line-height: 1.5;">
                Tu pedido ha sido enviado. Un repartidor lo aceptará pronto.
            </p>
            <button 
                onclick="window.location.href='my-orders.html'" 
                style="
                    width: 100%;
                    background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%);
                    border: none;
                    border-radius: 25px;
                    padding: 14px;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 10px;
                "
            >
                Ver mis pedidos
            </button>
            <button 
                onclick="window.location.href='home.html'" 
                style="
                    width: 100%;
                    background: #f5f5f5;
                    border: none;
                    border-radius: 25px;
                    padding: 14px;
                    color: #5f6368;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                "
            >
                Ir al inicio
            </button>
        </div>
    `;
    document.body.appendChild(modal);
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

console.log('✅ Página de selección de ubicación inicializada');
