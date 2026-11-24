const path = require('path');
const fs = require('fs');
const { chromium } = require('/home/yg/Downloads/BK3_Pagina_Claude/bk3kit/node_modules/playwright');

(async () => {
  const PREVIEWS_DIR = '/home/yg/BK3_Brochure_Digital/previews/final_audit';
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

  const consoleErrors = [];
  const failedRequests = [];
  const testResults = [];

  function record(id, title, pass, details = {}) {
    testResults.push({ id, title, pass, details });
    const mark = pass ? '✓ PASS' : '✗ FAIL';
    console.log(`${mark} [${id}] ${title}`);
    if (!pass) {
      console.error('   Details:', details);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message || String(err));
  });

  page.on('requestfailed', req => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  console.log('\n--- 1. NAVEGACIÓN Y CARGA INICIAL ---');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  record('NET-01', 'Cero errores de consola en carga inicial', consoleErrors.length === 0, { errors: consoleErrors });
  record('NET-02', 'Cero recursos fallidos (HTTP 404/500)', failedRequests.length === 0, { failed: failedRequests });

  // Portada (Página 1)
  const coverVisible = await page.isVisible('.page-cover');
  record('COV-01', 'Página 1 (Portada) visible y montada', coverVisible);

  const indicatorText0 = await page.textContent('#pageIndicator');
  record('NAV-01', 'Indicador inicial muestra Página 1', indicatorText0.includes('1'));

  await page.screenshot({ path: path.join(PREVIEWS_DIR, '01_spread_cover.png') });

  // Abrir catálogo
  console.log('\n--- 2. APERTURA Y NAVEGACIÓN DE PLIEGOS ---');
  await page.click('#btnOpenCatalog');
  await page.waitForTimeout(1200);

  // Pliego 1 (Páginas 2-3: Catálogo / Manifiesto)
  const p23Indicator = await page.textContent('#pageIndicator');
  record('NAV-02', 'Navegación a Pliego 2-3 exitosa', p23Indicator.includes('2') || p23Indicator.includes('3'), { text: p23Indicator });
  await page.screenshot({ path: path.join(PREVIEWS_DIR, '02_spread_index_manifesto.png') });

  // Pliego 2 (Páginas 4-5: BK3 Moto)
  await page.click('#btnNextFooter');
  await page.waitForTimeout(1200);
  const p45Indicator = await page.textContent('#pageIndicator');
  record('NAV-03', 'Navegación a Pliego 4-5 (BK3 Moto)', p45Indicator.includes('4') || p45Indicator.includes('5'), { text: p45Indicator });
  await page.screenshot({ path: path.join(PREVIEWS_DIR, '03_spread_moto.png') });

  // Pliego 3 (Páginas 6-7: BK3 Clásico)
  await page.click('#btnNextFooter');
  await page.waitForTimeout(1200);
  const p67Indicator = await page.textContent('#pageIndicator');
  record('NAV-04', 'Navegación a Pliego 6-7 (BK3 Clásico)', p67Indicator.includes('6') || p67Indicator.includes('7'), { text: p67Indicator });
  
  // Hover 3D en Clásico
  const clasico3dSpot = page.locator('.page-clasico .product-3d-spot.spot-clasico');
  const clasico3dExists = await clasico3dSpot.count() > 0;
  record('PROD-01', 'Spot interactivo 3D existe en BK3 Clásico', clasico3dExists);
  if (clasico3dExists) {
    await clasico3dSpot.hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(PREVIEWS_DIR, '04_spread_clasico_hover3d.png') });
  }

  // Pliego 4 (Páginas 8-9: BK3 Racing)
  await page.click('#btnNextFooter');
  await page.waitForTimeout(1200);
  const p89Indicator = await page.textContent('#pageIndicator');
  record('NAV-05', 'Navegación a Pliego 8-9 (BK3 Racing)', p89Indicator.includes('8') || p89Indicator.includes('9'), { text: p89Indicator });
  await page.screenshot({ path: path.join(PREVIEWS_DIR, '05_spread_racing.png') });

  // Pliego 5 (Páginas 10-11: BK3 Cetanium)
  await page.click('#btnNextFooter');
  await page.waitForTimeout(1200);
  const p1011Indicator = await page.textContent('#pageIndicator');
  record('NAV-06', 'Navegación a Pliego 10-11 (BK3 Cetanium)', p1011Indicator.includes('10') || p1011Indicator.includes('11'), { text: p1011Indicator });
  
  // Hover 3D en Cetanium
  const cetane3dSpot = page.locator('.page-cetane .product-3d-spot.spot-cetane');
  const cetane3dExists = await cetane3dSpot.count() > 0;
  record('PROD-02', 'Spot interactivo 3D existe en BK3 Cetanium', cetane3dExists);
  if (cetane3dExists) {
    await cetane3dSpot.hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(PREVIEWS_DIR, '06_spread_cetane_hover3d.png') });
  }

  // Pliego 6 (Páginas 12-13: BK3 Marine)
  await page.click('#btnNextFooter');
  await page.waitForTimeout(1200);
  const p1213Indicator = await page.textContent('#pageIndicator');
  record('NAV-07', 'Navegación a Pliego 12-13 (BK3 Marine)', p1213Indicator.includes('12') || p1213Indicator.includes('13'), { text: p1213Indicator });
  await page.screenshot({ path: path.join(PREVIEWS_DIR, '07_spread_marine.png') });

  // Pliego 7 (Páginas 14-15: Los 7 Beneficios)
  console.log('\n--- 3. VERIFICACIÓN RIGUROSA DE LOS 7 BENEFICIOS ---');
  await page.click('#btnNextFooter');
  await page.waitForTimeout(1200);
  const p1415Indicator = await page.textContent('#pageIndicator');
  record('NAV-08', 'Navegación a Pliego 14-15 (Los 7 Beneficios)', p1415Indicator.includes('14') || p1415Indicator.includes('15'), { text: p1415Indicator });

  // Verificar que la botella de Clásico en los 7 beneficios es la botella individual de 1L
  const clasicoBenefitImg = await page.$eval('.benefit-product-spot.spot-clasico .spot-bottle-img', img => ({
    src: img.getAttribute('src'),
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight
  }));
  const isClasicoSingle = clasicoBenefitImg.src.includes('spot_clasico_showcase.png') && clasicoBenefitImg.naturalHeight > clasicoBenefitImg.naturalWidth * 1.5;
  record('BEN-01', 'Botella de BK3 Clásico en Beneficios es individual de 1 Litro', isClasicoSingle, clasicoBenefitImg);

  // Verificar los 5 spots de productos y sus estilos limpios (sin cuadro ni bordes feos)
  const spotStyles = await page.$eval('.spot-clasico', el => {
    const s = window.getComputedStyle(el);
    return {
      background: s.backgroundColor,
      border: s.borderStyle,
      boxShadow: s.boxShadow
    };
  });
  const cleanSpotStyle = spotStyles.border === 'none' && (spotStyles.background === 'rgba(0, 0, 0, 0)' || spotStyles.background === 'transparent');
  record('BEN-02', 'Hotspots de productos no tienen recuadros ni bordes artificiales', cleanSpotStyle, spotStyles);

  // Hover en BK3 Clásico en el podio de beneficios
  await page.locator('.benefit-product-spot.spot-clasico').hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(PREVIEWS_DIR, '08_spread_beneficios_clasico_hover3d.png') });

  // Pliego completo de los 7 beneficios
  await page.mouse.move(10, 10);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(PREVIEWS_DIR, '08_spread_beneficios_spread.png') });

  // Pliego 8 (Página 16: Contraportada Oficial)
  console.log('\n--- 4. VERIFICACIÓN RIGUROSA DE LA CONTRAPORTADA ---');
  await page.click('#btnNextFooter');
  await page.waitForTimeout(1500);

  const p16Indicator = await page.textContent('#pageIndicator');
  record('NAV-09', 'Navegación a Página 16 (Contraportada)', p16Indicator.includes('16'), { text: p16Indicator });

  // Verificar botón de WhatsApp
  const wspButtonStyles = await page.$eval('.backcover-wsp-button', el => {
    const s = window.getComputedStyle(el);
    return {
      borderColor: s.borderColor,
      borderRadius: s.borderRadius,
      display: s.display
    };
  });
  // #F14825 equivale a rgb(241, 72, 37)
  const isWspBorderOrange = wspButtonStyles.borderColor === 'rgb(241, 72, 37)';
  record('BC-01', 'Botón de WhatsApp tiene borde exterior oficial en Naranja BK3 (#F14825)', isWspBorderOrange, wspButtonStyles);

  // Verificar anillo de pulso / faro
  const beaconStyles = await page.$eval('.wsp-beacon-ring', el => {
    const s = window.getComputedStyle(el);
    return {
      borderColor: s.borderColor,
      animationName: s.animationName
    };
  });
  const isBeaconOrange = beaconStyles.borderColor.includes('241, 72, 37');
  record('BC-02', 'Anillo de palpitación de WhatsApp usa Naranja BK3', isBeaconOrange, beaconStyles);

  // Verificar enlace web directo
  const webLinkInfo = await page.$eval('.hotspot-web-somos', el => {
    const s = window.getComputedStyle(el);
    return {
      href: el.getAttribute('href'),
      background: s.backgroundColor,
      border: s.borderStyle
    };
  });
  const isWebLinkCorrect = webLinkInfo.href === 'https://bk3octanebooster.com/somos-nosotros/';
  const isWebLinkClean = (webLinkInfo.background === 'rgba(0, 0, 0, 0)' || webLinkInfo.background === 'transparent') && webLinkInfo.border === 'none';
  record('BC-03', 'Enlace web oficial apunta a https://bk3octanebooster.com/somos-nosotros/', isWebLinkCorrect, webLinkInfo);
  record('BC-04', 'Enlace web oficial no tiene recuadros ni fondos de color estáticos', isWebLinkClean, webLinkInfo);

  // Verificar ausencia de texto residual "TODOS LOS DERECHOS RESERVADOS" en la página
  const backCoverHtml = await page.$eval('.page-back-cover', el => el.innerHTML);
  const hasDerechosReservados = backCoverHtml.toUpperCase().includes('TODOS LOS DERECHOS RESERVADOS');
  record('BC-05', 'Texto "TODOS LOS DERECHOS RESERVADOS" eliminado con éxito', !hasDerechosReservados);

  await page.screenshot({ path: path.join(PREVIEWS_DIR, '09_spread_backcover.png') });

  // Test del Drawer de Miniaturas (Índice Visual)
  console.log('\n--- 5. VERIFICACIÓN DEL DRAWER DE MINIATURAS ---');
  await page.click('#btnFooterThumbs');
  await page.waitForTimeout(600);
  const isDrawerActive = await page.isVisible('.thumbs-drawer.open');
  record('DRW-01', 'Drawer de miniaturas se despliega con botón de pie', isDrawerActive);
  await page.screenshot({ path: path.join(PREVIEWS_DIR, '10_thumbs_drawer_open.png') });

  // Click en miniatura de Beneficios (Página 14)
  await page.click('.thumb-item[data-target-anchor="beneficios-1"]');
  await page.waitForTimeout(1200);
  const pAfterThumb = await page.textContent('#pageIndicator');
  record('DRW-02', 'Clic en miniatura navega instantáneamente al ancla', pAfterThumb.includes('14') || pAfterThumb.includes('15'), { text: pAfterThumb });

  // Cierre de sesión y reporte final
  await browser.close();

  const allPassed = testResults.every(t => t.pass);
  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${testResults.length}`);
  console.log(`PASSED: ${testResults.filter(t => t.pass).length}`);
  console.log(`FAILED: ${testResults.filter(t => !t.pass).length}`);
  console.log(`STATUS: ${allPassed ? 'ALL VERIFICATIONS PASSED (EVIDENCE CONFIRMED)' : 'FAILURES DETECTED'}`);
  console.log(`========================================\n`);

  fs.writeFileSync(path.join(PREVIEWS_DIR, 'verification_report.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    allPassed,
    results: testResults,
    consoleErrors,
    failedRequests
  }, null, 2));

  process.exit(allPassed ? 0 : 1);
})();
