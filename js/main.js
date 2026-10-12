import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { SOLIDS, FILES, SIZES, TESTED, autoWall, parseEcho, sizeDefines } from "./solids.js";
import { frame } from "./frames.js";

const statusEl = document.getElementById("status");
const downloadEl = document.getElementById("download");
const factsEl = document.getElementById("facts");
const tabsEl = document.getElementById("tabs");
const layersEl = document.getElementById("layers");
const form = document.getElementById("controls");

const byId = new Map(SOLIDS.map((s) => [s.id, s]));
const LENGTH = { min: 50, max: 600, step: 5 };
const FIT = { min: 0, max: 0.5, step: 0.05, value: 0.1 };
const WALL = { min: 1.2, max: 3.0, step: 0.1 };
const FIGURE = "figure";

// The current settings. view is FIGURE or the index of a part. wall is
// null while it follows the dowel size. len is the longest stake, or the
// shortest one when by is "shortest". faces shows the solid's faces in
// the assembled view, and hidden lists the parts it leaves out.
const state = {};

function solid() {
    return byId.get(state.solid);
}

function part() {
    return state.view === FIGURE ? null : solid().parts[state.view];
}

function defaultsFor(s) {
    return {
        solid: s.id,
        view: FIGURE,
        dowel: s.defaultSize ?? 4,
        fit: FIT.value,
        wall: null,
        len: s.defaultLength ?? 300,
        by: "longest",
        faces: true,
        hidden: [],
    };
}

function wall() {
    return state.wall ?? autoWall(solid(), state.dowel);
}

// ---------------------------------------------------------------------
// Shareable URLs. Settings that differ from the solid's defaults are
// mirrored into the query string, so a view can be shared by copying the
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
    if (index >= 0) state.view = index;
    if (SIZES.includes(num("dowel"))) state.dowel = num("dowel");
    if (query.has("fit") && Number.isFinite(num("fit"))) state.fit = clamp(num("fit"), FIT);
    if (query.has("wall") && Number.isFinite(num("wall"))) state.wall = clamp(num("wall"), WALL);
    if (query.has("len") && Number.isFinite(num("len"))) state.len = clamp(num("len"), LENGTH);
    if (query.get("by") === "shortest") state.by = "shortest";
    if (query.get("faces") === "0") state.faces = false;
    state.hidden = (query.get("hide") ?? "").split(",").filter(Boolean).map(Number)
        .filter((i) => Number.isInteger(i) && i >= 0 && i < s.parts.length);
}

function updateUrl() {
    const defs = defaultsFor(solid());
    const query = new URLSearchParams({ solid: state.solid });
    if (part()) query.set("part", part().part);
    for (const name of ["dowel", "fit", "wall", "len", "by"]) {
        if (state[name] !== defs[name]) query.set(name, state[name]);
    }
    if (!state.faces) query.set("faces", "0");
    if (state.hidden.length) query.set("hide", state.hidden.join(","));
    history.replaceState(null, "", `?${query}`);
}

// ---------------------------------------------------------------------
// Controls. The form is rebuilt whenever the solid changes, because the
// parts and the stake names differ between solids.

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

// A row of buttons that works like radio buttons.
function segmented(options, selected, onInput) {
    const el = document.createElement("div");
    el.className = "segmented";
    el.setAttribute("role", "radiogroup");
    for (const [value, text] of options) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(value === selected));
        button.addEventListener("click", () => {
            for (const b of el.children) b.setAttribute("aria-checked", String(b === button));
            onInput(value);
        });
        el.append(button);
    }
    return el;
}

function fieldset(title, ...controls) {
    const el = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = title;
    el.append(legend, ...controls);
    return el;
}

const mm = (v) => `${v} mm`;
let lengthRow = null;
let byRow = null;

function buildControls() {
    const s = solid();
    form.replaceChildren();

    const solidSelect = select(SOLIDS.map((x) => [x.id, x.name]), s.id, (id) => {
        Object.assign(state, defaultsFor(byId.get(id)));
        buildControls();
        buildTabs();
        scheduleRender({ refit: true });
    });
    solidSelect.className = "wide";

    const dowelSelect = select(SIZES.map((d) => [String(d), `${d} mm`]), String(state.dowel), (d) => {
        state.dowel = Number(d);
        syncWall();
        scheduleRender();
    });
    const [lenInput, lenOut] = slider(LENGTH, state.len, mm, (v) => {
        state.len = v;
        scheduleRender();
    });
    const by = segmented([["longest", "longest"], ["shortest", "shortest"]], state.by, (v) => {
        state.by = v;
        syncLength();
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

    lengthRow = control(s.lengthLabel, "len", lenInput, lenOut);
    byRow = control("the length sets the", "by", by);
    byRow.hidden = true;
    form.append(
        fieldset("Figure", control("solid", "solid", solidSelect)),
        fieldset("Dowels",
            control("dowel size", "dowel", dowelSelect),
            byRow,
            lengthRow,
            control("bore clearance", "fit", fitInput, fitOut)),
        fieldset("Wall",
            control("follow dowel size", "auto", auto),
            control("wall", "wall", wallInput, wallOut)),
    );
    syncWall();
}

// The longest-or-shortest choice only shows for figures with more than
// one stake length.
function syncLength(multi = !byRow.hidden) {
    byRow.hidden = !multi;
    const label = lengthRow.querySelector("label");
    if (!multi) label.textContent = solid().lengthLabel;
    else label.textContent = state.by === "shortest" ? "shortest stake length" : "longest stake length";
}

function hex(color) {
    return `#${color.toString(16).padStart(6, "0")}`;
}

function dot(color) {
    const el = document.createElement("span");
    el.className = "dot";
    el.style.background = hex(color);
    return el;
}

// Tabs over the viewer: the assembled frame first, then one per printed
// part.
function buildTabs() {
    tabsEl.replaceChildren();
    const views = [[FIGURE, "assembled"], ...solid().parts.map((p, i) => [i, `${p.label} ×${p.count}`])];
    for (const [view, text] of views) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        // A part tab carries a dot in the colour the part has in the
        // viewer and in the assembled frame.
        if (view !== FIGURE) button.prepend(dot(KIND_COLORS[view]));
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", String(view === state.view));
        button.addEventListener("click", () => {
            if (state.view === view) return;
            state.view = view;
            for (const b of tabsEl.children) b.setAttribute("aria-selected", String(b === button));
            layersEl.hidden = view !== FIGURE;
            scheduleRender({ refit: true });
        });
        tabsEl.append(button);
    }
    buildLayers();
}

// Switches under the tabs while the assembled view shows: one per part,
// when there is more than one, and one for the faces. Hiding a part hides
// its connectors and every stake that ends in one.
function buildLayers() {
    layersEl.replaceChildren();
    layersEl.hidden = state.view !== FIGURE;
    const toggle = (content, pressed, onClick) => {
        const button = document.createElement("button");
        button.type = "button";
        button.append(...content);
        button.setAttribute("aria-pressed", String(pressed));
        button.addEventListener("click", () => {
            onClick();
            button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true"));
            scheduleRender();
        });
        layersEl.append(button);
    };
    const parts = solid().parts;
    if (parts.length > 1) {
        parts.forEach((p, i) => {
            toggle([dot(KIND_COLORS[i]), plural(p.label, p.count)], !state.hidden.includes(i), () => {
                state.hidden = state.hidden.includes(i)
                    ? state.hidden.filter((h) => h !== i) : [...state.hidden, i];
            });
        });
    }
    toggle(["faces"], state.faces, () => {
        state.faces = !state.faces;
    });
}

// ---------------------------------------------------------------------
// Facts. The ECHO line of the solid carries the stake lengths and the size
// of the finished frame, which are shown under the controls.

const round = (v) => Math.round(v * 10) / 10;

function plural(word, n) {
    if (n === 1) return word;
    if (word.endsWith("vertex")) return word.replace(/vertex$/, "vertices");
    return word.endsWith("s") ? `${word}es` : `${word}s`;
}

function solidEcho(echoes) {
    return echoes.map(parseEcho).find((e) => e.span ?? e.star_span ?? e.height);
}

function showFacts(echo) {
    factsEl.replaceChildren();
    const s = solid();
    const p = part();
    const add = (text) => {
        const li = document.createElement("li");
        li.textContent = text;
        factsEl.append(li);
    };
    if (p) {
        add(`Print ${p.count} of this part.`);
        if (p.from) add(`It is the same part as the ${byId.get(p.from).name} vertex.`);
    }
    const parts = s.parts.map((x) => `${x.count} ${plural(x.label, x.count)}`);
    const total = s.parts.reduce((n, x) => n + x.count, 0);
    add(`Connectors: ${total}${s.parts.length > 1 ? ` (${parts.join(", ")})` : ""}.`);
    if (echo) {
        const stakes = s.stakes(echo);
        const count = stakes.reduce((n, [c]) => n + c, 0);
        const cuts = stakes.map(([n, len]) => `${n} × ${round(len)} mm`);
        add(`Dowels: ${count}${stakes.length > 1 ? ` (${cuts.join(", ")})` : ` × ${round(stakes[0][1])} mm`}.`);
        const span = echo.span ?? echo.star_span;
        if (span) add(`The frame is ${Math.round(span)} mm across.`);
        if (echo.height) add(`The frame is ${Math.round(echo.height)} mm tall.`);
    }
    if (!TESTED.includes(state.dowel)) {
        add(`${state.dowel} mm parts have not been test-printed yet.`);
    }
}

// ---------------------------------------------------------------------
// Rendering pipeline. One update runs at a time; while it runs, further
// changes only mark the state dirty, and the latest state is rendered as
// soon as the current update finishes.
//
// Each OpenSCAD run gets a fresh worker because the Emscripten runtime
// cannot safely run main() twice on one instance.

let busy = false;
let dirty = false;
let refit = true;
let debounceTimer = null;
let lastStl = null;
let files = null;
const lengthMaps = new Map();

async function loadFiles() {
    const texts = await Promise.all(
        FILES.map((name) => fetch(`scad/${name}`).then((r) => r.text())));
    return Object.fromEntries(FILES.map((name, i) => [name, texts[i]]));
}

function runWorker(message) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
        worker.onmessage = (event) => {
            worker.terminate();
            if (event.data.error) reject(new Error(event.data.error));
            else resolve(event.data);
        };
        worker.onerror = (event) => {
            worker.terminate();
            reject(new Error(event.message));
        };
        worker.postMessage({ files, ...message });
    });
}

async function echoFor(s, defines, length) {
    const { echoes } = await runWorker({
        file: s.file, echoOnly: true,
        defines: { ...defines, [s.length]: length },
    });
    return solidEcho(echoes);
}

// Every stake length is a straight-line function of the longest one, so
// two runs at different lengths give the map from the shortest stake back
// to the longest. The map depends on the bore, so it is cached per solid
// and bore.
async function lengthMap(s, defines) {
    const key = `${s.id} ${defines.bore_d}`;
    if (!lengthMaps.has(key)) {
        const shortest = (e) => Math.min(...s.stakes(e).map(([, len]) => len));
        const [a, b] = [await echoFor(s, defines, 300), await echoFor(s, defines, 400)];
        const multi = new Set(s.stakes(a).map(([, len]) => round(len))).size > 1;
        const slope = (shortest(b) - shortest(a)) / 100;
        lengthMaps.set(key, { multi, fromShortest: (len) => 300 + (len - shortest(a)) / slope });
    }
    return lengthMaps.get(key);
}

function scheduleRender(opts = {}) {
    if (opts.refit) refit = true;
    updateUrl();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 150);
}

async function update() {
    if (busy) {
        dirty = true;
        return;
    }
    busy = true;
    dirty = false;
    const start = performance.now();
    statusEl.textContent = "rendering…";
    try {
        files ??= await loadFiles();
        const s = solid();
        const p = part();
        const defines = sizeDefines(s, state.dowel, state.fit, wall());
        const map = await lengthMap(s, defines);
        syncLength(map.multi);
        const longest = map.multi && state.by === "shortest" ? map.fromShortest(state.len) : state.len;
        const echo = await echoFor(s, defines, Math.round(longest * 100) / 100);
        if (p) {
            const source = p.from ? byId.get(p.from) : s;
            const partDefines = { ...sizeDefines(source, state.dowel, state.fit, wall()), part: `"${p.part}"` };
            if (!p.from) partDefines[s.length] = longest;
            const { stl } = await runWorker({ file: source.file, defines: partDefines });
            lastStl = stl;
            showStl(stl);
        } else {
            lastStl = null;
            showFrame(echo, defines);
        }
        showFacts(echo);
        downloadEl.disabled = !lastStl;
        const seconds = ((performance.now() - start) / 1000).toFixed(1);
        statusEl.textContent = p ? `rendered in ${seconds} s`
            : "Pick a part tab above the viewer to download its STL.";
    } catch (err) {
        statusEl.textContent = `render failed: ${err.message}`;
        console.error(err);
    } finally {
        busy = false;
        if (dirty) update();
    }
}

document.getElementById("share").addEventListener("click", async () => {
    await navigator.clipboard.writeText(location.href);
    statusEl.textContent = "link copied";
});

downloadEl.addEventListener("click", () => {
    if (!lastStl || !part()) {
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

// One colour per part, in tab order, used for the part on its own and for
// its connectors in the assembled frame.
const KIND_COLORS = [0xe8664a, 0x2f4fd0, 0x2a9d8f];
const DOWEL_COLOR = 0xd8b27a;
const FACE_COLOR = 0x2f4fd0;

let viewer = null;

function initViewer() {
    const canvas = document.getElementById("canvas");
    // The canvas is transparent, so the dotted page background shows
    // behind the part.
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
    camera.position.set(160, 90, 160);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7f70, 1.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(1, 2, 1.5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9fb0ff, 0.6);
    rimLight.position.set(-2, -0.5, -1);
    scene.add(rimLight);

    const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });

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

    return {
        scene, camera, controls, loader: new STLLoader(),
        kindMaterials: KIND_COLORS.map(material),
        dowelMaterial: material(DOWEL_COLOR),
        // depthWrite off lets faces behind faces show through.
        faceMaterial: new THREE.MeshStandardMaterial({
            color: FACE_COLOR, transparent: true, opacity: 0.22,
            side: THREE.DoubleSide, depthWrite: false, roughness: 0.9,
        }),
        object: null,
    };
}

// Position the camera so the whole object fits the view, with a small
// margin. Fitting uses the smaller of the vertical and horizontal fields
// of view, so the object fits on narrow (mobile) screens too.
function fitCamera(center, radius, margin) {
    const { camera, controls } = viewer;
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = (margin * radius) / Math.sin(Math.min(vFov, hFov) / 2);
    const direction = new THREE.Vector3(1, 0.7, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, dist);
    camera.near = dist / 100;
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    controls.target.copy(center);
}

// Swap the object in the scene, disposing of the old geometry, and fit
// the camera when a new solid or view comes in. Size changes keep the
// camera where the user put it.
function show(object) {
    if (viewer.object) {
        viewer.scene.remove(viewer.object);
        viewer.object.traverse((o) => o.geometry?.dispose());
    }
    viewer.object = object;
    viewer.scene.add(object);
    if (refit) {
        refit = false;
        const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
        // A part fills its bounding sphere; a frame is mostly air inside
        // its sphere, so it can sit closer.
        fitCamera(sphere.center, sphere.radius, object.isGroup ? 1.0 : 1.3);
    }
}

function showStl(buffer) {
    if (!viewer) {
        return;
    }
    const geometry = viewer.loader.parse(buffer);
    // The STL's z-up axis becomes three.js's y-up.
    geometry.rotateX(-Math.PI / 2);
    show(new THREE.Mesh(geometry, viewer.kindMaterials[state.view]));
}

// The assembled frame: a ball per connector in its part's colour and a
// rod per stake, scaled so the longest stake has its length in mm. Rods
// are drawn a little thicker than the dowels on large frames, so they
// stay visible when the whole frame fits the screen.
function showFrame(echo, defines) {
    if (!viewer) {
        return;
    }
    const s = solid();
    const f = frame(s.id, files["gi_geom.scad"]);
    const v = f.points.map((p) => new THREE.Vector3(...p));
    const longestUnit = Math.max(...f.edges.map(([i, j]) => v[i].distanceTo(v[j])));
    const longestMm = echo ? Math.max(...s.stakes(echo).map(([, len]) => len)) : state.len;
    const k = longestMm / longestUnit;
    v.forEach((p) => p.multiplyScalar(k));
    const span = Math.max(...v.map((p) => p.length())) * 2;
    const rod = Math.max(state.dowel / 2, span / 260);
    const ball = Math.max(defines.bore_d / 2 + defines.wall, rod * 3);

    const group = new THREE.Group();
    const ballGeometry = new THREE.SphereGeometry(ball, 20, 14);
    const shown = (i) => !state.hidden.includes(f.kinds[i]);
    f.points.forEach((_, i) => {
        if (!shown(i)) return;
        const mesh = new THREE.Mesh(ballGeometry, viewer.kindMaterials[f.kinds[i]]);
        mesh.position.copy(v[i]);
        group.add(mesh);
    });
    const up = new THREE.Vector3(0, 1, 0);
    for (const [i, j] of f.edges) {
        if (!shown(i) || !shown(j)) continue;
        const length = v[i].distanceTo(v[j]);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rod, rod, length, 10), viewer.dowelMaterial);
        mesh.position.copy(v[i]).add(v[j]).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(up, v[j].clone().sub(v[i]).normalize());
        group.add(mesh);
    }
    if (state.faces) group.add(faceMesh(f, v));
    show(group);
}

// The solid's faces, from triangles of connector indices or from the
// convex hull of each listed set of connectors.
function faceMesh(f, v) {
    const group = new THREE.Group();
    if (f.faces) {
        const geometry = new THREE.BufferGeometry().setFromPoints(f.faces.flat().map((i) => v[i]));
        geometry.computeVertexNormals();
        group.add(new THREE.Mesh(geometry, viewer.faceMaterial));
    }
    for (const hull of f.hulls ?? []) {
        group.add(new THREE.Mesh(new ConvexGeometry(hull.map((i) => v[i])), viewer.faceMaterial));
    }
    // Draw the faces after the opaque rods and balls, so those show
    // through them.
    group.renderOrder = 1;
    group.traverse((o) => (o.renderOrder = 1));
    return group;
}

// ---------------------------------------------------------------------
// Mobile menu. On narrow screens the panel slides in from the side.

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
buildTabs();
updateUrl();
try {
    viewer = initViewer();
} catch (err) {
    console.error(err);
    statusEl.textContent = "WebGL unavailable: no preview, STL download " +
        "still works.";
}
update();
