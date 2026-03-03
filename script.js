// ============================================
// APP ÑAN - DELIVERY CON FIREBASE
// ============================================

// Variables globales
let currentUser = null;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializar Firebase
    const firebaseInitialized = initializeFirebase();
    
    if (!firebaseInitialized) {
        updateFirebaseStatus('error', 'Error de conexión');
        showMessage('Error al conectar con Firebase. Verifica tu configuración.', 'error');
        return;
    }
    
    updateFirebaseStatus('connected', 'Conectado');
    
    // Elementos del DOM
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginBtn = document.getElementById('loginBtn');
    const emailPhoneInput = document.getElementById('emailPhone');
    const passwordInput = document.getElementById('password');
    
    // Observer del estado de autenticación
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log('Usuario autenticado:', user.email || user.phoneNumber);
            handleSuccessfulLogin(user);
        } else {
            currentUser = null;
            console.log('No hay usuario autenticado');
        }
    });
    
    // ============================================
    // FUNCIONES DE FIREBASE AUTHENTICATION
    // ============================================
    
    // Login con Google
    googleLoginBtn.addEventListener('click', async function() {
        this.disabled = true;
        const originalText = this.innerHTML;
        this.innerHTML = '<span>Conectando con Google...</span>';
        
        try {
            const provider = getGoogleProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            
            console.log('Login exitoso con Google:', user);
            showMessage(`¡Bienvenido ${user.displayName}!`, 'success');
            
            await saveUserToFirestore(user);
            
        } catch (error) {
            console.error('Error en login con Google:', error);
            handleAuthError(error);
        } finally {
            this.disabled = false;
            this.innerHTML = originalText;
        }
    });
    
    // Login con Email/Password
    loginBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const emailOrPhone = emailPhoneInput.value.trim();
        const password = passwordInput.value;
        
        if (!emailOrPhone) {
            showMessage('Por favor ingresa tu correo', 'error');
            emailPhoneInput.focus();
            return;
        }
        
        if (!isValidEmail(emailOrPhone)) {
            showMessage('Por favor ingresa un correo válido', 'error');
            emailPhoneInput.focus();
            return;
        }
        
        if (!password) {
            showMessage('Por favor ingresa tu contraseña', 'error');
            passwordInput.focus();
            return;
        }
        
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            passwordInput.focus();
            return;
        }
        
        this.disabled = true;
        const originalText = this.textContent;
        this.textContent = 'Iniciando sesión...';
        
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(emailOrPhone, password);
            const user = userCredential.user;
            
            console.log('Login exitoso:', user);
            showMessage('¡Inicio de sesión exitoso!', 'success');
            
        } catch (error) {
            console.error('Error en login:', error);
            
            if (error.code === 'auth/user-not-found') {
                const shouldRegister = confirm('No existe una cuenta con este correo. ¿Deseas crear una cuenta nueva?');
                
                if (shouldRegister) {
                    try {
                        const newUserCredential = await firebase.auth().createUserWithEmailAndPassword(emailOrPhone, password);
                        const newUser = newUserCredential.user;
                        
                        console.log('Usuario creado:', newUser);
                        showMessage('¡Cuenta creada exitosamente!', 'success');
                        
                        await saveUserToFirestore(newUser);
                        
                    } catch (registerError) {
                        console.error('Error al crear cuenta:', registerError);
                        handleAuthError(registerError);
                    }
                }
            } else {
                handleAuthError(error);
            }
        } finally {
            this.disabled = false;
            this.textContent = originalText;
        }
    });
    
    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    
    function handleSuccessfulLogin(user) {
        console.log('Login exitoso para:', user.email || user.phoneNumber);
        
        localStorage.setItem('nanAppUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));
        
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    }
    
    async function saveUserToFirestore(user) {
        try {
            const db = firebase.firestore();
            const userData = {
                email: user.email,
                displayName: user.displayName || 'Usuario',
                photoURL: user.photoURL || '',
                rol: 'cliente',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('users').doc(user.uid).set(userData, { merge: true });
            
            console.log('✅ Usuario guardado en Firestore con rol: cliente');
        } catch (error) {
            console.error('❌ Error al guardar en Firestore:', error);
        }
    }
    
    function handleAuthError(error) {
        let message = 'Error al iniciar sesión';
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'El correo electrónico no es válido';
                break;
            case 'auth/user-disabled':
                message = 'Esta cuenta ha sido deshabilitada';
                break;
            case 'auth/user-not-found':
                message = 'No existe una cuenta con este correo';
                break;
            case 'auth/wrong-password':
                message = 'Contraseña incorrecta';
                break;
            case 'auth/email-already-in-use':
                message = 'Ya existe una cuenta con este correo';
                break;
            case 'auth/weak-password':
                message = 'La contraseña es muy débil';
                break;
            case 'auth/operation-not-allowed':
                message = 'Operación no permitida. Verifica la configuración de Firebase';
                break;
            case 'auth/popup-closed-by-user':
                message = 'Ventana de login cerrada';
                break;
            case 'auth/cancelled-popup-request':
                message = 'Solicitud cancelada';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet';
                break;
            default:
                message = error.message || 'Error desconocido';
        }
        
        showMessage(message, 'error');
    }
    
    function updateFirebaseStatus(status, text) {
        const statusElement = document.getElementById('firebaseStatus');
        const dot = statusElement.querySelector('.status-dot');
        const textElement = statusElement.querySelector('.status-text');
        
        dot.className = `status-dot ${status}`;
        textElement.textContent = text;
        
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
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 50px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            animation: slideDown 0.3s ease;
            font-size: 14px;
            font-weight: 500;
            max-width: 90%;
        `;
        
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
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });
    
    const inputs = document.querySelectorAll('.input-field');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
            this.parentElement.style.transition = 'transform 0.3s ease';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
    
    console.log('✅ App Ñan con Firebase inicializada');
});

// Funciones globales
window.logoutUser = async function() {
    try {
        await firebase.auth().signOut();
        localStorage.removeItem('nanAppUser');
        console.log('Sesión cerrada');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
};

window.resetPassword = async function(email) {
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        return { success: true, message: 'Correo de recuperación enviado' };
    } catch (error) {
        console.error('Error al resetear contraseña:', error);
        return { success: false, message: error.message };
    }
};

document.addEventListener('deviceready', function() {
    console.log('✅ Cordova listo');
}, false);
