// The assembled frame of each solid, for the full-figure view.
//
// frame(id, giText) returns the connector positions, the part each one is
// (an index into the solid's parts), and the stakes as pairs of connector
// indices. The faces come either as `faces`, triangles of connector
// indices, or as `hulls`, sets of connector indices whose convex hull is a
// face-bounded solid. Positions are in arbitrary units; the viewer scales them. The
// great icosahedron comes from the point and edge lists in gi_geom.scad,
// passed in as text.

const PHI = (1 + Math.sqrt(5)) / 2;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a) => scale(a, 1 / len(a));
const dist = (a, b) => len(sub(a, b));

// Every sign combination of the non-zero coordinates of p.
function signs(p) {
    let out = [[]];
    for (const c of p) {
        out = out.flatMap((q) => (c === 0 ? [[...q, 0]] : [[...q, c], [...q, -c]]));
    }
    return out;
}

// p and its two cyclic permutations, with every sign combination.
function cyclic(p) {
    const [a, b, c] = p;
    return [[a, b, c], [b, c, a], [c, a, b]].flatMap(signs);
}

const TETRA = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const CUBE = signs([1, 1, 1]);
const OCTA = cyclic([1, 0, 0]);
const ICOSA = cyclic([0, 1, PHI]);
const DODECA = [...signs([1, 1, 1]), ...cyclic([0, 1 / PHI, PHI])];
// The icosahedron whose vertices point through the dodecahedron's faces,
// and the other way round.
const ICOSA_DUAL = cyclic([0, PHI, 1]);
const DODECA_DUAL = [...signs([1, 1, 1]), ...cyclic([0, PHI, 1 / PHI])];

// Pairs of points whose distance is d, within a small tolerance.
function pairsAt(points, d, from = 0) {
    const out = [];
    for (let i = from; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            if (Math.abs(dist(points[i], points[j]) - d) < 1e-6 * Math.max(1, d)) out.push([i, j]);
        }
    }
    return out;
}

function shortest(points) {
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) best = Math.min(best, dist(points[i], points[j]));
    }
    return best;
}

function convex(points) {
    const all = points.map((_, i) => i);
    return { points, kinds: points.map(() => 0), edges: pairsAt(points, shortest(points)), hulls: [all] };
}

// The core vertices closest to direction n: the face of the core that n
// points through, with `size` corners.
function faceOf(core, n, size) {
    return core.map((p, i) => [dot(unit(p), n), i]).sort((a, b) => b[0] - a[0])
        .slice(0, size).map(([, i]) => i);
}

// The point along n at distance reach from the face corner v, outside the
// face for sign +1 and inside it for -1.
function along(n, v, reach, sign) {
    const b = dot(n, v);
    return scale(n, b + sign * Math.sqrt(b * b - dot(v, v) + reach * reach));
}

// A core solid with a point raised over (or sunk under) each face and
// joined to the face's corners, `reach` core edges away. The core keeps its
// own edges. Core corners are part `coreKind`, the face points the other.
function stellate(core, faceDirs, size, reach, sign, coreKind) {
    const edge = shortest(core);
    const points = [...core];
    const kinds = core.map(() => coreKind);
    const edges = pairsAt(core, edge);
    const faces = [];
    for (const dir of faceDirs) {
        const n = unit(dir);
        const face = faceOf(core, n, size);
        const p = along(n, core[face[0]], reach * edge, sign);
        const index = points.push(p) - 1;
        kinds.push(1 - coreKind);
        for (const f of face) edges.push([f, index]);
        // The visible surface is a triangle from the new point to each
        // core edge of the face.
        for (const [a, b] of pairsAt(face.map((f) => core[f]), edge)) {
            faces.push([index, face[a], face[b]]);
        }
    }
    return { points, kinds, edges, faces };
}

function stella(inner) {
    const points = [...CUBE, ...OCTA];
    const kinds = [...CUBE.map(() => 0), ...OCTA.map(() => 1)];
    // A cross sits at a cube face centre, one unit from the face's four
    // corners and from the four neighbouring crosses.
    const edges = pairsAt(points, Math.SQRT2)
        .filter(([i, j]) => inner || i < CUBE.length);
    // The two tetrahedra take alternate cube corners.
    const parity = (p) => p[0] * p[1] * p[2] > 0;
    const hulls = [true, false].map((side) =>
        CUBE.map((p, i) => [p, i]).filter(([p]) => parity(p) === side).map(([, i]) => i));
    return { points, kinds, edges, hulls };
}

function greatIcosahedron(text) {
    const list = (name) => {
        const m = text.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\];`));
        return JSON.parse(`[${m[1].replace(/,\s*$/, "")}]`);
    };
    const points = list("gi_points");
    // An edge is listed as [from, to, stake kind].
    const edges = list("gi_edges").map(([i, j]) => [i, j]);
    const faces = list("gi_faces");
    // The tips are on the unit sphere and the hubs inside them, as listed
    // in gi_kind_r.
    const radii = list("gi_kind_r");
    const kinds = points.map((p) => {
        const r = len(p);
        return radii.reduce((best, kr, k) => (Math.abs(kr - r) < Math.abs(radii[best] - r) ? k : best), 0);
    });
    return { points, kinds, edges, faces };
}

export function frame(id, giText) {
    switch (id) {
        case "tetra": return convex(TETRA);
        case "cube": return convex(CUBE);
        case "octa": return convex(OCTA);
        case "dodeca": return convex(DODECA);
        case "icosa": return convex(ICOSA);
        case "stella": return stella(false);
        case "stella8": return stella(true);
        // Star points over the twelve pentagons of a dodecahedron core,
        // ridges phi times a core edge. The hubs are part 1.
        case "ssd": return stellate(DODECA, ICOSA_DUAL, 5, PHI, 1, 1);
        // Dimples sunk under the twenty triangles of an icosahedron, a
        // valley being a ridge over phi. The hubs are part 0.
        case "gd": return stellate(ICOSA, DODECA_DUAL, 3, 1 / PHI, -1, 0);
        // Star points over the twenty triangles of an icosahedron core.
        case "gsd": return stellate(ICOSA, DODECA_DUAL, 3, PHI, 1, 1);
        case "gi": return greatIcosahedron(giText);
        default: throw new Error(`no frame for ${id}`);
    }
}
