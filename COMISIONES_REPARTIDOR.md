# 💰 SISTEMA DE COMISIONES - REPARTIDORES

## 📊 Configuración de Comisión

### **Comisión por Pedido: $0.25**

```javascript
const COMISION_POR_PEDIDO = 0.25;
```

Cada vez que un repartidor completa una entrega (marca como "Entregado"), gana **$0.25**.

---

## 🎯 Cómo Funciona

### **1. Dashboard (Comisión Semanal)**

**Tarjeta "Comisión Pendiente":**
- Muestra comisiones de **esta semana** (Domingo a Hoy)
- Se actualiza al cargar el dashboard
- Cálculo: `pedidos_entregados_esta_semana × $0.25`

**Ejemplo:**
```
Pedidos entregados esta semana: 12
Comisión: 12 × $0.25 = $3.00

Tarjeta muestra: "$3.00"
```

### **2. Mis Pedidos (Comisión Diaria)**

**Estadística "Ganancia":**
- Muestra comisiones de **hoy** solamente
- Se actualiza en tiempo real
- Cálculo: `pedidos_entregados_hoy × $0.25`

**Ejemplo:**
```
Pedidos entregados hoy: 8
Comisión: 8 × $0.25 = $2.00

Estadística muestra: "$2.00"
```

---

## 📅 Períodos de Cálculo

### **Semanal (Dashboard)**
```javascript
Inicio: Domingo 00:00:00
Fin: Hoy 23:59:59
```

### **Diario (Mis Pedidos)**
```javascript
Inicio: Hoy 00:00:00
Fin: Hoy 23:59:59
```

---

## 🔄 Actualización de Comisiones

### **Cuándo se Actualiza:**

**Dashboard:**
```
✅ Al cargar la página
✅ Al recargar manualmente (F5)
```

**Mis Pedidos:**
```
✅ Al cargar la página
✅ En tiempo real cuando se marca "Entregado"
✅ Automáticamente con onSnapshot
```

---

## 💵 Ejemplos de Ganancias

### **Escenario 1: Día Tranquilo**
```
Pedidos entregados hoy: 4
Comisión del día: 4 × $0.25 = $1.00
```

### **Escenario 2: Día Normal**
```
Pedidos entregados hoy: 12
Comisión del día: 12 × $0.25 = $3.00
```

### **Escenario 3: Día Ocupado**
```
Pedidos entregados hoy: 20
Comisión del día: 20 × $0.25 = $5.00
```

### **Escenario 4: Semana Completa**
```
Lunes: 10 pedidos = $2.50
Martes: 12 pedidos = $3.00
Miércoles: 15 pedidos = $3.75
Jueves: 14 pedidos = $3.50
Viernes: 18 pedidos = $4.50
Sábado: 20 pedidos = $5.00
Domingo: 16 pedidos = $4.00

Total semana: 105 pedidos × $0.25 = $26.25
```

---

## 🔍 Cómo se Calcula

### **Código en Dashboard:**

```javascript
async function loadEarnings() {
    const COMISION_POR_PEDIDO = 0.25;
    
    // Obtener inicio de semana (Domingo)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Obtener pedidos entregados
    const snapshot = await db.collection('orders')
        .where('driverId', '==', currentDriver.uid)
        .where('status', '==', 'entregado')
        .get();
    
    // Contar pedidos de esta semana
    let weeklyCount = 0;
    snapshot.forEach(doc => {
        const deliveredDate = doc.data().deliveredAt.toDate();
        if (deliveredDate >= startOfWeek) {
            weeklyCount++;
        }
    });
    
    // Calcular comisión
    const weeklyEarnings = weeklyCount × COMISION_POR_PEDIDO;
    
    // Mostrar: $X.XX
    document.getElementById('earningsAmount').textContent = 
        `$${weeklyEarnings.toFixed(2)}`;
}
```

### **Código en Mis Pedidos:**

```javascript
function updateStats() {
    const COMISION_POR_PEDIDO = 0.25;
    
    // Obtener inicio del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Contar pedidos entregados hoy
    const completedToday = myOrders.filter(order => {
        if (order.status !== 'entregado') return false;
        if (!order.deliveredAt) return false;
        
        const deliveredDate = order.deliveredAt.toDate();
        return deliveredDate >= today;
    }).length;
    
    // Calcular comisión del día
    const earningsToday = completedToday × COMISION_POR_PEDIDO;
    
    // Mostrar: $X.XX
    document.getElementById('earningsToday').textContent = 
        `$${earningsToday.toFixed(2)}`;
}
```

---

## ✅ Validación

### **Solo se Cuentan Pedidos:**
```javascript
✅ status = "entregado"
✅ driverId = repartidor actual
✅ deliveredAt existe (timestamp)
✅ deliveredAt dentro del período
```

### **NO se Cuentan Pedidos:**
```javascript
❌ status = "aceptado"
❌ status = "en_camino"
❌ status = "cancelado"
❌ Pedidos de otros repartidores
❌ Pedidos sin deliveredAt
```

---

## 🎨 Visualización

### **Dashboard:**
```
┌─────────────────────────┐
│ Comisión Pendiente   📊 │
│                         │
│      $3.00              │ ← Comisión semanal
│   Esta Semana           │
└─────────────────────────┘
```

### **Mis Pedidos:**
```
┌────────┬────────┬────────┐
│   5    │   12   │ $3.00  │
│ Activos│  Hoy   │Ganancia│ ← Comisión diaria
└────────┴────────┴────────┘
```

---

## 🔧 Modificar la Comisión

Para cambiar el valor de la comisión, actualiza la constante en ambos archivos:

**1. driver-dashboard-script.js:**
```javascript
// Línea ~105
const COMISION_POR_PEDIDO = 0.25; // Cambia aquí
```

**2. driver-orders-script.js:**
```javascript
// Línea ~140
const COMISION_POR_PEDIDO = 0.25; // Cambia aquí
```

### **Ejemplos de Otras Comisiones:**

```javascript
// Comisión baja
const COMISION_POR_PEDIDO = 0.15; // $0.15

// Comisión media
const COMISION_POR_PEDIDO = 0.50; // $0.50

// Comisión alta
const COMISION_POR_PEDIDO = 1.00; // $1.00

// Porcentaje del total (10%)
const comision = order.total * 0.10;
```

---

## 📊 Estadísticas Mostradas

### **Dashboard:**
| Tarjeta | Valor | Período |
|---------|-------|---------|
| Comisión Pendiente | $X.XX | Esta Semana |

### **Mis Pedidos:**
| Stat | Valor | Descripción |
|------|-------|-------------|
| Activos | 5 | Pedidos aceptados + en camino |
| Hoy | 12 | Pedidos entregados hoy |
| Ganancia | $3.00 | Comisión del día (hoy × $0.25) |

---

## 🚀 Mejoras Futuras Sugeridas

### **1. Comisión Variable por Distancia:**
```javascript
const comision = distancia * 0.10; // $0.10 por km
```

### **2. Comisión por Horario:**
```javascript
// Horario nocturno (10pm-6am)
const comision = isNightShift ? 0.50 : 0.25;
```

### **3. Bonos por Cantidad:**
```javascript
if (pedidosDelDia >= 20) {
    comision += 2.00; // Bono de $2
}
```

### **4. Porcentaje del Total:**
```javascript
const PORCENTAJE_COMISION = 0.05; // 5%
const comision = order.total * PORCENTAJE_COMISION;
```

### **5. Sistema de Niveles:**
```javascript
const niveles = {
    'bronce': 0.20,   // 0-50 pedidos
    'plata': 0.25,    // 51-100 pedidos
    'oro': 0.30       // 101+ pedidos
};
```

---

## ✅ Checklist de Implementación

- [x] Comisión de $0.25 configurada
- [x] Cálculo semanal en dashboard
- [x] Cálculo diario en mis pedidos
- [x] Actualización en tiempo real
- [x] Formato de moneda correcto
- [x] Solo cuenta pedidos entregados
- [x] Filtra por período correcto
- [x] Manejo de errores

---

## 📝 Notas Importantes

1. **La comisión es SOLO por visualización**
   - No se guarda en Firestore
   - Se calcula en tiempo real
   - No afecta el total del pedido

2. **El cliente NO ve la comisión**
   - Es información privada del repartidor
   - Solo visible en app de repartidores

3. **Los $0.25 son por CADA pedido entregado**
   - No importa el total del pedido
   - No importa la distancia
   - Tarifa fija por entrega

4. **Para pagos reales:**
   - Implementar sistema de pagos
   - Guardar historial en Firestore
   - Generar reportes de comisiones
   - Integrar con sistema de nómina

---

## 🎯 Resumen

```
Comisión por pedido: $0.25
Período semanal: Domingo - Hoy
Período diario: 00:00 - 23:59
Actualización: Tiempo real
Estado requerido: "entregado"
```

**¡Sistema de comisiones configurado y funcionando!** 💰✅
