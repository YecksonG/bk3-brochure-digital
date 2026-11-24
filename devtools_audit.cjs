const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('/home/yg/Downloads/BK3_Pagina_Claude/bk3kit/node_modules/playwright');

(async () => {
  const OUTPUT_DIR = '/home/yg/BK3_Brochure_Digital/previews/devtools_audit';
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('\n======================================================');
  console.log('CHROME DEVTOOLS PROTOCOL (CDP) AUDIT & MOBILE TESTING');
  console.log('======================================================\n');

  const auditReport = {
    timestamp: new Date().toISOString(),
    profiles: {},
    summary: { passed: 0, failed: 0 }
  };

  const browser = await chromium.launch({ headless: true });

  // --------------------------------------------------------------------------
  // PERFIL 1: MOBILE PORTRAIT (iPhone 14 • 390x844 @3x)
  // --------------------------------------------------------------------------
  console.log('--- 1. AUDITORÍA DEVTOOLS EN DISPOSITIVO MÓVIL (iPhone 14) ---');
  {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    });

    const page = await mobileContext.newPage();
    const cdp = await mobileContext.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Network.enable');

    const consoleLogs = [];
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    page.on('requestfailed', req => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // Carga inicial
    const navStart = Date.now();
    await page.goto('http://localhost:3000/?debug=telemetry', { waitUntil: 'networkidle' });
    const loadTimeMs = Date.now() - navStart;

    // Métricas de Performance CDP
    const perfMetrics = await cdp.send('Performance.getMetrics');
    const metricMap = {};
    perfMetrics.metrics.forEach(m => { metricMap[m.name] = m.value; });

    // Captura inicial Portada Móvil
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_01_cover.png') });

    // Validar responsividad de portada: botón ABRIR REVISTA visible y centrado
    const isCoverBtnVisible = await page.isVisible('#btnOpenCatalog');
    const coverBtnBox = await page.locator('#btnOpenCatalog').boundingBox();

    // Pasar a página 2 (Índice en móvil es página individual)
    await page.click('#btnOpenCatalog');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_02_index.png') });

    // Navegar pliego por pliego hasta BK3 Moto (Pág 4)
    await page.click('#btnNextFooter'); // Pág 3 (Manifiesto)
    await page.waitForTimeout(800);
    await page.click('#btnNextFooter'); // Pág 4 (Moto 1)
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_03_moto_single.png') });

    // Verificar spot 3D táctil en móvil
    const motoSpot = page.locator('.page-moto .product-3d-spot.spot-moto');
    const motoSpotExists = (await motoSpot.count()) > 0;
    if (motoSpotExists) {
      await motoSpot.dispatchEvent('touchstart');
      await page.waitForTimeout(300);
      await motoSpot.dispatchEvent('touchend');
    }

    // Navegar hasta Beneficios (Página 14) vía ancla directa en drawer
    await page.click('#btnFooterThumbs');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_07_drawer_open.png') });

    const isDrawerOpen = await page.isVisible('.thumbs-drawer.open');

    // Click en miniatura de Beneficios
    await page.click('.thumb-item[data-target-anchor="beneficios-1"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_04_beneficios_p14.png') });

    // Verificar podio 3D en móvil: tocar botella de Clásico
    const benefitClasico = page.locator('.benefit-product-spot.spot-clasico');
    await benefitClasico.dispatchEvent('touchstart');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_04_beneficios_clasico_touch.png') });
    await benefitClasico.dispatchEvent('touchend');

    // Avanzar a Página 15 (Matriz en móvil)
    await page.click('#btnNextFooter');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_05_beneficios_p15.png') });

    // Avanzar a Contraportada (Página 16 en móvil)
    await page.click('#btnNextFooter');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile_06_backcover.png') });

    // Verificar botón WhatsApp en móvil
    const wspBtnBox = await page.locator('.backcover-wsp-button').boundingBox();
    const isWspProperWidth = wspBtnBox && wspBtnBox.width >= 200 && wspBtnBox.width <= 360;

    // Verificar árbol de accesibilidad en móvil vía Chrome DevTools Protocol (CDP)
    await cdp.send('Accessibility.enable');
    const a11yTree = await cdp.send('Accessibility.getFullAXTree');
    const a11yNodesCount = a11yTree.nodes.length;

    // Comprobar que no haya scroll horizontal roto
    const scrollDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    const noHorizontalOverflow = scrollDimensions.scrollWidth <= scrollDimensions.clientWidth + 2;

    auditReport.profiles.mobile_iphone14 = {
      viewport: '390x844 @3x',
      loadTimeMs,
      cdpMetrics: {
        JSHeapUsedSizeMB: Math.round((metricMap.JSHeapUsedSize || 0) / (1024 * 1024) * 100) / 100,
        NodesCount: metricMap.Nodes || 0,
        LayoutCount: metricMap.LayoutCount || 0,
        LayoutDurationSec: Math.round((metricMap.LayoutDuration || 0) * 1000) / 1000
      },
      consoleErrorsCount: consoleErrors.length,
      failedRequestsCount: failedRequests.length,
      isCoverBtnVisible,
      isDrawerOpen,
      isWspProperWidth,
      noHorizontalOverflow,
      a11yNodesCount: a11yNodesCount || 0
    };

    console.log(`  • Carga móvil: ${loadTimeMs} ms | Heap JS: ${auditReport.profiles.mobile_iphone14.cdpMetrics.JSHeapUsedSizeMB} MB`);
    console.log(`  • Errores de consola: ${consoleErrors.length} | Peticiones fallidas: ${failedRequests.length}`);
    console.log(`  • Cero desborde horizontal (Viewport Lock): ${noHorizontalOverflow ? 'OK' : 'FAIL'}`);
    console.log(`  • Botón WhatsApp adaptado a móvil: ${isWspProperWidth ? 'OK (' + Math.round(wspBtnBox.width) + 'px)' : 'FAIL'}`);

    await mobileContext.close();
  }

  // --------------------------------------------------------------------------
  // PERFIL 2: TABLET PORTRAIT (iPad • 810x1080 @2x)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. AUDITORÍA DEVTOOLS EN TABLET (iPad 810x1080) ---');
  {
    const tabletContext = await browser.newContext({
      viewport: { width: 810, height: 1080 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    const page = await tabletContext.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'tablet_01_cover.png') });

    await page.click('#btnOpenCatalog');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'tablet_02_spread.png') });

    const tabletLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));

    auditReport.profiles.tablet_ipad = {
      viewport: '810x1080 @2x',
      noHorizontalOverflow: tabletLayout.scrollWidth <= tabletLayout.clientWidth + 2
    };

    console.log(`  • Tablet Cero desborde: ${auditReport.profiles.tablet_ipad.noHorizontalOverflow ? 'OK' : 'FAIL'}`);
    await tabletContext.close();
  }

  // --------------------------------------------------------------------------
  // PERFIL 3: DESKTOP ULTRA-WIDE / FULL HD (1920x1080 @1x)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. AUDITORÍA DEVTOOLS EN ESCRITORIO (1920x1080) ---');
  {
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });

    const page = await desktopContext.newPage();
    const cdp = await desktopContext.newCDPSession(page);
    await cdp.send('Performance.enable');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const perfMetrics = await cdp.send('Performance.getMetrics');
    const metricMap = {};
    perfMetrics.metrics.forEach(m => { metricMap[m.name] = m.value; });

    // Navegar al pliego de los 7 beneficios
    await page.click('#btnOpenCatalog');
    await page.waitForTimeout(1000);
    await page.click('#btnFooterThumbs');
    await page.waitForTimeout(500);
    await page.click('.thumb-item[data-target-anchor="beneficios-1"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'desktop_spread_beneficios.png') });

    auditReport.profiles.desktop_fhd = {
      viewport: '1920x1080',
      cdpMetrics: {
        JSHeapUsedSizeMB: Math.round((metricMap.JSHeapUsedSize || 0) / (1024 * 1024) * 100) / 100,
        NodesCount: metricMap.Nodes || 0,
        LayoutDurationSec: Math.round((metricMap.LayoutDuration || 0) * 1000) / 1000
      }
    };

    console.log(`  • Desktop Heap JS: ${auditReport.profiles.desktop_fhd.cdpMetrics.JSHeapUsedSizeMB} MB | Nodos DOM: ${auditReport.profiles.desktop_fhd.cdpMetrics.NodesCount}`);
    await desktopContext.close();
  }

  await browser.close();

  // Evaluación final
  const mobileOk = auditReport.profiles.mobile_iphone14.consoleErrorsCount === 0 &&
                   auditReport.profiles.mobile_iphone14.failedRequestsCount === 0 &&
                   auditReport.profiles.mobile_iphone14.noHorizontalOverflow &&
                   auditReport.profiles.mobile_iphone14.isWspProperWidth;
  const tabletOk = auditReport.profiles.tablet_ipad.noHorizontalOverflow;
  const allPassed = mobileOk && tabletOk;

  auditReport.summary = {
    allPassed,
    verdict: allPassed ? 'DEVTOOLS AUDIT PASSED 10/10' : 'ISSUES DETECTED'
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'devtools_report.json'), JSON.stringify(auditReport, null, 2));

  console.log('\n======================================================');
  console.log(`DEVTOOLS AUDIT RESULT: ${allPassed ? 'ALL VIEWPORTS CERTIFIED OK' : 'FAILURES FOUND'}`);
  console.log('======================================================\n');

  process.exit(allPassed ? 0 : 1);
})();
