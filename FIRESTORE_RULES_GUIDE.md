# 🔒 REGLAS DE FIRESTORE ACTUALIZADAS - ÑAN DELIVERY

## 📋 Resumen de Cambios

### ✅ Nuevas Colecciones Soportadas:
1. **users** (Clientes) - Ya existente, mejorada
2. **repartidores** (Drivers) - NUEVA ✨
3. **orders** (Pedidos) - Mejorada con permisos para repartidores

---

## 🎯 Colección: `users` (CLIENTES)

### Permisos:
- ✅ **Lectura:** Solo el propio usuario
- ✅ **Creación:** Al registrarse (rol = "cliente")
- ✅ **Actualización:** Solo el usuario, NO puede cambiar su rol
- ✅ **Eliminación:** Solo el propio usuario

### Validaciones:
```javascript
✅ Email válido
✅ Nombre mínimo 3 caracteres
✅ Rol debe ser "cliente"
✅ No puede cambiar su UID
✅ No puede cambiar su rol
```

---

## 🚗 Colección: `repartidores` (DRIVERS) - NUEVA

### Permisos:
- ✅ **Lectura:** Solo el propio repartidor
- ✅ **Creación:** Al registrarse como repartidor
- ✅ **Actualización:** Puede actualizar sus datos, pero NO su status
- ❌ **Eliminación:** NO permitida (solo admin)

### Validaciones de Creación:
```javascript
✅ UID correcto (debe ser el mismo del Auth)
✅ Email válido (formato correcto)
✅ Teléfono: exactamente 10 dígitos
✅ Cédula: exactamente 10 caracteres
✅ Nombre: mínimo 3 caracteres
✅ Tipo de vehículo: 'moto', 'auto', o 'bicicleta'
✅ Placa: mínimo 3 caracteres
✅ Status inicial: 'activo' o 'pendiente'
```

### Campos Requeridos:
```javascript
{
  uid: string (requerido),
  nombre: string (requerido),
  email: string (requerido),
  telefono: string (requerido, 10 dígitos),
  cedula: string (requerido, 10 caracteres),
  tipoVehiculo: string (requerido, moto|auto|bicicleta),
  placa: string (requerido),
  status: string (requerido, activo|pendiente)
}
```

---

## 📦 Colección: `orders` (PEDIDOS) - MEJORADA

### Permisos de Lectura:
```javascript
✅ CLIENTE → Solo sus propios pedidos
✅ REPARTIDOR ACTIVO → 
   - Pedidos pendientes (sin asignar)
   - Pedidos asignados a él
```

### Permisos de Actualización:

**CLIENTE puede:**
- ✅ Cancelar su pedido si está "pendiente"

**REPARTIDOR ACTIVO puede:**
- ✅ Aceptar pedidos pendientes
- ✅ Actualizar status: aceptado → en_camino → entregado

---

## 📝 CÓMO DESPLEGAR ESTAS REGLAS

### Opción 1: Firebase Console (Recomendado)

1. Ve a https://console.firebase.google.com/
2. Selecciona tu proyecto
3. Firestore Database → Pestaña "Reglas"
4. Copia TODO el contenido de `firestore.rules`
5. Pega en el editor
6. Click en "Publicar"
7. ✅ ¡Listo!

### Opción 2: Firebase CLI

```bash
firebase deploy --only firestore:rules
```

---

## ✅ VERIFICAR QUE FUNCIONEN

### En Firebase Console:
1. Ve a Firestore → Reglas
2. Click en "Simulador de reglas"
3. Prueba operaciones:
   - Cliente creando pedido ✅
   - Repartidor aceptando pedido ✅
   - Cliente modificando pedido de otro ❌

---

## 🚨 ERRORES COMUNES

### "Missing or insufficient permissions"

**Para Clientes:**
- Verifica que existe en colección `users`
- Verifica que tiene rol = "cliente"

**Para Repartidores:**
- Verifica que existe en `repartidores`
- Verifica que status = "activo"

---

## 📊 FLUJO DE ESTADOS DE PEDIDO

```
PENDIENTE → [Repartidor acepta] → ACEPTADO
ACEPTADO → [En ruta] → EN_CAMINO
EN_CAMINO → [Entregado] → ENTREGADO

O bien:
PENDIENTE → [Cliente cancela] → CANCELADO
```

---

## ✅ CHECKLIST

- [ ] Copiar `firestore.rules`
- [ ] Ir a Firebase Console
- [ ] Publicar reglas
- [ ] Probar creando pedido
- [ ] Probar registrando repartidor
- [ ] Verificar permisos

**¡Reglas listas para producción!** 🚀
