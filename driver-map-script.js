// ============================================
// MAPA DE NAVEGACIÓN - REPARTIDOR
// ============================================

let currentDriver = null;
let orderData = null;
let orderId = null;
let map = null;
let driverMarker = null;
let clientMarker = null;
let routeLine = null;
let watchId = null;

// Ubicaciones
let driverLocation = null;
let clientLocation = null;

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
    
    // Obtener ID del pedido de la URL
    const urlParams = new URLSearchParams(window.location.search);
    orderId = urlParams.get('orderId');
    
    if (!orderId) {
        showMessage('No se especificó el pedido', 'error');
        setTimeout(() => {
            window.location.href = 'driver-orders.html';
        }, 2000);
        return;
    }
    
    // Verificar autenticación
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentDriver = user;
            await loadOrderData();
            initializeMap();
            startLocationTracking();
        } else {
            window.location.href = 'driver-login.html';
        }
    });
});

// ============================================
// CARGAR DATOS DEL PEDIDO
// ============================================

async function loadOrderData() {
    try {
        const db = firebase.firestore();
        const orderDoc = await db.collection('orders').doc(orderId).get();
        
        if (!orderDoc.exists) {
            showMessage('Pedido no encontrado', 'error');
            setTimeout(() => {
                window.location.href = 'driver-orders.html';
            }, 2000);
            return;
        }
        
        orderData = orderDoc.data();
        
        // Verificar que sea del repartidor actual
        if (orderData.driverId !== currentDriver.uid) {
            showMessage('Este pedido no está asignado a ti', 'error');
            setTimeout(() => {
                window.location.href = 'driver-orders.html';
            }, 2000);
            return;
        }
        
        // Mostrar información
        displayOrderInfo();
        
        // Ubicación del cliente
        clientLocation = {
            lat: orderData.deliveryLocation.latitude,
            lng: orderData.deliveryLocation.longitude
        };
        
        console.log('✅ Datos del pedido cargados');
        
    } catch (error) {
        console.error('Error al cargar pedido:', error);
        showMessage('Error al cargar el pedido', 'error');
    }
}

function displayOrderInfo() {
    const orderId = orderData.id || 'Pedido';
    document.getElementById('orderTitle').textContent = `Pedido #${orderId.substring(0, 8).toUpperCase()}`;
    document.getElementById('customerName').textContent = orderData.customerName;
    document.getElementById('deliveryAddress').textContent = orderData.deliveryLocation.address;
    
    // Mostrar notas si existen
    if (orderData.deliveryLocation.notes) {
        document.getElementById('notesRow').style.display = 'flex';
        document.getElementById('deliveryNotes').textContent = orderData.deliveryLocation.notes;
    }
}

// ============================================
// INICIALIZAR MAPA
// ============================================

function initializeMap() {
    // Centro inicial en Ecuador
    const initialCenter = clientLocation || [0.3346056, -78.2185059];
    
    // Crear mapa
    map = L.map('map').setView(initialCenter, 15);
    
    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Agregar marcador del cliente
    if (clientLocation) {
        const clientIcon = L.divIcon({
            className: 'custom-marker',
            html: '🏠',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        clientMarker = L.marker([clientLocation.lat, clientLocation.lng], {
            icon: clientIcon
        }).addTo(map);
        
        clientMarker.bindPopup(`
            <strong>${orderData.customerName}</strong><br>
            ${orderData.deliveryLocation.address}
        `);
    }
    
    console.log('✅ Mapa inicializado');
}

// ============================================
// RASTREO DE UBICACIÓN
// ============================================

function startLocationTracking() {
    if (!navigator.geolocation) {
        showMessage('Tu dispositivo no soporta geolocalización', 'error');
        return;
    }
    
    // Obtener ubicación inicial
    navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        onLocationError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    
    // Rastrear ubicación en tiempo real
    watchId = navigator.geolocation.watchPosition(
        onLocationSuccess,
        onLocationError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    
    console.log('✅ Rastreo de ubicación iniciado');
}

function onLocationSuccess(position) {
    driverLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    
    updateDriverMarker();
    updateRoute();
    calculateDistance();
}

function onLocationError(error) {
    console.error('Error de geolocalización:', error);
    
    let message = 'Error al obtener ubicación';
    switch (error.code) {
        case error.PERMISSION_DENIED:
            message = 'Permiso de ubicación denegado. Actívalo en configuración.';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Ubicación no disponible';
            break;
        case error.TIMEOUT:
            message = 'Tiempo de espera agotado';
            break;
    }
    
    showMessage(message, 'error');
}

function updateDriverMarker() {
    if (!driverLocation || !map) return;
    
    const driverIcon = L.divIcon({
        className: 'driver-marker',
        html: '🚗',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    if (driverMarker) {
        // Actualizar posición
        driverMarker.setLatLng([driverLocation.lat, driverLocation.lng]);
    } else {
        // Crear marcador
        driverMarker = L.marker([driverLocation.lat, driverLocation.lng], {
            icon: driverIcon
        }).addTo(map);
        
        driverMarker.bindPopup('Tu ubicación 🚗');
        
        // Centrar mapa en el repartidor
        map.setView([driverLocation.lat, driverLocation.lng], 15);
    }
}

function updateRoute() {
    if (!driverLocation || !clientLocation || !map) return;
    
    // Eliminar línea anterior
    if (routeLine) {
        map.removeLayer(routeLine);
    }
    
    // Dibujar línea entre repartidor y cliente
    routeLine = L.polyline([
        [driverLocation.lat, driverLocation.lng],
        [clientLocation.lat, clientLocation.lng]
    ], {
        color: '#1976d2',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(map);
    
    // Ajustar vista para mostrar ambos puntos
    const bounds = L.latLngBounds([
        [driverLocation.lat, driverLocation.lng],
        [clientLocation.lat, clientLocation.lng]
    ]);
    
    map.fitBounds(bounds, { padding: [50, 50] });
}

// ============================================
// CALCULAR DISTANCIA Y TIEMPO
// ============================================

function calculateDistance() {
    if (!driverLocation || !clientLocation) return;
    
    // Fórmula de Haversine para calcular distancia
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(clientLocation.lat - driverLocation.lat);
    const dLon = toRad(clientLocation.lng - driverLocation.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(driverLocation.lat)) * Math.cos(toRad(clientLocation.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    // Tiempo estimado (asumiendo 30 km/h promedio en ciudad)
    const timeInMinutes = Math.ceil((distance / 30) * 60);
    
    // Actualizar UI
    document.getElementById('distanceValue').textContent = distance.toFixed(2) + ' km';
    document.getElementById('timeValue').textContent = timeInMinutes + ' min';
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// ============================================
// ACTUALIZAR MI UBICACIÓN
// ============================================

window.updateMyLocation = function() {
    if (!navigator.geolocation) return;
    
    const btn = document.querySelector('.refresh-btn');
    btn.style.animation = 'spin 1s linear';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            driverLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            updateDriverMarker();
            updateRoute();
            calculateDistance();
            
            showMessage('Ubicación actualizada', 'success');
            
            setTimeout(() => {
                btn.style.animation = '';
            }, 1000);
        },
        (error) => {
            onLocationError(error);
            btn.style.animation = '';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
};

// ============================================
// ACCIONES
// ============================================

window.callCustomer = function() {
    const phone = orderData.customerPhone || orderData.customerEmail;
    
    if (phone && phone.match(/^\d{10}$/)) {
        window.location.href = `tel:${phone}`;
    } else {
        showMessage(`Contacto: ${phone}`, 'info');
    }
};

window.openMapsNavigation = function() {
    if (!clientLocation) {
        showMessage('Ubicación del cliente no disponible', 'error');
        return;
    }
    
    // Intentar abrir Google Maps
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${clientLocation.lat},${clientLocation.lng}`;
    
    window.open(mapsUrl, '_blank');
};

window.showCompleteModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'completeModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-icon">✓</div>
            <h3 class="modal-title">¿Confirmar Entrega?</h3>
            <p class="modal-text">
                ¿El pedido fue entregado correctamente a ${orderData.customerName}?
            </p>
            
            <div class="modal-buttons">
                <button class="modal-btn modal-btn-cancel" onclick="closeModal('completeModal')">
                    Cancelar
                </button>
                <button class="modal-btn modal-btn-confirm" onclick="completeDelivery()">
                    Confirmar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

window.completeDelivery = async function() {
    closeModal('completeModal');
    
    try {
        const db = firebase.firestore();
        
        await db.collection('orders').doc(orderId).update({
            status: 'entregado',
            deliveredAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('¡Pedido completado! 🎉', 'success');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
            window.location.href = 'driver-orders.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error al completar pedido:', error);
        showMessage('Error al completar el pedido', 'error');
    }
};

window.goBack = function() {
    window.location.href = 'driver-orders.html';
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
        top: 80px;
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
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-100%);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    
    if (!document.head.querySelector('style[data-messages]')) {
        style.setAttribute('data-messages', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            document.body.removeChild(messageDiv);
        }
    }, 3000);
}

// Limpiar al salir
window.addEventListener('beforeunload', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
});

console.log('✅ Mapa de navegación inicializado');
