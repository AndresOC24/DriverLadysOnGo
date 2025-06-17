// JavaScript para App de Conductoras - LadysOnGo

// Variables globales
let driverName = '';
let driverPhone = '';
let driverVehicle = '';
let driverLocation = null;
let pollInterval = null;
let isActive = false;
let currentTrip = null;
let statsData = {
    tripsCompleted: 0,
    earningsToday: 0,
    hoursOnline: 0,
    startTime: null
};

// URL base de las funciones Netlify (CAMBIAR POR TU URL REAL)
const API_BASE = window.location.hostname === 'https://ladysongo.netlify.app/' 
  ? 'http://localhost:8888/.netlify/functions'
  : 'https://ladysongo.netlify.app/.netlify/functions'; // CAMBIAR POR TU URL

console.log('🚗 Driver App - API Base URL:', API_BASE);

// Inicializar app cuando carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Driver App...');
    
    // Configurar formulario de conductora
    setupDriverForm();
    
    // Configurar botones
    setupButtons();
    
    // Mostrar estado inicial
    updateStatus('Desconectada', 'offline');
});

// Configurar formulario de registro de conductora
function setupDriverForm() {
    const form = document.getElementById('driver-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            startDriver();
        });
    }
}

// Configurar botones del dashboard
function setupButtons() {
    // Botón para dejar de recibir viajes
    const stopBtn = document.getElementById('stop-listening');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopDriver);
    }
    
    // Botón para actualizar viajes manualmente
    const refreshBtn = document.getElementById('refresh-rides');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', manualRefresh);
    }
}

// Iniciar conductora
function startDriver() {
    // Obtener datos del formulario
    const nameInput = document.getElementById('driver-name');
    const phoneInput = document.getElementById('driver-phone');
    const vehicleInput = document.getElementById('driver-vehicle');
    
    if (!nameInput.value.trim() || !phoneInput.value.trim() || !vehicleInput.value.trim()) {
        showNotification('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    driverName = nameInput.value.trim();
    driverPhone = phoneInput.value.trim();
    driverVehicle = vehicleInput.value.trim();
    driverLocation = generateRandomLocation();
    
    console.log('👤 Conductora iniciada:', {
        name: driverName,
        phone: driverPhone,
        vehicle: driverVehicle,
        location: driverLocation
    });
    
    // Mostrar información de conductora activa
    document.getElementById('active-driver-name').textContent = driverName;
    document.getElementById('active-driver-phone').textContent = driverPhone;
    document.getElementById('active-driver-vehicle').textContent = driverVehicle;
    document.getElementById('driver-location').textContent = driverLocation.address;
    
    // Cambiar vista
    document.getElementById('driver-setup').style.display = 'none';
    document.getElementById('active-driver').style.display = 'block';
    
    // Inicializar estadísticas
    statsData.startTime = new Date();
    updateStats();
    
    // Cambiar estado
    isActive = true;
    updateStatus('En línea - Buscando viajes', 'online');
    
    // Iniciar polling
    startPolling();
    
    showNotification('✅ ¡Conectada exitosamente!', 'success');
}

// Detener conductora
function stopDriver() {
    if (confirm('¿Estás segura que quieres dejar de recibir viajes?')) {
        console.log('⏹️ Deteniendo conductora...');
        
        // Detener polling
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        
        // Cambiar vista
        document.getElementById('active-driver').style.display = 'none';
        document.getElementById('driver-setup').style.display = 'block';
        
        // Limpiar formulario
        document.getElementById('driver-form').reset();
        
        // Resetear variables
        isActive = false;
        currentTrip = null;
        driverName = '';
        driverPhone = '';
        driverVehicle = '';
        driverLocation = null;
        
        // Cambiar estado
        updateStatus('Desconectada', 'offline');
        
        showNotification('⏹️ Desconectada exitosamente', 'info');
    }
}

// Generar ubicación aleatoria en Santa Cruz
function generateRandomLocation() {
    const santaCruzLat = -17.7833;
    const santaCruzLng = -63.1821;
    
    // Generar coordenadas aleatorias en un radio de ~3km
    const randomLat = santaCruzLat + (Math.random() - 0.5) * 0.03;
    const randomLng = santaCruzLng + (Math.random() - 0.5) * 0.03;
    
    const zones = [
        'Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste', 
        'Centro', 'Plan 3000', 'Villa 1ro de Mayo', 'Equipetrol',
        'Las Palmas', 'Urbari'
    ];
    
    return { 
        lat: randomLat, 
        lng: randomLng,
        address: zones[Math.floor(Math.random() * zones.length)]
    };
}

// Iniciar polling para buscar viajes
function startPolling() {
    console.log('📡 Iniciando polling para viajes...');
    
    // Mostrar indicador de búsqueda
    document.getElementById('search-spinner').style.display = 'block';
    
    pollInterval = setInterval(async () => {
        await searchForRides();
    }, 3000); // Buscar cada 3 segundos
    
    // Primera búsqueda inmediata
    searchForRides();
}

// Buscar viajes disponibles
async function searchForRides() {
    if (!isActive) return;
    
    try {
        console.log('🔍 Buscando viajes disponibles...');
        
        const response = await fetch(`${API_BASE}/rides-list?status=pending`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📋 Viajes encontrados:', result);
        
        // Actualizar indicador
        document.getElementById('last-update').textContent = 
            `Última actualización: ${new Date().toLocaleTimeString()}`;
        
        // Mostrar viajes
        displayRides(result.rides || []);
        
    } catch (error) {
        console.error('❌ Error buscando viajes:', error);
        
        // Si hay error de red, mostrar mensaje
        if (error.message.includes('Failed to fetch')) {
            document.getElementById('last-update').textContent = 
                '❌ Error de conexión';
        }
    } finally {
        document.getElementById('search-spinner').style.display = 'none';
    }
}

// Mostrar lista de viajes
function displayRides(rides) {
    const container = document.getElementById('rides-container');
    const noRidesMsg = document.getElementById('no-rides');
    
    if (rides.length === 0) {
        noRidesMsg.style.display = 'block';
        container.innerHTML = `
            <div id="no-rides" class="no-rides">
                <div class="empty-state">
                    <div class="empty-icon">🕐</div>
                    <p>No hay viajes disponibles</p>
                    <small>Los nuevos viajes aparecerán aquí automáticamente</small>
                </div>
            </div>
        `;
        return;
    }
    
    noRidesMsg.style.display = 'none';
    
    container.innerHTML = rides.map(ride => `
        <div class="ride-card fade-in" data-ride-id="${ride.id}">
            <div class="ride-info">
                <div class="ride-passenger">👤 ${ride.pasajera.nombre}</div>
                <div class="ride-details">
                    <p><strong>📍 Recoger en:</strong> ${ride.pasajera.lat.toFixed(4)}, ${ride.pasajera.lng.toFixed(4)}</p>
                    <p><strong>🎯 Destino:</strong> ${ride.destino}</p>
                    <p><strong>⏰ Solicitado:</strong> ${new Date(ride.timestamp).toLocaleTimeString()}</p>
                    <p><strong>💰 Tarifa estimada:</strong> $${calculateFare(ride)}</p>
                </div>
            </div>
            <div class="ride-actions">
                <button onclick="acceptRide('${ride.id}')" class="btn-success">
                    ✅ Aceptar Viaje
                </button>
                <button onclick="viewRideDetails('${ride.id}')" class="btn-secondary">
                    👁️ Ver Detalles
                </button>
            </div>
        </div>
    `).join('');
}

// Calcular tarifa estimada (simulada)
function calculateFare(ride) {
    // Calcular distancia aproximada (simulada)
    const distance = Math.random() * 10 + 2; // Entre 2 y 12 km
    const baseFare = 15; // Tarifa base en bolivianos
    const perKm = 2; // Precio por km
    
    return Math.round(baseFare + (distance * perKm));
}

// Aceptar viaje
async function acceptRide(rideId) {
    if (!isActive || currentTrip) {
        showNotification('❌ No puedes aceptar viajes en este momento', 'error');
        return;
    }
    
    try {
        console.log('✅ Aceptando viaje:', rideId);
        
        const response = await fetch(`${API_BASE}/rides-update/${rideId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'accepted',
                conductora_nombre: driverName,
                conductora_lat: driverLocation.lat,
                conductora_lng: driverLocation.lng
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Viaje aceptado:', result);
        
        if (result.success) {
            currentTrip = result.ride;
            showTripInProgress(result.ride);
            
            // Detener polling de nuevos viajes
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            
            // Actualizar estadísticas
            statsData.tripsCompleted++;
            statsData.earningsToday += calculateFare(result.ride);
            updateStats();
            
            showNotification('🎉 ¡Viaje aceptado exitosamente!', 'success');
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('❌ Error aceptando viaje:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Mostrar viaje en progreso
function showTripInProgress(ride) {
    console.log('🚗 Mostrando viaje en progreso:', ride);
    
    // Cambiar vista
    document.getElementById('active-driver').style.display = 'none';
    document.getElementById('trip-in-progress').style.display = 'block';
    
    // Llenar detalles del viaje
    const detailsContainer = document.getElementById('trip-details');
    detailsContainer.innerHTML = `
        <div class="trip-passenger">
            <h4>👤 Información de la Pasajera</h4>
            <p><strong>Nombre:</strong> ${ride.pasajera.nombre}</p>
            <p><strong>Ubicación:</strong> ${ride.pasajera.lat.toFixed(4)}, ${ride.pasajera.lng.toFixed(4)}</p>
            <p><strong>Destino:</strong> ${ride.destino}</p>
        </div>
        
        <div class="trip-route">
            <h4>🗺️ Información de Ruta</h4>
            <p><strong>Tu ubicación:</strong> ${driverLocation.address}</p>
            <p><strong>Distancia estimada:</strong> ${(Math.random() * 5 + 1).toFixed(1)} km</p>
            <p><strong>Tiempo estimado:</strong> ${Math.floor(Math.random() * 10 + 5)} minutos</p>
        </div>
        
        <div class="trip-actions">
            <button onclick="startNavigation()" class="btn-primary">
                🧭 Iniciar Navegación
            </button>
            <button onclick="callPassenger()" class="btn-secondary">
                📞 Llamar Pasajera
            </button>
            <button onclick="completeTrip()" class="btn-success">
                ✅ Completar Viaje
            </button>
            <button onclick="cancelTrip()" class="btn-danger">
                ❌ Cancelar Viaje
            </button>
        </div>
    `;
    
    // Cambiar estado
    updateStatus('En viaje', 'online');
}

// Ver detalles de un viaje
function viewRideDetails(rideId) {
    console.log('👁️ Viendo detalles del viaje:', rideId);
    
    // Buscar el viaje en la lista actual
    const rideCard = document.querySelector(`[data-ride-id="${rideId}"]`);
    if (rideCard) {
        rideCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rideCard.style.border = '3px solid #667eea';
        
        setTimeout(() => {
            rideCard.style.border = '2px solid #e1e5e9';
        }, 2000);
    }
    
    showNotification('ℹ️ Detalles del viaje resaltados', 'info');
}

// Iniciar navegación (simulado)
function startNavigation() {
    console.log('🧭 Iniciando navegación...');
    
    // Simular apertura de Google Maps
    if (currentTrip) {
        const passengerLat = currentTrip.pasajera.lat;
        const passengerLng = currentTrip.pasajera.lng;
        
        // URL para Google Maps con direcciones
        const mapsUrl = `https://www.google.com/maps/dir/${driverLocation.lat},${driverLocation.lng}/${passengerLat},${passengerLng}`;
        
        if (confirm('¿Abrir Google Maps para navegar hacia la pasajera?')) {
            window.open(mapsUrl, '_blank');
        }
    }
    
    showNotification('🧭 Navegación iniciada', 'success');
}

// Llamar a la pasajera (simulado)
function callPassenger() {
    console.log('📞 Llamando a la pasajera...');
    
    if (currentTrip) {
        // En una app real, aquí se haría una llamada telefónica
        showNotification('📞 Iniciando llamada a ' + currentTrip.pasajera.nombre, 'info');
        
        // Simular llamada
        setTimeout(() => {
            showNotification('📞 Llamada finalizada', 'success');
        }, 3000);
    }
}

// Completar viaje
function completeTrip() {
    if (!currentTrip) return;
    
    if (confirm('¿Confirmas que has completado el viaje exitosamente?')) {
        console.log('✅ Completando viaje...');
        
        // Simular finalización del viaje
        showNotification('🎉 ¡Viaje completado exitosamente!', 'success');
        
        // Actualizar estadísticas
        statsData.earningsToday += calculateFare(currentTrip);
        updateStats();
        
        // Volver al dashboard
        returnToDashboard();
    }
}

// Cancelar viaje
function cancelTrip() {
    if (!currentTrip) return;
    
    if (confirm('¿Estás segura que quieres cancelar este viaje?')) {
        console.log('❌ Cancelando viaje...');
        
        showNotification('❌ Viaje cancelado', 'info');
        
        // Volver al dashboard
        returnToDashboard();
    }
}

// Volver al dashboard principal
function returnToDashboard() {
    console.log('🔄 Volviendo al dashboard...');
    
    // Cambiar vista
    document.getElementById('trip-in-progress').style.display = 'none';
    document.getElementById('active-driver').style.display = 'block';
    
    // Resetear viaje actual
    currentTrip = null;
    
    // Cambiar estado
    updateStatus('En línea - Buscando viajes', 'online');
    
    // Reiniciar polling
    if (isActive) {
        startPolling();
    }
}

// Actualización manual de viajes
function manualRefresh() {
    console.log('🔄 Actualización manual solicitada...');
    
    if (isActive && !currentTrip) {
        showNotification('🔄 Actualizando lista de viajes...', 'info');
        searchForRides();
    } else {
        showNotification('ℹ️ No se puede actualizar en este momento', 'info');
    }
}

// Actualizar estado visual
function updateStatus(text, type) {
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    
    if (statusText) statusText.textContent = text;
    if (statusDot) {
        statusDot.className = `status-dot ${type}`;
    }
    
    console.log(`📊 Estado actualizado: ${text} (${type})`);
}

// Actualizar estadísticas
function updateStats() {
    // Calcular horas online
    if (statsData.startTime) {
        const now = new Date();
        const diffMs = now - statsData.startTime;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        statsData.hoursOnline = diffHours + (diffMinutes / 60);
    }
    
    // Actualizar elementos
    const tripsElement = document.getElementById('trips-completed');
    const earningsElement = document.getElementById('earnings-today');
    const hoursElement = document.getElementById('hours-online');
    
    if (tripsElement) tripsElement.textContent = statsData.tripsCompleted;
    if (earningsElement) earningsElement.textContent = `${statsData.earningsToday}`;
    if (hoursElement) hoursElement.textContent = `${statsData.hoursOnline.toFixed(1)}h`;
    
    console.log('📊 Estadísticas actualizadas:', statsData);
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    console.log(`📢 Notificación [${type}]: ${message}`);
    
    const notification = document.createElement('div');
    notification.className = 'notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm transform translate-x-full transition-all duration-300';
    
    // Colores según el tipo
    let bgColor, textColor, icon;
    switch(type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            icon = '✅';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            icon = '❌';
            break;
        case 'info':
        default:
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            icon = 'ℹ️';
            break;
    }
    
    notification.className += ` ${bgColor} ${textColor}`;
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <span class="text-lg">${icon}</span>
            <div class="flex-1 text-sm font-medium">${message}</div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 ml-2 text-lg">
                ✕
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 100);
    
    // Auto remover después de 5 segundos
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
    
    return notification;
}

// Hacer funciones globales para los onclick en HTML
window.acceptRide = acceptRide;
window.viewRideDetails = viewRideDetails;
window.startNavigation = startNavigation;
window.callPassenger = callPassenger;
window.completeTrip = completeTrip;
window.cancelTrip = cancelTrip;

console.log('🚗 Driver App JavaScript cargado completamente');