// ============================================
// LOGIN DE REPARTIDORES - ÑAN DELIVERY
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
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    
    // Event listener del botón de login
    loginBtn.addEventListener('click', handleLogin);
    
    // Enter para submit
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    console.log('✅ Login de repartidores inicializado');
});

// ============================================
// MANEJAR LOGIN
// ============================================

async function handleLogin() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const loginBtn = document.getElementById('loginBtn');
    
    // Validaciones
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
    
    if (!password) {
        showMessage('Por favor ingresa tu contraseña', 'error');
        document.getElementById('passwordInput').focus();
        return;
    }
    
    // Deshabilitar botón
    loginBtn.disabled = true;
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Iniciando sesión...';
    
    try {
        // Iniciar sesión con Firebase Auth
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Usuario autenticado:', user.uid);
        
        // Verificar que sea un repartidor
        const db = firebase.firestore();
        const driverDoc = await db.collection('repartidores').doc(user.uid).get();
        
        if (!driverDoc.exists) {
            // No es un repartidor
            await firebase.auth().signOut();
            showMessage('Esta cuenta no está registrada como repartidor', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
            return;
        }
        
        const driverData = driverDoc.data();
        
        // Verificar estado de aprobación
        if (driverData.status === 'pendiente') {
            await firebase.auth().signOut();
            showMessage('Tu cuenta está pendiente de aprobación', 'warning');
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
            return;
        }
        
        if (driverData.status === 'rechazado') {
            await firebase.auth().signOut();
            showMessage('Tu cuenta ha sido rechazada. Contacta a soporte.', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
            return;
        }
        
        // Login exitoso
        showMessage('¡Bienvenido de vuelta!', 'success');
        
        // Guardar en localStorage
        localStorage.setItem('nanDriverUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: driverData.nombre,
            vehicleType: driverData.tipoVehiculo
        }));
        
        // Actualizar último login
        await db.collection('repartidores').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Redirigir al dashboard
        setTimeout(() => {
            window.location.href = 'driver-dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        let message = 'Error al iniciar sesión';
        
        switch (error.code) {
            case 'auth/user-not-found':
                message = 'No existe una cuenta con este correo';
                break;
            case 'auth/wrong-password':
                message = 'Contraseña incorrecta';
                break;
            case 'auth/invalid-email':
                message = 'Correo electrónico inválido';
                break;
            case 'auth/user-disabled':
                message = 'Esta cuenta ha sido deshabilitada';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet';
                break;
            default:
                message = error.message;
        }
        
        showMessage(message, 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
    }
}

// ============================================
// RECUPERAR CONTRASEÑA
// ============================================

window.resetPassword = async function() {
    const email = document.getElementById('emailInput').value.trim();
    
    if (!email) {
        showMessage('Por favor ingresa tu correo primero', 'error');
        document.getElementById('emailInput').focus();
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Por favor ingresa un correo válido', 'error');
        return;
    }
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showMessage('Correo de recuperación enviado. Revisa tu bandeja de entrada.', 'success');
    } catch (error) {
        console.error('Error al enviar correo:', error);
        showMessage('Error al enviar correo de recuperación', 'error');
    }
};

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
