# vgpu-showcase — GPU-Effekte zum Ansehen

Live-WebGPU-Demos: **jede Kachel ist ein echter WGSL-Shader**, der in Echtzeit auf deiner Grafikkarte läuft.

## Öffnen

```bash
# Einfach index.html im Browser öffnen (Chrome/Edge ≥ 113 mit WebGPU)
# Oder lokal serven:
npx serve .
```

## Sektionen

1. **Fullscreen-Effekte** — 9 interaktive Kacheln (Plasma, Vortex, Moiré, Perlin-Noise, Kaleidoskop, Tunnel, Feuer, Wasser-Ripples, Metaballs)
2. **GPU-Partikel** — 20.000 Partikel in einem Draw-Call, Maus-Interaktiv
3. **3D** — rotierender Mesh mit Lambert-Beleuchtung + Fresnel-Rim, pure WGSL ohne three.js
4. **Was ist VGPU** — Erklärsection

## Warum WebGPU?

Die Shaders laufen **auf deiner GPU**, nicht auf der CPU. Jede Kachel ist ein eigenständiger WGSL-Shader — der Browser kompiliert ihn beim Laden, die GPU rendert bei 60 FPS.

## Browser-Support

- Chrome / Edge ≥ 113: ✓ nativ
- Firefox: `dom.webgpu.enabled = true` in `about:config`
- Headless-Server: vgpu/node mit Dawn-Renderer (Software-Fallback)
