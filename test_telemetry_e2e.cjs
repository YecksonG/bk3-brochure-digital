const http = require('http');
const handler = require('./api/telemetry.js');
const { chromium } = require('/home/yg/Downloads/BK3_Pagina_Claude/bk3kit/node_modules/playwright');

(async () => {
  console.log('\n========================================');
  console.log('TEST SUITE: OBSERVABILITY & SINK VERIFICATION');
  console.log('========================================\n');

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✓ PASS [TEL-API] ${testName}`);
      testPassed++;
    } else {
      console.error(`✗ FAIL [TEL-API] ${testName} - ${details}`);
      testFailed++;
    }
  }

  // PARTE 1: PRUEBAS UNITARIAS DEL HANDLER /api/telemetry.js
  console.log('--- FASE 1: Unit tests del handler serverless ---');

  // Helper para simular req / res
  function mockReqRes(method, body = null) {
    let statusCode = 200;
    let headers = {};
    let responseBody = null;
    let ended = false;

    const res = {
      setHeader: (k, v) => { headers[k] = v; },
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseBody = data; ended = true; return res; },
      end: () => { ended = true; return res; },
      getStatusCode: () => statusCode,
      getBody: () => responseBody,
      getHeaders: () => headers
    };

    const req = {
      method: method,
      body: body
    };

    return { req, res };
  }

  // Test 1: OPTIONS preflight
  {
    const { req, res } = mockReqRes('OPTIONS');
    await handler(req, res);
    assert(res.getStatusCode() === 204, 'Manejo correcto de OPTIONS Preflight (204)');
  }

  // Test 2: GET no permitido
  {
    const { req, res } = mockReqRes('GET');
    await handler(req, res);
    assert(res.getStatusCode() === 405, 'Rechazo de métodos no permitidos (GET -> 405)');
  }

  // Test 3: POST con payload inválido
  {
    const { req, res } = mockReqRes('POST', null);
    await handler(req, res);
    assert(res.getStatusCode() === 400, 'Rechazo de payload vacío o nulo (400)');
  }

  // Test 4: POST con evento estructurado válido
  {
    const capturedLogs = [];
    const origLog = console.log;
    console.log = (msg) => capturedLogs.push(msg);

    const { req, res } = mockReqRes('POST', {
      events: [
        {
          timestamp: new Date().toISOString(),
          sessionId: 'test-session-123',
          entryPoint: 'direct_web',
          event: 'conversion_intent',
          level: 'info',
          pageIndex: 15,
          payload: { cta: 'whatsapp_order' }
        }
      ]
    });

    await handler(req, res);
    console.log = origLog;

    const isOk = res.getStatusCode() === 200 && res.getBody()?.received === 1;
    const logEmitted = capturedLogs.some(l => {
      try {
        const parsed = JSON.parse(l);
        return parsed.sessionId === 'test-session-123' && parsed.event === 'conversion_intent';
      } catch {
        return false;
      }
    });

    assert(isOk && logEmitted, 'Ingesta y emisión de log JSON estructurado en stdout');
  }

  // PARTE 2: PRUEBA DE INTEGRACIÓN E2E CON PLAYWRIGHT Y SERVIDOR LOCAL
  console.log('\n--- FASE 2: Integración Cliente-Servidor (sendBeacon / fetch keepalive) ---');

  const receivedByServer = [];

  // Crear servidor HTTP local que atienda archivos estáticos y /api/telemetry
  const fs = require('fs');
  const path = require('path');

  const server = http.createServer(async (req, res) => {
    if (req.url === '/api/telemetry') {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', async () => {
        try {
          req.body = raw ? JSON.parse(raw) : null;
        } catch {
          req.body = raw;
        }
        await handler(req, res);
        if (req.body?.events) {
          receivedByServer.push(...req.body.events);
        }
      });
      return;
    }

    // Servir estáticos
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      return res.end('Not Found');
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentTypeMap = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };

    res.writeHead(200, { 'Content-Type': contentTypeMap[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(3344, resolve));
  console.log('Servidor de prueba local activo en http://localhost:3344');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3344/?debug=telemetry', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Navegar pliego
  await page.click('#btnOpenCatalog');
  await page.waitForTimeout(800);

  // Simular conversión (clic en WhatsApp)
  await page.evaluate(() => {
    window.BK3Telemetry.recordConversion('whatsapp_order', { test: true });
  });

  await page.waitForTimeout(1000);

  // Forzar flush manual para verificar API expuesta
  await page.evaluate(() => window.BK3Telemetry.flush(true));
  await page.waitForTimeout(800);

  assert(receivedByServer.length > 0, `Servidor recibió ${receivedByServer.length} eventos telemétricos por red`);

  const hasConversion = receivedByServer.some(e => e.event === 'conversion_intent');
  assert(hasConversion, 'Evento crítico conversion_intent entregado con éxito al sumidero');

  const hasAppInit = receivedByServer.some(e => e.event === 'app_initialized');
  assert(hasAppInit, 'Evento app_initialized entregado con éxito al sumidero');

  await browser.close();
  server.close();

  console.log('\n========================================');
  console.log(`RESULTADO FINAL: ${testPassed} APROBADOS, ${testFailed} FALLIDOS`);
  console.log('========================================\n');

  process.exit(testFailed === 0 ? 0 : 1);
})();
