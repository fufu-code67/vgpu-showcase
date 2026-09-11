/* ═══════════════════════════════════════════════════════
   vgpu-showcase — Live WebGPU Demos
   Jede Kachel: eigener WGSL-Shader, gerendert in Echtzeit
   ═══════════════════════════════════════════════════════ */

/* ── WGSL-Bausteine ───────────────────────────────── */
const WGSL_COMMON = `
fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 345.45));
  q += dot(q, q + 34.345);
  return fract(q.x * q.y);
}
fn noise2(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash21(i); let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0)); let d = hash21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
fn fbm(p: vec2f) -> f32 {
  var v = 0.0; var amp = 0.5; var pp = p;
  for (var i = 0; i < 5; i = i + 1) {
    v = v + amp * noise2(pp);
    pp = pp * 2.03; amp = amp * 0.5;
  }
  return v;
}
`;

const WGSL_HEAD = `
struct Params { time: f32, mouse: vec2f, aspect: f32, _pad: f32 };
@group(0) @binding(0) var<uniform> params: Params;

struct VertexOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
`;

/* ── Effekt-Definitionen ──────────────────────────── */
const EFFECTS = {
  plasma: {
    title: "Plasma",
    desc: "Überlagerte Sinuswellen — der klassische Shader-Effekt. Nur Mathematik, keine Textur.",
    body: `
      let p = uv * vec2f(params.aspect, 1.0) * 6.0;
      let t = params.time;
      let v = sin(p.x + t) + sin(p.y + t * 0.7) + sin((p.x + p.y) * 0.8 + t * 1.3) + sin(length(p - vec2f(3.0)) - t);
      let c = 0.5 + 0.5 * sin(v * 1.5);
      return vec4f(0.15 + c * 0.35, 0.25 + v * 0.15 + c * 0.1, 0.55 + c * 0.35, 1.0);
    `
  },
  vortex: {
    title: "Vortex",
    desc: "Rotierende Spiralen aus Polar-Koordinaten — eine galaktische Wirbelstruktur.",
    body: `
      let c = uv - 0.5;
      let r = length(c) * 8.0;
      let a = atan2(c.y, c.x) + r * 0.9 - params.time * 1.2;
      let v = sin(r * 3.0 + sin(a * 3.0) * 2.0) * 0.5 + 0.5;
      return vec4f(0.2 + v * 0.4, 0.4 + v * 0.3, 0.75 + v * 0.25, 1.0);
    `
  },
  moire: {
    title: "Moiré",
    desc: "Zwei überlagerte Ring-Wellen erzeugen Interferenz — Muster aus reiner Überlagerung.",
    body: `
      let p = uv - 0.5;
      let d1 = sin(length(p) * 40.0 - params.time * 2.0);
      let d2 = sin(length(p - vec2f(0.3, 0.0)) * 22.0 + params.time);
      let v = d1 * d2 * 0.5 + 0.5;
      let col = mix(vec3f(0.05, 0.08, 0.15), vec3f(0.35, 0.95, 0.85), v);
      return vec4f(col, 1.0);
    `
  },
  perlin: {
    title: "Perlin-Noise",
    desc: "Organisches fbm-Rauschen — die Basis von Wolken, Terrain und Rauch, hier animiert.",
    body: `
      let n = fbm(uv * 4.0 + vec2f(params.time * 0.15, params.time * 0.1));
      return vec4f(n * 0.6 + 0.15, n * 0.7 + 0.1, 0.35 + n * 0.5, 1.0);
    `
  },
  kaleidoscope: {
    title: "Kaleidoskop",
    desc: "8-fach gespiegelte Segmente — das Bild wird wie durch ein Kaleidoskop gefaltet.",
    body: `
      let p = uv - 0.5;
      let a = atan2(p.y, p.x) + params.time * 0.3;
      let r = length(p);
      let segA = abs(fract(a / 6.2831 * 8.0) * 2.0 - 1.0);
      let ang = segA * 3.14159 / 8.0;
      let q = vec2f(cos(ang), sin(ang)) * r;
      let v = sin(q.x * 18.0 + params.time * 1.5) * sin(q.y * 18.0 - params.time);
      return vec4f(0.35 + v * 0.5, 0.15 + v * 0.35, 0.75 + v * 0.25, 1.0);
    `
  },
  tunnel: {
    title: "Tunnel",
    desc: "Unendlicher Tunnel aus Polar-Koordinaten — digitaler Endlos-Flug.",
    body: `
      let p = uv - 0.5;
      let r = 0.25 / (length(p) + 0.02);
      let a = atan2(p.y, p.x);
      let v = sin(r * 3.0 + params.time * 2.5 + a * 5.0) * 0.5 + 0.5;
      let fade = exp(-length(p) * 2.0);
      return vec4f(v * fade, abs(v) * fade * 0.8, (0.7 - v * 0.3) * fade, 1.0);
    `
  },
  fire: {
    title: "Feuer",
    desc: "Domain-warped fbm-Noise steigt von unten auf — Flammen, die nur aus Mathe entstehen.",
    body: `
      let t = params.time * 0.7;
      let p = vec2f(uv.x, uv.y - t * 0.5);
      let n = fbm(p * vec2f(3.0, 2.0) + vec2f(0.0, -t));
      let v = clamp((1.0 - uv.y) * 1.4 + n * 0.8 - 0.3, 0.0, 1.0);
      return vec4f(v * 1.8, v * v * 1.1, v * v * v * 0.35, 1.0);
    `
  },
  ripple: {
    title: "Wasser-Ripples",
    desc: "Interaktiv! Konzentrische Wellen um deine Maus — bewege sie über die Kachel.",
    body: `
      let d = length(uv - params.mouse);
      let wave = sin(d * 30.0 - params.time * 4.0) * exp(-d * 4.0);
      let col = vec3f(0.1 + wave * 0.5, 0.25 + wave * 0.5, 0.45 + wave * 0.8);
      return vec4f(col, 1.0);
    `
  },
  metaballs: {
    title: "Metaballs",
    desc: "Vier Kugeln verschmelzen zu organischer Masse — drei tanzen durch die Zeit, einer folgt deiner Maus.",
    body: `
      let t = params.time;
      var acc = 0.0;
      let m = vec2f(params.mouse.x * params.aspect, params.mouse.y);
      let p0 = vec2f(0.5 * params.aspect + sin(t * 0.8) * 0.2, 0.5 + cos(t * 0.6) * 0.15);
      let p1 = vec2f(0.45 * params.aspect + sin(t * 1.1 + 2.0) * 0.18, 0.45 + sin(t * 0.9) * 0.18);
      let p2 = vec2f(0.55 * params.aspect + sin(t * 0.5 + 4.0) * 0.22, 0.55 + cos(t * 0.9 + 1.0) * 0.12);
      let d0 = length(uv * vec2f(params.aspect, 1.0) - p0);
      let d1 = length(uv * vec2f(params.aspect, 1.0) - p1);
      let d2 = length(uv * vec2f(params.aspect, 1.0) - p2);
      let dm = length(uv * vec2f(params.aspect, 1.0) - m);
      acc = 0.012 / (d0 * d0 + 0.003) + 0.012 / (d1 * d1 + 0.003) + 0.012 / (d2 * d2 + 0.003) + 0.02 / (dm * dm + 0.003);
      let v = clamp(acc, 0.0, 1.0);
      return vec4f(0.08 + v * 0.2, 0.15 + v * 0.4, 0.45 + v * 0.6, 1.0);
    `
  },
};

/* ── Partikel-Shader ──────────────────────────────── */
const PARTICLE_WGSL = `
struct Params { time: f32, mouse: vec2f, aspect: f32, _pad: f32 };
@group(0) @binding(0) var<uniform> params: Params;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  var corners = array<vec2f,6>(
    vec2f(-1.0,-1.0), vec2f(1.0,-1.0), vec2f(-1.0,1.0),
    vec2f(-1.0,1.0), vec2f(1.0,-1.0), vec2f(1.0,1.0)
  );
  let corner = corners[vi];

  let seed = f32(ii) * 0.0001;
  let t = params.time * 0.4 + fract(seed * 13.7) * 100.0;

  // Orbit-Feld
  let angle = t * (0.3 + fract(seed * 7.13) * 0.7) + seed * 6.2831;
  let radius = 0.12 + fract(seed * 5.31) * 0.55;
  let base = vec2f(cos(angle) * radius * params.aspect, sin(angle) * radius);

  // Maus-Anziehung
  let mouse = vec2f(params.mouse.x * params.aspect, params.mouse.y);
  let toMouse = mouse - base;
  let dist = length(toMouse);
  let pull = exp(-dist * 4.0) * 0.35;
  let pos = base + (toMouse / max(dist, 0.001)) * pull;

  var out: VOut;
  out.pos = vec4f(pos + corner * vec2f(0.005, 0.009), 0.0, 1.0);

  let hue = fract(seed * 3.0 + params.time * 0.04);
  out.color = 0.5 + 0.5 * cos(vec3f(6.2831) * (hue + vec3f(0.0, 0.33, 0.67)));
  return out;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color * 0.9, 0.9);
}
`;

/* ── 3D-Würfel ────────────────────────────────────── */
const CUBE_WGSL = `
struct Params { time: f32, aspect: f32, _p: vec2f };
struct Camera { viewProj: mat4x4f };
struct Model { model: mat4x4f };
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> model: Model;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
  @location(1) wpos: vec3f,
};

const CUBE_VERTS = array<vec3f,36>(
  // vorn
  vec3f(-1,-1, 1), vec3f( 1,-1, 1), vec3f( 1, 1, 1),  vec3f(-1,-1, 1), vec3f( 1, 1, 1), vec3f(-1, 1, 1),
  // hinten
  vec3f(-1,-1,-1), vec3f(-1, 1,-1), vec3f( 1, 1,-1),  vec3f(-1,-1,-1), vec3f( 1, 1,-1), vec3f( 1,-1,-1),
  // oben
  vec3f(-1, 1,-1), vec3f(-1, 1, 1), vec3f( 1, 1, 1),  vec3f(-1, 1,-1), vec3f( 1, 1, 1), vec3f( 1, 1,-1),
  // unten
  vec3f(-1,-1,-1), vec3f( 1,-1,-1), vec3f( 1,-1, 1),  vec3f(-1,-1,-1), vec3f( 1,-1, 1), vec3f(-1,-1, 1),
  // rechts
  vec3f( 1,-1,-1), vec3f( 1, 1,-1), vec3f( 1, 1, 1),  vec3f( 1,-1,-1), vec3f( 1, 1, 1), vec3f( 1,-1, 1),
  // links
  vec3f(-1,-1,-1), vec3f(-1,-1, 1), vec3f(-1, 1, 1),  vec3f(-1,-1,-1), vec3f(-1, 1, 1), vec3f(-1, 1,-1)
);
const CUBE_NORMALS = array<vec3f,6>(
  vec3f(0,0,1), vec3f(0,0,-1), vec3f(0,1,0),
  vec3f(0,-1,0), vec3f(1,0,0), vec3f(-1,0,0)
);

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VOut {
  let face = vi / 6u;
  var out: VOut;
  let wp = model.model * vec4f(CUBE_VERTS[vi], 1.0);
  out.pos = camera.viewProj * wp;
  out.normal = CUBE_NORMALS[face];
  out.wpos = wp.xyz;
  return out;
}

@fragment
fn fs_main(@location(0) normal: vec3f, @location(1) wpos: vec3f) -> @location(0) vec4f {
  let n = normalize(normal);
  let l = normalize(vec3f(0.8, 1.0, 0.6));
  let diffuse = max(dot(n, l), 0.0);
  let viewDir = normalize(vec3f(0.0, 0.0, 4.0) - wpos);
  let fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  let base = vec3f(0.12, 0.4, 0.85);
  let col = base * (0.15 + diffuse * 0.85) + vec3f(0.37, 0.92, 0.83) * fres * 0.7;
  return vec4f(col, 1.0);
}
`;

/* ── Matrix-Mathe (minimal) ───────────────────────── */
function mat4Mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, far * nf, -1,
    0, 0, far * near * nf, 0,
  ]);
}
function rotY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}
function rotX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}
function translate(x, y, z) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

/* ── Boot ─────────────────────────────────────────── */
(async function boot() {
  const FALLBACK = `
    <div class="fallback">
      <div><b>WebGPU nicht verfügbar.</b><br>
      Chrome/Edge ≥ 113 öffnen, oder in <a href="chrome://flags/#enable-unsafe-webgpu">chrome://flags</a>
      WebGPU aktivieren.<br><span style="opacity:.6">Die Effekte oben laufen sonst nicht — der Rest der Seite funktioniert.</span></div>
    </div>`;

  if (!navigator.gpu) {
    document.querySelectorAll("canvas").forEach((c) => {
      const d = document.createElement("div");
      d.innerHTML = FALLBACK;
      c.replaceWith(d.firstElementChild);
      c.parentElement.classList.add("gpu-off");
    });
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return;
  const device = await adapter.requestDevice();
  const format = navigator.gpu.getPreferredCanvasFormat();

  /* — Effekt-Kacheln — */
  const liveTiles = [];
  const effectsGrid = document.getElementById("effects-grid");

  for (const [id, def] of Object.entries(EFFECTS)) {
    const div = document.createElement("div");
    div.className = "tile";
    div.innerHTML = `
      <canvas width="640" height="360"></canvas>
      <div class="meta"><h3>${def.title}</h3><p>${def.desc}</p><span class="wgsl">WGSL · live</span></div>`;
    effectsGrid.appendChild(div);

    const tile = setupFullscreenTile(div.querySelector("canvas"), def.body, device, format);
    if (tile) liveTiles.push(tile);
  }

  /* — Hero-Hintergrund — */
  const heroCanvas = document.getElementById("hero-canvas");
  function sizeHero() {
    heroCanvas.width = heroCanvas.clientWidth * devicePixelRatio;
    heroCanvas.height = heroCanvas.clientHeight * devicePixelRatio;
  }
  sizeHero();
  const hero = setupFullscreenTile(heroCanvas, EFFECTS.plasma.body, device, format, 0.5);
  if (hero) liveTiles.push(hero);

  /* — Partikel — */
  const pc = document.getElementById("particles-canvas");
  pc.width = 1280; pc.height = 420;
  const particles = setupParticles(pc, device, format);
  if (particles) liveTiles.push(particles);
  pc.addEventListener("pointermove", (e) => {
    const r = pc.getBoundingClientRect();
    particles.mouse = { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
  });

  /* — Würfel — */
  const cc = document.getElementById("cube-canvas");
  cc.width = 1280; cc.height = 420;
  const cube = setupCube(cc, device, format);
  if (cube) liveTiles.push(cube);

  /* — Frame-Loop — */
  const t0 = performance.now();
  requestAnimationFrame(function frame(now) {
    const t = (now - t0) / 1000;
    for (const tile of liveTiles) tile.render(t);
    requestAnimationFrame(frame);
  });

  /* ═══ Tile-Typen ══════════════════════════════════ */

  function setupFullscreenTile(canvas, body, device, format, timeScale = 1.0) {
    const ctx = canvas.getContext("webgpu");
    if (!ctx) return null;
    ctx.configure({ device, format, alphaMode: "opaque" });

    const module = device.createShaderModule({ code: WGSL_HEAD + WGSL_COMMON + `
      @vertex fn vs(@builtin(vertex_index) vi: u32) -> VertexOut {
        var p = array<vec2f,3>(vec2f(-1.0,-1.0), vec2f(3.0,-1.0), vec2f(-1.0,3.0));
        var out: VertexOut;
        out.pos = vec4f(p[vi], 0.0, 1.0);
        out.uv = vec2f((p[vi].x + 1.0) * 0.5, 1.0 - (p[vi].y + 1.0) * 0.5);
        return out;
      }
      @fragment fn fs(@location(0) uv: vec2f) -> @location(0) vec4f { ${body} }
    `});

    // Kompilierfehler sichtbar machen (statt still schwarzer Kachel)
    device.pushErrorScope("validation");
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    device.popErrorScope().then((err) => {
      if (err) {
        const d = document.createElement("div");
        d.style.cssText = "color:#f66;font:11px monospace;padding:6px;white-space:pre-wrap";
        d.textContent = "Shader-Fehler in dieser Kachel: " + err.message.slice(0, 300);
        canvas.parentElement.prepend(d);
      }
    });
    const ubo = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: ubo } }],
    });

    let mouse = { x: 0.5, y: 0.5 };
    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse = { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
    });

    return {
      mouse,
      render(time) {
        if (canvas.width === 0) return;
        device.queue.writeBuffer(ubo, 0, new Float32Array([time * timeScale, mouse.x, mouse.y, canvas.width / canvas.height]));
        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
          colorAttachments: [{
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1 },
            loadOp: "clear", storeOp: "store",
          }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.draw(3);
        pass.end();
        device.queue.submit([enc.finish()]);
      }
    };
  }

  function setupParticles(canvas, device, format) {
    const ctx = canvas.getContext("webgpu");
    if (!ctx) return null;
    ctx.configure({ device, format, alphaMode: "opaque" });

    const module = device.createShaderModule({ code: PARTICLE_WGSL });
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs_main" },
      fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    const ubo = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: ubo } }],
    });

    let mouse = { x: 0.5, y: 0.5 };

    return {
      mouse,
      render(time) {
        device.queue.writeBuffer(ubo, 0, new Float32Array([time, mouse.x, mouse.y, canvas.width / canvas.height]));
        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
          colorAttachments: [{
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0.01, g: 0.015, b: 0.03, a: 1 },
            loadOp: "clear", storeOp: "store",
          }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.draw(6, 20000);
        pass.end();
        device.queue.submit([enc.finish()]);
      }
    };
  }

  function setupCube(canvas, device, format) {
    const ctx = canvas.getContext("webgpu");
    if (!ctx) return null;
    ctx.configure({ device, format, alphaMode: "opaque" });

    const module = device.createShaderModule({ code: CUBE_WGSL });
    // GPUShaderStage-Konstanten fehlen in manchen Chrome-Versionen → numerische Fallbacks
    const STAGE_V = (typeof GPUShaderStage !== "undefined" && GPUShaderStage.VERTEX !== undefined) ? GPUShaderStage.VERTEX : 0x1;
    const STAGE_F = (typeof GPUShaderStage !== "undefined" && GPUShaderStage.FRAGMENT !== undefined) ? GPUShaderStage.FRAGMENT : 0x2;
    const uboLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: STAGE_V | STAGE_F, buffer: {} },
        { binding: 1, visibility: STAGE_V, buffer: {} },
        { binding: 2, visibility: STAGE_V, buffer: {} },
      ],
    });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [uboLayout] }),
      vertex: { module, entryPoint: "vs_main" },
      fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
    });

    const bufParams = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bufCamera = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bufModel = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bind = device.createBindGroup({
      layout: uboLayout,
      entries: [
        { binding: 0, resource: { buffer: bufParams } },
        { binding: 1, resource: { buffer: bufCamera } },
        { binding: 2, resource: { buffer: bufModel } },
      ],
    });

    const depthTex = device.createTexture({
      size: [canvas.width, canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    return {
      render(time) {
        const aspect = canvas.width / canvas.height;
        const proj = perspective(Math.PI / 4, aspect, 0.1, 100);
        const view = mat4Mul(translate(0, 0, -5), mat4Mul(rotX(0.4), rotY(time * 0.3)));
        const viewProj = mat4Mul(proj, view);
        const model = mat4Mul(rotY(time * 0.6), rotX(time * 0.35));

        device.queue.writeBuffer(bufParams, 0, new Float32Array([time, aspect, 0, 0]));
        device.queue.writeBuffer(bufCamera, 0, viewProj);
        device.queue.writeBuffer(bufModel, 0, model);

        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
          colorAttachments: [{
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1 },
            loadOp: "clear", storeOp: "store",
          }],
          depthStencilAttachment: {
            view: depthTex.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear", depthStoreOp: "store",
          },
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.draw(36);
        pass.end();
        device.queue.submit([enc.finish()]);
      }
    };
  }
})();