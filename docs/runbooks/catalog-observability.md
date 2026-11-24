# Runbook: BK3 Digital Brochure Observability & Telemetry

Este runbook define los procedimientos operativos, señales telemétricas y umbrales de alerta para el **Catálogo Digital Interactivo Oficial de BK3 Solutions** alojado en Vercel.

---

## 1. Arquitectura de Telemetría y Señales

El sistema utiliza observabilidad cliente-servidor sin cookies invasivas ni PII:
- **Transporte:** `navigator.sendBeacon` y `fetch(..., { keepalive: true })` en `js/telemetry.js`.
- **Sumidero:** `/api/telemetry` (Vercel Serverless Function Node.js).
- **Correlation ID:** `sessionId` (`crypto.randomUUID()`) persistente por sesión de navegación.
- **Formato:** JSON estructurado en `stdout`/`stderr` de Vercel.

### Esquema Canónico de Evento
```json
{
  "timestamp": "2026-11-24T12:00:00.000Z",
  "serverReceivedAt": "2026-11-24T12:00:00.050Z",
  "sessionId": "a8f3b4c1-...",
  "entryPoint": "direct_web",
  "event": "conversion_intent",
  "level": "info",
  "pageIndex": 15,
  "payload": {
    "cta": "whatsapp_order",
    "sourcePage": 15,
    "pagesExplored": 16,
    "productsExplored": ["clasico", "cetane"]
  }
}
```

---

## 2. Alertas Operativas y Acciones Inmediatas

### Alerta 1: `HighClientExceptionRate`
* **Severidad:** **Page** (Acción inmediata)
* **Condición:** Eventos `client_exception` > 2% de las sesiones activas en una ventana de 10 minutos.
* **Qué significa:** Un script cliente falló, un asset crítico no cargó o un navegador móvil específico (Safari iOS antiguo, Android WebView) tiene incompatibilidad de APIs.
* **Primer paso:**
  1. Abrir la consola de Vercel Logs o ejecutar:
     ```bash
     vercel logs --query="client_exception"
     ```
  2. Filtrar por `payload.message` y `payload.stack` para identificar el error exacto y el agente de usuario afectado.
* **Escalar a:** Ingeniero Frontend de guardia.

---

### Alerta 2: `ConversionFunnelDropoff`
* **Severidad:** **Ticket** (Investigar en el día)
* **Condición:** La tasa de `conversion_intent` (clics a WhatsApp) cae > 50% respecto al promedio móvil de 7 días con tráfico equivalente.
* **Qué significa:** El botón de WhatsApp en la contraportada está roto, el número oficial fue mal configurado o la URL de API de WhatsApp falla.
* **Primer paso:**
  1. Probar la contraportada en vivo ejecutando la suite de pruebas:
     ```bash
     node verify_full_brochure.cjs
     ```
  2. Confirmar que el enlace `https://api.whatsapp.com/send?phone=...` responde HTTP 200 y el texto codificado abre WhatsApp Web/Mobile sin error.
* **Escalar a:** Tech Lead / Growth Lead.

---

### Alerta 3: `CoreWebVitalsDegradation`
* **Severidad:** **Ticket** (Revisar en el ciclo semanal)
* **Condición:** Percentil p95 de `performance_lcp` > 3500 ms o `performance_cls` > 0.1 en una ventana de 1 hora.
* **Qué significa:** Se subió una imagen o textura sin comprimir o la CDN de Vercel está experimentando ratio elevado de Cache Misses.
* **Primer paso:**
  1. Verificar el peso de los assets en producción:
     ```bash
     curl -I -s https://bk3-brochure-digital.vercel.app/assets/pages_webp/page-01.webp | grep -E "x-vercel-cache|content-length"
     ```
  2. Confirmar que `x-vercel-cache` devuelva `HIT` y que ninguna imagen supere los 800 KB.
* **Escalar a:** Especialista en Web Performance.

---

## 3. Recetas de Diagnóstico con Logs de Vercel

### Reconstruir el viaje completo de un usuario por su `sessionId`:
```bash
# Reconstruir todos los pasos de la sesión X
vercel logs | jq 'select(.sessionId == "TARGET_SESSION_ID") | {time: .timestamp, event: .event, page: .pageIndex, payload: .payload}'
```

### Contar conversiones por producto explorado:
```bash
vercel logs | jq 'select(.event == "conversion_intent") | .payload.productsExplored[]' | sort | uniq -c | sort -nr
```
