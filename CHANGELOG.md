# Changelog

All notable changes to the BK3 Brochure Digital project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-24

### Added
- **Full 16-page editorial magazine structure** supporting 8 spreads with realistic page curl simulation, hardware-accelerated canvas rendering, and progressive WebP loading.
- **3D interactive product showroom**: Hover and touch micro-interactions that elevate bottles with line-specific colored volumetric glows (`#F14825` Moto, `#62C331` Clásico, `#ED1C24` Racing, `#FDB913` Cetanium, `#0E87D2` Marine).
- **Showroom podium for Los 7 Beneficios (Page 14)** featuring isolated single 1L bottle of BK3 Clásico and bidirectional label-to-bottle focus tracking.
- **Visual thumbnails drawer**: Slide-up quick navigation menu accessible from bottom footer with section pill indicators.
- **Automated Playwright audit suite** (`verify_full_brochure.cjs`) verifying 23 visual, interactive, console, and HTTP assertions.

### Changed
- **Los 7 Beneficios matrix (Page 15)**: Balanced descriptions into clean 2-line paragraphs (~135-155 characters), concise single-line headers, and fixed top alignment on Point 02 (`justify-content: flex-start; gap: 10px;`).
- **Presentation capsules**: Replaced verbose "PRESENTACIONES:" labels in BK3 Clásico and BK3 Cetanium with compact monolithic data badges (`500 ML • 1 LITRO • 5 LITROS` and `1 LITRO • 5 LITROS`) to prevent bounding box overflow.
- **Back cover (Page 16)**: Upgraded corporate entity footer to 46px high-contrast typography, WhatsApp CTA button with official BK3 Orange (`#F14825`) perimeter border and pulsing beacon ring, and clean hyperlinked text to `bk3octanebooster.com/somos-nosotros/`.

### Fixed
- Replaced duo-bottle image in 7 Beneficios with authentic single 1L bottle render.
- Eliminated generic transparent box styling from showroom 3D hotspots.
- Corrected bold text contrast on dark card 07 by applying `#f59e0b` gold accent.
- Purged legacy "TODOS LOS DERECHOS RESERVADOS..." disclaimer from back cover.
