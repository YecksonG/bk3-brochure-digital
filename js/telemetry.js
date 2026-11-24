/**
 * BK3 SOLUTIONS • CLIENT-SIDE OBSERVABILITY & TELEMETRY ENGINE
 * Módulo de instrumentación estructurada para el Catálogo Digital Oficial.
 * Conforme a estándares de observabilidad: eventos JSON estructurados, correlation ID,
 * tracking de conversión, Core Web Vitals, detección de errores sin PII
 * y sumidero first-party vía /api/telemetry (navigator.sendBeacon & fetch keepalive).
 */

(function (window) {
  'use strict';

  // 1. Session Correlation ID (persistente durante la sesión de lectura)
  const SESSION_KEY = 'bk3_telemetry_session_id';
  let sessionId = null;
  try {
    sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = (window.crypto && window.crypto.randomUUID) 
        ? window.crypto.randomUUID() 
        : 'bk3_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch (e) {
    sessionId = 'bk3_fallback_' + Date.now();
  }

  // Identificación del punto de entrada (directo o embebido)
  const entryPoint = (window.self !== window.top) ? 'embedded_iframe' : 'direct_web';

  // Buffers de eventos
  const eventBuffer = [];
  const MAX_BUFFER = 200;
  const pendingDispatchQueue = [];
  const ENDPOINT_URL = '/api/telemetry';

  // Estado de sesión y métricas RED/USE
  let currentPageIndex = 0;
  let pageStartTime = performance.now();
  const visitedPages = new Set([0]);
  const productInteractions = {};
  const metrics = {
    flipsCount: 0,
    totalDwellTimeSec: 0,
    whatsappClicks: 0,
    webPortalClicks: 0,
    errorCount: 0
  };

  /**
   * Envía los eventos acumulados hacia el sumidero first-party /api/telemetry.
   * Utiliza navigator.sendBeacon con fallback a fetch con keepalive para garantizar
   * la entrega incluso si la pestaña se cierra o navega a WhatsApp.
   */
  function flush(isImmediate = false) {
    if (pendingDispatchQueue.length === 0) return Promise.resolve(false);

    // Extraer hasta 25 eventos por lote
    const batch = pendingDispatchQueue.splice(0, 25);
    const payload = JSON.stringify({ events: batch });

    // 1. Prioridad: navigator.sendBeacon (ideal para cierres de página y clics a WhatsApp)
    if (navigator && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const enqueued = navigator.sendBeacon(ENDPOINT_URL, blob);
        if (enqueued) {
          return Promise.resolve(true);
        }
      } catch (beaconErr) {
        // Fallback a fetch si sendBeacon arroja excepción
      }
    }

    // 2. Fallback: fetch con keepalive
    if (typeof fetch === 'function') {
      return fetch(ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: payload,
        keepalive: true
      }).then(res => res.ok).catch(() => {
        // En caso de fallo transitorio en background, reencolar si no supera el límite
        if (pendingDispatchQueue.length + batch.length <= MAX_BUFFER) {
          pendingDispatchQueue.unshift(...batch);
        }
        return false;
      });
    }

    return Promise.resolve(false);
  }

  /**
   * Emite un evento telemétrico estructurado.
   * @param {string} eventName - Nombre estable del evento (ej: 'page_turned', 'cta_clicked')
   * @param {Object} payload - Datos de contexto del evento (sin PII)
   * @param {'info'|'warn'|'error'} level - Nivel de severidad
   * @param {boolean} forceFlush - Si debe forzar el envío inmediato al sumidero
   */
  function emit(eventName, payload = {}, level = 'info', forceFlush = false) {
    const event = {
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      entryPoint: entryPoint,
      event: eventName,
      level: level,
      pageIndex: currentPageIndex,
      payload: Object.assign({}, payload)
    };

    // Buffer de inspección en memoria
    if (eventBuffer.length >= MAX_BUFFER) {
      eventBuffer.shift();
    }
    eventBuffer.push(event);

    // Cola de transmisión a backend
    pendingDispatchQueue.push(event);

    // Hook para Google Tag Manager / GA4 si dataLayer está disponible
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      try {
        window.dataLayer.push({
          event: 'bk3_' + eventName,
          bk3_session: sessionId,
          bk3_page: currentPageIndex,
          ...payload
        });
      } catch (dlErr) {
        // Silencioso para no romper ejecución
      }
    }

    // Salida estructurada limpia para desarrollo
    if (window.location.hostname === 'localhost' || window.location.search.includes('debug=telemetry')) {
      const logFn = level === 'error' ? console.error : (level === 'warn' ? console.warn : console.log);
      logFn(`[BK3-TELEMETRY] ${event.event}`, event);
    }

    // Si es un evento de conversión, error crítico o se solicita flush inmediato
    if (forceFlush || eventName === 'conversion_intent' || level === 'error' || pendingDispatchQueue.length >= 8) {
      flush(true);
    }

    return event;
  }

  /**
   * Registro de cambio de página / pliego.
   */
  function recordPageTurn(toPageIndex, spreadName = '') {
    const now = performance.now();
    const dwellTimeSec = Math.round((now - pageStartTime) / 100) / 10;
    metrics.flipsCount++;
    metrics.totalDwellTimeSec += dwellTimeSec;

    emit('page_turned', {
      fromPage: currentPageIndex,
      toPage: toPageIndex,
      spread: spreadName,
      dwellTimeSec: dwellTimeSec,
      totalVisitedPages: visitedPages.size
    });

    currentPageIndex = toPageIndex;
    visitedPages.add(toPageIndex);
    pageStartTime = now;
  }

  /**
   * Registro de interacción con producto 3D (Showroom o páginas individuales).
   */
  function recordProductInteraction(productName, triggerType = 'hover', durationMs = 0) {
    productInteractions[productName] = (productInteractions[productName] || 0) + 1;

    emit('product_3d_interacted', {
      product: productName,
      triggerType: triggerType,
      durationMs: Math.round(durationMs),
      interactionCount: productInteractions[productName]
    });
  }

  /**
   * Registro de llamadas a la acción (WhatsApp y Web Oficial).
   */
  function recordConversion(ctaType, details = {}) {
    if (ctaType === 'whatsapp_order') {
      metrics.whatsappClicks++;
    } else if (ctaType === 'official_website') {
      metrics.webPortalClicks++;
    }

    // Forzar flush inmediato para asegurar transmisión antes de abandonar la pestaña
    emit('conversion_intent', Object.assign({
      cta: ctaType,
      sourcePage: currentPageIndex,
      pagesExplored: visitedPages.size,
      productsExplored: Object.keys(productInteractions)
    }, details), 'info', true);
  }

  /**
   * Captura y reporte estructurado de excepciones cliente.
   */
  function recordError(errorObj, context = {}) {
    metrics.errorCount++;
    const safeError = {
      name: errorObj?.name || 'Error',
      message: errorObj?.message || String(errorObj),
      stack: errorObj?.stack ? errorObj.stack.split('\n').slice(0, 4).join(' > ') : 'N/A',
      context: context
    };

    emit('client_exception', safeError, 'error', true);
  }

  // Listeners globales para captura de fallos de tiempo de ejecución
  window.addEventListener('error', function (evt) {
    recordError(evt.error || evt.message, {
      filename: evt.filename,
      lineno: evt.lineno,
      colno: evt.colno
    });
  });

  window.addEventListener('unhandledrejection', function (evt) {
    recordError(evt.reason, { type: 'unhandled_promise_rejection' });
  });

  // Temporizador de flush periódico cada 15 segundos si hay eventos acumulados
  setInterval(function () {
    if (pendingDispatchQueue.length > 0) {
      flush(false);
    }
  }, 15000);

  // 2. Medición pasiva de Core Web Vitals (LCP, FID/INP, CLS) vía PerformanceObserver
  if (typeof window.PerformanceObserver !== 'undefined') {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        emit('performance_lcp', {
          lcpMs: Math.round(lastEntry.startTime),
          rating: lastEntry.startTime < 2500 ? 'good' : (lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor')
        });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Reporte de cierre de página / visibilidad (Dwell summary & Flush final)
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          emit('performance_cls', {
            clsValue: Math.round(clsValue * 1000) / 1000,
            rating: clsValue < 0.1 ? 'good' : 'needs-improvement'
          });
          flush(true);
        }
      });

      window.addEventListener('pagehide', () => {
        flush(true);
      });
    } catch (e) {
      // Navegadores sin soporte de observers específicos continúan sin degradación
    }
  }

  // Emisión inicial de carga de aplicación
  emit('app_initialized', {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    pixelRatio: window.devicePixelRatio || 1,
    screenCategory: window.innerWidth < 768 ? 'mobile' : (window.innerWidth < 1024 ? 'tablet' : 'desktop'),
    userAgentSnippet: navigator.userAgent.substring(0, 100)
  }, 'info', true);

  // API pública de observabilidad
  window.BK3Telemetry = {
    sessionId: sessionId,
    emit: emit,
    flush: flush,
    recordPageTurn: recordPageTurn,
    recordProductInteraction: recordProductInteraction,
    recordConversion: recordConversion,
    recordError: recordError,
    getMetrics: function () {
      return Object.assign({}, metrics, {
        uniquePagesRead: visitedPages.size,
        productInteractions: Object.assign({}, productInteractions),
        pendingQueueLength: pendingDispatchQueue.length
      });
    },
    getEventLog: function () {
      return eventBuffer.slice();
    }
  };

})(window);
