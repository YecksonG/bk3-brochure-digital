# BK3 Octane Booster • Catálogo & Brochure Digital Oficial (v1.0.0)

Catálogo editorial e interactivo de 16 páginas (8 pliegos completos) para **BK3 Solutions, C.A.** Desarrollado con tecnología web estándar (HTML5, CSS3 y JavaScript moderno) con simulación física tridimensional de paso de página (*StPageFlip*), micro-interacciones 3D de elevación de producto y renderizado visual ultraligero en WebP de alta densidad.

---

## 🚀 Características Principales

1. **Flujo Editorial de 16 Páginas (8 Pliegos Maestros):**
   - **Pliego 1:** Portada Oficial (Pág. 01) e Índice / Manifiesto Tecnológico (Págs. 02-03).
   - **Pliego 2:** BK3 Moto • 250 ML (Págs. 04-05).
   - **Pliego 3:** BK3 Clásico • 500 ML / 1L / 5L (Págs. 06-07).
   - **Pliego 4:** BK3 Racing • 1L (Págs. 08-09).
   - **Pliego 5:** BK3 Cetanium Diésel • 1L / 5L (Págs. 10-11).
   - **Pliego 6:** BK3 Performance Marine • 5L (Págs. 12-13).
   - **Pliego 7:** Los 7 Beneficios Oficiales (Showroom 3D y Matriz Modular, Págs. 14-15).
   - **Pliego 8:** Contraportada Oficial con CTA Dinámico de WhatsApp y Enlace Web (Pág. 16).

2. **Micro-interacciones 3D por Línea:**
   - Pop-outs volumétricos de botellas al hacer *hover* o *touch* con resplandores específicos:
     - Naranja BK3 (`#F14825`) para Moto.
     - Verde Clásico (`#62C331`) para Clásico.
     - Rojo Racing (`#ED1C24`) para Racing.
     - Oro Diésel (`#FDB913`) para Cetanium.
     - Azul Náutico (`#0E87D2`) para Marine.

3. **Showroom de los 7 Beneficios:**
   - Botella individual de 1 Litro en podio.
   - Sincronización bidireccional entre etiquetas de texto y productos 3D.
   - Matriz de 7 beneficios sintetizada a 1 sola línea por título y 2 líneas exactas por descripción.

4. **Navegación Táctil & Drawer Visual:**
   - Menú deslizante (*slide-up drawer*) con miniaturas de las 16 páginas y saltos directos a cualquier sección.
   - Indicador dinámico de pliego y barra de progreso de lectura.

5. **Seguridad y Hardening:**
   - Cabeceras de seguridad estrictas en `vercel.json` (Content-Security-Policy, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff).

---

## 🛠️ Entorno de Desarrollo y Ejecución Local

Para levantar el servidor local de desarrollo:

```bash
# Servir en puerto 3000
npx serve -l 3000 .
```

Abrir [http://localhost:3000/](http://localhost:3000/) en el navegador.

---

## 🧪 Batería de Pruebas Automatizadas

El proyecto cuenta con una suite integral de verificación Playwright (`verify_full_brochure.cjs`):

```bash
node verify_full_brochure.cjs
```

**Verificaciones cubiertas (23 aserciones):**
- Cero errores de consola de JavaScript y cero solicitudes de red fallidas (404/500).
- Navegación pliego por pliego desde Portada hasta Contraportada.
- Existencia y funcionamiento de hotspots 3D en todos los productos.
- Verificación del render individual de 1L en Los 7 Beneficios.
- Borde en Naranja BK3 (`#F14825`) y faro pulsante del botón de WhatsApp.
- Enlace web oficial sin recuadros a `https://bk3octanebooster.com/somos-nosotros/`.
- Apertura y cierre del drawer de miniaturas.

---

## 🚢 Despliegue en Producción & Rollback

### Despliegue Automático (Git Push / Vercel Integration):
```bash
git push origin master --tags
```
El repositorio en GitHub (`https://github.com/YecksonG/bk3-brochure-digital.git`) activa automáticamente el pipeline de despliegue en Vercel a la URL de producción.

### Plan de Rollback Inmediato:
En caso de requerir reversión inmediata:
1. **Opción A (Git):**
   ```bash
   git revert HEAD
   git push origin master
   ```
2. **Opción B (Vercel Dashboard):**
   - Entrar al panel de Vercel > Proyecto `bk3-brochure-digital`.
   - Seleccionar el despliegue anterior estable y hacer clic en **Instant Rollback**.
