// ============================================
// REGISTRO DE REPARTIDORES - ÑAN DELIVERY
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializar Firebase
    const firebaseInitialized = initializeFirebase();
    
    if (!firebaseInitialized) {
        updateFirebaseStatus('error', 'Error de conexión');
        showMessage('Error al conectar con Firebase', 'error');
        return;
    }
    
    updateFirebaseStatus('connected', 'Conectado');
    
    // Elementos del DOM
    const registerBtn = document.getElementById('registerBtn');
    const phoneInput = document.getElementById('phoneInput');
    const cedulaInput = document.getElementById('cedulaInput');
    const plateInput = document.getElementById('plateInput');
    
    // Solo números en teléfono y cédula
    phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    
    cedulaInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    
    // Formato placa
    plateInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });
    
    // Event listener del botón de registro
    registerBtn.addEventListener('click', handleRegister);
    
    console.log('✅ Registro de repartidores inicializado');
});

// ============================================
// MANEJAR REGISTRO
// ============================================

async function handleRegister() {
    // Obtener valores
    const nombre = document.getElementById('nameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const telefono = document.getElementById('phoneInput').value.trim();
    const cedula = document.getElementById('cedulaInput').value.trim();
    const tipoVehiculo = document.getElementById('vehicleTypeInput').value;
    const placa = document.getElementById('plateInput').value.trim().toUpperCase();
    const password = document.getElementById('passwordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    const termsAccepted = document.getElementById('termsCheckbox').checked;
    
    const registerBtn = document.getElementById('registerBtn');
    
    // Validaciones
    if (!nombre) {
        showMessage('Por favor ingresa tu nombre completo', 'error');
        document.getElementById('nameInput').focus();
        return;
    }
    
    if (nombre.length < 3) {
        showMessage('El nombre debe tener al menos 3 caracteres', 'error');
        document.getElementById('nameInput').focus();
        return;
    }
    
    if (!email) {
        showMessage('Por favor ingresa tu correo', 'error');
        document.getElementById('emailInput').focus();
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Por favor ingresa un correo válido', 'error');
        document.getElementById('emailInput').focus();
        return;
    }
    
    if (!telefono) {
        showMessage('Por favor ingresa tu teléfono', 'error');
        document.getElementById('phoneInput').focus();
        return;
    }
    
    if (telefono.length !== 10) {
        showMessage('El teléfono debe tener 10 dígitos', 'error');
        document.getElementById('phoneInput').focus();
        return;
    }
    
    if (!cedula) {
        showMessage('Por favor ingresa tu cédula', 'error');
        document.getElementById('cedulaInput').focus();
        return;
    }
    
    if (cedula.length !== 10) {
        showMessage('La cédula debe tener 10 dígitos', 'error');
        document.getElementById('cedulaInput').focus();
        return;
    }
    
    if (!tipoVehiculo) {
        showMessage('Por favor selecciona el tipo de vehículo', 'error');
        document.getElementById('vehicleTypeInput').focus();
        return;
    }
    
    if (!placa) {
        showMessage('Por favor ingresa la placa del vehículo', 'error');
        document.getElementById('plateInput').focus();
        return;
    }
    
    if (!password) {
        showMessage('Por favor ingresa una contraseña', 'error');
        document.getElementById('passwordInput').focus();
        return;
    }
    
    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        document.getElementById('passwordInput').focus();
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        document.getElementById('confirmPasswordInput').focus();
        return;
    }
    
    if (!termsAccepted) {
        showMessage('Debes aceptar los términos y condiciones', 'error');
        return;
    }
    
    // Deshabilitar botón
    registerBtn.disabled = true;
    const originalText = registerBtn.textContent;
    registerBtn.textContent = 'Registrando...';
    
    try {
        // Crear usuario en Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Usuario creado en Auth:', user.uid);
        
        // Actualizar perfil
        await user.updateProfile({
            displayName: nombre
        });
        
        // Guardar en Firestore - Colección REPARTIDORES
        const db = firebase.firestore();
        const driverData = {
            uid: user.uid,
            nombre: nombre,
            email: email,
            telefono: telefono,
            cedula: cedula,
            tipoVehiculo: tipoVehiculo,
            placa: placa,
            status: 'activo', // pendiente, activo, rechazado, suspendido
            rating: 0,
            totalDeliveries: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: false,
            currentLocation: null,
            // Datos adicionales
            photoURL: user.photoURL || '',
            documentosVerificados: false,
            cuentaBancaria: null
        };
        
        await db.collection('repartidores').doc(user.uid).set(driverData);
        
        console.log('✅ Repartidor guardado en Firestore');
        
        // Mostrar mensaje de éxito
        showMessage('¡Registro exitoso! Bienvenido al equipo', 'success');
        
        // Limpiar formulario
        document.querySelectorAll('.input-field').forEach(input => {
            input.value = '';
        });
        document.getElementById('termsCheckbox').checked = false;
        
        // Redirigir al dashboard
        setTimeout(() => {
            window.location.href = 'driver-dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        
        let message = 'Error al registrarse';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Ya existe una cuenta con este correo';
                break;
            case 'auth/invalid-email':
                message = 'Correo electrónico inválido';
                break;
            case 'auth/weak-password':
                message = 'La contraseña es muy débil';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet';
                break;
            default:
                message = error.message;
        }
        
        showMessage(message, 'error');
        registerBtn.disabled = false;
        registerBtn.textContent = originalText;
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function updateFirebaseStatus(status, text) {
    const statusElement = document.getElementById('firebaseStatus');
    if (!statusElement) return;
    
    const dot = statusElement.querySelector('.status-dot');
    const textElement = statusElement.querySelector('.status-text');
    
    if (dot) dot.className = `status-dot ${status}`;
    if (textElement) textElement.textContent = text;
    
    if (status === 'connected') {
        setTimeout(() => {
            statusElement.style.opacity = '0';
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 300);
        }, 3000);
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
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1001;
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
        @keyframes slideUp {
            from {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50%) translateY(-100%);
            }
        }
    `;
    
    if (!document.head.querySelector('style[data-messages]')) {
        style.setAttribute('data-messages', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                document.body.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}
