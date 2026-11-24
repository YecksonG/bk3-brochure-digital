/**
 * BK3 SOLUTIONS • CLIENT-SIDE OBSERVABILITY & TELEMETRY ENGINE
 * Módulo de instrumentación estructurada para el Catálogo Digital Oficial.
 * Conforme a estándares de observabilidad: eventos JSON estructurados, correlation ID,
 * tracking de conversión, Core Web Vitals y detección de errores sin PII.
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

  // Buffer en memoria de eventos telemétricos (hasta 200 eventos)
  const eventBuffer = [];
  const MAX_BUFFER = 200;

  // Estado de sesión
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
   * Emite un evento telemétrico estructurado.
   * @param {string} eventName - Nombre estable del evento (ej: 'page_turned', 'cta_clicked')
   * @param {Object} payload - Datos de contexto del evento (sin PII)
   * @param {'info'|'warn'|'error'} level - Nivel de severidad
   */
  function emit(eventName, payload = {}, level = 'info') {
    const event = {
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      entryPoint: entryPoint,
      event: eventName,
      level: level,
      pageIndex: currentPageIndex,
      payload: Object.assign({}, payload)
    };

    if (eventBuffer.length >= MAX_BUFFER) {
      eventBuffer.shift();
    }
    eventBuffer.push(event);

    // Salida estructurada limpia para herramientas de observabilidad / consola de desarrollo
    if (window.location.hostname === 'localhost' || window.location.search.includes('debug=telemetry')) {
      const logFn = level === 'error' ? console.error : (level === 'warn' ? console.warn : console.log);
      logFn(`[BK3-TELEMETRY] ${event.event}`, event);
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

    emit('conversion_intent', Object.assign({
      cta: ctaType,
      sourcePage: currentPageIndex,
      pagesExplored: visitedPages.size,
      productsExplored: Object.keys(productInteractions)
    }, details));
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

    emit('client_exception', safeError, 'error');
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

      // Reporte de cierre de página / visibilidad (Dwell summary)
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          emit('performance_cls', {
            clsValue: Math.round(clsValue * 1000) / 1000,
            rating: clsValue < 0.1 ? 'good' : 'needs-improvement'
          });
        }
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
  });

  // API pública de observabilidad
  window.BK3Telemetry = {
    sessionId: sessionId,
    emit: emit,
    recordPageTurn: recordPageTurn,
    recordProductInteraction: recordProductInteraction,
    recordConversion: recordConversion,
    recordError: recordError,
    getMetrics: function () {
      return Object.assign({}, metrics, {
        uniquePagesRead: visitedPages.size,
        productInteractions: Object.assign({}, productInteractions)
      });
    },
    getEventLog: function () {
      return eventBuffer.slice();
    }
  };

})(window);
