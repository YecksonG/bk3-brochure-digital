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
      // Revelación escalonada (stagger) de botellas de vitrina (si existen)
      if (document.querySelector('.packshot-bottle')) {
        gsap.fromTo('.packshot-bottle',
          { y: -12, opacity: 0, scale: 0.88 },
          { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.04, ease: 'back.out(1.6)', clearProps: 'transform' }
        );
      }

      // Revelación escalonada táctil de tarjetas de producto
      if (document.querySelector('.cat-item-card')) {
        gsap.fromTo('.cat-item-card',
          { y: 16, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }
        );
      }
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

    // Zonas táctiles laterales en móvil: desactivar pointer-events en el Índice (pág 2) y Contraportada para no tapar tarjetas ni botón WhatsApp
    const isMobileInteractivePage = isMobile && (pageIndex === 1 || pageIndex === totalPages - 1);
    const touchZonePrevEl = document.getElementById('touchZonePrev');
    const touchZoneNextEl = document.getElementById('touchZoneNext');
    if (touchZonePrevEl) {
      touchZonePrevEl.style.pointerEvents = isMobileInteractivePage ? 'none' : 'auto';
      touchZonePrevEl.style.display = isMobile ? 'block' : 'none';
    }
    if (touchZoneNextEl) {
      touchZoneNextEl.style.pointerEvents = isMobileInteractivePage ? 'none' : 'auto';
      touchZoneNextEl.style.display = isMobile ? 'block' : 'none';
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

  // Interactividad táctil en las botellas 3D (iluminación y zoom sin mover la página)
  const spots = document.querySelectorAll('.product-3d-spot');
  spots.forEach(spot => {
    spot.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      spot.classList.add('touch-active');
    }, { passive: true });
    spot.addEventListener('touchend', (e) => {
      e.stopPropagation();
      setTimeout(() => spot.classList.remove('touch-active'), 800);
    }, { passive: true });
  });

  // --------------------------------------------------------------------------
  // 7. NAVEGACIÓN SEGURA E INTELIGENTE ENTRE PÁGINAS Y PLIEGOS
  // --------------------------------------------------------------------------
  let navUITimeout = null;

  function safeFlipNext() {
    if (!pageFlip) return;
    dismissGuide();
    if (pageFlip.getCurrentPageIndex && pageFlip.getCurrentPageIndex() >= totalPages - 1) {
      return; // Ya en la última página
    }
    if (pageFlip.getState && pageFlip.getState() === 'flipping') {
      return; // Prevenir saltos múltiples o aceleración de pliegos al pulsar repetidamente
    }
    try {
      pageFlip.flipNext();
    } catch (e) {
      pageFlip.turnToNextPage();
    }
  }

  function safeFlipPrev() {
    if (!pageFlip) return;
    dismissGuide();
    if (pageFlip.getCurrentPageIndex && pageFlip.getCurrentPageIndex() <= 0) {
      return; // Ya en la primera página
    }
    if (pageFlip.getState && pageFlip.getState() === 'flipping') {
      return; // Prevenir saltos múltiples o aceleración de pliegos al pulsar repetidamente
    }
    try {
      pageFlip.flipPrev();
    } catch (e) {
      pageFlip.turnToPrevPage();
    }
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
        updateActiveUI(current);
        return;
      }
    }

    if (!pageFlip) return;
    dismissGuide();

    const pageCol = pageFlip.getPageCollection();
    const curSpread = pageCol.getCurrentSpreadIndex();
    const targetSpread = pageCol.getSpreadIndexByPage(targetPage);
    const spreadDiff = Math.abs(targetSpread - curSpread);

    if (spreadDiff <= 1) {
      // Pliegos contiguos: animación 3D de volteo de hoja natural
      try {
        pageFlip.flip(targetPage);
      } catch (err) {
        pageFlip.turnToPage(targetPage);
      }
    } else {
      // Salto a pliego distante: reposicionar limpiamente
      try {
        if (pageFlip.getFlipController()) {
          pageFlip.getFlipController().stopMove();
          pageFlip.getFlipController().reset();
          pageFlip.getFlipController().setState('read');
        }
        if (pageFlip.getRender()) {
          pageFlip.getRender().finishAnimation();
        }
      } catch (e) {}
      pageFlip.turnToPage(targetPage);
    }

    // Actualizar UI del footer
    if (navUITimeout) clearTimeout(navUITimeout);
    navUITimeout = setTimeout(() => {
      updateActiveUI(targetPage);
    }, 400);
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
      showPageCorners: false,
      mobileScrollSupport: true,
      usePortrait: currentDims.isMobile,
      startPage: startAt,
      flippingTime: 650,
    });

    pageFlip.loadFromHTML(pageElements);

    // Evento al pasar de página
    pageFlip.on('flip', (e) => {
      dismissGuide();
      updateActiveUI(e.data);
      updateSpreadCentering(e.data);
      playPaperTurnSound();
      triggerPageAnimations(e.data);
    });

    pageFlip.on('init', (e) => {
      // Estilo de papel de revista flexible (soft) continuo para evitar roturas de rotateY en modo móvil
      pageFlip.getPageCollection().getPages().forEach((p, idx) => {
        const isCover = (idx === 0 || idx === totalPages - 1);
        const density = (currentDims.isMobile || !isCover) ? 'soft' : 'hard';
        p.setDensity(density);
        p.setDrawingDensity(density);
      });
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
  // 10. GESTIÓN LIMPIA DE GESTOS TÁCTILES
  // StPageFlip gestiona internamente los toques y deslizamientos de pliegue.
  // Evitamos escuchadores duplicados en el viewport para prevenir doble disparo de flipNext/flipPrev.
  // --------------------------------------------------------------------------

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

  // Mostrar la guía únicamente en la primera visita a la portada en dispositivos móviles
  try {
    if (window.innerWidth <= 768 && startPage === 0 && sessionStorage.getItem('bk3_guide_seen') !== 'true' && gestureGuide) {
      gestureGuide.classList.remove('hidden');
      setTimeout(dismissGuide, 3500);
    }
  } catch (e) {}

  if (btnDismissGuide) {
    btnDismissGuide.addEventListener('click', dismissGuide);
  }

  if (gestureGuide) {
    gestureGuide.addEventListener('touchstart', dismissGuide, { passive: true });
    gestureGuide.addEventListener('click', dismissGuide);
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
  let lastCardNavTime = 0;
  productCards.forEach(card => {
    const handleCardNav = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const now = Date.now();
      if (now - lastCardNavTime < 350) return; // Dedupe entre touchend y click sintético
      lastCardNavTime = now;
      dismissGuide();
      const targetPage = parseInt(card.getAttribute('data-target-page'), 10);
      goToPage(targetPage);
    };

    // Permitir gestos de paso de página: solo activar navegación si fue un tap limpio (no swipe)
    let cardTouchStartX = 0;
    let cardTouchStartY = 0;
    card.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        cardTouchStartX = e.touches[0].clientX;
        cardTouchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        const deltaX = Math.abs(e.changedTouches[0].clientX - cardTouchStartX);
        const deltaY = Math.abs(e.changedTouches[0].clientY - cardTouchStartY);
        // Si el usuario deslizó el dedo para cambiar de página, no navegar
        if (deltaX > 15 || deltaY > 15) {
          return;
        }
      }
      handleCardNav(e);
    });

    card.addEventListener('click', (e) => {
      // En desktop o mouse click limpio
      handleCardNav(e);
    });

    // Accesibilidad teclado (Enter / Espacio)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleCardNav(e);
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

  // Hotspots interactivos de productos en Página 11 (Los 7 Beneficios)
  const benefitSpots = document.querySelectorAll('.benefit-product-spot');
  benefitSpots.forEach(spot => {
    const handleSpotNav = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      dismissGuide();
      const targetPage = parseInt(spot.getAttribute('data-target-page'), 10);
      goToPage(targetPage);
    };

    ['pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
      spot.addEventListener(evt, (e) => {
        e.stopPropagation();
        spot.classList.add('touch-active');
      }, { passive: true });
    });

    ['pointerup', 'mouseup', 'touchend', 'touchcancel'].forEach(evt => {
      spot.addEventListener(evt, () => {
        setTimeout(() => spot.classList.remove('touch-active'), 400);
      }, { passive: true });
    });

    spot.addEventListener('click', handleSpotNav);

    spot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleSpotNav(e);
      }
    });
  });

  // Thumbnails Slide-Up Drawer
  const btnThumbs = document.getElementById('btnThumbs');
  const btnFooterThumbs = document.getElementById('btnFooterThumbs');
  const btnCloseThumbs = document.getElementById('btnCloseThumbs');
  const thumbsDrawer = document.getElementById('thumbsDrawer');

  // Detener propagación de toques táctiles y clicks para aislar completamente el drawer del libro
  if (thumbsDrawer) {
    ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mousemove', 'mouseup', 'pointerdown', 'pointermove', 'pointerup'].forEach(evt => {
      thumbsDrawer.addEventListener(evt, (e) => {
        e.stopPropagation();
      }, { passive: evt.includes('touch') || evt.includes('pointer') });
    });
  }

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
        ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.15"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg><span class="btn-label">Sonido: ON</span>`
        : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg><span class="btn-label">Sonido: OFF</span>`;
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

        pageFlip.getPageCollection().getPages().forEach((p, idx) => {
          const isCover = (idx === 0 || idx === totalPages - 1);
          const density = (newDims.isMobile || !isCover) ? 'soft' : 'hard';
          p.setDensity(density);
          p.setDrawingDensity(density);
        });

        pageFlip.update();
        updateSpreadCentering(pageFlip.getCurrentPageIndex());
        updateActiveUI(pageFlip.getCurrentPageIndex());
      }
    }, 150);
  });
});
