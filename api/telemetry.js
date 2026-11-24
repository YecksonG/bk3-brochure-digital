/**
 * BK3 SOLUTIONS • INGESTION DE TELEMETRÍA (VERCEL SERVERLESS FUNCTION)
 * Endpoint receptor para eventos telemétricos del Catálogo Digital Oficial.
 * Conforme a estándares de observabilidad:
 * - Logs estructurados JSON
 * - Correlation ID obligatorio (sessionId)
 * - Identificación de punto de entrada (entryPoint)
 * - Bounded cardinality y cero PII
 * - Polimórfico (compatible con Vercel Serverless y Node.js http nativo)
 */

function sendJson(res, statusCode, body) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(body);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(body));
}

function sendEmpty(res, statusCode) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).end();
  }
  res.writeHead(statusCode);
  return res.end();
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return null;
    }
  }

  // Fallback para streaming de request en Node nativo si no fue pre-procesado
  if (typeof req.on !== 'function') {
    return null;
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

module.exports = async function handler(req, res) {
  // Manejo de preflight CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

  if (req.method === 'OPTIONS') {
    return sendEmpty(res, 204);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const payload = await readRequestBody(req);

  if (!payload) {
    return sendJson(res, 400, { error: 'Invalid or missing JSON payload' });
  }

  // Acepta lote de eventos (array) o evento individual
  const rawEvents = Array.isArray(payload.events) 
    ? payload.events 
    : (Array.isArray(payload) ? payload : [payload]);

  const receivedAt = new Date().toISOString();
  let validEventsCount = 0;

  for (const ev of rawEvents) {
    if (!ev || typeof ev !== 'object' || !ev.event || !ev.sessionId) {
      continue;
    }

    validEventsCount++;

    // Esquema canónico estructurado
    const structuredLog = {
      timestamp: ev.timestamp || receivedAt,
      serverReceivedAt: receivedAt,
      sessionId: String(ev.sessionId).substring(0, 128),
      entryPoint: ev.entryPoint || 'unknown',
      event: String(ev.event).substring(0, 64),
      level: ['info', 'warn', 'error'].includes(ev.level) ? ev.level : 'info',
      pageIndex: typeof ev.pageIndex === 'number' ? ev.pageIndex : -1,
      payload: (typeof ev.payload === 'object' && ev.payload !== null) ? ev.payload : {}
    };

    // Emisión a stdout/stderr de Vercel (recogido por runtime logs y log drains)
    const logString = JSON.stringify(structuredLog);
    if (structuredLog.level === 'error') {
      console.error(logString);
    } else if (structuredLog.level === 'warn') {
      console.warn(logString);
    } else {
      console.log(logString);
    }
  }

  return sendJson(res, 200, {
    status: 'ok',
    received: validEventsCount
  });
};
