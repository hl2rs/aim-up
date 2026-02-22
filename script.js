const mouseStats = document.getElementById("mouse-coords");
const actionContainer = document.getElementById("actions-container");
const resultsDiv = document.getElementById("results");
mouseStats.innerHTML = `X: 0 <br> Y: 0`;

let threeArena = null;
let currentTarget3D = null;
let targetLifeTimeoutId = null;

const cubeScene = document.createElement("div");
cubeScene.classList.add("cube-scene");

const arenaCube = document.createElement("div");
arenaCube.classList.add("arena-cube");

const cubeBack = document.createElement("div");
cubeBack.classList.add("cube-face", "cube-back");

const cubeLeft = document.createElement("div");
cubeLeft.classList.add("cube-face", "cube-left");

const cubeRight = document.createElement("div");
cubeRight.classList.add("cube-face", "cube-right");

const cubeTop = document.createElement("div");
cubeTop.classList.add("cube-face", "cube-top");

const cubeFloor = document.createElement("div");
cubeFloor.classList.add("cube-face", "cube-floor");

arenaCube.append(cubeBack, cubeLeft, cubeRight, cubeTop, cubeFloor);
cubeScene.appendChild(arenaCube);
actionContainer.appendChild(cubeScene);

let accurateClicks = 0;
let missedClicks = 0;
let reactionTimes = [];
let currentDot = null;
let dotStartTime = null;
let fastestTime = null;
let averageTime = 0;

let dotLifeTimeoutId = null;
let dotMoveAnimation = null;
let currentDotCellIndex = null;
let currentDotX = 0;
let currentDotY = 0;

let dotSpeed = 2000;
let dotSize = 20;
let dotColor = "#0066ff";
let dotShape = "circle";
let customColorEnabled = false;

let isRunning = false;
let gameStartTime = null;
let timerInterval = null;
let raceMode = "none";
let raceTarget = 0;
let timedRaceDuration = 0;

actionContainer.addEventListener("mousemove", (e) => {
  mouseStats.innerHTML = `X: ${e.clientX} <br> Y: ${e.clientY}`;
});

actionContainer.addEventListener("click", (e) => {
  if (actionContainer.classList.contains("is-webgl")) return;
  if (isRunning && currentDot && !e.target.classList.contains("blue-dot")) {
    missedClicks++;
    updateStats();

    if (isRunning) {
      setTimeout(createRandomDot, 150);
    }
  }
});

const GRID_SIZE_2D =
  parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("--grid-size"),
    10,
  ) || 20;
const GRID_SIZE_3D = 8;

let currentGridSize = GRID_SIZE_2D;
let gridCells = [];

function buildCssGrid(size) {
  currentGridSize = Math.max(2, Math.floor(size));

  actionContainer.style.setProperty("--grid-size", String(currentGridSize));

  const existingDot = currentDot;
  if (existingDot && existingDot.parentNode) {
    existingDot.remove();
  }

  cubeFloor.replaceChildren();

  for (let i = 0; i < currentGridSize * currentGridSize; i++) {
    const row = Math.floor(i / currentGridSize);
    const col = i % currentGridSize;
    const center = (currentGridSize - 1) / 2;
    const distanceToCenter = Math.hypot(row - center, col - center);
    const normalizedDistance = distanceToCenter / Math.max(center, 1);
    const radialInfluence = Math.max(0, 1 - normalizedDistance * 0.78);
    const randomVariance = Math.random() * 0.32;
    const heightUnits = 0.9 + radialInfluence * 1.35 + randomVariance;

    const cell = document.createElement("div");
    cell.classList.add("grid-cell");
    cell.style.setProperty(
      "--cell-height",
      `calc(var(--voxel-depth) * ${heightUnits.toFixed(2)})`,
    );

    const voxel = document.createElement("div");
    voxel.classList.add("grid-voxel");

    const voxelTop = document.createElement("div");
    voxelTop.classList.add("voxel-face", "voxel-top");

    const voxelBottom = document.createElement("div");
    voxelBottom.classList.add("voxel-face", "voxel-bottom");

    const voxelLeft = document.createElement("div");
    voxelLeft.classList.add("voxel-face", "voxel-left");

    const voxelRight = document.createElement("div");
    voxelRight.classList.add("voxel-face", "voxel-right");

    const voxelFront = document.createElement("div");
    voxelFront.classList.add("voxel-face", "voxel-front");

    const voxelBack = document.createElement("div");
    voxelBack.classList.add("voxel-face", "voxel-back");

    voxel.append(
      voxelTop,
      voxelBottom,
      voxelLeft,
      voxelRight,
      voxelFront,
      voxelBack,
    );
    cell.appendChild(voxel);
    cubeFloor.appendChild(cell);
  }

  gridCells = cubeFloor.querySelectorAll(".grid-cell");

  if (existingDot) {
    cubeFloor.appendChild(existingDot);
  }
}

buildCssGrid(GRID_SIZE_2D);

function updateStats() {
  const totalClicks = accurateClicks + missedClicks;
  const accuracy =
    totalClicks > 0 ? Math.round((accurateClicks / totalClicks) * 100) : 0;

  let statsHTML = `
    <h2>Click Stats</h2>
    <p>Accurate Clicks: ${accurateClicks}`;

  if (raceMode !== "none" && raceMode.startsWith("timed-")) {
    statsHTML += ` / Target: Max`;
  } else if (raceMode !== "none") {
    statsHTML += ` / ${raceTarget}`;
  }

  statsHTML += `<br>
    Misses: ${missedClicks}<br>
    Accuracy: ${accuracy}%<br>
    Fastest Reaction: ${fastestTime ? fastestTime + "ms" : "N/A"}<br>
    Average Reaction Time: ${averageTime ? averageTime + "ms" : "N/A"}</p>
  `;

  const ps =
    window.__precisionStats ||
    (window.__precisionStats = {
      distances: [],
      precisions: [],
      lastDistance: null,
      bestDistance: null,
      avgDistance: 0,
      lastPrecision: 0,
      bestPrecision: 0,
      avgPrecision: 0,
    });

  let lastPrecision = 0;
  let bestPrecision = 0;
  let avgPrecision = 0;
  if (ps.precisions && ps.precisions.length > 0) {
    lastPrecision = ps.lastPrecision;
    bestPrecision = ps.bestPrecision;
    avgPrecision = ps.avgPrecision;
  }

  statsHTML += `
    <p>
      Last Precision: ${lastPrecision}%<br>
      Best Precision: ${bestPrecision}%<br>
      Avg Precision: ${avgPrecision}%
    </p>
  `;

  resultsDiv.innerHTML = statsHTML;
}

function ensurePrecisionStats() {
  if (!window.__precisionStats) {
    window.__precisionStats = {
      distances: [],
      precisions: [],
      lastDistance: null,
      bestDistance: null,
      avgDistance: 0,
      lastPrecision: 0,
      bestPrecision: 0,
      avgPrecision: 0,
    };
  }
  return window.__precisionStats;
}

function registerHit({ clientX, clientY, centerX, centerY, radiusPx }) {
  const reactionTime = Date.now() - dotStartTime;
  accurateClicks++;
  reactionTimes.push(reactionTime);

  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  const precisionPct = Math.max(
    0,
    Math.min(100, Math.round(100 * (1 - distancePx / Math.max(radiusPx, 1)))),
  );

  const ps = ensurePrecisionStats();
  ps.distances.push(distancePx);
  ps.precisions.push(precisionPct);
  ps.lastDistance = distancePx;
  ps.lastPrecision = precisionPct;
  ps.bestDistance =
    ps.bestDistance === null
      ? distancePx
      : Math.min(ps.bestDistance, distancePx);
  ps.bestPrecision = Math.max(ps.bestPrecision, precisionPct);
  ps.avgDistance =
    Math.round(
      (ps.distances.reduce((a, b) => a + b, 0) / ps.distances.length) * 10,
    ) / 10;
  ps.avgPrecision = Math.round(
    ps.precisions.reduce((a, b) => a + b, 0) / ps.precisions.length,
  );

  if (fastestTime === null || reactionTime < fastestTime) {
    fastestTime = reactionTime;
  }
  averageTime = Math.round(
    reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length,
  );

  updateStats();

  return (
    raceMode !== "none" &&
    !raceMode.startsWith("timed-") &&
    accurateClicks >= raceTarget
  );
}

function registerMiss() {
  missedClicks++;
  updateStats();
}

function clearDotTimers() {
  if (dotLifeTimeoutId) {
    clearTimeout(dotLifeTimeoutId);
    dotLifeTimeoutId = null;
  }
  if (dotMoveAnimation) {
    dotMoveAnimation.cancel();
    dotMoveAnimation = null;
  }
}

function pickNextCellIndex() {
  if (!gridCells || gridCells.length === 0) return 0;
  if (gridCells.length === 1) return 0;

  let idx = Math.floor(Math.random() * gridCells.length);
  if (currentDotCellIndex !== null && idx === currentDotCellIndex) {
    idx =
      (idx + 1 + Math.floor(Math.random() * (gridCells.length - 1))) %
      gridCells.length;
  }
  return idx;
}

function ensureDotElement() {
  if (currentDot) return currentDot;

  const dot = document.createElement("div");
  dot.classList.add("blue-dot");
  dot.style.transform = "translate3d(0px, 0px, 0)";

  const visual = document.createElement("div");
  visual.classList.add("dot-visual");
  dot.appendChild(visual);

  dot.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!isRunning) return;
    if (!dotStartTime) return;
    if (dot.classList.contains("is-moving")) return;

    const rect = dot.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radiusPx = dotSize / 2;

    const raceCompleted = registerHit({
      clientX: e.clientX,
      clientY: e.clientY,
      centerX,
      centerY,
      radiusPx,
    });

    if (raceCompleted) {
      endGame(true);
      return;
    }

    clearDotTimers();
    dotStartTime = null;
    setTimeout(createRandomDot, 150);
  });

  cubeFloor.appendChild(dot);
  currentDot = dot;
  return dot;
}

function moveDotToCellIndex(index, { animate } = { animate: true }) {
  const dot = ensureDotElement();
  const dotIn3dMode = actionContainer.classList.contains("is-3d");
  updateDotStyle(dot, dotIn3dMode);

  const cell = gridCells[index];
  if (!cell) return;

  const parentRect = cubeFloor.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  const targetCenterX = cellRect.left - parentRect.left + cellRect.width / 2;
  const targetCenterY = cellRect.top - parentRect.top + cellRect.height / 2;

  const endX = targetCenterX - dotSize / 2;
  const endY = targetCenterY - dotSize / 2;

  if (currentDotCellIndex === null || !animate) {
    clearDotTimers();
    dot.classList.remove("is-moving");
    dot.style.transform = `translate3d(${endX}px, ${endY}px, 0)`;
    currentDotX = endX;
    currentDotY = endY;
    currentDotCellIndex = index;
    dotStartTime = Date.now();
    return;
  }

  const dx = endX - currentDotX;
  const dy = endY - currentDotY;
  const dist = Math.hypot(dx, dy);
  const duration = Math.round(Math.max(55, Math.min(120, dist * 0.28)));
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  dot.style.setProperty("--trail-angle", `${angleDeg}deg`);
  dot.style.setProperty(
    "--trail-length",
    `${Math.max(16, Math.min(220, dist))}px`,
  );

  clearDotTimers();
  dot.classList.add("is-moving");
  dot.style.pointerEvents = "none";
  dotStartTime = null;

  dotMoveAnimation = dot.animate(
    [
      { transform: `translate3d(${currentDotX}px, ${currentDotY}px, 0)` },
      { transform: `translate3d(${endX}px, ${endY}px, 0)` },
    ],
    {
      duration,
      easing: "cubic-bezier(0.2, 0.9, 0.2, 1)",
      fill: "forwards",
    },
  );

  dotMoveAnimation.onfinish = () => {
    dotMoveAnimation = null;
    currentDotX = endX;
    currentDotY = endY;
    currentDotCellIndex = index;
    dot.classList.remove("is-moving");
    dot.style.pointerEvents = "auto";
    dotStartTime = Date.now();
  };
}

function createRandomDot() {
  if (!isRunning) return;

  if (actionContainer.classList.contains("is-webgl")) {
    createRandomTarget3D();
    return;
  }

  const idx = pickNextCellIndex();
  ensureDotElement();
  moveDotToCellIndex(idx, { animate: true });

  if (dotLifeTimeoutId) clearTimeout(dotLifeTimeoutId);
  dotLifeTimeoutId = setTimeout(() => {
    if (!isRunning) return;
    if (actionContainer.classList.contains("is-webgl")) return;
    createRandomDot();
  }, dotSpeed);
}

const speedControl = document.getElementById("speed-control");
const sizeControl = document.getElementById("size-control");
const colorControl = document.getElementById("color-control");
const shapeControl = document.getElementById("shape-control");
const toggle3dBtn = document.getElementById("toggle-3d-btn");
const speedValue = document.getElementById("speed-value");
const sizeValue = document.getElementById("size-value");

speedControl.addEventListener("input", (e) => {
  dotSpeed = parseInt(e.target.value);
  speedValue.textContent = dotSpeed;
});

sizeControl.addEventListener("input", (e) => {
  dotSize = parseInt(e.target.value);
  sizeValue.textContent = dotSize;
  if (currentDot) {
    updateDotStyle(currentDot, actionContainer.classList.contains("is-3d"));
  }
  if (currentTarget3D && actionContainer.classList.contains("is-webgl")) {
    updateThreeTargetAppearance(currentTarget3D);
  }
});

colorControl.addEventListener("input", (e) => {
  dotColor = e.target.value;
  customColorEnabled = true;
  if (currentDot) {
    updateDotStyle(currentDot, actionContainer.classList.contains("is-3d"));
  }
  if (currentTarget3D && actionContainer.classList.contains("is-webgl")) {
    updateThreeTargetAppearance(currentTarget3D);
  }
});

shapeControl.addEventListener("change", (e) => {
  dotShape = e.target.value;
  if (currentDot) {
    updateDotStyle(currentDot, actionContainer.classList.contains("is-3d"));
  }
  if (currentTarget3D && actionContainer.classList.contains("is-webgl")) {
    updateThreeTargetAppearance(currentTarget3D);
  }
});

toggle3dBtn.addEventListener("click", () => {
  const is3dEnabled = actionContainer.classList.toggle("is-3d");
  toggle3dBtn.textContent = is3dEnabled ? "Disable 3D" : "Enable 3D";

  if (is3dEnabled) {
    buildCssGrid(GRID_SIZE_3D);
    const ok = initWebGLArena();
    if (!ok) actionContainer.classList.remove("is-webgl");
  } else {
    destroyWebGLArena();
    actionContainer.classList.remove("is-webgl");
    buildCssGrid(GRID_SIZE_2D);
  }

  if (currentDot && !actionContainer.classList.contains("is-webgl")) {
    updateDotStyle(currentDot, is3dEnabled);
  }

  if (isRunning) {
    if (currentDot && currentDot.parentNode) currentDot.remove();
    currentDot = null;
    if (currentTarget3D && threeArena) threeArena.removeTarget(currentTarget3D);
    currentTarget3D = null;
    setTimeout(createRandomDot, 150);
  }
});

function updateDotStyle(
  dot,
  dotIn3dMode = actionContainer.classList.contains("is-3d"),
) {
  const visual = dot.querySelector(".dot-visual") || dot;
  const shouldUseTriangle = dotShape === "triangle" && !dotIn3dMode;

  if (dotIn3dMode && !dot.style.getPropertyValue("--dot-elevation")) {
    const randomHeight = Math.floor(Math.random() * 201) + 60;
    const shadowOffset = Math.round(randomHeight * 0.46);
    const shadowBlur = Math.round(randomHeight * 0.9);
    const depthScale = (0.9 + randomHeight / 360).toFixed(2);
    dot.style.setProperty("--dot-elevation", `${randomHeight}px`);
    dot.style.setProperty("--dot-shadow-offset", `${shadowOffset}px`);
    dot.style.setProperty("--dot-shadow-blur", `${shadowBlur}px`);
    dot.style.setProperty("--dot-depth-scale", depthScale);
  }

  if (dotIn3dMode && !dot.style.getPropertyValue("--dot-tilt-x")) {
    const tiltX = (Math.random() * 16 - 8).toFixed(1);
    const tiltY = (Math.random() * 20 - 10).toFixed(1);
    dot.style.setProperty("--dot-tilt-x", `${tiltX}deg`);
    dot.style.setProperty("--dot-tilt-y", `${tiltY}deg`);
  }

  if (!dotIn3dMode) {
    dot.style.removeProperty("--dot-elevation");
    dot.style.removeProperty("--dot-shadow-offset");
    dot.style.removeProperty("--dot-shadow-blur");
    dot.style.removeProperty("--dot-depth-scale");
    dot.style.removeProperty("--dot-tilt-x");
    dot.style.removeProperty("--dot-tilt-y");
  }

  if (shouldUseTriangle) {
    dot.style.width = `${dotSize}px`;
    dot.style.height = `${dotSize}px`;

    visual.style.width = "0";
    visual.style.height = "0";
    visual.style.borderLeftWidth = `${dotSize / 2}px`;
    visual.style.borderRightWidth = `${dotSize / 2}px`;
    visual.style.borderBottomWidth = `${dotSize}px`;
    visual.style.borderBottomColor = customColorEnabled
      ? dotColor
      : "var(--accent)";
    visual.style.background = "transparent";
  } else {
    dot.style.width = `${dotSize}px`;
    dot.style.height = `${dotSize}px`;
    visual.style.width = "100%";
    visual.style.height = "100%";
    visual.style.borderLeftWidth = "";
    visual.style.borderRightWidth = "";
    visual.style.borderBottomWidth = "";
    visual.style.borderLeftColor = "";
    visual.style.borderRightColor = "";
    visual.style.borderBottomColor = "";

    if (customColorEnabled) {
      const base = hexToRgb(dotColor);
      if (base) {
        const light = mixRGB(base, { r: 255, g: 255, b: 255 }, 0.7);
        const dark = mixRGB(base, { r: 0, g: 0, b: 0 }, 0.3);
        visual.style.background = `radial-gradient(circle at 35% 35%, ${rgbToCss(light)} 0%, ${rgbToCss(base)} 60%, ${rgbToCss(dark)} 100%)`;
      }
    } else {
      visual.style.background = "";
    }
  }

  const rgbColor = customColorEnabled ? hexToRgb(dotColor) : null;
  if (rgbColor && !shouldUseTriangle) {
    if (dotIn3dMode) {
      const elevation =
        parseInt(dot.style.getPropertyValue("--dot-elevation"), 10) || 36;
      const shadowOffset =
        parseInt(dot.style.getPropertyValue("--dot-shadow-offset"), 10) ||
        Math.round(elevation * 0.46);
      const shadowBlur =
        parseInt(dot.style.getPropertyValue("--dot-shadow-blur"), 10) ||
        Math.round(elevation * 0.9);
      visual.style.boxShadow = `
        0 0 10px rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.82),
        0 ${shadowOffset}px ${shadowBlur}px rgba(0, 0, 0, 0.45)
      `;
    } else {
      visual.style.boxShadow = `0 0 10px rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.8)`;
    }
  } else {
    visual.style.boxShadow = "";
  }

  const wasMoving = dot.classList.contains("is-moving");
  dot.className = "blue-dot";
  if (wasMoving) dot.classList.add("is-moving");

  if (dotIn3dMode) {
    dot.classList.add("dot-3d");
  } else if (dotShape !== "circle") {
    dot.classList.add(dotShape);
  }

  dot.style.setProperty(
    "--dot-trail-color",
    customColorEnabled ? dotColor : "#78e2ff",
  );
}

function mixRGB(a, b, p) {
  return {
    r: Math.round(a.r + (b.r - a.r) * p),
    g: Math.round(a.g + (b.g - a.g) * p),
    b: Math.round(a.b + (b.b - a.b) * p),
  };
}
function rgbToCss(c) {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function initWebGLArena() {
  if (actionContainer.classList.contains("is-webgl")) return true;
  if (typeof THREE === "undefined") return false;

  try {
    threeArena = new ThreeArena(actionContainer, { gridSize: currentGridSize });
    actionContainer.classList.add("is-webgl");
    return true;
  } catch (e) {
    console.error("WebGL init failed:", e);
    threeArena = null;
    return false;
  }
}

function destroyWebGLArena() {
  if (targetLifeTimeoutId) {
    clearTimeout(targetLifeTimeoutId);
    targetLifeTimeoutId = null;
  }
  if (currentTarget3D && threeArena) {
    threeArena.removeTarget(currentTarget3D);
    currentTarget3D = null;
  }
  if (threeArena) {
    threeArena.dispose();
    threeArena = null;
  }
}

function createRandomTarget3D() {
  if (!isRunning) return;
  if (!threeArena) return;

  if (targetLifeTimeoutId) {
    clearTimeout(targetLifeTimeoutId);
    targetLifeTimeoutId = null;
  }

  const randomIndex = Math.floor(Math.random() * threeArena.cells.length);
  const cell = threeArena.cells[randomIndex];

  const next = {
    x: cell.x,
    z: cell.z,
    y: threeArena.randomTargetY(),
  };

  const scheduleNextMove = () => {
    if (targetLifeTimeoutId) clearTimeout(targetLifeTimeoutId);
    targetLifeTimeoutId = setTimeout(() => {
      if (!isRunning) return;
      if (!threeArena) return;
      if (!currentTarget3D) return;
      if (currentTarget3D.userData?.moving) {
        scheduleNextMove();
        return;
      }
      createRandomTarget3D();
    }, dotSpeed);
  };

  if (!currentTarget3D) {
    currentTarget3D = threeArena.spawnTarget({
      x: next.x,
      z: next.z,
      y: next.y,
      elevation: 0,
      dotSize,
      dotColor,
      customColorEnabled,
    });
    dotStartTime = Date.now();
    scheduleNextMove();
    return;
  }

  updateThreeTargetAppearance(currentTarget3D);
  dotStartTime = null;
  const dist = currentTarget3D.position.distanceTo(
    new THREE.Vector3(next.x, next.y, next.z),
  );
  const durationMs = Math.round(Math.max(55, Math.min(140, dist * 12)));

  threeArena
    .moveTarget(currentTarget3D, {
      x: next.x,
      y: next.y,
      z: next.z,
      durationMs,
    })
    .then(() => {
      if (!isRunning) return;
      if (!currentTarget3D) return;
      dotStartTime = Date.now();
      scheduleNextMove();
    });
}

function updateThreeTargetAppearance(targetMesh) {
  if (!threeArena || !targetMesh) return;
  threeArena.updateTargetAppearance(targetMesh, {
    dotSize,
    dotColor,
    customColorEnabled,
  });
}

function readCssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function readCssNumberVar(name, fallback) {
  const raw = readCssVar(name, "");
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readArenaThemeFromCss() {
  return {
    wall0: readCssVar("--arena-wall-0", "#000000"),
    wall1: readCssVar("--arena-wall-1", "#48be99"),
    wall2: readCssVar("--arena-wall-2", "#00ffdd"),
    floor: readCssVar("--arena-floor", "#071217"),
    voxel: readCssVar("--arena-voxel", "#1a3238"),
    voxelOpacity: readCssNumberVar("--arena-voxel-opacity", 0.35),
  };
}

class ThreeArena {
  constructor(container, { gridSize }) {
    this.container = container;
    this.gridSize = gridSize;
    this.theme = readArenaThemeFromCss();

    const rect = container.getBoundingClientRect();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(rect.width, rect.height, false);
    this.renderer.domElement.classList.add("three-canvas");
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      rect.width / rect.height,
      0.05,
      200,
    );

    this.roomW = 10;
    this.roomD = 24;
    this.roomH = 10;

    this.cellSize = this.roomW / this.gridSize;

    this._textures = [];

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.targets = new Set();
    this._tweens = new Set();
    this._meshTweens = new Set();
    this._roomMeshes = null;

    this._buildLights();
    this._buildRoom();
    this._buildVoxelFloor();
    this._setCameraPose();

    this.playGridIntro();

    this._onPointerDown = (e) => {
      if (!actionContainer.classList.contains("is-webgl")) return;
      if (!isRunning) return;

      const canvasRect = this.renderer.domElement.getBoundingClientRect();
      const nx = (e.clientX - canvasRect.left) / canvasRect.width;
      const ny = (e.clientY - canvasRect.top) / canvasRect.height;
      this.pointerNdc.set(nx * 2 - 1, -(ny * 2 - 1));

      if (targetLifeTimeoutId) {
        clearTimeout(targetLifeTimeoutId);
        targetLifeTimeoutId = null;
      }

      let hitTarget = null;
      if (currentTarget3D) {
        if (currentTarget3D.userData?.moving) return;
        this.raycaster.setFromCamera(this.pointerNdc, this.camera);
        const hits = this.raycaster.intersectObject(currentTarget3D, false);
        if (hits && hits.length) hitTarget = currentTarget3D;
      }

      if (hitTarget) {
        if (!dotStartTime) return;
        const centerPx = this._projectToScreenPx(
          hitTarget.position,
          canvasRect,
        );
        const raceCompleted = registerHit({
          clientX: e.clientX,
          clientY: e.clientY,
          centerX: centerPx.x,
          centerY: centerPx.y,
          radiusPx: dotSize / 2,
        });

        if (raceCompleted) {
          endGame(true);
          return;
        }

        dotStartTime = null;
        setTimeout(createRandomDot, 100);
        return;
      }

      registerMiss();
      dotStartTime = null;
      setTimeout(createRandomDot, 100);
    };

    this.renderer.domElement.addEventListener(
      "pointerdown",
      this._onPointerDown,
    );

    this._onResize = () => {
      const r = this.container.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      this.camera.aspect = r.width / r.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(r.width, r.height, false);
    };
    window.addEventListener("resize", this._onResize);

    this._running = true;
    this._animate();
  }

  _makeVoxelEdgeGeometry({ cubeEdge, thickness }) {
    const half = cubeEdge / 2;
    const t = Math.max(0.0001, thickness);

    const parts = [];

    const make = (sx, sy, sz, tx, ty, tz) => {
      const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
      g.translate(tx, ty, tz);
      parts.push(g);
    };

    for (const y of [-half, half]) {
      for (const z of [-half, half]) {
        make(cubeEdge, t, t, 0, y, z);
      }
    }

    for (const x of [-half, half]) {
      for (const z of [-half, half]) {
        make(t, cubeEdge, t, x, 0, z);
      }
    }

    for (const x of [-half, half]) {
      for (const y of [-half, half]) {
        make(t, t, cubeEdge, x, y, 0);
      }
    }

    let totalFloats = 0;
    for (const g of parts) {
      totalFloats += g.getAttribute("position").array.length;
    }

    const merged = new Float32Array(totalFloats);
    let offset = 0;
    for (const g of parts) {
      const arr = g.getAttribute("position").array;
      merged.set(arr, offset);
      offset += arr.length;
      g.dispose();
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(merged, 3));
    out.computeBoundingBox();
    out.computeBoundingSphere();
    return out;
  }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const hemi = new THREE.HemisphereLight(
      0xc8f2ff,
      new THREE.Color(this.theme.floor),
      0.45,
    );
    hemi.position.set(0, 12, -6);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 6);
    this.scene.add(dir);

    const fill = new THREE.PointLight(
      new THREE.Color(this.theme.wall1),
      0.55,
      60,
    );
    fill.position.set(0, this.roomH * 0.85, -this.roomD * 0.65);
    this.scene.add(fill);
  }

  _buildRoom() {
    const wall0 = new THREE.Color(this.theme.wall0);
    const wall1 = new THREE.Color(this.theme.wall1);
    const wall2 = new THREE.Color(this.theme.wall2);
    const floorC = new THREE.Color(this.theme.floor);

    const cellSize = this.roomW / this.gridSize;
    this.cellSize = cellSize;
    const gridCountX = this.gridSize;
    const gridCountZ = Math.max(2, Math.round(this.roomD / cellSize));
    const gridCountY = Math.max(2, Math.round(this.roomH / cellSize));

    const backTex = this._makeGradientTexture(180, [
      { t: 0, color: wall0, a: 1 },
      { t: 0.55, color: wall1, a: 1 },
      { t: 1, color: wall2, a: 1 },
    ]);
    const leftTex = this._makeGradientTexture(120, [
      { t: 0, color: wall0, a: 1 },
      { t: 0.55, color: wall1, a: 1 },
      { t: 1, color: wall2, a: 1 },
    ]);
    const rightTex = this._makeGradientTexture(240, [
      { t: 0, color: wall0, a: 1 },
      { t: 0.55, color: wall1, a: 1 },
      { t: 1, color: wall2, a: 1 },
    ]);
    const ceilTex = this._makeGradientTexture(0, [
      { t: 0, color: wall0, a: 0.95 },
      { t: 0.6, color: wall1, a: 0.22 },
      { t: 1, color: wall2, a: 0.14 },
    ]);

    const wallMat = new THREE.MeshStandardMaterial({
      map: leftTex,
      color: 0xffffff,
      emissive: wall0.clone().lerp(wall1, 0.12),
      emissiveIntensity: 0.35,
      metalness: 0.0,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      map: backTex,
      color: 0xffffff,
      emissive: wall2.clone(),
      emissiveIntensity: 0.08,
      metalness: 0.05,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, this.roomD),
      new THREE.MeshStandardMaterial({
        color: floorC,
        metalness: 0.05,
        roughness: 0.95,
        side: THREE.DoubleSide,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -this.roomD / 2);
    this.scene.add(floor);

    const gridFloor = this._makeGridOverlayMesh({
      width: this.roomW,
      height: this.roomD,
      cellsX: gridCountX,
      cellsY: gridCountZ,
      lineColor: wall2,
      opacity: 0.32,
    });
    gridFloor.rotation.x = -Math.PI / 2;
    gridFloor.position.set(0, 0.01, -this.roomD / 2);
    this.scene.add(gridFloor);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, this.roomH),
      accentMat,
    );
    if (back.material) {
      back.material.transparent = true;
      back.material.opacity = 1;
      back.material.depthWrite = true;
    }
    back.position.set(0, this.roomH / 2, -this.roomD);
    this.scene.add(back);

    const left = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomD, this.roomH),
      wallMat,
    );
    left.rotation.y = Math.PI / 2;
    left.position.set(-this.roomW / 2, this.roomH / 2, -this.roomD / 2);
    this.scene.add(left);

    const gridLeft = this._makeGridOverlayMesh({
      width: this.roomD,
      height: this.roomH,
      cellsX: gridCountZ,
      cellsY: gridCountY,
      lineColor: wall2,
      opacity: 0.26,
    });
    gridLeft.rotation.y = Math.PI / 2;
    gridLeft.position.set(
      -this.roomW / 2 + 0.01,
      this.roomH / 2,
      -this.roomD / 2,
    );
    this.scene.add(gridLeft);

    const right = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomD, this.roomH),
      new THREE.MeshStandardMaterial({
        map: rightTex,
        color: 0xffffff,
        emissive: wall0.clone().lerp(wall1, 0.12),
        emissiveIntensity: 0.35,
        metalness: 0.0,
        roughness: 0.88,
        side: THREE.DoubleSide,
      }),
    );
    right.rotation.y = -Math.PI / 2;
    right.position.set(this.roomW / 2, this.roomH / 2, -this.roomD / 2);
    this.scene.add(right);

    const gridRight = this._makeGridOverlayMesh({
      width: this.roomD,
      height: this.roomH,
      cellsX: gridCountZ,
      cellsY: gridCountY,
      lineColor: wall2,
      opacity: 0.26,
    });
    gridRight.rotation.y = -Math.PI / 2;
    gridRight.position.set(
      this.roomW / 2 - 0.01,
      this.roomH / 2,
      -this.roomD / 2,
    );
    this.scene.add(gridRight);

    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, this.roomD),
      new THREE.MeshStandardMaterial({
        map: ceilTex,
        color: 0xffffff,
        emissive: wall0.clone().lerp(wall1, 0.12),
        emissiveIntensity: 0.35,
        metalness: 0.0,
        roughness: 0.92,
        side: THREE.DoubleSide,
      }),
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, this.roomH, -this.roomD / 2);
    this.scene.add(ceil);

    const gridCeil = this._makeGridOverlayMesh({
      width: this.roomW,
      height: this.roomD,
      cellsX: gridCountX,
      cellsY: gridCountZ,
      lineColor: wall2,
      opacity: 0.18,
    });
    gridCeil.rotation.x = Math.PI / 2;
    gridCeil.position.set(0, this.roomH - 0.01, -this.roomD / 2);
    this.scene.add(gridCeil);

    this._roomMeshes = {
      floor,
      gridFloor,
      back,
      left,
      gridLeft,
      right,
      gridRight,
      ceil,
      gridCeil,
    };
  }

  _tweenMeshTransform(
    mesh,
    { fromScale, toScale, fromPos, toPos, fromOpacity, toOpacity, durationMs },
  ) {
    if (!mesh) return Promise.resolve();

    const fs = fromScale ? fromScale.clone() : mesh.scale.clone();
    const ts = toScale ? toScale.clone() : mesh.scale.clone();
    const fp = fromPos ? fromPos.clone() : mesh.position.clone();
    const tp = toPos ? toPos.clone() : mesh.position.clone();

    mesh.scale.copy(fs);
    mesh.position.copy(fp);

    const hasOpacity =
      typeof fromOpacity === "number" || typeof toOpacity === "number";
    const fo =
      typeof fromOpacity === "number"
        ? fromOpacity
        : (mesh.material?.opacity ?? 1);
    const to =
      typeof toOpacity === "number" ? toOpacity : (mesh.material?.opacity ?? 1);
    if (hasOpacity && mesh.material) {
      mesh.material.transparent = true;
      mesh.material.opacity = fo;
      mesh.material.needsUpdate = true;
    }

    return new Promise((resolve) => {
      this._meshTweens.add({
        mesh,
        fs,
        ts,
        fp,
        tp,
        fo,
        to,
        hasOpacity,
        startTime: performance.now(),
        durationMs: Math.max(1, durationMs || 260),
        resolve,
      });
    });
  }

  playGridIntro() {
    if (!this._roomMeshes) return;
    const {
      floor,
      gridFloor,
      back,
      left,
      gridLeft,
      right,
      gridRight,
      ceil,
      gridCeil,
    } = this._roomMeshes;

    const depthCells = Math.max(
      1,
      Math.round(this.roomD / Math.max(0.001, this.cellSize)),
    );
    const oneRowDepth = this.roomD / depthCells;
    const startScale = Math.max(0.05, Math.min(1, oneRowDepth / this.roomD));

    const zStart = -(this.roomD * startScale) / 2;
    const zEnd = -this.roomD / 2;

    const durationMs = 360;
    const promises = [];

    for (const mesh of [floor, gridFloor, ceil, gridCeil]) {
      if (!mesh) continue;
      const fromScale = new THREE.Vector3(1, startScale, 1);
      const toScale = new THREE.Vector3(1, 1, 1);
      const fromPos = mesh.position.clone();
      const toPos = mesh.position.clone();
      fromPos.z = zStart;
      toPos.z = zEnd;
      promises.push(
        this._tweenMeshTransform(mesh, {
          fromScale,
          toScale,
          fromPos,
          toPos,
          durationMs,
        }),
      );
    }

    for (const mesh of [left, gridLeft, right, gridRight]) {
      if (!mesh) continue;
      const fromScale = new THREE.Vector3(startScale, 1, 1);
      const toScale = new THREE.Vector3(1, 1, 1);
      const fromPos = mesh.position.clone();
      const toPos = mesh.position.clone();
      fromPos.z = zStart;
      toPos.z = zEnd;
      promises.push(
        this._tweenMeshTransform(mesh, {
          fromScale,
          toScale,
          fromPos,
          toPos,
          durationMs,
        }),
      );
    }

    if (back) {
      const fromPos = back.position.clone();
      const toPos = back.position.clone();
      fromPos.z = -(this.roomD * startScale);
      toPos.z = -this.roomD;
      promises.push(
        this._tweenMeshTransform(back, {
          fromPos,
          toPos,
          fromOpacity: 0,
          toOpacity: 1,
          durationMs,
        }),
      );
    }

    return Promise.all(promises);
  }

  _makeGridOverlayMesh({ width, height, cellsX, cellsY, lineColor, opacity }) {
    const tex = this._makeGridTexture({
      cellsX,
      cellsY,
      lineColor,
      lineAlpha: 0.55,
      majorEvery: 4,
      majorAlpha: 0.9,
    });

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      opacity: Math.max(0, Math.min(1, opacity ?? 0.25)),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  }

  _makeGridTexture({
    cellsX,
    cellsY,
    lineColor,
    lineAlpha,
    majorEvery,
    majorAlpha,
  }) {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallback = new THREE.DataTexture(
        new Uint8Array([255, 255, 255, 0]),
        1,
        1,
      );
      fallback.needsUpdate = true;
      return fallback;
    }

    const lc =
      lineColor instanceof THREE.Color ? lineColor : new THREE.Color(lineColor);
    const r = Math.round(lc.r * 255);
    const g = Math.round(lc.g * 255);
    const b = Math.round(lc.b * 255);

    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = 1;

    const cx = Math.max(2, Math.floor(cellsX));
    const cy = Math.max(2, Math.floor(cellsY));
    const major = Math.max(0, Math.floor(majorEvery || 0));
    const baseA = typeof lineAlpha === "number" ? lineAlpha : 0.55;
    const majorA = typeof majorAlpha === "number" ? majorAlpha : 0.9;

    const drawLine = (x0, y0, x1, y1, a) => {
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
      ctx.beginPath();
      ctx.moveTo(x0 + 0.5, y0 + 0.5);
      ctx.lineTo(x1 + 0.5, y1 + 0.5);
      ctx.stroke();
    };

    for (let i = 0; i <= cx; i++) {
      const x = (i * size) / cx;
      const isMajor = major > 0 && i % major === 0;
      drawLine(x, 0, x, size, isMajor ? majorA : baseA);
    }

    for (let j = 0; j <= cy; j++) {
      const y = (j * size) / cy;
      const isMajor = major > 0 && j % major === 0;
      drawLine(0, y, size, y, isMajor ? majorA : baseA);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this._textures.push(tex);
    return tex;
  }

  _makeGradientTexture(angleDeg, stops) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallback = new THREE.DataTexture(
        new Uint8Array([255, 255, 255, 255]),
        1,
        1,
      );
      fallback.needsUpdate = true;
      return fallback;
    }

    const rad = (angleDeg * Math.PI) / 180;
    const cx = size / 2;
    const cy = size / 2;
    const half = size / 2;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const x0 = cx - dx * half;
    const y0 = cy - dy * half;
    const x1 = cx + dx * half;
    const y1 = cy + dy * half;

    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) {
      const c =
        s.color instanceof THREE.Color ? s.color : new THREE.Color(s.color);
      const r = Math.round(c.r * 255);
      const gch = Math.round(c.g * 255);
      const b = Math.round(c.b * 255);
      const a = typeof s.a === "number" ? s.a : 1;
      g.addColorStop(s.t, `rgba(${r}, ${gch}, ${b}, ${a})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this._textures.push(tex);
    return tex;
  }

  _buildVoxelFloor() {
    const cellSize = this.roomW / this.gridSize;
    this.cellSize = cellSize;

    const layerCount = Math.max(1, Math.floor(this.roomH / cellSize));
    this.layerCount = layerCount;

    const depthOffset = Math.max(0, (this.roomD - this.roomW) / 2);

    this.cells = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = (col + 0.5) * cellSize - this.roomW / 2;
        const z = -((row + 0.5) * cellSize) - depthOffset;
        this.cells.push({ x, z });
      }
    }
  }

  _setCameraPose() {
    this.camera.position.set(0, 5.7, 7.6);
    this.camera.lookAt(0, 1.4, -7.6);
  }

  randomElevation() {
    return 0.35 + Math.random() * 1.6;
  }

  randomTargetY() {
    const minY = this.cellSize;
    const maxY = Math.max(minY, this.roomH - this.cellSize);
    return minY + Math.random() * (maxY - minY);
  }

  spawnTarget({ x, y, z, elevation, dotSize, dotColor, customColorEnabled }) {
    const radius = this._radiusFromDotSize(dotSize);
    const color = customColorEnabled
      ? new THREE.Color(dotColor)
      : new THREE.Color(0x79e8ff);

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.35),
      roughness: 0.25,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), mat);
    mesh.position.set(x, Math.max(0.05, y + elevation), z);
    this.scene.add(mesh);
    this.targets.add(mesh);
    return mesh;
  }

  updateTargetAppearance(target, { dotSize, dotColor, customColorEnabled }) {
    if (!target) return;
    const radius = this._radiusFromDotSize(dotSize);
    if (target.geometry) {
      target.geometry.dispose();
      target.geometry = new THREE.SphereGeometry(radius, 32, 24);
    }
    const color = customColorEnabled
      ? new THREE.Color(dotColor)
      : new THREE.Color(0x79e8ff);
    if (target.material) {
      target.material.color = color;
      target.material.emissive = color.clone().multiplyScalar(0.35);
      target.material.needsUpdate = true;
    }
  }

  removeTarget(target) {
    if (!target) return;
    this.targets.delete(target);
    this.scene.remove(target);
    target.geometry?.dispose?.();
    target.material?.dispose?.();
  }

  _projectToScreenPx(worldPos, canvasRect) {
    const v = worldPos.clone().project(this.camera);
    return {
      x: canvasRect.left + (v.x * 0.5 + 0.5) * canvasRect.width,
      y: canvasRect.top + (-v.y * 0.5 + 0.5) * canvasRect.height,
    };
  }

  _radiusFromDotSize(sizePx = dotSize) {
    const t = Math.max(10, Math.min(60, sizePx));
    const base = 0.13 * this.cellSize;
    return base * (t / 20);
  }

  moveTarget(target, { x, y, z, durationMs = 90 }) {
    if (!target) return Promise.resolve();

    const start = target.position.clone();
    const end = new THREE.Vector3(x, Math.max(0.05, y), z);
    const dist = start.distanceTo(end);

    target.userData = target.userData || {};
    target.userData.moving = true;

    return new Promise((resolve) => {
      this._tweens.add({
        target,
        start,
        end,
        startTime: performance.now(),
        durationMs: Math.max(1, durationMs),
        dist,
        resolve,
      });
    });
  }

  _updateTweens(nowMs) {
    if (this._tweens && this._tweens.size) {
      for (const tw of Array.from(this._tweens)) {
        const t = (nowMs - tw.startTime) / tw.durationMs;
        const done = t >= 1;
        const tt = Math.max(0, Math.min(1, t));
        const eased = 1 - Math.pow(1 - tt, 3);

        tw.target.position.lerpVectors(tw.start, tw.end, eased);

        const dir = tw.end.clone().sub(tw.start);
        const angleY = Math.atan2(dir.x, dir.z);
        tw.target.rotation.y = angleY;

        const strength = Math.min(
          2.4,
          (tw.dist / Math.max(0.001, this.cellSize)) * 1.1,
        );
        const pulse = 1 - Math.abs(0.5 - tt) * 2;
        const stretch = 1 + strength * pulse;
        tw.target.scale.set(1, 1, stretch);

        if (done) {
          tw.target.position.copy(tw.end);
          tw.target.scale.set(1, 1, 1);
          tw.target.userData.moving = false;
          this._tweens.delete(tw);
          tw.resolve();
        }
      }
    }

    if (this._meshTweens && this._meshTweens.size) {
      for (const tw of Array.from(this._meshTweens)) {
        const t = (nowMs - tw.startTime) / tw.durationMs;
        const done = t >= 1;
        const tt = Math.max(0, Math.min(1, t));
        const eased = 1 - Math.pow(1 - tt, 3);

        tw.mesh.scale.lerpVectors(tw.fs, tw.ts, eased);
        tw.mesh.position.lerpVectors(tw.fp, tw.tp, eased);
        if (tw.hasOpacity && tw.mesh.material) {
          tw.mesh.material.opacity = tw.fo + (tw.to - tw.fo) * eased;
        }

        if (done) {
          tw.mesh.scale.copy(tw.ts);
          tw.mesh.position.copy(tw.tp);
          if (tw.hasOpacity && tw.mesh.material) {
            tw.mesh.material.opacity = tw.to;
            tw.mesh.material.needsUpdate = true;
          }
          this._meshTweens.delete(tw);
          tw.resolve();
        }
      }
    }
  }

  _animate() {
    if (!this._running) return;
    this._updateTweens(performance.now());
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this._animate());
  }

  dispose() {
    this._running = false;
    if (this._tweens) this._tweens.clear();
    if (this._meshTweens) this._meshTweens.clear();
    window.removeEventListener("resize", this._onResize);
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this._onPointerDown,
    );

    for (const t of Array.from(this.targets)) {
      this.removeTarget(t);
    }

    if (this.voxels) {
      this.scene.remove(this.voxels);
      this.voxels.geometry?.dispose?.();
      this.voxels.material?.dispose?.();
    }

    if (this._textures) {
      for (const t of this._textures) t.dispose?.();
      this._textures.length = 0;
    }
    this.renderer.dispose();
    this.renderer.domElement?.remove?.();
  }
}

function updateTimer() {
  if (!isRunning || !gameStartTime) return;

  const elapsed = (Date.now() - gameStartTime) / 1000;
  const timerDisplay = document.getElementById("timer-display");
  if (raceMode.startsWith("timed-")) {
    const remaining = timedRaceDuration - elapsed;
    if (remaining > 0 && remaining <= 5) {
      timerDisplay.classList.add("pulse");
    } else {
      timerDisplay.classList.remove("pulse");
    }
  } else {
    timerDisplay.classList.remove("pulse");
  }

  if (raceMode.startsWith("timed-") && elapsed >= timedRaceDuration) {
    timerDisplay.textContent = `${timedRaceDuration.toFixed(2)}s`;
    endGame(true);
    return;
  }

  timerDisplay.textContent = `${elapsed.toFixed(2)}s`;
}

function startGame() {
  isRunning = true;
  accurateClicks = 0;
  missedClicks = 0;
  reactionTimes = [];
  fastestTime = null;
  averageTime = 0;
  gameStartTime = Date.now();

  const raceModeSelect = document.getElementById("race-mode");
  raceMode = raceModeSelect.value;
  if (raceMode !== "none" && !raceMode.startsWith("timed-")) {
    raceTarget = parseInt(raceMode);
  } else if (raceMode.startsWith("timed-")) {
    timedRaceDuration = parseInt(raceMode.split("-")[1]);
  }

  document.getElementById("start-btn").disabled = true;
  document.getElementById("stop-btn").disabled = false;
  document.getElementById("race-mode").disabled = true;

  timerInterval = setInterval(updateTimer, 10);
  document.getElementById("timer-display").classList.remove("pulse");

  updateStats();
  createRandomDot();
}

function stopGame() {
  endGame(false);
}

function endGame(completed) {
  isRunning = false;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (currentDot && currentDot.parentNode) {
    clearDotTimers();
    currentDot.remove();
    currentDot = null;
    currentDotCellIndex = null;
    currentDotX = 0;
    currentDotY = 0;
    dotStartTime = null;
  }

  if (targetLifeTimeoutId) {
    clearTimeout(targetLifeTimeoutId);
    targetLifeTimeoutId = null;
  }
  if (currentTarget3D && threeArena) {
    threeArena.removeTarget(currentTarget3D);
  }
  currentTarget3D = null;

  document.getElementById("start-btn").disabled = false;
  document.getElementById("stop-btn").disabled = true;
  document.getElementById("race-mode").disabled = false;
  document.getElementById("timer-display").classList.remove("pulse");

  if (completed && raceMode !== "none") {
    showReportCard();
  }
}

function showReportCard() {
  const elapsed = (Date.now() - gameStartTime) / 1000;
  const totalClicks = accurateClicks + missedClicks;
  const accuracy =
    totalClicks > 0 ? Math.round((accurateClicks / totalClicks) * 100) : 0;

  const ps = window.__precisionStats;
  const hasPrecision = !!(ps && ps.precisions && ps.precisions.length);
  const lastPrecisionText = hasPrecision ? `${ps.lastPrecision}%` : "N/A";
  const bestPrecisionText = hasPrecision ? `${ps.bestPrecision}%` : "N/A";
  const avgPrecisionText = hasPrecision ? `${ps.avgPrecision}%` : "N/A";

  let grade = "F";
  if (accuracy >= 95 && averageTime < 500) grade = "S";
  else if (accuracy >= 90 && averageTime < 600) grade = "A+";
  else if (accuracy >= 85) grade = "A";
  else if (accuracy >= 80) grade = "B+";
  else if (accuracy >= 75) grade = "B";
  else if (accuracy >= 70) grade = "C+";
  else if (accuracy >= 60) grade = "C";
  else if (accuracy >= 50) grade = "D";

  const recommendations = [];

  if (accuracy < 80) {
    recommendations.push(
      "Focus on accuracy over speed. Take your time to aim precisely.",
    );
    recommendations.push("Try using a smaller dot size to improve precision.");
  }

  if (averageTime > 800) {
    recommendations.push(
      "Work on reaction speed. Try increasing dot speed gradually.",
    );
    recommendations.push(
      "Practice tracking dots with your eyes before clicking.",
    );
  }

  if (averageTime > 500 && averageTime < 800) {
    recommendations.push(
      "Good reaction time! Push yourself with faster dot speeds.",
    );
  }

  if (accuracy >= 90 && averageTime < 500) {
    recommendations.push(
      "Excellent performance! Try timed challenges for an extra test.",
    );
    recommendations.push(
      "Experiment with different dot shapes to maintain skills.",
    );
  }

  if (missedClicks > accurateClicks) {
    recommendations.push(
      "Too many misses! Wait for the dot to fully appear before clicking.",
    );
    recommendations.push(
      "Consider using a larger dot size until accuracy improves.",
    );
  }

  if (fastestTime && fastestTime < 300) {
    recommendations.push(
      "Amazing fastest reaction! Try to maintain that speed consistently.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Great job! Keep practicing to maintain your skills.");
    recommendations.push("Try different race modes to challenge yourself.");
  }

  let reportHTML = `
    <div class="grade-badge">${grade}</div>
    
    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-label">Time</div>
        <div class="stat-value">${elapsed.toFixed(2)}s</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Accuracy</div>
        <div class="stat-value">${accuracy}%</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Accurate Clicks</div>
        <div class="stat-value">${accurateClicks}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Misses</div>
        <div class="stat-value">${missedClicks}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Fastest Reaction</div>
        <div class="stat-value">${fastestTime ? fastestTime + "ms" : "N/A"}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Average Reaction</div>
        <div class="stat-value">${averageTime ? averageTime + "ms" : "N/A"}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Last Precision</div>
        <div class="stat-value">${lastPrecisionText}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Best Precision</div>
        <div class="stat-value">${bestPrecisionText}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Avg Precision</div>
        <div class="stat-value">${avgPrecisionText}</div>
      </div>
    </div>
    
    <div class="recommendations">
      <h3>📈 Recommended Improvements</h3>
      <ul>
  `;

  recommendations.forEach((rec) => {
    reportHTML += `<li>${rec}</li>`;
  });

  reportHTML += `
      </ul>
    </div>
  `;

  document.getElementById("report-content").innerHTML = reportHTML;
  document.getElementById("report-overlay").classList.remove("hidden");
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("stop-btn").addEventListener("click", stopGame);
document.getElementById("close-report-btn").addEventListener("click", () => {
  document.getElementById("report-overlay").classList.add("hidden");
});

updateStats();
document.getElementById("timer-display").textContent = "0.00s";
