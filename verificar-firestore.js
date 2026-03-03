// ============================================
// VERIFICACIÓN DE PEDIDOS EN FIRESTORE
// ============================================
// Este archivo te ayuda a verificar que los pedidos
// se están guardando correctamente en Firestore

// Instrucciones:
// 1. Abre la consola del navegador (F12)
// 2. Ejecuta: verificarPedidos()
// 3. Verás todos los pedidos en la consola

async function verificarPedidos() {
    console.log('🔍 Verificando pedidos en Firestore...');
    
    try {
        const db = firebase.firestore();
        
        // Obtener TODOS los pedidos
        const snapshot = await db.collection('orders').get();
        
        console.log(`📊 Total de pedidos encontrados: ${snapshot.size}`);
        console.log('━'.repeat(50));
        
        if (snapshot.empty) {
            console.log('⚠️ No hay pedidos en Firestore');
            console.log('Esto puede significar:');
            console.log('1. Aún no se ha creado ningún pedido');
            console.log('2. Firestore no está configurado correctamente');
            return;
        }
        
        // Mostrar cada pedido
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`\n📦 Pedido ${index + 1}:`);
            console.log(`   ID: ${doc.id}`);
            console.log(`   Cliente: ${data.customerName}`);
            console.log(`   Total: $${data.total}`);
            console.log(`   Estado: ${data.status}`);
            console.log(`   Productos: ${data.items.length} items`);
            console.log(`   Ubicación: ${data.deliveryLocation.address}`);
            console.log(`   Fecha: ${data.orderDate ? data.orderDate.toDate() : 'N/A'}`);
            console.log('   ─'.repeat(40));
        });
        
        console.log('\n✅ Verificación completada');
        console.log('Los pedidos SÍ se están guardando en Firestore');
        
    } catch (error) {
        console.error('❌ Error al verificar pedidos:', error);
        console.log('Posibles causas:');
        console.log('1. Firebase no está inicializado');
        console.log('2. No hay conexión a internet');
        console.log('3. Reglas de seguridad de Firestore bloquean la lectura');
    }
}

// Función para verificar la última orden creada
async function verificarUltimoPedido() {
    console.log('🔍 Buscando el último pedido...');
    
    try {
        const db = firebase.firestore();
        
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            console.log('⚠️ No se encontraron pedidos');
            return;
        }
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        console.log('\n📦 ÚLTIMO PEDIDO:');
        console.log('━'.repeat(50));
        console.log(`ID: ${doc.id}`);
        console.log(`Cliente: ${data.customerName} (${data.customerEmail})`);
        console.log(`Total: $${data.total.toFixed(2)}`);
        console.log(`Estado: ${data.status}`);
        console.log(`\nProductos:`);
        data.items.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.name} x${item.quantity} = $${item.subtotal.toFixed(2)}`);
        });
        console.log(`\nUbicación de entrega:`);
        console.log(`  ${data.deliveryLocation.address}`);
        console.log(`  Coordenadas: ${data.deliveryLocation.latitude}, ${data.deliveryLocation.longitude}`);
        if (data.deliveryLocation.notes) {
            console.log(`  Notas: ${data.deliveryLocation.notes}`);
        }
        console.log('\n✅ Este es el pedido más reciente en Firestore');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Función para contar pedidos por estado
async function contarPedidosPorEstado() {
    console.log('📊 Contando pedidos por estado...');
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('orders').get();
        
        const estadisticas = {
            pendiente: 0,
            aceptado: 0,
            en_camino: 0,
            entregado: 0,
            cancelado: 0
        };
        
        snapshot.forEach(doc => {
            const status = doc.data().status;
            if (estadisticas.hasOwnProperty(status)) {
                estadisticas[status]++;
            }
        });
        
        console.log('\n📊 ESTADÍSTICAS:');
        console.log('━'.repeat(50));
        console.log(`Total de pedidos: ${snapshot.size}`);
        console.log(`\nPor estado:`);
        console.log(`  🟠 Pendientes:  ${estadisticas.pendiente}`);
        console.log(`  🔵 Aceptados:   ${estadisticas.aceptado}`);
        console.log(`  🟣 En camino:   ${estadisticas.en_camino}`);
        console.log(`  🟢 Entregados:  ${estadisticas.entregado}`);
        console.log(`  🔴 Cancelados:  ${estadisticas.cancelado}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Auto-ejecutar verificación cuando se carga el archivo
console.log('═'.repeat(50));
console.log('🔧 HERRAMIENTA DE VERIFICACIÓN DE FIRESTORE');
console.log('═'.repeat(50));
console.log('\nFunciones disponibles:');
console.log('  • verificarPedidos()           - Ver todos los pedidos');
console.log('  • verificarUltimoPedido()      - Ver el último pedido');
console.log('  • contarPedidosPorEstado()     - Ver estadísticas');
console.log('\nEjecuta cualquiera de estas funciones en la consola');
console.log('═'.repeat(50));

// Exportar funciones al scope global
window.verificarPedidos = verificarPedidos;
window.verificarUltimoPedido = verificarUltimoPedido;
window.contarPedidosPorEstado = contarPedidosPorEstado;
