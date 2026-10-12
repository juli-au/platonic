// The solids, their printed parts, and the .scad files they need.
//
// Each solid lists its parts with how many to print. A part is rendered
// from the solid's own file unless it names another solid in `from`, as
// the great dodecahedron does for its dimple vertex. `length` is the variable that
// sets the longest stake, and `stakes` turns the ECHO values of a render
// into the stakes to cut, as [count, length in mm] pairs. `core` names the
// solid the frame is built on and the part whose connectors are its
// corners.

export const SOLIDS = [
    {
        id: "tetra", name: "tetrahedron", file: "tetra.scad",
        length: "dowel_len", lengthLabel: "dowel length",
        parts: [{ part: "tetra_vertex", label: "vertex", count: 4 }],
        stakes: (e) => [[6, e.dowel_len]],
    },
    {
        id: "cube", name: "cube", file: "cube.scad",
        length: "dowel_len", lengthLabel: "dowel length",
        parts: [{ part: "cube_vertex", label: "vertex", count: 8 }],
        stakes: (e) => [[12, e.dowel_len]],
    },
    {
        id: "octa", name: "octahedron", file: "octa.scad",
        length: "dowel_len", lengthLabel: "dowel length",
        parts: [{ part: "octa_vertex", label: "vertex", count: 6 }],
        stakes: (e) => [[12, e.dowel_len]],
    },
    {
        id: "dodeca", name: "dodecahedron", file: "dodeca.scad",
        base: 4, radii: { tri_r: 14 }, widths: { fin_t: 2.0 },
        length: "dowel_len", lengthLabel: "dowel length",
        parts: [{ part: "dodeca_vertex", label: "vertex", count: 20 }],
        stakes: (e) => [[30, e.dowel_len]],
    },
    {
        id: "icosa", name: "icosahedron", file: "icosa.scad",
        base: 4, radii: { pent_r: 17 }, widths: { fin_t: 2.0, band: 2.4 },
        length: "dowel_len", lengthLabel: "dowel length",
        parts: [{ part: "icosa_vertex", label: "vertex", count: 12 }],
        stakes: (e) => [[30, e.dowel_len]],
    },
    {
        id: "stella", name: "stella octangula", file: "stella.scad",
        core: { kind: 1, name: "octahedron" },
        length: "dowel_len", lengthLabel: "stake length", defaultLength: 150,
        parts: [
            { part: "stella_tip", label: "star point", count: 8 },
            { part: "stella_cross", label: "cross", count: 6 },
        ],
        stakes: (e) => [[24, e.dowel_len]],
    },
    {
        id: "stella8", name: "stella octangula with inner octahedron", file: "stella.scad",
        core: { kind: 1, name: "octahedron" },
        length: "dowel_len", lengthLabel: "stake length", defaultLength: 150,
        defines: { inner: "true" },
        parts: [
            { part: "stella_tip", label: "star point", count: 8 },
            { part: "stella_cross8", label: "cross", count: 6 },
        ],
        stakes: (e) => [[36, e.dowel_len]],
    },
    {
        id: "ssd", name: "small stellated dodecahedron", file: "ssd.scad",
        core: { kind: 1, name: "dodecahedron" },
        base: 4, radii: { hex_r: 13 }, widths: { fin_t: 2.0 },
        length: "ridge_len", lengthLabel: "ridge stake length",
        defaultLength: 280, minWall: 1.8,
        parts: [
            { part: "ssd_tip", label: "star point", count: 12 },
            { part: "ssd_hub", label: "hub", count: 20 },
        ],
        stakes: (e) => [[60, e.ridge_len], [30, e.core_len]],
    },
    {
        id: "gd", name: "great dodecahedron", file: "gd.scad",
        core: { kind: 0, name: "icosahedron" },
        base: 4, widths: { fin_t: 2.0, band: 2.4 },
        length: "ridge_len", lengthLabel: "ridge stake length",
        parts: [
            { part: "gd_hub", label: "hub", count: 12 },
            { part: "dodeca_vertex", label: "dimple vertex", count: 20, from: "dodeca" },
        ],
        stakes: (e) => [[30, e.ridge_len], [60, e.valley_len]],
    },
    {
        id: "gsd", name: "great stellated dodecahedron", file: "kepler.scad",
        core: { kind: 1, name: "icosahedron" },
        base: 5, radii: { pent_r: 22 }, widths: { fin_t: 2.0 },
        defaultSize: 5, length: "ridge_len", lengthLabel: "ridge stake length",
        parts: [
            { part: "gsd_tip", label: "star point", count: 20 },
            { part: "gsd_hub", label: "hub", count: 12 },
        ],
        stakes: (e) => [[60, e.ridge_len], [30, e.core_len]],
    },
    {
        id: "gi", name: "great icosahedron", file: "gi.scad",
        core: { kind: 1, name: "dodecahedron" },
        base: 4, widths: { fin_t: 2.0, band: 2.4 },
        length: "long_len", lengthLabel: "longest stake length",
        parts: [
            { part: "gi_tip", label: "star point", count: 12 },
            { part: "gi_hub", label: "hub", count: 20 },
            { part: "gi_corner", label: "flute corner", count: 60 },
        ],
        stakes: (e) => e.counts.map((count, i) => [count, e.stake_lengths[i]]),
    },
];

// The dowel sizes on offer, and the ones that have been test-printed.
export const SIZES = [2, 3, 4, 5, 6, 8, 10];
export const TESTED = [4, 5];

// The design variables for a dowel size. The bore is the dowel plus the
// clearance, and sockets get deeper for thick dowels. Base plates and
// gussets were drawn for the solid's `base` dowel size: their radii grow
// and shrink with the bore, and their widths only grow.
export function sizeDefines(solid, dowel, fit, wall) {
    const round = (v) => Math.round(v * 100) / 100;
    const bore = round(dowel + fit);
    const k = (dowel + 1.1) / ((solid.base ?? 4) + 1.1);
    const out = { bore_d: bore, wall, socket: Math.max(14, Math.round(3.5 * dowel)), ...solid.defines };
    for (const [name, v] of Object.entries(solid.radii ?? {})) out[name] = round(v * k);
    for (const [name, v] of Object.entries(solid.widths ?? {})) out[name] = round(v * Math.max(1, k));
    return out;
}

// Every .scad file a render may need. The worker writes all of them into
// OpenSCAD's file system, so `use` and `include` between them resolve.
export const FILES = [
    "tetra.scad", "cube.scad", "octa.scad", "dodeca.scad", "icosa.scad",
    "stella.scad", "ssd.scad", "gd.scad", "kepler.scad", "gi.scad",
    "gi_geom.scad", "vertex.scad", "yarn.scad",
];

// The wall the designs use for each dowel size: 1.6 mm for 4 mm dowels,
// 1.8 mm for 5 mm and 2.0 mm for 6 mm. Some solids ask for a thicker wall.
export function autoWall(solid, dowel) {
    const wall = Math.round((0.2 * dowel + 0.8) * 10) / 10;
    return Math.max(wall, solid.minWall ?? 0);
}

// Parses an ECHO line like `edge = 310.2, counts = [60, 30]` into an
// object of numbers and arrays of numbers.
export function parseEcho(line) {
    const out = {};
    for (const [, name, value] of line.matchAll(/(\w+) = (\[[^\]]*\]|[^,]+)/g)) {
        out[name] = value.startsWith("[")
            ? value.slice(1, -1).split(",").map(Number)
            : Number(value);
    }
    return out;
}
