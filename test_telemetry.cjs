const path = require('path');
const { chromium } = require('/home/yg/Downloads/BK3_Pagina_Claude/bk3kit/node_modules/playwright');

(async () => {
  console.log('\n========================================');
  console.log('TEST SUITE: BK3 CLIENT OBSERVABILITY & TELEMETRY');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.text().includes('[BK3-TELEMETRY]')) {
      consoleLogs.push(msg.text());
    }
  });

  console.log('1. Cargando catálogo con telemetría activa...');
  await page.goto('http://localhost:3000/?debug=telemetry', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Test 1: Verificar inicialización de BK3Telemetry
  const telemetryInit = await page.evaluate(() => {
    return {
      available: typeof window.BK3Telemetry !== 'undefined',
      sessionId: window.BK3Telemetry?.sessionId,
      eventsCount: window.BK3Telemetry?.getEventLog().length,
      firstEvent: window.BK3Telemetry?.getEventLog()[0]
    };
  });

  const isInitOk = telemetryInit.available && !!telemetryInit.sessionId && telemetryInit.firstEvent?.event === 'app_initialized';
  console.log(isInitOk ? '✓ PASS [TEL-01] BK3Telemetry inicializado con Session Correlation ID' : '✗ FAIL [TEL-01]', telemetryInit);

  // Test 2: Simular paso de página y verificar evento `page_turned`
  console.log('2. Navegando pliego para registrar telemetría de lectura...');
  await page.click('#btnOpenCatalog');
  await page.waitForTimeout(1200);

  const flipEvent = await page.evaluate(() => {
    const events = window.BK3Telemetry.getEventLog();
    return events.find(e => e.event === 'page_turned');
  });

  const isFlipRecorded = !!flipEvent && flipEvent.payload.toPage > 0;
  console.log(isFlipRecorded ? '✓ PASS [TEL-02] Evento structured `page_turned` emitido con métricas de permanencia' : '✗ FAIL [TEL-02]', flipEvent);

  // Test 3: Simular interacción con producto 3D en catálogo
  console.log('3. Interactuando con hotspot 3D...');
  await page.click('#btnNextFooter'); // Ir a Moto (Págs 4-5)
  await page.waitForTimeout(1000);
  await page.locator('.page-moto .product-3d-spot.spot-moto').hover();
  await page.waitForTimeout(400);

  const productEvent = await page.evaluate(() => {
    const events = window.BK3Telemetry.getEventLog();
    return events.find(e => e.event === 'product_3d_interacted');
  });

  const isProductRecorded = !!productEvent && productEvent.payload.product.includes('moto');
  console.log(isProductRecorded ? '✓ PASS [TEL-03] Micro-interacción `product_3d_interacted` capturada' : '✗ FAIL [TEL-03]', productEvent);

  // Test 4: Simular interacción con drawer
  console.log('4. Abriendo drawer de miniaturas...');
  await page.click('#btnFooterThumbs');
  await page.waitForTimeout(500);

  const drawerEvent = await page.evaluate(() => {
    const events = window.BK3Telemetry.getEventLog();
    return events.find(e => e.event === 'thumbnail_drawer_toggled');
  });

  const isDrawerRecorded = !!drawerEvent && drawerEvent.payload.state === 'open';
  console.log(isDrawerRecorded ? '✓ PASS [TEL-04] Evento `thumbnail_drawer_toggled` registrado con estado' : '✗ FAIL [TEL-04]', drawerEvent);

  // Test 5: Navegar a contraportada y probar CTA
  console.log('5. Navegando a contraportada para verificar conversión...');
  await page.click('.thumb-item[data-target-anchor="contacto"]');
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    // Simular clic sin disparar navegación externa en browser headless
    const btn = document.querySelector('.backcover-wsp-button');
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const conversionEvent = await page.evaluate(() => {
    const events = window.BK3Telemetry.getEventLog();
    return events.find(e => e.event === 'conversion_intent');
  });

  const isConversionRecorded = !!conversionEvent && conversionEvent.payload.cta === 'whatsapp_order';
  console.log(isConversionRecorded ? '✓ PASS [TEL-05] Intención de conversión `conversion_intent` capturada con embudo' : '✗ FAIL [TEL-05]', conversionEvent);

  // Test 6: Inyectar excepción controlada y validar error boundary telemétrico
  console.log('6. Validando captura resiliente de errores sin caída...');
  await page.evaluate(() => {
    window.BK3Telemetry.recordError(new Error('Synthetic verification error for telemetry'), { test: true });
  });

  const errorEvent = await page.evaluate(() => {
    const events = window.BK3Telemetry.getEventLog();
    return events.find(e => e.event === 'client_exception');
  });

  const isErrorRecorded = !!errorEvent && errorEvent.payload.message.includes('Synthetic verification');
  console.log(isErrorRecorded ? '✓ PASS [TEL-06] Manejador de excepciones `client_exception` captura stack de forma segura' : '✗ FAIL [TEL-06]', errorEvent);

  // Test 7: Verificar consolidación de métricas
  const finalMetrics = await page.evaluate(() => window.BK3Telemetry.getMetrics());
  const isMetricsOk = finalMetrics.flipsCount > 0 && finalMetrics.whatsappClicks === 1 && finalMetrics.uniquePagesRead >= 3;
  console.log(isMetricsOk ? '✓ PASS [TEL-07] Consolidado de métricas de sesión (`getMetrics()`) íntegro' : '✗ FAIL [TEL-07]', finalMetrics);

  await browser.close();

  const allPassed = isInitOk && isFlipRecorded && isProductRecorded && isDrawerRecorded && isConversionRecorded && isErrorRecorded && isMetricsOk;
  console.log('\n========================================');
  console.log(`TELEMETRY VERIFICATION: ${allPassed ? 'ALL PASS (100% OPERATIONAL)' : 'FAILURES DETECTED'}`);
  console.log('========================================\n');

  process.exit(allPassed ? 0 : 1);
})();
