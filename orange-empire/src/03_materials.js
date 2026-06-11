// ============ 03 materials ============
// GLSL twin of terrainH + smoothstep helpers. Keep EXACTLY in sync with 01_util.terrainH.
const GLSL_TERRAIN = `
float terrainH(float x, float z){
  float d = sqrt(x*x + z*z);
  float rise = smoothstep(${CFG.D_RISE0.toFixed(1)}, ${CFG.D_RISE1.toFixed(1)}, d);
  if (rise <= 0.0) return 0.0;
  float h = sin(x*0.013 + 2.0) * cos(z*0.011 - 1.0) * 16.0
          + sin(x*0.043 + z*0.017) * 3.5
          + sin(z*0.051 - x*0.012) * 3.5
          + rise * 9.0;
  h *= rise;
  float roadInf = smoothstep(0.0, 40.0, x) * (1.0 - smoothstep(840.0, 900.0, x)) * (1.0 - smoothstep(12.0, 34.0, abs(z)));
  h *= (1.0 - roadInf);
  return h;
}`;

const MAT = (() => {
  const lib = {};

  // ---------- ground: textured terrain that decays into green wireframe ----------
  function groundMaterial() {
    const u = {
      tGrass: { value: T.grass() },
      tSoil: { value: T.groveSoil() },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uSunCol: { value: new THREE.Color(1.0, 0.85, 0.7) },
      uAmb: { value: new THREE.Color(0.30, 0.30, 0.36) },
      uFogColor: { value: new THREE.Color(0x2a2430) },
      uFogNear: { value: 60 },
      uFogFar: { value: 700 },
      uGridCol: { value: new THREE.Color(0.13, 1.0, 0.45) },
      uTime: { value: 0 },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: `
        varying vec3 vW; varying vec3 vN; varying float vFogZ;
        ${GLSL_TERRAIN}
        void main(){
          vec3 p = position;
          float h = terrainH(p.x, p.z);
          p.y = h;
          float e = 2.0;
          float hx = terrainH(p.x+e, p.z) - terrainH(p.x-e, p.z);
          float hz = terrainH(p.x, p.z+e) - terrainH(p.x, p.z-e);
          vN = normalize(vec3(-hx/(2.0*e), 1.0, -hz/(2.0*e)));
          vW = p;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFogZ = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vW; varying vec3 vN; varying float vFogZ;
        uniform sampler2D tGrass; uniform sampler2D tSoil;
        uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb;
        uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
        uniform vec3 uGridCol; uniform float uTime;
        void main(){
          float d = length(vW.xz);
          if (d > ${CFG.D_GROUND_END.toFixed(1)}) discard;
          // base texture: town grass -> grove soil -> dry scrub
          vec3 grass = texture2D(tGrass, vW.xz * 0.055).rgb;
          vec3 soil  = texture2D(tSoil,  vW.xz * 0.030).rgb;
          float soilMix = smoothstep(92.0, 150.0, d) * (1.0 - smoothstep(700.0, 820.0, d));
          vec3 base = mix(grass, soil, soilMix);
          // lambert
          float nd = max(dot(normalize(vN), normalize(uSunDir)), 0.0);
          vec3 col = base * (uAmb + uSunCol * nd);
          // desaturate ring
          float des = smoothstep(${CFG.D_DESAT0.toFixed(1)}, ${CFG.D_DESAT1.toFixed(1)}, d);
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, vec3(lum), des * 0.92);
          // darken ring
          float drk = smoothstep(${CFG.D_DARK0.toFixed(1)}, ${CFG.D_DARK1.toFixed(1)}, d);
          col = mix(col, vec3(0.004, 0.010, 0.006), drk * 0.96);
          // wire grid emerges
          float gf = smoothstep(${CFG.D_GRID0.toFixed(1)}, ${CFG.D_GRID1.toFixed(1)}, d);
          vec2 gp = vW.xz / 8.0;
          vec2 fw = fwidth(gp);
          vec2 gv = abs(fract(gp - 0.5) - 0.5) / max(fw, vec2(1e-4));
          float line = 1.0 - min(min(gv.x, gv.y), 1.0);
          line *= 1.0 - smoothstep(0.22, 0.62, max(fw.x, fw.y));   // lines dissolve, not fatten, far away
          // coarse major lines every 40m, brighter
          vec2 gp2 = vW.xz / 40.0;
          vec2 fw2 = fwidth(gp2);
          vec2 gl2 = abs(fract(gp2 - 0.5) - 0.5) / max(fw2, vec2(1e-4));
          float line2 = 1.0 - min(min(gl2.x, gl2.y), 1.0);
          line2 *= 1.0 - smoothstep(0.22, 0.62, max(fw2.x, fw2.y));
          float pulse = 0.85 + 0.15 * sin(uTime * 1.7 + d * 0.05);
          vec3 grid = uGridCol * (line * 0.75 + line2 * 1.25) * gf * pulse;
          // fog base color, then add grid partially unfogged so it glows through
          float fog = smoothstep(uFogNear, uFogFar, vFogZ);
          col = mix(col, uFogColor, fog);
          col += grid * mix(1.0, 0.25, fog * 0.85);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    m.extensions = { derivatives: true };
    lib.groundU = u;
    return m;
  }

  // ---------- east road: asphalt that desaturates, darkens, dissolves ----------
  function eastRoadMaterial() {
    const u = {
      tMap: { value: T.asphalt() },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uSunCol: { value: new THREE.Color(1.0, 0.85, 0.7) },
      uAmb: { value: new THREE.Color(0.30, 0.30, 0.36) },
      uFogColor: { value: new THREE.Color(0x2a2430) },
      uFogNear: { value: 60 },
      uFogFar: { value: 700 },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: `
        varying vec3 vW; varying float vFogZ;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vec4 mv = viewMatrix * wp;
          vFogZ = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vW; varying float vFogZ;
        uniform sampler2D tMap;
        uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb;
        uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
        void main(){
          float d = length(vW.xz);
          vec3 col = texture2D(tMap, vW.xz * 0.16).rgb;
          float nd = max(uSunDir.y, 0.0);
          col *= (uAmb + uSunCol * nd);
          // center dashes
          float dash = step(abs(vW.z), 0.14) * step(0.55, fract(vW.x * 0.12));
          col = mix(col, vec3(0.85, 0.78, 0.55), dash * 0.8 * (1.0 - smoothstep(420.0, 560.0, vW.x)));
          float des = smoothstep(${CFG.D_DESAT0.toFixed(1)}, ${CFG.D_DESAT1.toFixed(1)}, d);
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, vec3(lum), des * 0.92);
          float drk = smoothstep(${CFG.D_DARK0.toFixed(1)}, ${CFG.D_DARK1.toFixed(1)}, d);
          col = mix(col, vec3(0.004, 0.010, 0.006), drk * 0.96);
          float fog = smoothstep(uFogNear, uFogFar, vFogZ);
          col = mix(col, uFogColor, fog);
          float alpha = 1.0 - smoothstep(770.0, 850.0, vW.x);
          gl_FragColor = vec4(col, alpha);
        }`,
    });
    lib.eastRoadU = u;
    return m;
  }

  // ---------- sky dome ----------
  function skyMaterial() {
    const u = {
      uTop: { value: new THREE.Color(0x1c2a52) },
      uMid: { value: new THREE.Color(0x7a5a8a) },
      uHor: { value: new THREE.Color(0xe8843c) },
      uSunPos: { value: new THREE.Vector3(0.7, 0.12, 0.2).normalize() },
      uSunGlow: { value: new THREE.Color(0xffc46a) },
      uGlowAmt: { value: 1.0 },
      uEdge: { value: 0 },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor;
        uniform vec3 uSunPos; uniform vec3 uSunGlow; uniform float uGlowAmt; uniform float uEdge;
        void main(){
          float y = clamp(vDir.y, -1.0, 1.0);
          vec3 col;
          if (y >= 0.0) {
            float a = pow(y, 0.62);
            col = mix(uHor, uMid, smoothstep(0.0, 0.34, a));
            col = mix(col, uTop, smoothstep(0.30, 1.0, a));
          } else {
            col = mix(uHor, vec3(0.012, 0.02, 0.015), smoothstep(0.0, 0.22, -y));
          }
          float s = max(dot(normalize(vDir), normalize(uSunPos)), 0.0);
          col += uSunGlow * (pow(s, 38.0) * 0.9 + pow(s, 6.0) * 0.22) * uGlowAmt;
          // at the edge of the world the sky dies to void-green-black
          vec3 voidCol = vec3(0.004, 0.016, 0.008);
          voidCol += vec3(0.02, 0.20, 0.08) * pow(max(0.0, 1.0 - abs(y) * 6.0), 2.0); // faint green horizon line
          col = mix(col, voidCol, uEdge);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    lib.skyU = u;
    return m;
  }

  // ---------- boundary wall: the place where rendering stops ----------
  function wallMaterial() {
    const u = { uTime: { value: 0 }, uGridCol: { value: new THREE.Color(0.13, 1.0, 0.45) }, uPlayerD: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms: u, side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false,
      vertexShader: `
        varying vec3 vW; varying vec2 vUv;
        void main(){
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        varying vec3 vW; varying vec2 vUv;
        uniform float uTime; uniform vec3 uGridCol; uniform float uPlayerD;
        void main(){
          // grid in cylindrical space: u around (scaled to meters), y vertical
          float around = vUv.x * 6283.18; // 2*pi*1000
          vec2 gp = vec2(around, vW.y) / 8.0;
          vec2 fw = fwidth(gp);
          vec2 gv = abs(fract(gp - 0.5) - 0.5) / max(fw, vec2(1e-4));
          float line = 1.0 - min(min(gv.x, gv.y), 1.0);
          line *= 1.0 - smoothstep(0.25, 0.7, max(fw.x, fw.y));
          vec2 gp2 = vec2(around, vW.y) / 40.0;
          vec2 fw2 = fwidth(gp2);
          vec2 gl2 = abs(fract(gp2 - 0.5) - 0.5) / max(fw2, vec2(1e-4));
          float line2 = 1.0 - min(min(gl2.x, gl2.y), 1.0);
          line2 *= 1.0 - smoothstep(0.25, 0.7, max(fw2.x, fw2.y));
          float scan = 0.5 + 0.5 * sin(vW.y * 2.2 - uTime * 2.4);
          float hFade = 1.0 - smoothstep(70.0, 150.0, vW.y);
          float appear = smoothstep(710.0, 945.0, uPlayerD);   // the wall only exists if you go looking
          vec3 col = uGridCol * (line * 0.55 + line2 * 1.1) * (0.8 + 0.25 * scan);
          float alpha = clamp(line * 0.7 + line2 * 0.95, 0.0, 1.0) * hFade;
          alpha = max(alpha, 0.05 * hFade); // faint dark film between lines
          alpha *= appear;
          gl_FragColor = vec4(col, alpha);
        }`,
    });
    m.extensions = { derivatives: true };
    lib.wallU = u;
    return m;
  }

  // ---------- shared basic materials ----------
  function init() {
    const L = (opts) => new THREE.MeshLambertMaterial(opts);
    lib.asphalt = L({ map: T.asphalt() });
    lib.sidewalk = L({ map: T.sidewalk() });
    lib.brick = L({ map: T.brick() });
    lib.stuccoTan = L({ map: T.stucco('stuccoTan', '#c9b896', ['#d4c4a2', '#bcab88', '#cfbf9e']) });
    lib.stuccoCream = L({ map: T.stucco('stuccoCream', '#ddd2b4', ['#e6dcc2', '#d2c6a6', '#e0d5b8']) });
    lib.stuccoSage = L({ map: T.stucco('stuccoSage', '#9aa382', ['#a5ad8e', '#8d9675', '#a9b292']) });
    lib.stuccoRose = L({ map: T.stucco('stuccoRose', '#c49a84', ['#cfa790', '#b88e78', '#d2ab94']) });
    lib.wood = L({ map: T.wood() });
    lib.woodDark = L({ color: 0x5a4936, map: T.wood() });
    lib.roof = L({ map: T.roof() });
    lib.trim = L({ color: 0x6e5a40 });
    lib.trimGreen = L({ color: 0x3c5a44 });
    lib.trunk = L({ color: 0x6b5236 });
    lib.canopy = L({ map: T.canopy() });
    lib.palmTrunk = L({ color: 0x8a7354 });
    lib.palmFrond = L({ color: 0x4d6628 });
    lib.pole = L({ color: 0x5c4a36 });
    lib.iron = L({ color: 0x2e2c28 });
    lib.glassNight = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    lib.glassDay = L({ color: 0x2c3744 });
    lib.skin = L({ color: 0xc9966e });
    lib.skin2 = L({ color: 0x8a5e3c });
    lib.white = L({ color: 0xd8d2c2 });
    lib.black = L({ color: 0x1c1a18 });
    lib.wire = new THREE.LineBasicMaterial({ color: 0x14160f });
    lib.wireGreen = new THREE.MeshBasicMaterial({ color: 0x22ff66, wireframe: true });
    lib.orange = L({ color: 0xe08a1e });
    lib.ground = groundMaterial();
    lib.eastRoad = eastRoadMaterial();
    lib.sky = skyMaterial();
    lib.wall = wallMaterial();
  }
  return { lib, init };
})();
