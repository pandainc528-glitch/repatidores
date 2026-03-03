# 🔥 Ñan Delivery App - Integración con Firebase

## 📋 Requisitos Previos
- Cuenta de Google/Gmail
- Node.js instalado (para Cordova)
- Android Studio (para compilar APK)

## 🚀 Paso 1: Configurar Firebase

### 1.1 Crear Proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Nombra tu proyecto (ej: "nan-delivery")
4. Acepta los términos y crea el proyecto

### 1.2 Registrar tu Aplicación Web
1. En el Dashboard de Firebase, haz clic en el ícono **Web** (`</>`)
2. Registra tu app con el nombre "Ñan Delivery Web"
3. **Copia las credenciales** que aparecen (apiKey, authDomain, etc.)
4. Pega estas credenciales en el archivo `firebase-config.js`

### 1.3 Habilitar Authentication
1. En el menú lateral, ve a **Build** → **Authentication**
2. Haz clic en "Comenzar"
3. En la pestaña **Sign-in method**, habilita:
   - ✅ **Email/Password** (activar)
   - ✅ **Google** (activar y configurar)

Para configurar Google Sign-In:
- Haz clic en "Google"
- Activa el interruptor
- Selecciona un email de soporte
- Guarda

### 1.4 Configurar Dominios Autorizados
1. En Authentication, ve a **Settings** → **Authorized domains**
2. Agrega tu dominio si vas a usar hosting web
3. Para desarrollo local ya está autorizado `localhost`

### 1.5 Habilitar Firestore Database
1. En el menú lateral, ve a **Build** → **Firestore Database**
2. Haz clic en "Crear base de datos"
3. Selecciona **modo de prueba** (para desarrollo)
   - Ubicación: elige la más cercana (us-east1, southamerica-east1, etc.)
4. Haz clic en "Habilitar"

### 1.6 Configurar Reglas de Seguridad de Firestore
1. En Firestore Database, ve a la pestaña **Reglas**
2. Copia y pega las reglas del archivo `firestore.rules`
3. Haz clic en "Publicar"

**Las reglas garantizan que:**
- Los usuarios solo puedan leer/escribir sus propios datos
- Todos los usuarios nuevos se crean con rol "cliente"
- Los usuarios no puedan cambiar su propio rol
- Se valide la estructura de datos

### 1.7 Crear Índices (Opcional para mejor rendimiento)
1. Ve a la pestaña **Índices** en Firestore
2. Los índices se crearán automáticamente cuando los necesites
3. Consulta el archivo `FIRESTORE_STRUCTURE.md` para índices recomendados

## 📁 Estructura de Archivos

```
nan-app/
├── index.html                    # Pantalla de login
├── register.html                 # Pantalla de registro
├── styles.css                    # Estilos generales
├── register-styles.css           # Estilos del registro
├── script.js                     # Lógica del login con Firebase
├── register-script.js            # Lógica del registro con Firebase
├── firebase-config.js            # Configuración de Firebase
├── firestore.rules               # Reglas de seguridad de Firestore
├── FIRESTORE_STRUCTURE.md        # Documentación de estructura de datos
└── README.md                     # Esta guía
```

## ⚙️ Paso 2: Configurar Credenciales

Abre el archivo `firebase-config.js` y reemplaza con tus credenciales:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

## 🧪 Paso 3: Probar la Aplicación

### Opción A: Servidor Local Simple
```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (si tienes http-server instalado)
npx http-server -p 8000
```

Luego abre: `http://localhost:8000`

### Opción B: Live Server (VS Code)
1. Instala la extensión "Live Server"
2. Clic derecho en `index.html`
3. Selecciona "Open with Live Server"

## 📱 Paso 4: Convertir a APK con Cordova

### 4.1 Instalar Cordova
```bash
npm install -g cordova
```

### 4.2 Crear Proyecto Cordova
```bash
cordova create NanApp com.tuempresa.nan Ñan
cd NanApp
```

### 4.3 Copiar Archivos
Copia todos los archivos HTML, CSS y JS a la carpeta `www/`

### 4.4 Agregar Plataforma Android
```bash
cordova platform add android
```

### 4.5 Configurar para Firebase en Cordova

Para que Google Sign-In funcione en Cordova, necesitas un plugin adicional:

```bash
cordova plugin add cordova-plugin-googleplus --save --variable REVERSED_CLIENT_ID=com.googleusercontent.apps.XXXXXXXXXX
```

**Obtener REVERSED_CLIENT_ID:**
1. En Firebase Console, ve a **Project Settings**
2. Selecciona tu app Android
3. Descarga `google-services.json`
4. Busca el campo `client_id` con `client_type: 3`
5. Invierte el dominio (ej: si es `123-xxx.apps.googleusercontent.com`, usa `com.googleusercontent.apps.123-xxx`)

### 4.6 Modificar script.js para Cordova

En Cordova, cambia `signInWithPopup` por `signInWithRedirect`:

```javascript
// En lugar de:
const result = await firebase.auth().signInWithPopup(provider);

// Usa:
await firebase.auth().signInWithRedirect(provider);

// Y maneja el resultado:
firebase.auth().getRedirectResult().then((result) => {
    if (result.user) {
        console.log('Login exitoso', result.user);
    }
});
```

### 4.7 Compilar APK
```bash
# APK de desarrollo
cordova build android

# APK de producción (firmado)
cordova build android --release
```

El APK estará en: `platforms/android/app/build/outputs/apk/`

## 🔐 Funcionalidades Implementadas

### ✅ Autenticación con Email/Password
- Registro de nuevos usuarios
- Login de usuarios existentes
- Validación de formato de email y contraseña
- Indicador de fortaleza de contraseña en registro

### ✅ Autenticación con Google
- Login con cuenta de Google
- Obtención automática de foto de perfil y nombre

### ✅ Firestore Database
- **Guardado automático de datos de usuario:**
  - Email, nombre, teléfono
  - Rol: "cliente" (por defecto)
  - Fecha de creación y último login
  - Estado activo
  - Arrays para favoritos y historial de pedidos
- **Actualización de lastLogin** en cada inicio de sesión
- **Reglas de seguridad** implementadas

### ✅ Gestión de Sesión
- Persistencia de sesión con `onAuthStateChanged`
- Guardar datos de usuario en localStorage
- Función de cerrar sesión (`logoutUser()`)

### ✅ Recuperación de Contraseña
- Función `resetPassword(email)` para enviar email de recuperación

### ✅ Validaciones en Tiempo Real
- Cambio de color en campos válidos/inválidos
- Validación de formato de email
- Validación de longitud de contraseña
- Solo números en campo de teléfono

## 🎨 Personalización

### Cambiar Colores
Edita `styles.css` y busca estos valores:
- Color principal rojo: `#c62828` y `#b71c1c`
- Para cambiar el tema completo, reemplaza estos valores

### Agregar Logo Personalizado
Reemplaza el texto "Ñan" con una imagen:
```html
<img src="logo.png" alt="Ñan" class="logo-img">
```

## 🛠️ Funciones Útiles Disponibles

```javascript
// Cerrar sesión
logoutUser();

// Resetear contraseña
resetPassword('usuario@email.com');

// Obtener usuario actual
const user = firebase.auth().currentUser;
console.log(user.email, user.displayName);
```

## 📊 Firestore Database - Configurado y Activo

### ✅ Estructura de Datos Implementada

**Colección: `users`**
```javascript
{
  uid: "string",                    // ID único del usuario
  email: "string",                  // Correo electrónico
  displayName: "string",            // Nombre completo
  phone: "string",                  // Teléfono (10 dígitos)
  photoURL: "string",               // URL de foto de perfil
  rol: "cliente",                   // Rol del usuario
  createdAt: timestamp,             // Fecha de creación
  lastLogin: timestamp,             // Último login
  isActive: true,                   // Estado de la cuenta
  address: null,                    // Dirección (opcional)
  favorites: [],                    // Restaurantes favoritos
  orderHistory: []                  // Historial de pedidos
}
```

### 📖 Documentación Completa
- Ver `FIRESTORE_STRUCTURE.md` para estructura completa
- Ver `firestore.rules` para reglas de seguridad

### 🔒 Seguridad Implementada
- Usuarios solo pueden leer/escribir sus propios datos
- Rol "cliente" asignado automáticamente
- Validación de estructura de datos
- Protección contra cambios de rol no autorizados

## 🚨 Solución de Problemas Comunes

### Error: "Firebase not defined"
- Verifica que las librerías de Firebase estén cargando correctamente
- Revisa la consola del navegador

### Error: "Operation not allowed"
- Ve a Firebase Console → Authentication → Sign-in method
- Asegúrate de habilitar Email/Password y Google

### Login con Google no funciona
- Verifica que el dominio esté en "Authorized domains"
- Para Cordova, asegúrate de configurar el plugin correctamente

### APK no se instala
- Revisa que tengas Android SDK instalado
- Verifica el archivo AndroidManifest.xml

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Verifica los logs de Firebase Authentication
3. Consulta la [documentación oficial de Firebase](https://firebase.google.com/docs)

## 🎯 Próximos Pasos

Una vez que el login funcione:
1. Crear pantalla principal (home.html)
2. Agregar listado de restaurantes
3. Implementar carrito de compras
4. Sistema de pedidos con Firestore
5. Notificaciones push

---

**¡Tu app Ñan Delivery ya está lista para comenzar! 🚀🍕**
