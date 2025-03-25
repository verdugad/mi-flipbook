// Configuración global para PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
// Variables para el flipbook
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0; // Valor inicial que se ajustará automáticamente
let flipbookInitialized = false;
let totalPages = 0;
let pageWidth = 0;
let pageHeight = 0;
const A4_RATIO = 210 / 297; // Proporción exacta de A4
// Al inicio del archivo, añadir detección de dispositivo móvil
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const pixelRatio = Math.max(window.devicePixelRatio || 1, isMobile ? 2 : 3); // Ajustar según dispositivo


// Función para calcular el tamaño óptimo del flipbook manteniendo proporción A4
const calculateOptimalSize = () => {
    const [w, h] = [window.innerWidth - 40, window.innerHeight - 150];
    let width = Math.min(w * 0.95, (h * 0.95) * A4_RATIO);
    let height = width / A4_RATIO;
    if (window.innerWidth >= 768) width = height * A4_RATIO * 2;
    return { width: Math.floor(width), height: Math.floor(height) };
};

// Variables para controlar el modo de pantalla completa simulado
let isSimulatedFullscreen = false;
let originalStyles = {};

// Función para entrar en pantalla completa con soporte para móviles
function enterFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { /* Safari y iOS */
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { /* IE11 */
        element.msRequestFullscreen();
    } else if (element.webkitEnterFullscreen) { /* iOS Safari */
        element.webkitEnterFullscreen();
    } else if (element.mozRequestFullScreen) { /* Firefox */
        element.mozRequestFullScreen();
    } else {
        // Si no hay soporte nativo para pantalla completa, simulamos el efecto
        simulateFullscreen(element);
    }
}

// Función para salir de pantalla completa con soporte para móviles
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari y iOS */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
    } else if (document.webkitCancelFullScreen) { /* iOS Safari */
        document.webkitCancelFullScreen();
    } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
    } else {
        // Si estamos en modo simulado, restauramos
        removeSimulatedFullscreen();
    }
}

// Función para manejar cambios de pantalla completa
function handleFullscreenChange() {
    if (flipbookInitialized) {
        const isInFullscreen = document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement ||
            isSimulatedFullscreen;

        // Actualizar el texto del botón
        const fullscreenBtn = document.getElementById('fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = isInFullscreen ?
                '<i class="fas fa-compress"></i> Salir' :
                '<i class="fas fa-expand"></i> Pantalla completa';
        }

        setTimeout(() => {
            // Aplicar el tamaño adecuado según el modo
            const newSize = isInFullscreen ?
                calculateOptimalSizeForFullscreen() :
                calculateOptimalSize();

            const flipbookElement = document.getElementById('flipbook');

            // Aplicar nuevo tamaño
            $(flipbookElement).turn('size', newSize.width, newSize.height);

            // Aplicar modo de visualización (single/double)
            if (isInFullscreen) {
                $(flipbookElement).turn('display', newSize.display);
            } else {
                $(flipbookElement).turn('display', window.innerWidth < 768 ? 'single' : 'double');
            }

            // Ajustar estilos según el modo
            if (isInFullscreen) {
                flipbookElement.style.margin = '0 auto';
                flipbookElement.style.maxWidth = '100%';

                // Asegurar que el contenedor también se ajuste correctamente
                const container = document.querySelector('.flipbook-container');
                if (container) {
                    container.style.display = 'flex';
                    container.style.flexDirection = 'column';
                    container.style.justifyContent = 'center';
                    container.style.alignItems = 'center';
                    container.style.height = '100vh';
                    container.style.width = '100vw';
                }
            } else {
                flipbookElement.style.margin = '';
                flipbookElement.style.maxWidth = '';

                // Restaurar estilos del contenedor
                const container = document.querySelector('.flipbook-container');
                if (container) {
                    container.style.display = '';
                    container.style.flexDirection = '';
                    container.style.justifyContent = '';
                    container.style.alignItems = '';
                    container.style.height = '';
                    container.style.width = '';
                }
            }

            // Forzar reflow
            flipbookElement.offsetHeight;
        }, 300);
    }
}

// Escuchar todos los posibles eventos de cambio de pantalla completa
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);
document.addEventListener('simulated-fullscreenchange', handleFullscreenChange);



// Función para calcular el tamaño óptimo en pantalla completa
// Función mejorada para calcular el tamaño óptimo en pantalla completa
function calculateOptimalSizeForFullscreen() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLandscape = window.innerWidth > window.innerHeight;

    // Espacio para controles (menor en móviles)
    const controlsHeight = isMobile ? 40 : 60;

    // En pantalla completa queremos usar todo el espacio disponible
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight - controlsHeight;

    let width, height, display;

    if (isMobile) {
        // Siempre usar modo de una sola página en móviles
        display = 'single';

        if (isLandscape) {
            // Móvil en horizontal - priorizar altura
            height = availableHeight * 0.95;
            width = height * A4_RATIO;

            // Verificar si el ancho calculado excede el disponible
            if (width > availableWidth * 0.95) {
                width = availableWidth * 0.95;
                height = width / A4_RATIO;
            }
        } else {
            // Móvil en vertical - priorizar ancho
            width = availableWidth * 0.95;
            height = width / A4_RATIO;

            // Verificar si la altura calculada excede la disponible
            if (height > availableHeight * 0.95) {
                height = availableHeight * 0.95;
                width = height * A4_RATIO;
            }
        }
    } else {
        // Desktop - puede usar modo doble página si hay suficiente espacio
        if (availableWidth >= 768 && isLandscape) {
            // Calcular para doble página
            display = 'double';
            height = availableHeight * 0.95;
            width = height * (A4_RATIO * 2);

            // Verificar si el ancho calculado excede el disponible
            if (width > availableWidth * 0.95) {
                width = availableWidth * 0.95;
                height = width / (A4_RATIO * 2);
            }
        } else {
            // Pantalla estrecha - usar modo de una sola página
            display = 'single';
            width = availableWidth * 0.95;
            height = width / A4_RATIO;

            // Verificar si la altura calculada excede la disponible
            if (height > availableHeight * 0.95) {
                height = availableHeight * 0.95;
                width = height * A4_RATIO;
            }
        }
    }

    return {
        width: Math.floor(width),
        height: Math.floor(height),
        display: display
    };
}

// Cargar el PDF

const loadPdf = async() => {
    try {
        // Mostrar mensaje de carga
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = 'Cargando revista... Por favor espere.';
            loadingMessage.style.display = 'block';
        }

        console.log('Intentando cargar PDF...');

        // Probar diferentes rutas para el PDF
        const possiblePaths = [
            'revista.pdf',
            'pdf/revista.pdf',
            './revista.pdf',
            './pdf/revista.pdf',
            '../revista.pdf',
            window.location.origin + '/revista.pdf',
            window.location.origin + '/pdf/revista.pdf'
        ];

        let pdfPath = null;
        let loadingTask = null;

        // Intentar cargar el PDF desde diferentes rutas
        for (const path of possiblePaths) {
            try {
                console.log('Intentando cargar desde:', path);

                // Verificar si el archivo existe
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) {
                    console.log('PDF encontrado en:', path);
                    pdfPath = path;

                    // Configuración para PDF.js - valores más conservadores
                    loadingTask = pdfjsLib.getDocument({
                        url: pdfPath,
                        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/cmaps/',
                        cMapPacked: true,
                        disableRange: false,
                        disableStream: false,
                        disableAutoFetch: false
                    });

                    break;
                }
            } catch (e) {
                console.log('Error al verificar ruta:', path, e);
            }
        }

        if (!pdfPath || !loadingTask) {
            throw new Error('No se pudo encontrar el archivo PDF en ninguna ruta conocida');
        }

        // Cargar el documento PDF
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;

        console.log('PDF cargado correctamente. Número de páginas:', totalPages);

        // Actualizar el contador de páginas
        document.getElementById('page-num').textContent = `1 de ${totalPages}`;

        // Obtener la primera página para determinar dimensiones
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 }); // Escala 1 para obtener dimensiones reales

        // Guardar dimensiones originales
        pageWidth = viewport.width;
        pageHeight = viewport.height;

        // Calcular tamaño óptimo basado en proporción A4
        const optimalSize = calculateOptimalSize();

        // Calcular escala para renderizado
        const singlePageHeight = optimalSize.height;
        const singlePageWidth = singlePageHeight * A4_RATIO;

        // Calcular escala basada en dimensiones originales del PDF
        const scaleX = singlePageWidth / pageWidth;
        const scaleY = singlePageHeight / pageHeight;

        // Usar una escala mejorada pero no extrema
        scale = Math.min(scaleX, scaleY) * 4; // Valor más conservador

        // Mostrar mensaje de carga actualizado
        if (loadingMessage) {
            loadingMessage.textContent = 'Cargando revista en alta calidad... Por favor espere.';
        }

        // Renderizar todas las páginas
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            // Actualizar mensaje de carga con progreso
            if (loadingMessage) {
                loadingMessage.textContent = `Cargando página ${i} de ${totalPages}...`;
            }

            const pageContainer = document.createElement('div');
            pageContainer.className = 'page-container';

            const canvas = document.createElement('canvas');
            pageContainer.appendChild(canvas);

            // Renderizar la página en el canvas
            const page = await pdfDoc.getPage(i);

            // Usar una escala razonable para renderizado
            const viewport = page.getViewport({ scale: scale });

            // Establecer dimensiones del canvas
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Establecer dimensiones de visualización del canvas
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            const ctx = canvas.getContext('2d');

            // Configuración básica para el renderizado
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
                renderInteractiveForms: true
            };

            // Renderizar la página
            await page.render(renderContext).promise;

            // Añadir la página al array en el orden correcto
            pages.push(pageContainer);
        }

        // Ocultar mensaje de carga
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }

        // Mostrar el flipbook
        const flipbookElement = document.getElementById('flipbook');
        if (flipbookElement.classList.contains('hidden')) {
            flipbookElement.classList.remove('hidden');
        }

        // Limpiar el flipbook antes de añadir páginas
        flipbookElement.innerHTML = '';

        // Añadir páginas al flipbook en el orden correcto
        pages.forEach(page => {
            flipbookElement.appendChild(page);
        });

        // Calcular tamaño óptimo final
        const finalSize = calculateOptimalSize();

        // Inicializar Turn.js con opciones mejoradas
        $(flipbookElement).turn({
            width: finalSize.width,
            height: finalSize.height,
            autoCenter: true,
            // Usar el display calculado en finalSize o determinarlo basado en dispositivo y orientación
            display: finalSize.display || (function() {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const isLandscape = window.innerWidth > window.innerHeight;
                // En móviles siempre usar 'single', en desktop depende del ancho
                return (isMobile || window.innerWidth < 768) ? 'single' : 'double';
            })(),
            acceleration: true,
            elevation: 50,
            gradients: true,
            // Animación más rápida en móviles para mejor respuesta
            duration: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 600 : 1000,
            page: 1,
            padding: 0,
            margin: 0,
            // Esquinas más pequeñas en móviles
            cornerSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 20 : 0,
            // Mejorar rendimiento en dispositivos móviles
            turnCorners: 'bl,br',
            // Desactivar sombras en dispositivos de bajo rendimiento
            shadows: !(/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && navigator.hardwareConcurrency <= 4),
            when: {
                turning: function(event, page, pageObj) {
                    pageNum = page;
                    document.getElementById('page-num').textContent = `${page} de ${totalPages}`;

                    // Ocultar controles durante la animación en móviles para mejorar rendimiento
                    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        const controls = document.querySelector('.controls');
                        if (controls) controls.style.opacity = '0.3';
                    }
                },
                turned: function(event, page) {
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState({ page: page }, `Página ${page}`, `?page=${page}`);
                    }

                    // Aplicar sombras para simular la unión de páginas
                    $('.page').removeClass('odd even');
                    $('.page').each(function(index) {
                        if (index % 2 === 0) {
                            $(this).addClass('even');
                        } else {
                            $(this).addClass('odd');
                        }
                    });

                    // Restaurar visibilidad de controles
                    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        const controls = document.querySelector('.controls');
                        if (controls) {
                            setTimeout(() => {
                                controls.style.opacity = '1';
                            }, 300);
                        }
                    }

                    // Actualizar estado de botones de navegación
                    updateControlsState();
                },
                start: function(event, pageObject) {
                    // Mejorar rendimiento durante la animación en dispositivos móviles
                    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        $('.page-container').css('will-change', 'transform');
                    }
                },
                end: function(event, pageObject) {
                    // Liberar recursos después de la animación
                    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        setTimeout(() => {
                            $('.page-container').css('will-change', 'auto');
                        }, 100);
                    }
                },
                missing: function(event, pages) {
                    // Manejar páginas faltantes (útil si se cargan páginas bajo demanda)
                    console.log('Páginas faltantes:', pages);
                }
            },
            // Mejorar el manejo táctil para dispositivos móviles
            swipe: true
        });

        // Añadir detección de orientación para ajustar el modo de visualización
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                if (flipbookInitialized) {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const isLandscape = window.innerWidth > window.innerHeight;

                    // Determinar el modo de visualización basado en la orientación
                    let display = 'single';
                    if (!isMobile && window.innerWidth >= 768) {
                        display = 'double';
                    } else if (isMobile && isLandscape && window.innerWidth >= 900) {
                        // En algunos tablets o móviles grandes en horizontal, podemos usar doble página
                        display = 'double';
                    }

                    // Aplicar el nuevo modo de visualización
                    $(flipbookElement).turn('display', display);

                    // Recalcular tamaño óptimo
                    const isFullscreen = !!document.fullscreenElement || isSimulatedFullscreen;
                    const newSize = isFullscreen ?
                        calculateOptimalSizeForFullscreen() :
                        calculateOptimalSize();

                    // Aplicar nuevo tamaño
                    $(flipbookElement).turn('size', newSize.width, newSize.height);
                }
            }, 500); // Esperar a que termine la transición de orientación
        });


        // Añade esto al final de la función loadPdf, justo antes de cerrar el bloque try:

        // Añadir estilos CSS para mejorar la nitidez del texto
        const style = document.createElement('style');
        style.textContent = `
    #flipbook canvas {
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }
    .page-container {
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
    }
`;
        document.head.appendChild(style);


        // Aplicar sombras iniciales
        setTimeout(() => {
            $('.page').each(function(index) {
                if (index % 2 === 0) {
                    $(this).addClass('even');
                } else {
                    $(this).addClass('odd');
                }
            });
        }, 100);

        flipbookInitialized = true;
        console.log('Flipbook inicializado correctamente');

        // Detectar gestos táctiles para dispositivos móviles
        if ('ontouchstart' in window) {
            let startX;
            flipbookElement.addEventListener('touchstart', function(e) {
                startX = e.changedTouches[0].pageX;
            });

            flipbookElement.addEventListener('touchend', function(e) {
                const endX = e.changedTouches[0].pageX;
                const diffX = endX - startX;

                if (diffX > 50) { // Deslizar hacia la derecha
                    $('#flipbook').turn('previous');
                } else if (diffX < -50) { // Deslizar hacia la izquierda
                    $('#flipbook').turn('next');
                }
            });
        }

        // Añadir funcionalidad de zoom para texto
        implementZoomFeature(flipbookElement);

        // Ajustar tamaño en cambio de ventana
        window.addEventListener('resize', debounce(() => {
            if (flipbookInitialized) {
                // Verificar si estamos en pantalla completa
                const isFullscreen = !!document.fullscreenElement;

                // Usar el cálculo apropiado según el modo
                const newSize = isFullscreen ?
                    calculateOptimalSizeForFullscreen() :
                    calculateOptimalSize();

                $(document.getElementById('flipbook')).turn('size', newSize.width, newSize.height);
                $(document.getElementById('flipbook')).turn('display', window.innerWidth < 768 ? 'single' : 'double');

                // Reajustar sombras
                setTimeout(() => {
                    $('.page').removeClass('odd even');
                    $('.page').each(function(index) {
                        if (index % 2 === 0) {
                            $(this).addClass('even');
                        } else {
                            $(this).addClass('odd');
                        }
                    });
                }, 100);

                // Ajustar el contenedor si estamos en pantalla completa
                if (isFullscreen) {
                    const flipbookContainer = document.querySelector('.flipbook-container');
                    if (flipbookContainer) {
                        flipbookContainer.style.width = '100vw';
                        flipbookContainer.style.height = '100vh';
                        flipbookContainer.style.display = 'flex';
                        flipbookContainer.style.justifyContent = 'center';
                        flipbookContainer.style.alignItems = 'center';
                    }
                }
            }
        }, 200));

        // Añadir estilos CSS específicos para móviles
        const mobileStyles = document.createElement('style');
        mobileStyles.textContent = `
    @media (max-width: 767px) {
        .controls {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 5px;
        }
        
        .control-button {
            padding: 8px 12px;
            font-size: 14px;
        }
        
        /* Ocultar algunos elementos en modo vertical para ahorrar espacio */
        @media (orientation: portrait) {
            .page-controls {
                width: 100%;
                margin: 5px 0;
                text-align: center;
            }
        }
    }
    
    /* Estilos para pantalla completa en iOS */
    .flipbook-container.ios-fullscreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 9999 !important;
        background-color: #333 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
    }
    
    /* Ajustes para dispositivos con "notch" */
    @supports (padding-top: env(safe-area-inset-top)) {
        .flipbook-container:fullscreen,
        .flipbook-container.ios-fullscreen {
            padding-top: env(safe-area-inset-top) !important;
            padding-bottom: env(safe-area-inset-bottom) !important;
            padding-left: env(safe-area-inset-left) !important;
            padding-right: env(safe-area-inset-right) !important;
        }
    }
`;
        document.head.appendChild(mobileStyles);
    } catch (error) {
        console.error('Error al cargar el PDF:', error);
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = 'Error al cargar la revista. Por favor, intente de nuevo más tarde.';
        }

        // Crear botón de recarga
        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'reload-btn';
        reloadBtn.textContent = 'Intentar de nuevo';
        reloadBtn.addEventListener('click', () => {
            location.reload();
        });

        // Añadir botón de recarga
        if (loadingMessage && !document.querySelector('.reload-btn')) {
            loadingMessage.parentNode.appendChild(reloadBtn);
        }
    }
};


// Función para controlar la frecuencia de ejecución (debounce)
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Eventos para los botones
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si los elementos existen antes de añadir event listeners
    const prevBtn = document.getElementById('prev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (flipbookInitialized) {
                $('#flipbook').turn('previous');
            }
        });
    }

    const nextBtn = document.getElementById('next');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (flipbookInitialized) {
                $('#flipbook').turn('next');
            }
        });
    }

    // Modificar el evento del botón de pantalla completa
    // Reemplaza el evento existente del botón de pantalla completa
    const fullscreenBtn = document.getElementById('fullscreen');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            // Obtener el contenedor del flipbook
            const flipbookContainer = document.querySelector('.flipbook-container') || document.body;
            const flipbookElement = document.getElementById('flipbook');

            // Verificar si estamos en pantalla completa (nativa o simulada)
            const isInFullscreen = document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement ||
                isSimulatedFullscreen;

            if (!isInFullscreen) {
                // Entrar en modo pantalla completa
                enterFullscreen(flipbookContainer);

                // Cambiar el texto del botón
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Salir';

                // Reajustar tamaño después de entrar en pantalla completa
                setTimeout(() => {
                    if (flipbookInitialized) {
                        // Maximizar el flipbook para ocupar toda la pantalla
                        const newSize = calculateOptimalSizeForFullscreen();
                        $(flipbookElement).turn('size', newSize.width, newSize.height);

                        // Ajustar estilos para pantalla completa
                        flipbookElement.style.margin = '0 auto';
                        flipbookElement.style.maxWidth = '100%';

                        // Forzar reflow
                        flipbookElement.offsetHeight;
                    }
                }, 300);
            } else {
                // Salir del modo pantalla completa
                exitFullscreen();

                // Cambiar el texto del botón
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Pantalla completa';

                // Reajustar tamaño después de salir de pantalla completa
                setTimeout(() => {
                    if (flipbookInitialized) {
                        const newSize = calculateOptimalSize();
                        $(flipbookElement).turn('size', newSize.width, newSize.height);

                        // Restaurar estilos normales
                        flipbookElement.style.margin = '';
                        flipbookElement.style.maxWidth = '';
                    }
                }, 300);
            }
        });
    }


    // Iniciar la carga del PDF
    loadPdf();
});

function calculateOptimalSizeForFullscreen() {
    // En pantalla completa queremos usar todo el espacio disponible
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight - 60; // Solo un pequeño espacio para controles

    // Determinar si limitamos por ancho o por alto
    let width, height;

    // Calcular altura basada en ancho disponible y proporción A4
    const heightBasedOnWidth = availableWidth / (A4_RATIO * 2); // Para modo doble página

    // Calcular ancho basado en altura disponible y proporción A4
    const widthBasedOnHeight = availableHeight * (A4_RATIO * 2); // Para modo doble página

    // Determinar qué dimensión limita
    if (heightBasedOnWidth <= availableHeight) {
        // Limitado por ancho
        width = availableWidth;
        height = heightBasedOnWidth;
    } else {
        // Limitado por altura
        height = availableHeight;
        width = widthBasedOnHeight;
    }

    // Si estamos en modo de una sola página, ajustar el ancho
    if (window.innerWidth < 768) {
        width = height * A4_RATIO;
    }

    return {
        width: Math.floor(width),
        height: Math.floor(height)
    };
}


// Verificar y corregir la proporción después de que se cargue completamente la página
window.addEventListener('load', () => {
    // Esperar a que el flipbook esté inicializado
    const checkInterval = setInterval(() => {
        if (flipbookInitialized) {
            clearInterval(checkInterval);
            // Esperar un poco más para asegurar que turn.js haya terminado de renderizar
            setTimeout(() => {
                checkAndFixAspectRatio();
                enforceA4Ratio();
            }, 1000);
        }
    }, 500);
});

// Función para crear un elemento de mensaje de carga si no existe
function createLoadingMessageIfNeeded() {
    if (!document.querySelector('.loading-message')) {
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'loading-container';

        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'loading-message';
        loadingMessage.textContent = 'Cargando revista...';

        const spinner = document.createElement('div');
        spinner.className = 'spinner';

        loadingContainer.appendChild(spinner);
        loadingContainer.appendChild(loadingMessage);

        // Insertar antes del flipbook
        const flipbook = document.getElementById('flipbook');
        if (flipbook && flipbook.parentNode) {
            flipbook.parentNode.insertBefore(loadingContainer, flipbook);
        } else {
            document.body.appendChild(loadingContainer);
        }
    }
}
// Verificar la estructura del HTML al cargar
document.addEventListener('DOMContentLoaded', () => {
    // Crear mensaje de carga si no existe
    createLoadingMessageIfNeeded();

    // Verificar que existe el elemento flipbook
    if (!document.getElementById('flipbook')) {
        console.error('Elemento #flipbook no encontrado. Creando uno...');

        const flipbookContainer = document.createElement('div');
        flipbookContainer.className = 'flipbook-container';

        const flipbook = document.createElement('div');
        flipbook.id = 'flipbook';
        flipbook.className = 'hidden';

        flipbookContainer.appendChild(flipbook);

        // Crear controles si no existen
        if (!document.querySelector('.controls')) {
            const controls = document.createElement('div');
            controls.className = 'controls';

            controls.innerHTML = `
                <button id="prev" class="control-button"><i class="fas fa-chevron-left"></i> Anterior</button>
                <div class="page-controls">
                    <span id="page-num">1 de 0</span>
                    <input type="number" id="page-input" placeholder="Ir a página" min="1">
                    <button id="go-btn" class="control-button">Ir</button>
                </div>
                <button id="next" class="control-button">Siguiente <i class="fas fa-chevron-right"></i></button>
                <button id="fullscreen" class="control-button"><i class="fas fa-expand"></i> Pantalla completa</button>
            `;

            flipbookContainer.appendChild(controls);
        }

        document.body.appendChild(flipbookContainer);
    }

    // Verificar que existen los elementos de control
    if (!document.getElementById('page-num')) {
        console.error('Elemento #page-num no encontrado');
    }

    // Verificar que PDF.js está cargado
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js no está cargado. Asegúrate de incluir pdf.min.js antes de este script.');

        // Intentar cargar PDF.js dinámicamente
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = function() {
            console.log('PDF.js cargado dinámicamente');

            // Cargar el worker
            const workerScript = document.createElement('script');
            workerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            workerScript.onload = function() {
                console.log('PDF.js worker cargado dinámicamente');

                // Configurar worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

                // Reintentar cargar el PDF
                setTimeout(loadPdf, 1000);
            };
            document.head.appendChild(workerScript);
        };
        document.head.appendChild(script);
    }

    // Añadir funcionalidad para el botón "Ir a página"
    const pageInput = document.getElementById('page-input');
    const goBtn = document.getElementById('go-btn');

    if (pageInput && goBtn) {
        const goToPage = () => {
            if (flipbookInitialized && pdfDoc) {
                const pageNum = parseInt(pageInput.value);
                if (pageNum && pageNum > 0 && pageNum <= totalPages) {
                    $('#flipbook').turn('page', pageNum);
                    pageInput.value = '';
                } else {
                    alert(`Por favor ingrese un número de página válido (1-${totalPages})`);
                }
            }
        };

        goBtn.addEventListener('click', goToPage);
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                goToPage();
            }
        });
    }
});

// Función para actualizar el estado de los controles
function updateControlsState() {
    if (flipbookInitialized) {
        const currentPage = $('#flipbook').turn('page');
        const totalPages = $('#flipbook').turn('pages');

        // Actualizar el indicador de página
        const pageNum = document.getElementById('page-num');
        if (pageNum) {
            pageNum.textContent = `${currentPage} de ${totalPages}`;
        }

        // Actualizar el indicador flotante si existe
        const pageIndicator = document.getElementById('page-indicator');
        if (pageIndicator) {
            pageIndicator.textContent = `${currentPage} de ${totalPages}`;
        }

        // Deshabilitar botón anterior en la primera página
        const prevBtn = document.getElementById('prev');
        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
            prevBtn.classList.toggle('disabled', currentPage === 1);
        }

        // Deshabilitar botón siguiente en la última página
        const nextBtn = document.getElementById('next');
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.classList.toggle('disabled', currentPage === totalPages);
        }

        // Actualizar también los botones laterales si existen
        const prevSideBtn = document.querySelector('.side-nav.prev');
        if (prevSideBtn) {
            prevSideBtn.style.opacity = currentPage === 1 ? '0.1' : '0.3';
            prevSideBtn.style.pointerEvents = currentPage === 1 ? 'none' : 'auto';
        }

        const nextSideBtn = document.querySelector('.side-nav.next');
        if (nextSideBtn) {
            nextSideBtn.style.opacity = currentPage === totalPages ? '0.1' : '0.3';
            nextSideBtn.style.pointerEvents = currentPage === totalPages ? 'none' : 'auto';
        }
    }
}

// Añadir evento para actualizar controles cuando se cambia de página
$(document).on('turning', '#flipbook', function() {
    updateControlsState();
});

// Añadir evento para actualizar controles cuando se completa la carga
$(document).on('turned', '#flipbook', function() {
    updateControlsState();
});

// Añadir teclas de navegación
document.addEventListener('keydown', (e) => {
    if (flipbookInitialized) {
        if (e.key === 'ArrowLeft' || e.key === 'Left') {
            $('#flipbook').turn('previous');
        } else if (e.key === 'ArrowRight' || e.key === 'Right') {
            $('#flipbook').turn('next');
        } else if (e.key === 'Home') {
            $('#flipbook').turn('page', 1);
        } else if (e.key === 'End') {
            $('#flipbook').turn('page', totalPages);
        }
    }
});

// Función para añadir animación de carga
function addLoadingAnimation() {
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer && !document.querySelector('.loading-animation')) {
        const loadingAnimation = document.createElement('div');
        loadingAnimation.className = 'loading-animation';

        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            dot.className = 'loading-dot';
            loadingAnimation.appendChild(dot);
        }

        loadingContainer.appendChild(loadingAnimation);
    }
}

// Reemplazar la función implementZoomFeature con esta versión mejorada
// Implementar funcionalidad de lupa mejorada
function implementZoomFeature(flipbookElement) {
    console.log('Implementando funcionalidad de lupa mejorada...');

    // Crear el contenedor de la lupa si no existe
    if (!document.getElementById('magnifier-container')) {
        const magnifierContainer = document.createElement('div');
        magnifierContainer.id = 'magnifier-container';
        magnifierContainer.style.display = 'none';
        document.body.appendChild(magnifierContainer);
    }

    // Añadir botón de lupa si no existe
    if (!document.getElementById('zoom-btn')) {
        const zoomBtn = document.createElement('button');
        zoomBtn.id = 'zoom-btn';
        zoomBtn.className = 'control-button';
        zoomBtn.innerHTML = '<i class="fas fa-search-plus"></i> Lupa';

        // Buscar el contenedor de controles
        const controlsContainer = document.querySelector('.controls');
        if (controlsContainer) {
            controlsContainer.appendChild(zoomBtn);
            console.log('Botón de lupa añadido correctamente');
        }
    }

    // Obtener referencia al botón y al contenedor de la lupa
    const zoomBtn = document.getElementById('zoom-btn');
    const magnifierContainer = document.getElementById('magnifier-container');

    if (!zoomBtn || !magnifierContainer) {
        console.error('No se pudo encontrar el botón de lupa o el contenedor');
        return;
    }

    // Variables para controlar el estado de la lupa
    let lupaActiva = false;
    let nivelZoom = 3;
    let tamanoLupa = 300;
    let lupaFija = false;

    // Ajustar tamaño de lupa para dispositivos móviles
    if (window.innerWidth < 768) {
        tamanoLupa = 200;
    }

    // Evento para el botón de lupa
    zoomBtn.addEventListener('click', () => {
        lupaActiva = !lupaActiva;
        console.log('Lupa activada:', lupaActiva);

        if (lupaActiva) {
            // Activar lupa
            zoomBtn.innerHTML = '<i class="fas fa-search-minus"></i> Salir Lupa';
            zoomBtn.classList.add('active');
            document.body.classList.add('magnifier-mode');

            // Mostrar instrucciones
            mostrarInstrucciones();

            // Inicializar la lupa
            inicializarLupa();
        } else {
            // Desactivar lupa
            zoomBtn.innerHTML = '<i class="fas fa-search-plus"></i> Lupa';
            zoomBtn.classList.remove('active');
            document.body.classList.remove('magnifier-mode');

            // Ocultar la lupa
            magnifierContainer.style.display = 'none';

            // Eliminar instrucciones
            const instrucciones = document.getElementById('magnifier-instructions');
            if (instrucciones) instrucciones.remove();
        }
    });

    // Función para mostrar instrucciones
    function mostrarInstrucciones() {
        // Eliminar instrucciones anteriores si existen
        const instruccionesAnteriores = document.getElementById('magnifier-instructions');
        if (instruccionesAnteriores) instruccionesAnteriores.remove();

        // Crear nuevas instrucciones
        const instrucciones = document.createElement('div');
        instrucciones.id = 'magnifier-instructions';
        instrucciones.innerHTML = `
            <div class="instructions-content">
                <h3>Modo Lupa</h3>
                <p>Mueva el cursor sobre la página para ver el contenido ampliado.</p>
                <p>Use la rueda del ratón para ajustar el nivel de zoom.</p>
                <p>Haga clic para fijar/liberar la posición de la lupa.</p>
                <button id="close-instructions">Entendido</button>
            </div>
        `;
        document.body.appendChild(instrucciones);

        // Evento para cerrar instrucciones
        document.getElementById('close-instructions').addEventListener('click', () => {
            instrucciones.remove();
        });

        // Auto-cerrar después de 8 segundos
        setTimeout(() => {
            if (document.getElementById('magnifier-instructions')) {
                instrucciones.remove();
            }
        }, 8000);
    }

    // Función para inicializar la lupa
    function inicializarLupa() {
        // Configurar el contenedor de la lupa
        magnifierContainer.style.cssText = `
            position: fixed;
            width: ${tamanoLupa}px;
            height: ${tamanoLupa}px;
            border: 3px solid #4CAF50;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            z-index: 9999;
            display: none;
            background-color: white;
            pointer-events: none;
        `;

        // Crear el canvas de la lupa si no existe
        if (!magnifierContainer.querySelector('canvas')) {
            const lupaCanvas = document.createElement('canvas');
            lupaCanvas.id = 'magnifier-canvas';
            lupaCanvas.width = tamanoLupa * 2; // Mayor resolución
            lupaCanvas.height = tamanoLupa * 2; // Mayor resolución
            lupaCanvas.style.width = '100%';
            lupaCanvas.style.height = '100%';
            magnifierContainer.appendChild(lupaCanvas);
        }

        // Obtener el canvas de la lupa
        const lupaCanvas = magnifierContainer.querySelector('canvas');
        const lupaCtx = lupaCanvas.getContext('2d', { alpha: false });

        // Configurar el contexto para mejor calidad
        lupaCtx.imageSmoothingEnabled = true;
        lupaCtx.imageSmoothingQuality = 'high';

        // Función para actualizar la lupa
        function actualizarLupa(e) {
            if (!lupaActiva || lupaFija) return;

            // Obtener la página actual bajo el cursor
            const elementoActual = document.elementFromPoint(e.clientX, e.clientY);
            if (!elementoActual) return;

            const contenedorPagina = elementoActual.closest('.page-container');
            if (!contenedorPagina) return;

            // Obtener el canvas dentro de la página
            const canvasPagina = contenedorPagina.querySelector('canvas');
            if (!canvasPagina) return;

            // Obtener las dimensiones y posición del canvas de la página
            const rectPagina = canvasPagina.getBoundingClientRect();

            // Calcular la posición relativa dentro del canvas
            const x = e.clientX - rectPagina.left;
            const y = e.clientY - rectPagina.top;

            // Calcular la posición de la lupa en la pantalla
            const lupaX = e.clientX - tamanoLupa / 2;
            const lupaY = e.clientY - tamanoLupa / 2;

            // Actualizar la posición de la lupa
            magnifierContainer.style.left = `${lupaX}px`;
            magnifierContainer.style.top = `${lupaY}px`;

            // Mostrar la lupa
            magnifierContainer.style.display = 'block';

            // Guardar la posición y el canvas para uso posterior
            magnifierContainer.dataset.x = x;
            magnifierContainer.dataset.y = y;
            magnifierContainer.dataset.pageId = contenedorPagina.id || '';

            // Dibujar el contenido ampliado en el canvas de la lupa
            dibujarContenidoLupa(canvasPagina, x, y, rectPagina);
        }

        // Función para dibujar el contenido ampliado en la lupa
        function dibujarContenidoLupa(canvasPagina, x, y, rectPagina) {
            // Limpiar el canvas de la lupa
            lupaCtx.clearRect(0, 0, lupaCanvas.width, lupaCanvas.height);

            // Calcular la escala entre el canvas original y su tamaño en pantalla
            const escalaX = canvasPagina.width / rectPagina.width;
            const escalaY = canvasPagina.height / rectPagina.height;

            // Calcular las coordenadas reales en el canvas original
            const xReal = x * escalaX;
            const yReal = y * escalaY;

            // Calcular el área a capturar del canvas original
            const anchoCaptura = (tamanoLupa / nivelZoom) * escalaX;
            const altoCaptura = (tamanoLupa / nivelZoom) * escalaY;

            // Calcular las coordenadas de inicio para la captura
            const xInicio = Math.max(0, xReal - anchoCaptura / 2);
            const yInicio = Math.max(0, yReal - altoCaptura / 2);

            // Asegurar que no nos salimos de los límites del canvas
            const anchoFinal = Math.min(anchoCaptura, canvasPagina.width - xInicio);
            const altoFinal = Math.min(altoCaptura, canvasPagina.height - yInicio);

            try {
                // Dibujar la porción del canvas original en el canvas de la lupa
                lupaCtx.drawImage(
                    canvasPagina,
                    xInicio, yInicio, anchoFinal, altoFinal,
                    0, 0, lupaCanvas.width, lupaCanvas.height
                );

                // Aplicar mejoras de contraste y nitidez
                aplicarMejorasImagen(lupaCtx, lupaCanvas.width, lupaCanvas.height);
            } catch (error) {
                console.error('Error al dibujar en la lupa:', error);
            }
        }

        // Función para aplicar mejoras a la imagen
        function aplicarMejorasImagen(ctx, ancho, alto) {
            try {
                // Obtener los datos de la imagen
                const imageData = ctx.getImageData(0, 0, ancho, alto);
                const data = imageData.data;

                // Aplicar un ligero aumento de contraste
                const factor = 1.1; // Factor de contraste
                const intercept = 128 * (1 - factor);

                for (let i = 0; i < data.length; i += 4) {
                    // Aplicar contraste a cada canal RGB
                    data[i] = factor * data[i] + intercept; // R
                    data[i + 1] = factor * data[i + 1] + intercept; // G
                    data[i + 2] = factor * data[i + 2] + intercept; // B
                }

                // Volver a colocar los datos de la imagen
                ctx.putImageData(imageData, 0, 0);
            } catch (error) {
                console.error('Error al aplicar mejoras a la imagen:', error);
            }
        }

        // Evento para mover la lupa con el cursor
        flipbookElement.addEventListener('mousemove', actualizarLupa);

        // Evento para ajustar el nivel de zoom con la rueda del ratón
        flipbookElement.addEventListener('wheel', (e) => {
            if (!lupaActiva) return;

            e.preventDefault();

            if (e.deltaY < 0) {
                // Aumentar zoom
                nivelZoom = Math.min(nivelZoom + 0.5, 8);
            } else {
                // Disminuir zoom
                nivelZoom = Math.max(nivelZoom - 0.5, 1.5);
            }

            console.log('Nivel de zoom ajustado a:', nivelZoom);

            // Si la lupa está fija, actualizar su contenido
            if (lupaFija) {
                const contenedorPagina = document.querySelector(`#${magnifierContainer.dataset.pageId}`) ||
                    document.querySelector('.page-container');

                if (contenedorPagina) {
                    const canvasPagina = contenedorPagina.querySelector('canvas');
                    if (canvasPagina) {
                        const rectPagina = canvasPagina.getBoundingClientRect();
                        const x = parseFloat(magnifierContainer.dataset.x);
                        const y = parseFloat(magnifierContainer.dataset.y);

                        dibujarContenidoLupa(canvasPagina, x, y, rectPagina);
                    }
                }
            }
        });

        // Evento para fijar/liberar la lupa con clic
        flipbookElement.addEventListener('click', (e) => {
            if (!lupaActiva) return;

            lupaFija = !lupaFija;
            console.log('Lupa fija:', lupaFija);

            if (lupaFija) {
                // Fijar la lupa
                magnifierContainer.style.pointerEvents = 'auto';
                magnifierContainer.style.cursor = 'move';

                // Añadir indicador de lupa fija
                if (!magnifierContainer.querySelector('.fixed-indicator')) {
                    const indicadorFijo = document.createElement('div');
                    indicadorFijo.className = 'fixed-indicator';
                    indicadorFijo.textContent = 'Lupa fija - Haga clic para liberar';
                    magnifierContainer.appendChild(indicadorFijo);
                }

                // Hacer que la lupa sea arrastrable
                hacerArrastrable(magnifierContainer);
            } else {
                // Liberar la lupa
                magnifierContainer.style.pointerEvents = 'none';

                // Eliminar indicador de lupa fija
                const indicadorFijo = magnifierContainer.querySelector('.fixed-indicator');
                if (indicadorFijo) indicadorFijo.remove();

                // Restaurar posición con el cursor
                actualizarLupa(e);
            }
        });

        // Función para hacer un elemento arrastrable
        function hacerArrastrable(elemento) {
            let pos1 = 0,
                pos2 = 0,
                pos3 = 0,
                pos4 = 0;

            elemento.onmousedown = iniciarArrastre;

            function iniciarArrastre(e) {
                e = e || window.event;
                e.preventDefault();

                // Obtener posición inicial del cursor
                pos3 = e.clientX;
                pos4 = e.clientY;

                document.onmouseup = finalizarArrastre;
                document.onmousemove = arrastrarElemento;
            }

            function arrastrarElemento(e) {
                e = e || window.event;
                e.preventDefault();

                // Calcular nueva posición
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;

                // Establecer nueva posición del elemento
                const nuevaTop = elemento.offsetTop - pos2;
                const nuevaLeft = elemento.offsetLeft - pos1;

                // Asegurar que la lupa no salga de la ventana
                const maxTop = window.innerHeight - elemento.offsetHeight;
                const maxLeft = window.innerWidth - elemento.offsetWidth;

                elemento.style.top = Math.max(0, Math.min(nuevaTop, maxTop)) + 'px';
                elemento.style.left = Math.max(0, Math.min(nuevaLeft, maxLeft)) + 'px';
            }

            function finalizarArrastre() {
                // Detener el arrastre
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }

        // Soporte para dispositivos táctiles
        if ('ontouchstart' in window) {
            // Evento para mover la lupa con el toque
            flipbookElement.addEventListener('touchmove', (e) => {
                if (!lupaActiva) return;

                // Prevenir el desplazamiento de la página
                e.preventDefault();

                // Obtener la posición del toque
                const touch = e.touches[0];

                // Crear un evento de ratón simulado
                const mouseEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };

                // Actualizar la lupa con el evento simulado
                actualizarLupa(mouseEvent);
            });

            // Evento para fijar/liberar la lupa con toque
            flipbookElement.addEventListener('touchend', (e) => {
                if (!lupaActiva) return;

                // Prevenir el comportamiento predeterminado
                e.preventDefault();

                // Alternar el estado de la lupa fija
                lupaFija = !lupaFija;

                if (lupaFija) {
                    // Fijar la lupa
                    magnifierContainer.style.pointerEvents = 'auto';

                    // Añadir indicador de lupa fija
                    if (!magnifierContainer.querySelector('.fixed-indicator')) {
                        const indicadorFijo = document.createElement('div');
                        indicadorFijo.className = 'fixed-indicator';
                        indicadorFijo.textContent = 'Lupa fija - Toque para liberar';
                        magnifierContainer.appendChild(indicadorFijo);
                    }
                } else {
                    // Liberar la lupa
                    magnifierContainer.style.pointerEvents = 'none';

                    // Eliminar indicador de lupa fija
                    const indicadorFijo = magnifierContainer.querySelector('.fixed-indicator');
                    if (indicadorFijo) indicadorFijo.remove();

                    // Ocultar la lupa después de liberarla en dispositivos táctiles
                    magnifierContainer.style.display = 'none';
                }
            });

            // Hacer que la lupa sea arrastrable en dispositivos táctiles
            let touchStartX, touchStartY;
            let lupaStartX, lupaStartY;

            magnifierContainer.addEventListener('touchstart', (e) => {
                if (!lupaFija) return;

                // Prevenir el comportamiento predeterminado
                e.preventDefault();

                // Obtener la posición inicial del toque
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;

                // Obtener la posición inicial de la lupa
                lupaStartX = magnifierContainer.offsetLeft;
                lupaStartY = magnifierContainer.offsetTop;
            });

            magnifierContainer.addEventListener('touchmove', (e) => {
                if (!lupaFija) return;

                // Prevenir el comportamiento predeterminado
                e.preventDefault();

                // Obtener la posición actual del toque
                const touch = e.touches[0];

                // Calcular el desplazamiento
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;

                // Calcular la nueva posición de la lupa
                const nuevaLeft = lupaStartX + deltaX;
                const nuevaTop = lupaStartY + deltaY;

                // Asegurar que la lupa no salga de la ventana
                const maxTop = window.innerHeight - magnifierContainer.offsetHeight;
                const maxLeft = window.innerWidth - magnifierContainer.offsetWidth;

                // Aplicar la nueva posición
                magnifierContainer.style.left = Math.max(0, Math.min(nuevaLeft, maxLeft)) + 'px';
                magnifierContainer.style.top = Math.max(0, Math.min(nuevaTop, maxTop)) + 'px';
            });
        }

        // Actualizar la lupa cuando se cambia de página
        $(flipbookElement).on('turning', () => {
            if (lupaActiva) {
                // Ocultar la lupa durante el cambio de página
                magnifierContainer.style.display = 'none';

                // Resetear el estado de la lupa fija
                lupaFija = false;

                // Eliminar indicador de lupa fija si existe
                const indicadorFijo = magnifierContainer.querySelector('.fixed-indicator');
                if (indicadorFijo) indicadorFijo.remove();
            }
        });

        // Ocultar la lupa cuando el ratón sale del flipbook
        flipbookElement.addEventListener('mouseleave', () => {
            if (lupaActiva && !lupaFija) {
                magnifierContainer.style.display = 'none';
            }
        });

        // Mostrar la lupa cuando el ratón entra al flipbook
        flipbookElement.addEventListener('mouseenter', (e) => {
            if (lupaActiva && !lupaFija) {
                actualizarLupa(e);
            }
        });
    }
    // Añadir estos estilos al final de la función loadPdf
    const fullscreenStyles = document.createElement('style');
    fullscreenStyles.textContent = `
        .flipbook-container:fullscreen {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100vw !important;
            height: 100vh !important;
            background-color: #333 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
        }
        
        .flipbook-container:fullscreen #flipbook {
            margin: 0 auto !important;
            max-height: calc(100vh - 60px) !important;
        }
        
        .flipbook-container:fullscreen .controls {
            position: fixed !important;
            bottom: 10px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background-color: rgba(255, 255, 255, 0.8) !important;
            border-radius: 10px !important;
            padding: 5px 15px !important;
            z-index: 9999 !important;
        }
        
        /* Soporte para diferentes navegadores */
        .flipbook-container:-webkit-full-screen { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; width: 100vw !important; height: 100vh !important; background-color: #333 !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; }
        .flipbook-container:-moz-full-screen { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; width: 100vw !important; height: 100vh !important; background-color: #333 !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; }
        .flipbook-container:-ms-fullscreen { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; width: 100vw !important; height: 100vh !important; background-color: #333 !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; }
        
        .flipbook-container:-webkit-full-screen #flipbook { margin: 0 auto !important; max-height: calc(100vh - 60px) !important; }
        .flipbook-container:-moz-full-screen #flipbook { margin: 0 auto !important; max-height: calc(100vh - 60px) !important; }
        .flipbook-container:-ms-fullscreen #flipbook { margin: 0 auto !important; max-height: calc(100vh - 60px) !important; }
        
        .flipbook-container:-webkit-full-screen .controls { position: fixed !important; bottom: 10px !important; left: 50% !important; transform: translateX(-50%) !important; background-color: rgba(255, 255, 255, 0.8) !important; border-radius: 10px !important; padding: 5px 15px !important; z-index: 9999 !important; }
        .flipbook-container:-moz-full-screen .controls { position: fixed !important; bottom: 10px !important; left: 50% !important; transform: translateX(-50%) !important; background-color: rgba(255, 255, 255, 0.8) !important; border-radius: 10px !important; padding: 5px 15px !important; z-index: 9999 !important; }
        .flipbook-container:-ms-fullscreen .controls { position: fixed !important; bottom: 10px !important; left: 50% !important; transform: translateX(-50%) !important; background-color: rgba(255, 255, 255, 0.8) !important; border-radius: 10px !important; padding: 5px 15px !important; z-index: 9999 !important; }
    `;
    document.head.appendChild(fullscreenStyles);

}
document.addEventListener('fullscreenchange', () => {
    if (flipbookInitialized) {
        const isFullscreen = !!document.fullscreenElement;

        // Actualizar el texto del botón
        const fullscreenBtn = document.getElementById('fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = isFullscreen ?
                '<i class="fas fa-compress"></i> Salir' :
                '<i class="fas fa-expand"></i> Pantalla completa';
        }

        setTimeout(() => {
            // Aplicar el tamaño adecuado según el modo
            const newSize = isFullscreen ?
                calculateOptimalSizeForFullscreen() :
                calculateOptimalSize();

            $(document.getElementById('flipbook')).turn('size', newSize.width, newSize.height);

            // Ajustar estilos según el modo
            if (isFullscreen) {
                document.getElementById('flipbook').style.margin = '0 auto';
                document.getElementById('flipbook').style.maxWidth = '100%';
            } else {
                document.getElementById('flipbook').style.margin = '';
                document.getElementById('flipbook').style.maxWidth = '';
            }

            // Forzar reflow
            document.getElementById('flipbook').offsetHeight;
        }, 300);
    }
    // Función específica para iOS que tiene limitaciones con la API de pantalla completa
    function setupIOSFullscreenWorkaround() {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
            const fullscreenBtn = document.getElementById('fullscreen');
            if (fullscreenBtn) {
                // Reemplazar el evento original
                const originalClickHandler = fullscreenBtn.onclick;
                fullscreenBtn.removeEventListener('click', originalClickHandler);

                // Añadir un nuevo manejador específico para iOS
                fullscreenBtn.addEventListener('click', () => {
                    const flipbookContainer = document.querySelector('.flipbook-container');

                    if (!flipbookContainer.classList.contains('ios-fullscreen')) {
                        // Entrar en modo "fullscreen" simulado para iOS
                        flipbookContainer.classList.add('ios-fullscreen');
                        document.body.style.overflow = 'hidden';
                        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Salir';

                        // Disparar evento simulado
                        isSimulatedFullscreen = true;
                        const event = new Event('simulated-fullscreenchange');
                        document.dispatchEvent(event);
                    } else {
                        // Salir del modo "fullscreen" simulado
                        flipbookContainer.classList.remove('ios-fullscreen');
                        document.body.style.overflow = '';
                        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Pantalla completa';

                        // Disparar evento simulado
                        isSimulatedFullscreen = false;
                        const event = new Event('simulated-fullscreenchange');
                        document.dispatchEvent(event);
                    }
                });
            }
        }
    }

    // Ejecutar la configuración específica para iOS después de cargar el documento
    document.addEventListener('DOMContentLoaded', setupIOSFullscreenWorkaround);

});






// Añadir animación de carga al iniciar
document.addEventListener('DOMContentLoaded', addLoadingAnimation);