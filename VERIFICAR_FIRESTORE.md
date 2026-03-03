# ✅ VERIFICAR QUE LOS PEDIDOS SE GUARDAN EN FIRESTORE

## 🎯 Resumen Rápido

**SÍ, los pedidos se están guardando en Firestore** ✅

La función `createOrder()` en `select-location-script.js` guarda cada pedido en la colección `orders` de Firestore.

---

## 🔍 3 Formas de Verificar

### **Método 1: Firebase Console (Más Fácil)**

1. **Ve a [Firebase Console](https://console.firebase.google.com/)**
2. Selecciona tu proyecto
3. En el menú lateral → **Firestore Database**
4. Deberías ver una colección llamada **`orders`**
5. Haz click en ella para ver todos los pedidos

**Estructura que verás:**
```
orders
├── ABC123XYZ
│   ├── userId: "..."
│   ├── customerName: "Juan Pérez"
│   ├── total: 11.00
│   ├── status: "pendiente"
│   └── deliveryLocation: {...}
└── DEF456UVW
    └── ...
```

---

### **Método 2: Consola del Navegador**

1. **Incluye el archivo de verificación en tu HTML:**
   
   En `select-location.html` o `my-orders.html`, agrega antes de `</body>`:
   ```html
   <script src="verificar-firestore.js"></script>
   ```

2. **Abre la consola del navegador** (F12 o clic derecho → Inspeccionar)

3. **Ejecuta en la consola:**
   ```javascript
   verificarPedidos()
   ```

4. **Verás algo como:**
   ```
   🔍 Verificando pedidos en Firestore...
   📊 Total de pedidos encontrados: 3
   
   📦 Pedido 1:
      ID: ABC123XYZ
      Cliente: Juan Pérez
      Total: $11.00
      Estado: pendiente
      Productos: 2 items
   ...
   ```

**Otras funciones útiles:**
```javascript
verificarUltimoPedido()      // Ver solo el último pedido
contarPedidosPorEstado()     // Ver estadísticas
```

---

### **Método 3: En la App "Mis Pedidos"**

1. **Crea un pedido de prueba:**
   - Agrega productos al carrito
   - Ve a "Realizar Pedido"
   - Selecciona ubicación
   - Confirma

2. **Ve a "Mis Pedidos"** (`my-orders.html`)

3. **Si ves tu pedido** → ✅ **Se está guardando correctamente**

4. **Si no ves nada:**
   - Abre la consola (F12)
   - Busca errores en rojo
   - Verifica que Firebase esté configurado

---

## 🐛 Solución de Problemas

### Problema: "No veo pedidos en Firestore Console"

**Posibles causas:**

1. **Aún no has creado ningún pedido**
   - Solución: Crea un pedido de prueba

2. **Firestore no está habilitado**
   - Ve a Firebase Console → Firestore Database
   - Si dice "Crear base de datos", hazlo

3. **Error en la configuración de Firebase**
   - Verifica que `firebase-config.js` tenga las credenciales correctas
   - Verifica que Firestore esté inicializado:
   ```javascript
   db = firebase.firestore();
   ```

---

### Problema: "Error al crear pedido"

**Verifica en la consola del navegador:**

1. **Abre la consola** (F12)
2. **Crea un pedido**
3. **Busca mensajes:**
   - ✅ `"✅ Pedido creado: ABC123XYZ"` → Todo bien
   - ❌ Errores en rojo → Hay un problema

**Errores comunes:**

```
❌ "Missing or insufficient permissions"
```
**Solución:** Actualiza las reglas de Firestore

```
❌ "Firebase not initialized"
```
**Solución:** Verifica `firebase-config.js`

```
❌ "orders is not defined"
```
**Solución:** Firestore no está inicializado

---

## 📋 Checklist de Verificación

Marca cada paso:

- [ ] Firebase está configurado (`firebase-config.js` con credenciales)
- [ ] Firestore Database está habilitado en Firebase Console
- [ ] Reglas de Firestore permiten escritura (ver `firestore.rules`)
- [ ] Al crear pedido, se muestra mensaje de éxito
- [ ] En Firebase Console → Firestore, existe colección `orders`
- [ ] Los pedidos aparecen en "Mis Pedidos"
- [ ] La consola muestra: `"✅ Pedido creado: ..."`

---

## 🔧 Código Exacto que Guarda el Pedido

**Archivo:** `select-location-script.js`

**Línea ~214:**
```javascript
async function createOrder(addressReference, deliveryNotes) {
    const db = firebase.firestore();  // ← Conectar a Firestore
    
    const orderData = {
        userId: currentUser.uid,
        customerName: currentUser.displayName,
        items: [...],
        total: total,
        status: 'pendiente',
        deliveryLocation: {
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            address: addressReference,
            notes: deliveryNotes
        },
        // ... más campos
    };
    
    // ← AQUÍ SE GUARDA EN FIRESTORE
    const orderRef = await db.collection('orders').add(orderData);
    
    console.log('✅ Pedido creado:', orderRef.id);
    return orderRef.id;
}
```

---

## ✅ Confirmación Final

Si después de crear un pedido:

1. ✅ Ves el modal de "¡Pedido Realizado!"
2. ✅ Te redirige a "Mis Pedidos"
3. ✅ Ves tu pedido en la lista

**→ Entonces los pedidos SÍ se están guardando en Firestore** 🎉

---

## 📞 Ayuda Adicional

Si sigues teniendo dudas, verifica:

1. **Logs en la consola del navegador** (F12)
2. **Firebase Console** → Firestore Database → orders
3. **Reglas de Firestore** están configuradas correctamente

---

## 🎯 Resumen

| Acción | Ubicación | Resultado |
|--------|-----------|-----------|
| Usuario confirma pedido | `select-location.html` | Se ejecuta `createOrder()` |
| Se guarda en Firestore | Colección `orders` | Nuevo documento creado |
| Se muestra en la app | `my-orders.html` | Lista de pedidos actualizada |

**Todo está configurado correctamente para guardar en Firestore** ✅
