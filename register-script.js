// ============================================
// REGISTRO DE USUARIOS - FIREBASE
// ============================================

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
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('emailInput');
    const nameInput = document.getElementById('nameInput');
    const passwordInput = document.getElementById('passwordInput');
    const phoneInput = document.getElementById('phoneInput');
    
    // ============================================
    // VALIDACIONES EN TIEMPO REAL
    // ============================================
    
    // Validar email mientras escribe
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        if (email.length > 0) {
            if (isValidEmail(email)) {
                this.classList.remove('invalid');
                this.classList.add('valid');
            } else {
                this.classList.remove('valid');
                this.classList.add('invalid');
            }
        } else {
            this.classList.remove('valid', 'invalid');
        }
    });
    
    // Validar nombre mientras escribe
    nameInput.addEventListener('input', function() {
        const name = this.value.trim();
        if (name.length > 0) {
            if (name.length >= 3) {
                this.classList.remove('invalid');
                this.classList.add('valid');
            } else {
                this.classList.remove('valid');
                this.classList.add('invalid');
            }
        } else {
            this.classList.remove('valid', 'invalid');
        }
    });
    
    // Indicador de fortaleza de contraseña
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = getPasswordStrength(password);
        
        // Crear o actualizar indicador
        let strengthIndicator = this.parentElement.querySelector('.password-strength');
        if (!strengthIndicator) {
            strengthIndicator = document.createElement('div');
            strengthIndicator.className = 'password-strength';
            this.parentElement.appendChild(strengthIndicator);
        }
        
        if (password.length > 0) {
            strengthIndicator.classList.add('show');
            strengthIndicator.className = `password-strength show ${strength.level}`;
            strengthIndicator.textContent = strength.text;
            
            if (strength.level === 'strong' || (strength.level === 'medium' && password.length >= 6)) {
                this.classList.remove('invalid');
                this.classList.add('valid');
            } else {
                this.classList.remove('valid');
                if (password.length >= 3) {
                    this.classList.add('invalid');
                }
            }
        } else {
            strengthIndicator.classList.remove('show');
            this.classList.remove('valid', 'invalid');
        }
    });
    
    // Validar teléfono
    phoneInput.addEventListener('input', function() {
        // Permitir solo números
        this.value = this.value.replace(/[^0-9]/g, '');
        
        const phone = this.value.trim();
        if (phone.length > 0) {
            if (phone.length >= 10) {
                this.classList.remove('invalid');
                this.classList.add('valid');
            } else if (phone.length >= 5) {
                this.classList.remove('valid');
                this.classList.add('invalid');
            }
        } else {
            this.classList.remove('valid', 'invalid');
        }
    });
    
    // ============================================
    // PROCESO DE REGISTRO
    // ============================================
    
    registerBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Obtener valores
        const email = emailInput.value.trim();
        const name = nameInput.value.trim();
        const password = passwordInput.value;
        const phone = phoneInput.value.trim();
        
        // Validaciones
        if (!email) {
            showMessage('Por favor ingresa tu correo electrónico', 'error');
            emailInput.focus();
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Por favor ingresa un correo electrónico válido', 'error');
            emailInput.focus();
            return;
        }
        
        if (!name) {
            showMessage('Por favor ingresa tu nombre', 'error');
            nameInput.focus();
            return;
        }
        
        if (name.length < 3) {
            showMessage('El nombre debe tener al menos 3 caracteres', 'error');
            nameInput.focus();
            return;
        }
        
        if (!password) {
            showMessage('Por favor ingresa una contraseña', 'error');
            passwordInput.focus();
            return;
        }
        
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            passwordInput.focus();
            return;
        }
        
        if (!phone) {
            showMessage('Por favor ingresa tu número de teléfono', 'error');
            phoneInput.focus();
            return;
        }
        
        if (phone.length < 10) {
            showMessage('Por favor ingresa un número de teléfono válido (10 dígitos)', 'error');
            phoneInput.focus();
            return;
        }
        
        // Deshabilitar botón y mostrar loading
        this.disabled = true;
        const originalText = this.textContent;
        this.textContent = 'Registrando...';
        
        try {
            // Crear usuario en Firebase Authentication
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Usuario creado exitosamente:', user.uid);
            
            // Actualizar perfil del usuario con el nombre
            await user.updateProfile({
                displayName: name
            });
            
            console.log('Perfil actualizado con nombre:', name);
            
            // Guardar información adicional en Firestore (opcional)
            await saveUserData(user.uid, {
                email: email,
                displayName: name,
                phone: phone,
                createdAt: new Date().toISOString(),
                photoURL: user.photoURL || ''
            });
            
            // Mostrar mensaje de éxito
            showMessage(`¡Bienvenido ${name}! Tu cuenta ha sido creada exitosamente`, 'success');
            
            // Limpiar formulario
            emailInput.value = '';
            nameInput.value = '';
            passwordInput.value = '';
            phoneInput.value = '';
            
            // Remover clases de validación
            document.querySelectorAll('.input-field').forEach(input => {
                input.classList.remove('valid', 'invalid');
            });
            
            // Redirigir a la pantalla principal después de 2 segundos
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            handleRegistrationError(error);
            
            this.disabled = false;
            this.textContent = originalText;
        }
    });
    
    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    
    // Guardar datos del usuario en Firestore
    async function saveUserData(uid, userData) {
        try {
            const db = firebase.firestore();
            
            // Estructura completa de datos del usuario
            const userDocument = {
                uid: uid,
                email: userData.email,
                displayName: userData.displayName,
                phone: userData.phone,
                photoURL: userData.photoURL || '',
                rol: 'cliente', // Rol por defecto
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true,
                // Datos adicionales opcionales
                address: null,
                favorites: [],
                orderHistory: []
            };
            
            await db.collection('users').doc(uid).set(userDocument);
            console.log('✅ Datos de usuario guardados en Firestore con rol: cliente');
            
            // También guardar en localStorage para acceso rápido
            localStorage.setItem('nanAppUser', JSON.stringify({
                uid: uid,
                email: userData.email,
                displayName: userData.displayName,
                phone: userData.phone,
                rol: 'cliente'
            }));
            
        } catch (error) {
            console.error('❌ Error al guardar datos en Firestore:', error);
            throw error;
        }
    }
    
    // Validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Calcular fortaleza de contraseña
    function getPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        if (strength <= 2) {
            return { level: 'weak', text: 'Contraseña débil' };
        } else if (strength <= 3) {
            return { level: 'medium', text: 'Contraseña media' };
        } else {
            return { level: 'strong', text: 'Contraseña fuerte' };
        }
    }
    
    // Manejar errores de registro
    function handleRegistrationError(error) {
        let message = 'Error al crear la cuenta';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Ya existe una cuenta con este correo electrónico';
                break;
            case 'auth/invalid-email':
                message = 'El correo electrónico no es válido';
                break;
            case 'auth/operation-not-allowed':
                message = 'El registro no está habilitado. Contacta al administrador';
                break;
            case 'auth/weak-password':
                message = 'La contraseña es muy débil. Usa al menos 6 caracteres';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet';
                break;
            default:
                message = error.message || 'Error desconocido al crear la cuenta';
        }
        
        showMessage(message, 'error');
    }
    
    // Actualizar estado de Firebase
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
    
    // Mostrar mensajes
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
            text-align: center;
        `;
        
        // Agregar animaciones
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
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
    
    // Enter key para submit
    phoneInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            registerBtn.click();
        }
    });
    
    console.log('✅ Pantalla de registro inicializada');
});
