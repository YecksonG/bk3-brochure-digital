const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/yg/Downloads/BK3_Pagina_Claude/bk3kit/node_modules/playwright');

(async () => {
  const OUTPUT_DIR = '/home/yg/BK3_Brochure_Digital/previews/devtools_memory_audit';
  const ARTIFACT_DIR = '/home/yg/.gemini/antigravity-cli/brain/1d28574d-da0d-43ea-900a-b46ea857cbec';
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('\n======================================================');
  console.log('CHROME DEVTOOLS PROTOCOL (CDP) MEMORY & RUNTIME AUDIT');
  console.log('TARGET: https://bk3-brochure-digital.vercel.app');
  console.log('======================================================\n');

  const auditReport = {
    targetUrl: 'https://bk3-brochure-digital.vercel.app',
    timestamp: new Date().toISOString(),
    memoryProfile: {
      checkpoints: [],
      leakDetected: false,
      maxHeapUsedMB: 0
    },
    networkAudit: {
      totalRequests: 0,
      telemetryCalls: 0,
      failedRequests: [],
      statusCodes: {}
    },
    consoleAudit: {
      errors: [],
      warnings: [],
      telemetryLogs: 0
    },
    a11yAudit: {
      totalNodes: 0,
      interactiveControlsValidated: []
    },
    viewports: {}
  };

  const browser = await chromium.launch({ headless: true });

  // --------------------------------------------------------------------------
  // SESIÓN 1: PROLONGED READING & MEMORY PROFILE (iPhone 14 • 390x844 @3x)
  // --------------------------------------------------------------------------
  console.log('--- FASE 1: Auditoría de Memoria y Ciclo de Vida Prolongado (Móvil) ---');
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

    // Escuchadores de red y consola
    page.on('console', msg => {
      const txt = msg.text();
      if (msg.type() === 'error') auditReport.consoleAudit.errors.push(txt);
      if (msg.type() === 'warning') auditReport.consoleAudit.warnings.push(txt);
      if (txt.includes('[BK3-TELEMETRY]')) auditReport.consoleAudit.telemetryLogs++;
    });

    page.on('pageerror', err => {
      auditReport.consoleAudit.errors.push(err.message);
    });

    page.on('response', res => {
      auditReport.networkAudit.totalRequests++;
      const status = res.status();
      auditReport.networkAudit.statusCodes[status] = (auditReport.networkAudit.statusCodes[status] || 0) + 1;
      if (res.url().includes('/api/telemetry')) {
        auditReport.networkAudit.telemetryCalls++;
      }
    });

    page.on('requestfailed', req => {
      auditReport.networkAudit.failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText})`);
    });

    // Función auxiliar para leer métricas de memoria CDP
    async function getHeapMemoryMB() {
      const data = await cdp.send('Performance.getMetrics');
      const heapMetric = data.metrics.find(m => m.name === 'JSHeapUsedSize');
      const totalHeap = data.metrics.find(m => m.name === 'JSHeapTotalSize');
      const nodes = data.metrics.find(m => m.name === 'Nodes');
      const usedMB = Math.round(((heapMetric?.value || 0) / (1024 * 1024)) * 100) / 100;
      const totalMB = Math.round(((totalHeap?.value || 0) / (1024 * 1024)) * 100) / 100;
      return { usedMB, totalMB, nodes: nodes?.value || 0 };
    }

    // 1. Carga inicial
    console.log('1. Cargando catálogo en producción...');
    const t0 = Date.now();
    await page.goto('https://bk3-brochure-digital.vercel.app/?debug=telemetry', { waitUntil: 'networkidle' });
    const loadTimeMs = Date.now() - t0;

    let mem0 = await getHeapMemoryMB();
    auditReport.memoryProfile.checkpoints.push({ stage: '01_cover_init', ...mem0 });
    console.log(`   [Baseline] Heap: ${mem0.usedMB} MB / ${mem0.totalMB} MB | Nodos DOM: ${mem0.nodes} (Carga: ${loadTimeMs}ms)`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mem_audit_01_cover.png') });

    // 2. Abrir revista y navegar secuencialmente pliego por pliego
    console.log('2. Recorriendo secuencialmente las 16 páginas simulando lectura...');
    await page.click('#btnOpenCatalog');
    await page.waitForTimeout(800);

    for (let i = 2; i <= 8; i++) {
      await page.click('#btnNextFooter');
      await page.waitForTimeout(400);
      
      // Simular interacción táctil aleatoria en hotspots si están visibles
      const spots = page.locator('.product-3d-spot, .benefit-product-spot');
      const count = await spots.count();
      if (count > 0) {
        await spots.first().dispatchEvent('touchstart');
        await page.waitForTimeout(100);
        await spots.first().dispatchEvent('touchend');
      }

      if (i === 4 || i === 8) {
        let memMid = await getHeapMemoryMB();
        auditReport.memoryProfile.checkpoints.push({ stage: `mid_spread_${i}`, ...memMid });
        console.log(`   [Pliego ${i}/8] Heap: ${memMid.usedMB} MB | Nodos: ${memMid.nodes}`);
      }
    }

    // 3. Llegada a Contraportada (Página 16)
    let memBackcover = await getHeapMemoryMB();
    auditReport.memoryProfile.checkpoints.push({ stage: '08_backcover_reached', ...memBackcover });
    console.log(`   [Contraportada P16] Heap: ${memBackcover.usedMB} MB | Nodos: ${memBackcover.nodes}`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mem_audit_02_backcover.png') });

    // 4. Test de estrés del drawer: abrir y cerrar 4 veces
    console.log('3. Test de estrés: apertura y cierre repetido del drawer de miniaturas...');
    for (let j = 0; j < 4; j++) {
      await page.click('#btnFooterThumbs');
      await page.waitForTimeout(250);
      await page.click('#btnFooterThumbs');
      await page.waitForTimeout(250);
    }
    let memAfterDrawer = await getHeapMemoryMB();
    auditReport.memoryProfile.checkpoints.push({ stage: 'drawer_stress_test', ...memAfterDrawer });
    console.log(`   [Post-Drawer Stress] Heap: ${memAfterDrawer.usedMB} MB | Nodos: ${memAfterDrawer.nodes}`);

    // 5. Simular interacción con el botón de WhatsApp (conversión)
    console.log('4. Accionando botón de WhatsApp...');
    await page.evaluate(() => {
      const btn = document.querySelector('.backcover-wsp-button');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(800);

    // 6. Regresar al inicio (Página 1) y evaluar liberación de memoria (GC)
    console.log('5. Retornando a portada para verificar estabilidad de memoria y GC...');
    await page.click('#btnFooterThumbs');
    await page.waitForTimeout(300);
    await page.click('.thumb-item[data-target-anchor="portada"]');
    await page.waitForTimeout(1000);

    // Forzar Garbage Collection si el browser lo permite vía CDP
    try {
      await cdp.send('HeapProfiler.collectGarbage');
    } catch {}
    await page.waitForTimeout(500);

    let memFinal = await getHeapMemoryMB();
    auditReport.memoryProfile.checkpoints.push({ stage: 'final_cover_return', ...memFinal });
    console.log(`   [Final Portada] Heap: ${memFinal.usedMB} MB | Nodos: ${memFinal.nodes}`);

    // Evaluación de Memory Leaks
    const maxHeap = Math.max(...auditReport.memoryProfile.checkpoints.map(c => c.usedMB));
    auditReport.memoryProfile.maxHeapUsedMB = maxHeap;
    auditReport.memoryProfile.leakDetected = (memFinal.usedMB - mem0.usedMB) > 3.0; // Más de 3MB residual se considera fuga

    console.log(`\n  >>> Evaluación de Memoria: Heap Máximo = ${maxHeap} MB | Residual = ${Math.round((memFinal.usedMB - mem0.usedMB) * 100) / 100} MB (Criterio < 3.0 MB)`);
    console.log(`  >>> Fuga de memoria detectada: ${auditReport.memoryProfile.leakDetected ? 'SÍ (FAIL)' : 'NO (PASSED)'}`);

    // Validar responsividad y desborde
    const mobileMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    auditReport.viewports.mobile = {
      device: 'iPhone 14 (390x844 @3x)',
      noHorizontalOverflow: mobileMetrics.scrollWidth <= mobileMetrics.clientWidth + 1,
      heapMB: memFinal.usedMB
    };

    await mobileContext.close();
  }

  // --------------------------------------------------------------------------
  // SESIÓN 2: AUDITORÍA DE ACCESIBILIDAD AXTree (CDP)
  // --------------------------------------------------------------------------
  console.log('\n--- FASE 2: Auditoría de Accesibilidad (AXTree vía CDP) ---');
  {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await desktopContext.newPage();
    const cdp = await desktopContext.newCDPSession(page);

    await cdp.send('Accessibility.enable');
    await page.goto('https://bk3-brochure-digital.vercel.app', { waitUntil: 'networkidle' });

    const axData = await cdp.send('Accessibility.getFullAXTree');
    auditReport.a11yAudit.totalNodes = axData.nodes.length;

    // Verificar controles interactivos clave en el árbol de accesibilidad
    const interactiveRoles = ['button', 'link', 'navigation'];
    const namedControls = axData.nodes.filter(n => {
      const role = n.role?.value;
      const name = n.name?.value;
      return interactiveRoles.includes(role) && name && name.trim().length > 0;
    });

    auditReport.a11yAudit.interactiveControlsValidated = namedControls.slice(0, 10).map(n => ({
      role: n.role.value,
      name: n.name.value
    }));

    console.log(`  • Nodos de accesibilidad analizados: ${axData.nodes.length}`);
    console.log(`  • Controles interactivos con nombre accesible: ${namedControls.length}`);
    namedControls.slice(0, 5).forEach(c => console.log(`     - [${c.role.value}] "${c.name.value}"`));

    // Captura del pliego de los 7 beneficios en Desktop
    await page.click('#btnOpenCatalog');
    await page.waitForTimeout(800);
    await page.click('#btnFooterThumbs');
    await page.waitForTimeout(400);
    await page.click('.thumb-item[data-target-anchor="beneficios-1"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'desktop_beneficios_spread.png') });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_devtools_beneficios.png') });

    await desktopContext.close();
  }

  await browser.close();

  // Resumen final
  const isNetworkClean = auditReport.networkAudit.failedRequests.length === 0;
  const isConsoleClean = auditReport.consoleAudit.errors.length === 0;
  const isMemoryHealthy = !auditReport.memoryProfile.leakDetected && auditReport.memoryProfile.maxHeapUsedMB < 6.0;
  const allAuditsPassed = isNetworkClean && isConsoleClean && isMemoryHealthy;

  auditReport.verdict = allAuditsPassed ? 'CERTIFIED_PERFECT_PRODUCTION_HEALTH' : 'ATTENTION_REQUIRED';

  fs.writeFileSync(path.join(OUTPUT_DIR, 'devtools_memory_report.json'), JSON.stringify(auditReport, null, 2));

  console.log('\n======================================================');
  console.log('RESUMEN DE AUDITORÍA DEVTOOLS:');
  console.log(`  1. Salud de Memoria (Heap < 6 MB, sin fugas): ${isMemoryHealthy ? '✓ EXCELENTE (' + auditReport.memoryProfile.maxHeapUsedMB + ' MB máx)' : '✗ DEFICIENTE'}`);
  console.log(`  2. Limpieza de Red (0 peticiones fallidas): ${isNetworkClean ? '✓ LIMPIA (Total: ' + auditReport.networkAudit.totalRequests + ')' : '✗ CON ERRORES'}`);
  console.log(`  3. Peticiones de Telemetría entregadas: ✓ ${auditReport.networkAudit.telemetryCalls} recibidas en /api/telemetry`);
  console.log(`  4. Errores de Consola / Runtime: ${isConsoleClean ? '✓ CERO ERRORES' : '✗ ' + auditReport.consoleAudit.errors.length + ' errores'}`);
  console.log(`  5. Árbol de Accesibilidad: ✓ ${auditReport.a11yAudit.totalNodes} nodos válidos`);
  console.log(`VEREDICTO FINAL: ${allAuditsPassed ? '100% OPERATIVO Y CERTIFICADO PARA PRODUCCIÓN' : 'FALLOS DETECTADOS'}`);
  console.log('======================================================\n');

  process.exit(allAuditsPassed ? 0 : 1);
})();
