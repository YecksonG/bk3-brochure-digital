/**
 * BK3 OCTANE BOOSTER - DIGITAL FLIPBOOK CONTROLLER
 * Controlador de Revista Digital 3D (Estilo Heyzine Magazine)
 * Inspirado en Microinteracciones de Portfolio & Invitación Harmony:
 * - GSAP Stagger Entrance en páginas y tarjetas de producto
 * - Interactive Mouse & Touch Spotlight (Resplandor Verde Neón & Naranja)
 * - Explosión Confetti en "ABRIR REVISTA"
 * - Mobile-First Dinámico, Audio Sintetizado y Cero Cortes en Página 2
 * - Detección inteligente de pliegos y resaltado bidireccional
 */

document.addEventListener('DOMContentLoaded', () => {
  const flipContainer = document.getElementById('flipbook');
  const flipWrapper = document.getElementById('flipbookWrapper');
  const pageElements = document.querySelectorAll('.page');
  const totalPages = pageElements.length;

  let pageFlip = null;
  let isSoundEnabled = true;
  let audioCtx = null;

  // Aspect ratio estándar del brochure BK3 (1275 x 1650 = 0.7727)
  const PAGE_ASPECT_RATIO = 1275 / 1650;

  // --------------------------------------------------------------------------
  // 1. DYNAMIC MOUSE & TOUCH SPOTLIGHT (INSPIRADO EN PORTFOLIO YECKSON)
  // --------------------------------------------------------------------------
  const spotlightOverlay = document.getElementById('spotlightOverlay');
  if (spotlightOverlay) {
    let spotlightRaf = null;
    let idleTimeout = null;

    function updateSpotlight(x, y) {
      if (spotlightRaf) cancelAnimationFrame(spotlightRaf);
      spotlightRaf = requestAnimationFrame(() => {
        spotlightOverlay.style.background = `radial-gradient(550px circle at ${x}px ${y}px, rgba(98, 195, 49, 0.16) 0%, rgba(241, 72, 37, 0.05) 45%, transparent 70%)`;
        spotlightOverlay.style.opacity = '1';
      });

      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        spotlightOverlay.style.opacity = '0.6';
      }, 1800);
    }

    window.addEventListener('mousemove', (e) => {
      updateSpotlight(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        updateSpotlight(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // 2. WEB AUDIO SYNTHESIZER: SONIDO DE HOJA DE REVISTA (PAPER FLIP)
  // --------------------------------------------------------------------------
  function playPaperTurnSound() {
    if (!isSoundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const bufferSize = Math.floor(audioCtx.sampleRate * 0.12); // 120ms
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.sin(t * Math.PI);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.12);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start();
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // --------------------------------------------------------------------------
  // 3. CÁLCULO DE DIMENSIONES DINÁMICAS (MOBILE FIRST & DESKTOP SPREAD)
  // --------------------------------------------------------------------------
  function calculatePageDimensions() {
    const vpWidth = window.innerWidth;
    // Header (48px) + Footer (48px) + padding vertical (16px) = 112px
    const vpHeight = window.innerHeight - 112;
    const isMobile = vpWidth <= 768;

    let targetWidth, targetHeight;

    if (isMobile) {
      // MODO MÓVIL: Una sola página vertical ajustada a la pantalla del teléfono
      const maxWidth = Math.min(vpWidth - 16, 440);
      const maxHeight = vpHeight - 8;

      targetHeight = Math.min(maxHeight, Math.round(maxWidth / PAGE_ASPECT_RATIO));
      targetWidth = Math.round(targetHeight * PAGE_ASPECT_RATIO);
    } else {
      // MODO ESCRITORIO / TABLET: Pliego de doble página (spread)
      const maxWidthPerPage = Math.min((vpWidth - 70) / 2, 580);
      const maxHeight = Math.min(vpHeight - 16, 780);

      targetHeight = Math.min(maxHeight, Math.round(maxWidthPerPage / PAGE_ASPECT_RATIO));
      targetWidth = Math.round(targetHeight * PAGE_ASPECT_RATIO);
    }

    return {
      width: Math.max(targetWidth, 260),
      height: Math.max(targetHeight, 340),
      isMobile: isMobile
    };
  }

  // --------------------------------------------------------------------------
  // 4. CENTRADO INTELIGENTE DE PORTADA (ESTILO HEYZINE)
  // En escritorio, la portada cerrada se centra en la pantalla sin hueco izquierdo
  // --------------------------------------------------------------------------
  function updateSpreadCentering(pageIndex) {
    if (window.innerWidth <= 768) {
      // En móvil siempre es página simple centrada
      if (flipWrapper) flipWrapper.style.transform = 'none';
      return;
    }

    if (!flipWrapper) return;

    if (pageIndex === 0) {
      // Portada frontal: desplazar hacia la izquierda un 25% del ancho del libro
      flipWrapper.style.transform = 'translateX(-25%)';
    } else if (pageIndex >= totalPages - 1) {
      // Contraportada final: desplazar hacia la derecha un 25% para centrarla
      flipWrapper.style.transform = 'translateX(25%)';
    } else {
      // Pliego interior de 2 páginas: centrado completo
      flipWrapper.style.transform = 'translateX(0)';
    }
  }

  // --------------------------------------------------------------------------
  // 5. ANIMACIONES GSAP EN CAMBIOS DE PÁGINA (INSPIRADO EN HARMONY)
  // --------------------------------------------------------------------------
  function triggerPageAnimations(pageIndex) {
    if (typeof gsap === 'undefined') return;

    // Cuando se muestra la Página 2 (Índice de Todos los Productos)
    if (pageIndex === 1) {
      // Revelación escalonada (stagger) de botellas de vitrina
      gsap.fromTo('.packshot-bottle',
        { y: -12, opacity: 0, scale: 0.88 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.04, ease: 'back.out(1.6)', clearProps: 'transform' }
      );

      // Revelación escalonada táctil de tarjetas de producto
      gsap.fromTo('.cat-item-card',
        { y: 16, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }
      );
    }

    // Cuando se muestra la Página 10 (BK3 Performance Marine • 7 Beneficios)
    if (pageIndex === 9 || (window.innerWidth > 768 && (pageIndex === 8 || pageIndex === 9))) {
      gsap.fromTo('.marine-hero-img',
        { scale: 0.88, opacity: 0, y: -12 },
        { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.5)', clearProps: 'transform' }
      );
      gsap.fromTo('.marine-benefit-item',
        { x: 16, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.035, ease: 'power2.out', clearProps: 'transform' }
      );
    }
  }

  // --------------------------------------------------------------------------
  // 6. ACTUALIZAR ESTADO DE LA INTERFAZ (PAGINACIÓN, PROGRESO & MINIATURAS)
  // --------------------------------------------------------------------------
  const pageCounter = document.getElementById('pageIndicator');
  const readingProgressBar = document.getElementById('readingProgressBar');
  const thumbItems = document.querySelectorAll('.thumb-item');

  function updateActiveUI(pageIndex) {
    const isMobile = window.innerWidth <= 768;

    if (pageCounter) {
      if (isMobile || pageIndex === 0 || pageIndex >= totalPages - 1) {
        pageCounter.textContent = `Página ${pageIndex + 1} de ${totalPages}`;
      } else {
        const leftPage = pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
        pageCounter.textContent = `Páginas ${leftPage + 1}-${leftPage + 2} de ${totalPages}`;
      }
    }

    // Actualizar barra de progreso de lectura (9% en portada hasta 100%)
    if (readingProgressBar) {
      const pct = Math.max(9, Math.round(((pageIndex + 1) / totalPages) * 100));
      readingProgressBar.style.width = `${pct}%`;
    }

    // Comprobar si una página objetivo está visible en el pliego actual
    function isPageVisible(target) {
      if (isMobile || pageIndex === 0 || pageIndex >= totalPages - 1) {
        return target === pageIndex;
      }
      const spreadLeft = pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
      return target === spreadLeft || target === spreadLeft + 1;
    }

    // Actualizar thumbnails activas y auto-scroll en drawer
    thumbItems.forEach(thumb => {
      const target = parseInt(thumb.getAttribute('data-page'), 10);
      if (isPageVisible(target)) {
        thumb.classList.add('active');
        // Mantener la miniatura visible en la tira horizontal si el drawer está abierto
        if (thumb.scrollIntoView && document.getElementById('thumbsDrawer')?.classList.contains('open')) {
          thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } else {
        thumb.classList.remove('active');
      }
    });

    // Animación interactiva en la contraportada: Salto / caída elástica lenta del botón WhatsApp y cierre del hueco en el header
    const backCoverWsp = document.getElementById('backCoverWhatsAppBtn');
    const headerWsp = document.getElementById('headerWspBtn') || document.querySelector('.header-wsp-pill');
    const headerWspSlot = document.getElementById('headerWspSlot');
    const isContraportada = isPageVisible(totalPages - 1);

    if (isContraportada) {
      if (headerWsp && !headerWsp.classList.contains('wsp-fallen')) {
        headerWsp.classList.add('wsp-fallen');

        // 1. Calcular trayectoria precisa hacia el botón de la contraportada
        let deltaX = -window.innerWidth * 0.14;
        let deltaY = window.innerHeight * 0.45;

        if (backCoverWsp) {
          const startRect = headerWsp.getBoundingClientRect();
          const targetRect = backCoverWsp.getBoundingClientRect();
          if (targetRect.width > 0 && targetRect.height > 0) {
            deltaX = (targetRect.left + targetRect.width / 2) - (startRect.left + startRect.width / 2);
            deltaY = (targetRect.top + targetRect.height / 2) - (startRect.top + startRect.height / 2);
          }
        }

        // 2. Caída lenta y cinematográfica del botón superior hacia el centro de la contraportada
        gsap.to(headerWsp, {
          x: deltaX,
          y: deltaY,
          scale: 0.75,
          opacity: 0.9,
          duration: 1.1,
          ease: 'power1.inOut',
          onComplete: () => {
            gsap.to(headerWsp, { opacity: 0, scale: 0.4, duration: 0.25 });
            headerWsp.style.visibility = 'hidden';
          }
        });

        // 3. Los iconos laterales se juntan suavemente cerrando el espacio vacío que dejó el botón
        if (headerWspSlot) {
          gsap.to(headerWspSlot, {
            width: 0,
            opacity: 0,
            duration: 0.75,
            delay: 0.35,
            ease: 'power2.inOut',
            onComplete: () => {
              headerWspSlot.style.display = 'none';
            }
          });
        }

        // 4. El botón de la contraportada recibe la caída y emerge materializándose con rebote elástico
        if (backCoverWsp) {
          gsap.fromTo(backCoverWsp,
            { scale: 0.25, opacity: 0, y: -60 },
            { scale: 1, opacity: 1, y: 0, duration: 0.9, delay: 0.95, ease: 'back.out(2.2)' }
          );
        }
      }
    } else {
      if (headerWsp && headerWsp.classList.contains('wsp-fallen')) {
        headerWsp.classList.remove('wsp-fallen');
        headerWsp.style.visibility = 'visible';

        // Reabrir el slot para dar cabida al botón en el header
        if (headerWspSlot) {
          headerWspSlot.style.display = 'inline-flex';
          gsap.fromTo(headerWspSlot,
            { width: 0, opacity: 0 },
            { width: 'auto', opacity: 1, duration: 0.55, ease: 'power2.out' }
          );
        }

        // Rebound elástico de retorno al header superior
        gsap.fromTo(headerWsp,
          { y: 28, x: 0, scale: 0.75, opacity: 0 },
          { y: 0, x: 0, scale: 1, opacity: 1, duration: 0.65, delay: 0.15, ease: 'back.out(1.8)' }
        );
      }
      if (backCoverWsp) {
        gsap.to(backCoverWsp, { opacity: 0, scale: 0.8, duration: 0.25 });
      }
    }
  }

  // Interactividad táctil en las botellas 3D
  const spots = document.querySelectorAll('.product-3d-spot');
  spots.forEach(spot => {
    spot.addEventListener('touchstart', () => {
      spot.classList.add('touch-active');
      playPaperTurnSound();
    }, { passive: true });
    spot.addEventListener('touchend', () => {
      setTimeout(() => spot.classList.remove('touch-active'), 800);
    }, { passive: true });
  });

  // --------------------------------------------------------------------------
  // 7. NAVEGACIÓN SEGURA E INTELIGENTE ENTRE PÁGINAS Y PLIEGOS
  // --------------------------------------------------------------------------
  function safeFlipNext() {
    if (!pageFlip) return;
    if (pageFlip.getState && pageFlip.getState() === 'flipping') return;
    pageFlip.flipNext();
  }

  function safeFlipPrev() {
    if (!pageFlip) return;
    if (pageFlip.getState && pageFlip.getState() === 'flipping') return;
    pageFlip.flipPrev();
  }

  function goToPage(targetPage) {
    if (isNaN(targetPage) || targetPage < 0 || targetPage >= totalPages) return;
    const current = pageFlip ? pageFlip.getCurrentPageIndex() : 0;
    const isMobile = window.innerWidth <= 768;

    // En pliego de escritorio, si la página solicitada ya está visible a la vista
    if (!isMobile && current > 0 && current < totalPages - 1) {
      const spreadLeft = current % 2 === 1 ? current : current - 1;
      const spreadRight = spreadLeft + 1;
      if (targetPage === spreadLeft || targetPage === spreadRight) {
        const targetEl = pageElements[targetPage];
        if (targetEl) {
          targetEl.classList.remove('pulse-highlight');
          void targetEl.offsetWidth; // Reflow para reiniciar la animación
          targetEl.classList.add('pulse-highlight');
        }
        updateActiveUI(current);
        return;
      }
    }

    if (pageFlip) {
      if (pageFlip.getState && pageFlip.getState() === 'flipping') return;
      pageFlip.flip(targetPage);
    }
  }

  // --------------------------------------------------------------------------
  // 8. INICIALIZACIÓN DE ST.PAGEFLIP
  // --------------------------------------------------------------------------
  let currentDims = calculatePageDimensions();
  const urlParams = new URLSearchParams(window.location.search);
  const hashMatch = window.location.hash.match(/page=(\d+)/);
  const rawPage = hashMatch ? parseInt(hashMatch[1], 10) : parseInt(urlParams.get('page') || '0', 10);
  const startPage = (!isNaN(rawPage) && rawPage >= 0 && rawPage < totalPages) ? rawPage : 0;

  function initPageFlip(startAt) {
    pageFlip = new St.PageFlip(flipContainer, {
      width: currentDims.width,
      height: currentDims.height,
      size: 'fixed',
      minWidth: currentDims.width,
      maxWidth: currentDims.width,
      minHeight: currentDims.height,
      maxHeight: currentDims.height,
      maxShadowOpacity: 0.6,
      showCover: true,
      showPageCorners: true,
      mobileScrollSupport: true,
      usePortrait: currentDims.isMobile,
      startPage: startAt,
      flippingTime: 650,
    });

    window.pageFlip = pageFlip;

    pageFlip.loadFromHTML(pageElements);

    // Evento al pasar de página
    pageFlip.on('flip', (e) => {
      updateActiveUI(e.data);
      updateSpreadCentering(e.data);
      playPaperTurnSound();
      triggerPageAnimations(e.data);
    });

    pageFlip.on('init', (e) => {
      updateActiveUI(startAt);
      updateSpreadCentering(startAt);
      triggerPageAnimations(startAt);
    });
  }

  initPageFlip(startPage);

  // --------------------------------------------------------------------------
  // 9. CONTROLES Y EVENTOS DE INTERACCIÓN
  // --------------------------------------------------------------------------
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnPrevFooter = document.getElementById('btnPrevFooter');
  const btnNextFooter = document.getElementById('btnNextFooter');

  if (btnPrev) btnPrev.addEventListener('click', safeFlipPrev);
  if (btnNext) btnNext.addEventListener('click', safeFlipNext);
  if (btnPrevFooter) btnPrevFooter.addEventListener('click', safeFlipPrev);
  if (btnNextFooter) btnNextFooter.addEventListener('click', safeFlipNext);

  // Zonas de toque lateral invisible para móvil (Edge Tap Navigation)
  const touchZonePrev = document.getElementById('touchZonePrev');
  const touchZoneNext = document.getElementById('touchZoneNext');
  if (touchZonePrev) {
    touchZonePrev.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissGuide();
      safeFlipPrev();
    });
  }
  if (touchZoneNext) {
    touchZoneNext.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissGuide();
      safeFlipNext();
    });
  }

  // --------------------------------------------------------------------------
  // 10. RECONOCEDOR NATIVO DE GESTOS SWIPE TÁCTIL (SUAVE Y SIN BUG EN MÓVIL)
  // --------------------------------------------------------------------------
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  const viewport = document.querySelector('.viewer-viewport');
  if (viewport) {
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      // No disparar swipe si el usuario está haciendo scroll dentro del catálogo de página 2 o tocando cajones
      if (e.target && e.target.closest && (
        e.target.closest('.index-scroll-wrapper') ||
        e.target.closest('.thumbs-drawer') ||
        e.target.closest('.app-header') ||
        e.target.closest('.app-footer') ||
        e.target.closest('.cover-open-btn') ||
        e.target.closest('.hotspot-link') ||
        e.target.closest('.cat-item-card') ||
        e.target.closest('.packshot-bottle')
      )) {
        return;
      }

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const duration = Date.now() - touchStartTime;

      // Distancia horizontal clara (> 35px) y dominante sobre el movimiento vertical
      if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && duration < 600) {
        dismissGuide();
        if (deltaX < 0) {
          safeFlipNext();
        } else {
          safeFlipPrev();
        }
      }
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // 11. GUÍA INTERACTIVA INICIAL (ONBOARDING TUTORIAL OVERLAY)
  // --------------------------------------------------------------------------
  const gestureGuide = document.getElementById('gestureGuideOverlay');
  const btnDismissGuide = document.getElementById('btnDismissGuide');

  function dismissGuide() {
    if (gestureGuide && !gestureGuide.classList.contains('hidden')) {
      gestureGuide.classList.add('hidden');
      try { sessionStorage.setItem('bk3_guide_seen', 'true'); } catch (e) {}
    }
  }

  // Mostrar la guía únicamente en la primera visita a la portada
  try {
    if (startPage === 0 && sessionStorage.getItem('bk3_guide_seen') !== 'true' && gestureGuide) {
      gestureGuide.classList.remove('hidden');
      setTimeout(dismissGuide, 4500);
    }
  } catch (e) {}

  if (btnDismissGuide) {
    btnDismissGuide.addEventListener('click', dismissGuide);
  }

  if (gestureGuide) {
    gestureGuide.addEventListener('click', (e) => {
      if (e.target === gestureGuide) dismissGuide();
    });
  }

  // Teclado (flechas izquierda / derecha)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      safeFlipPrev();
    } else if (e.key === 'ArrowRight') {
      safeFlipNext();
    }
  });

  // Botón "ABRIR REVISTA" en Portada
  const btnOpenCatalog = document.getElementById('btnOpenCatalog');
  if (btnOpenCatalog) {
    btnOpenCatalog.addEventListener('click', () => {
      dismissGuide();
      goToPage(1); // Abre la revista hacia el catálogo de productos
    });
  }

  // Tarjetas de producto en Página 2 (Todos los productos)
  const productCards = document.querySelectorAll('.cat-item-card');
  productCards.forEach(card => {
    card.addEventListener('click', () => {
      const targetPage = parseInt(card.getAttribute('data-target-page'), 10);
      goToPage(targetPage);
    });

    // Accesibilidad teclado (Enter / Espacio)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const targetPage = parseInt(card.getAttribute('data-target-page'), 10);
        goToPage(targetPage);
      }
    });
  });

  // Botellas en la vitrina superior de Página 2
  const packshotBottles = document.querySelectorAll('.packshot-bottle');
  packshotBottles.forEach(bottle => {
    bottle.addEventListener('click', () => {
      const targetPage = parseInt(bottle.getAttribute('data-target-page'), 10);
      goToPage(targetPage);
    });
  });

  // Thumbnails Slide-Up Drawer
  const btnThumbs = document.getElementById('btnThumbs');
  const btnFooterThumbs = document.getElementById('btnFooterThumbs');
  const btnCloseThumbs = document.getElementById('btnCloseThumbs');
  const thumbsDrawer = document.getElementById('thumbsDrawer');

  function toggleThumbsDrawer() {
    if (thumbsDrawer) thumbsDrawer.classList.toggle('open');
  }

  if (btnThumbs) btnThumbs.addEventListener('click', toggleThumbsDrawer);
  if (btnFooterThumbs) btnFooterThumbs.addEventListener('click', toggleThumbsDrawer);
  if (btnCloseThumbs) btnCloseThumbs.addEventListener('click', () => {
    if (thumbsDrawer) thumbsDrawer.classList.remove('open');
  });

  thumbItems.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const targetPage = parseInt(thumb.getAttribute('data-page'), 10);
      goToPage(targetPage);
      if (thumbsDrawer) thumbsDrawer.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (thumbsDrawer && thumbsDrawer.classList.contains('open')) {
      if (!thumbsDrawer.contains(e.target) &&
          e.target !== btnThumbs && !btnThumbs.contains(e.target) &&
          e.target !== btnFooterThumbs && !btnFooterThumbs.contains(e.target)) {
        thumbsDrawer.classList.remove('open');
      }
    }
  });

  // Toggle Sonido
  const btnSound = document.getElementById('btnSound');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      btnSound.innerHTML = isSoundEnabled
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg><span class="btn-label">Sonido: ON</span>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg><span class="btn-label">Sonido: OFF</span>`;
    });
  }

  // Toggle Pantalla Completa
  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });
  }

  // Redimensionamiento inteligente y adaptativo
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newDims = calculatePageDimensions();
      if (pageFlip) {
        currentDims = newDims;
        const s = pageFlip.getSettings();
        s.width = newDims.width;
        s.minWidth = newDims.width;
        s.maxWidth = newDims.width;
        s.height = newDims.height;
        s.minHeight = newDims.height;
        s.maxHeight = newDims.height;
        s.usePortrait = newDims.isMobile;

        const multiplier = newDims.isMobile ? 1 : 2;
        if (flipContainer) {
          flipContainer.style.minWidth = (newDims.width * multiplier) + 'px';
          flipContainer.style.minHeight = newDims.height + 'px';
        }

        pageFlip.update();
        updateSpreadCentering(pageFlip.getCurrentPageIndex());
        updateActiveUI(pageFlip.getCurrentPageIndex());
      }
    }, 150);
  });
});
