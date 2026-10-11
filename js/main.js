import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { SOLIDS, FILES, autoWall, parseEcho } from "./solids.js";

const statusEl = document.getElementById("status");
const downloadEl = document.getElementById("download");
const factsEl = document.getElementById("facts");
const form = document.getElementById("controls");

const byId = new Map(SOLIDS.map((s) => [s.id, s]));
const LENGTH = { min: 100, max: 600, step: 10 };
const FIT = { min: 0, max: 0.5, step: 0.05, value: 0.1 };
const WALL = { min: 1.2, max: 3.0, step: 0.1 };

// The current settings. wall is null while it follows the dowel size.
const state = {};

function solid() {
    return byId.get(state.solid);
}

function part() {
    return solid().parts[state.part];
}

function defaultsFor(s) {
    return {
        solid: s.id,
        part: 0,
        dowel: s.defaultSize ?? s.sizes[0],
        fit: FIT.value,
        wall: null,
        len: s.defaultLength ?? 300,
    };
}

function wall() {
    return state.wall ?? autoWall(solid(), state.dowel);
}

// ---------------------------------------------------------------------
// Shareable URLs. Settings that differ from the solid's defaults are
// mirrored into the query string, so a part can be shared by copying the
// address.

function clamp(num, { min, max }) {
    return Math.min(max, Math.max(min, num));
}

function applyUrlParams() {
    const query = new URLSearchParams(location.search);
    const s = byId.get(query.get("solid")) ?? SOLIDS[0];
    Object.assign(state, defaultsFor(s));
    const num = (name) => Number(query.get(name));
    const index = s.parts.findIndex((p) => p.part === query.get("part"));
    if (index >= 0) state.part = index;
    if (s.sizes.includes(num("dowel"))) state.dowel = num("dowel");
    if (query.has("fit") && Number.isFinite(num("fit"))) state.fit = clamp(num("fit"), FIT);
    if (query.has("wall") && Number.isFinite(num("wall"))) state.wall = clamp(num("wall"), WALL);
    if (query.has("len") && Number.isFinite(num("len"))) state.len = clamp(num("len"), LENGTH);
}

function updateUrl() {
    const defs = defaultsFor(solid());
    const query = new URLSearchParams({ solid: state.solid });
    if (state.part !== 0) query.set("part", part().part);
    for (const name of ["dowel", "fit", "wall", "len"]) {
        if (state[name] !== defs[name]) query.set(name, state[name]);
    }
    history.replaceState(null, "", `?${query}`);
}

// ---------------------------------------------------------------------
// Controls. The form is rebuilt whenever the solid changes, because the
// parts, the dowel sizes and the stake name differ between solids.

function control(label, id, input, output) {
    const div = document.createElement("div");
    div.className = "control";
    const el = document.createElement("label");
    el.textContent = label;
    el.htmlFor = id;
    input.id = id;
    div.append(el);
    if (output) div.append(output);
    div.append(input);
    return div;
}

function select(options, selected, onInput) {
    const el = document.createElement("select");
    options.forEach(([value, text]) => {
        const option = new Option(text, value, false, value === selected);
        el.append(option);
    });
    el.addEventListener("input", () => onInput(el.value));
    return el;
}

function slider(range, value, format, onInput) {
    const input = document.createElement("input");
    input.type = "range";
    input.min = range.min;
    input.max = range.max;
    input.step = range.step;
    input.value = value;
    const output = document.createElement("output");
    output.textContent = format(value);
    input.addEventListener("input", () => {
        output.textContent = format(Number(input.value));
        onInput(Number(input.value));
    });
    return [input, output];
}

function fieldset(title, ...controls) {
    const el = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = title;
    el.append(legend, ...controls);
    return el;
}

const mm = (v) => `${v} mm`;

function buildControls() {
    const s = solid();
    form.replaceChildren();

    const solidSelect = select(SOLIDS.map((x) => [x.id, x.name]), s.id, (id) => {
        Object.assign(state, defaultsFor(byId.get(id)));
        buildControls();
        scheduleRender({ refit: true });
    });
    const partSelect = select(
        s.parts.map((p, i) => [String(i), `${p.label} (print ${p.count})`]),
        String(state.part),
        (i) => {
            state.part = Number(i);
            scheduleRender({ refit: true });
        });
    solidSelect.className = "wide";
    partSelect.className = "wide";

    const dowelSelect = select(s.sizes.map((d) => [String(d), `${d} mm`]), String(state.dowel), (d) => {
        state.dowel = Number(d);
        syncWall();
        scheduleRender();
    });
    const [lenInput, lenOut] = slider(LENGTH, state.len, mm, (v) => {
        state.len = v;
        scheduleRender();
    });
    const [fitInput, fitOut] = slider(FIT, state.fit, (v) => `+${v.toFixed(2)} mm`, (v) => {
        state.fit = v;
        scheduleRender();
    });

    const auto = document.createElement("input");
    auto.type = "checkbox";
    auto.checked = state.wall === null;
    const [wallInput, wallOut] = slider(WALL, wall(), (v) => mm(v.toFixed(1)), (v) => {
        state.wall = v;
        scheduleRender();
    });
    auto.addEventListener("input", () => {
        state.wall = auto.checked ? null : wall();
        syncWall();
        scheduleRender();
    });

    // While the wall follows the dowel size, its slider shows the value in
    // use but cannot be moved.
    function syncWall() {
        wallInput.value = wall();
        wallOut.textContent = mm(wall().toFixed(1));
        wallInput.disabled = state.wall === null;
        wallInput.closest(".control").classList.toggle("disabled", state.wall === null);
    }

    form.append(
        fieldset("Solid",
            control("solid", "solid", solidSelect),
            control("part", "part", partSelect)),
        fieldset("Dowels",
            control("dowel size", "dowel", dowelSelect),
            control(s.lengthLabel, "len", lenInput, lenOut),
            control("bore clearance", "fit", fitInput, fitOut)),
        fieldset("Wall",
            control("follow dowel size", "auto", auto),
            control("wall", "wall", wallInput, wallOut)),
    );
    syncWall();
}

// ---------------------------------------------------------------------
// Facts. The ECHO line of each render carries the stake lengths and the
// size of the finished frame, which are shown under the controls.

function showFacts(echoes) {
    factsEl.replaceChildren();
    const s = solid();
    const p = part();
    const add = (text) => {
        const li = document.createElement("li");
        li.textContent = text;
        factsEl.append(li);
    };
    add(`Print ${p.count} of this part.`);
    if (p.file) {
        add(`This is the same part as the ${byId.get("dodeca").name} vertex.`);
        return;
    }
    const echo = echoes.map(parseEcho).find((e) => e.span ?? e.star_span ?? e.height);
    if (!echo) return;
    const round = (v) => Math.round(v * 10) / 10;
    const cuts = s.stakes(echo).map(([n, len]) => `${n} × ${round(len)} mm`);
    add(`Stakes: ${cuts.join(", ")}.`);
    const span = echo.span ?? echo.star_span;
    if (span) add(`The frame is ${Math.round(span)} mm across.`);
    if (echo.height) add(`The frame is ${Math.round(echo.height)} mm tall.`);
}

// ---------------------------------------------------------------------
// Rendering pipeline. One render runs at a time; while it runs, further
// changes only mark the state dirty, and the latest state is rendered as
// soon as the current render finishes.
//
// Each render gets a fresh worker because the Emscripten runtime cannot
// safely run main() twice on one instance.

let busy = false;
let dirty = false;
let refit = true;
let debounceTimer = null;
let renderId = 0;
let renderStart = 0;
let lastStl = null;
let files = null;

async function loadFiles() {
    const texts = await Promise.all(
        FILES.map((name) => fetch(`scad/${name}`).then((r) => r.text())));
    return Object.fromEntries(FILES.map((name, i) => [name, texts[i]]));
}

function scheduleRender(opts = {}) {
    if (opts.refit) refit = true;
    updateUrl();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(startRender, 150);
}

async function startRender() {
    if (busy) {
        dirty = true;
        return;
    }
    busy = true;
    dirty = false;
    renderId += 1;
    renderStart = performance.now();
    statusEl.textContent = "rendering…";
    files ??= await loadFiles();

    const s = solid();
    const p = part();
    const defines = {
        part: `"${p.part}"`,
        bore_d: Math.round((state.dowel + state.fit) * 100) / 100,
        wall: wall(),
    };
    if (!p.file) defines[s.length] = state.len;

    const worker = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
    });
    worker.onmessage = (event) => {
        worker.terminate();
        const { id, stl, echoes, error } = event.data;
        busy = false;
        if (id === renderId && stl) {
            const seconds =
                ((performance.now() - renderStart) / 1000).toFixed(1);
            lastStl = stl;
            downloadEl.disabled = false;
            showStl(stl);
            showFacts(echoes);
            statusEl.textContent = `rendered in ${seconds} s`;
        } else if (id === renderId && error) {
            statusEl.textContent = `render failed: ${error}`;
            console.error(error);
        }
        if (dirty) {
            startRender();
        }
    };
    worker.onerror = (event) => {
        worker.terminate();
        busy = false;
        statusEl.textContent = `render failed: ${event.message}`;
        console.error(event);
    };
    worker.postMessage({ id: renderId, files, file: p.file ?? s.file, defines });
}

document.getElementById("share").addEventListener("click", async () => {
    await navigator.clipboard.writeText(location.href);
    statusEl.textContent = "link copied";
});

downloadEl.addEventListener("click", () => {
    if (!lastStl) {
        return;
    }
    const blob = new Blob([lastStl], { type: "model/stl" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${part().part}_${state.dowel}mm.stl`;
    link.click();
    URL.revokeObjectURL(link.href);
});

// ---------------------------------------------------------------------
// Viewer. A WebGL failure must not take down the controls: without a
// viewer the part can still be rendered and downloaded as STL.

let viewer = null;

function initViewer() {
    const canvas = document.getElementById("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14151a);

    const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
    camera.position.set(160, 90, 160);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    scene.add(new THREE.HemisphereLight(0xf0ead8, 0x40382c, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(1, 2, 1.5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8ba0c0, 0.7);
    rimLight.position.set(-2, -0.5, -1);
    scene.add(rimLight);

    const material = new THREE.MeshStandardMaterial({
        color: 0xf2e3cf,
        roughness: 0.55,
        metalness: 0.05,
    });

    function resize() {
        const { clientWidth: w, clientHeight: h } = canvas.parentElement;
        renderer.setSize(w, h, false);
        renderer.setPixelRatio(window.devicePixelRatio);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", resize);
    resize();

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });

    return { scene, camera, controls, mesh: null, material, loader: new STLLoader() };
}

// Position the camera so the whole part fits the view, with a small
// margin. Fitting uses the smaller of the vertical and horizontal fields
// of view, so the part fits on narrow (mobile) screens too.
function fitCamera(geometry) {
    const { camera, controls } = viewer;
    geometry.computeBoundingSphere();
    const { center, radius } = geometry.boundingSphere;
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = (1.3 * radius) / Math.sin(Math.min(vFov, hFov) / 2);
    const direction = new THREE.Vector3(1, 0.7, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, dist);
    camera.near = dist / 100;
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    controls.target.copy(center);
}

function showStl(buffer) {
    if (!viewer) {
        return;
    }
    const geometry = viewer.loader.parse(buffer);
    // The STL's z-up axis becomes three.js's y-up.
    geometry.rotateX(-Math.PI / 2);
    if (viewer.mesh) {
        viewer.mesh.geometry.dispose();
        viewer.mesh.geometry = geometry;
    } else {
        viewer.mesh = new THREE.Mesh(geometry, viewer.material);
        viewer.scene.add(viewer.mesh);
    }
    // Fit when a new solid or part comes in. Size changes keep the camera
    // where the user put it.
    if (refit) {
        refit = false;
        fitCamera(geometry);
    }
}

// ---------------------------------------------------------------------
// Mobile menu. On narrow screens the panel slides in from the left.

const panel = document.getElementById("panel");
document.getElementById("menu-toggle").addEventListener("click", () => {
    panel.classList.toggle("open");
});
document.getElementById("canvas").addEventListener("pointerdown", () => {
    panel.classList.remove("open");
});

// ---------------------------------------------------------------------

applyUrlParams();
buildControls();
updateUrl();
try {
    viewer = initViewer();
} catch (err) {
    console.error(err);
    statusEl.textContent = "WebGL unavailable: no preview, STL download " +
        "still works.";
}
startRender();
