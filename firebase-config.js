// ============================================
// CONFIGURACIÓN DE FIREBASE
// ============================================
// 
// INSTRUCCIONES PARA CONFIGURAR:
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Ve a "Configuración del proyecto" (ícono de engranaje)
// 4. En la sección "Tus apps", selecciona "Web" (ícono </>)
// 5. Registra tu app y copia las credenciales
// 6. Reemplaza los valores de ejemplo abajo con tus credenciales reales
//
// SERVICIOS A HABILITAR EN FIREBASE:
// - Authentication (Email/Password y Google)
// - Firestore Database (opcional para guardar datos de usuarios)
// - Storage (opcional para imágenes de perfil)
//
// ============================================

// Configuración de Firebase - REEMPLAZA CON TUS CREDENCIALES
const firebaseConfig = {
  apiKey: "AIzaSyA-ENc1XtVdfPhMV2wT8shhLILM1mSLd-w",
  authDomain: "delivery-3179e.firebaseapp.com",
  projectId: "delivery-3179e",
  storageBucket: "delivery-3179e.firebasestorage.app",
  messagingSenderId: "160250026389",
  appId: "1:160250026389:web:9d36000119bc53058ffe9c"
};

// Inicializar Firebase
let app, auth, db;

function initializeFirebase() {
    try {
        // Inicializar Firebase
        app = firebase.initializeApp(firebaseConfig);
        
        // Inicializar servicios
        auth = firebase.auth();
        
        // Configurar idioma en español
        auth.languageCode = 'es';
        
        // Inicializar Firestore
        db = firebase.firestore();
        
        console.log('✅ Firebase inicializado correctamente');
        console.log('✅ Firestore inicializado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
        return false;
    }
}

// Configuración del proveedor de Google
function getGoogleProvider() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    return provider;
}

// Exportar configuración
window.firebaseConfig = firebaseConfig;
window.initializeFirebase = initializeFirebase;
window.getGoogleProvider = getGoogleProvider;
