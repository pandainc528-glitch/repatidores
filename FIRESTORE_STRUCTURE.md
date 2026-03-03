# 📊 Estructura de Datos en Firestore - Ñan Delivery

## 🗂️ Colecciones y Documentos

### 📁 Colección: `users`
Almacena la información de todos los usuarios registrados.

**Ruta:** `/users/{userId}`

**Estructura del documento:**
```javascript
{
  uid: "string",                    // ID único del usuario (igual al Auth UID)
  email: "string",                  // Correo electrónico
  displayName: "string",            // Nombre completo
  phone: "string",                  // Número de teléfono (10 dígitos)
  photoURL: "string",               // URL de foto de perfil
  rol: "cliente",                   // Rol del usuario: "cliente", "admin", "repartidor"
  createdAt: timestamp,             // Fecha de creación de la cuenta
  lastLogin: timestamp,             // Última vez que inició sesión
  isActive: boolean,                // Si la cuenta está activa
  address: object | null,           // Dirección guardada (opcional)
  favorites: array,                 // IDs de restaurantes favoritos
  orderHistory: array               // IDs de órdenes pasadas
}
```

**Ejemplo de documento:**
```javascript
{
  uid: "Xy7pQmNk3ZRfL9vT2jH8",
  email: "juan.perez@gmail.com",
  displayName: "Juan Pérez",
  phone: "0987654321",
  photoURL: "",
  rol: "cliente",
  createdAt: Timestamp(2024-02-03 10:30:00),
  lastLogin: Timestamp(2024-02-03 10:30:00),
  isActive: true,
  address: {
    street: "Av. Principal 123",
    city: "Atuntaqui",
    reference: "Junto al parque"
  },
  favorites: [],
  orderHistory: []
}
```

---

### 📁 Colección: `restaurants` (Para implementar)
Almacena información de los restaurantes disponibles.

**Ruta:** `/restaurants/{restaurantId}`

**Estructura del documento:**
```javascript
{
  restaurantId: "string",           // ID único del restaurante
  name: "string",                   // Nombre del restaurante
  description: "string",            // Descripción
  category: "string",               // Categoría (comida rápida, italiana, etc.)
  imageURL: "string",               // Imagen principal
  rating: number,                   // Calificación promedio (0-5)
  deliveryTime: "string",           // Tiempo estimado de entrega
  deliveryFee: number,              // Costo de envío
  minOrder: number,                 // Pedido mínimo
  isOpen: boolean,                  // Si está abierto ahora
  schedule: object,                 // Horarios de atención
  location: {
    latitude: number,
    longitude: number,
    address: "string"
  },
  menu: array,                      // Array de categorías del menú
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

### 📁 Colección: `orders` (Para implementar)
Almacena los pedidos realizados.

**Ruta:** `/orders/{orderId}`

**Estructura del documento:**
```javascript
{
  orderId: "string",                // ID único del pedido
  userId: "string",                 // ID del usuario que ordenó
  restaurantId: "string",           // ID del restaurante
  items: array,                     // Productos ordenados
  subtotal: number,                 // Subtotal sin envío
  deliveryFee: number,              // Costo de envío
  total: number,                    // Total a pagar
  status: "string",                 // "pendiente", "confirmado", "en_camino", "entregado", "cancelado"
  paymentMethod: "string",          // "efectivo", "tarjeta", "transferencia"
  deliveryAddress: object,          // Dirección de entrega
  deliveryInstructions: "string",   // Instrucciones especiales
  orderDate: timestamp,             // Fecha del pedido
  estimatedDelivery: timestamp,     // Entrega estimada
  actualDelivery: timestamp | null, // Entrega real
  driverId: "string" | null,        // ID del repartidor asignado
  customerName: "string",           // Nombre del cliente
  customerPhone: "string"           // Teléfono del cliente
}
```

**Ejemplo de pedido:**
```javascript
{
  orderId: "ORD-20240203-001",
  userId: "Xy7pQmNk3ZRfL9vT2jH8",
  restaurantId: "REST-001",
  items: [
    {
      productId: "PROD-123",
      name: "Hamburguesa Clásica",
      quantity: 2,
      price: 5.50,
      subtotal: 11.00,
      notes: "Sin cebolla"
    },
    {
      productId: "PROD-456",
      name: "Papas Fritas",
      quantity: 1,
      price: 2.50,
      subtotal: 2.50,
      notes: ""
    }
  ],
  subtotal: 13.50,
  deliveryFee: 1.50,
  total: 15.00,
  status: "pendiente",
  paymentMethod: "efectivo",
  deliveryAddress: {
    street: "Av. Principal 123",
    city: "Atuntaqui",
    reference: "Casa blanca, portón negro"
  },
  deliveryInstructions: "Tocar el timbre dos veces",
  orderDate: Timestamp(2024-02-03 12:30:00),
  estimatedDelivery: Timestamp(2024-02-03 13:00:00),
  actualDelivery: null,
  driverId: null,
  customerName: "Juan Pérez",
  customerPhone: "0987654321"
}
```

---

## 🔐 Roles de Usuario

### 1. **Cliente** (Por defecto)
- Puede ver restaurantes y menús
- Puede hacer pedidos
- Puede ver su historial de pedidos
- Puede actualizar su perfil

### 2. **Admin** (Futuro)
- Todos los permisos de cliente
- Puede crear/editar/eliminar restaurantes
- Puede ver todos los pedidos
- Puede gestionar usuarios

### 3. **Repartidor** (Futuro)
- Puede ver pedidos asignados
- Puede actualizar estado de entregas
- Puede ver direcciones de entrega

---

## 📋 Índices Recomendados

### Colección `users`
- `email` (ascendente)
- `rol` (ascendente)
- `createdAt` (descendente)

### Colección `orders`
- `userId` + `orderDate` (compuesto, descendente)
- `restaurantId` + `orderDate` (compuesto, descendente)
- `status` (ascendente)
- `driverId` + `status` (compuesto)

### Colección `restaurants`
- `category` (ascendente)
- `rating` (descendente)
- `isOpen` (ascendente)

---

## 🚀 Funciones Útiles para Consultas

### Obtener datos del usuario actual:
```javascript
const userId = firebase.auth().currentUser.uid;
const userDoc = await firebase.firestore()
  .collection('users')
  .doc(userId)
  .get();

const userData = userDoc.data();
console.log('Usuario:', userData);
```

### Actualizar perfil del usuario:
```javascript
const userId = firebase.auth().currentUser.uid;
await firebase.firestore()
  .collection('users')
  .doc(userId)
  .update({
    displayName: 'Nuevo Nombre',
    phone: '0999999999',
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });
```

### Obtener restaurantes abiertos:
```javascript
const restaurants = await firebase.firestore()
  .collection('restaurants')
  .where('isOpen', '==', true)
  .orderBy('rating', 'desc')
  .get();

restaurants.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

### Crear un nuevo pedido:
```javascript
const newOrder = {
  userId: firebase.auth().currentUser.uid,
  restaurantId: 'REST-001',
  items: [...],
  total: 15.00,
  status: 'pendiente',
  orderDate: firebase.firestore.FieldValue.serverTimestamp()
};

const orderRef = await firebase.firestore()
  .collection('orders')
  .add(newOrder);

console.log('Pedido creado:', orderRef.id);
```

### Obtener pedidos del usuario:
```javascript
const userId = firebase.auth().currentUser.uid;
const orders = await firebase.firestore()
  .collection('orders')
  .where('userId', '==', userId)
  .orderBy('orderDate', 'desc')
  .limit(10)
  .get();

orders.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

---

## ⚠️ Notas Importantes

1. **Timestamps**: Usar `firebase.firestore.FieldValue.serverTimestamp()` para fechas
2. **IDs**: El campo `uid` debe coincidir con el ID del documento
3. **Seguridad**: Siempre validar datos antes de guardar
4. **Índices**: Crear índices para consultas complejas
5. **Backup**: Configurar exportaciones automáticas de Firestore

---

## 📱 Estado Actual de la App

✅ **Implementado:**
- Colección `users` con rol "cliente"
- Registro de usuarios con datos completos
- Login con Google y Email/Password
- Actualización de `lastLogin` en cada inicio de sesión

🔜 **Próximo a implementar:**
- Colección `restaurants`
- Colección `orders`
- Sistema de favoritos
- Historial de pedidos
