// GI: connectors for a great icosahedron frame, and a model of the whole.
//
// The great icosahedron is twenty large triangles passing through each other.
// What the eye sees is twelve fluted points: 180 small triangles meeting at
// 92 corners along 270 creases. The frame builds that visible surface. Every
// crease is its own stake, and no stake passes through a connector. There are
// three printed parts and four stake lengths:
//
//   gi_tip     x12  joins ten stakes at a point
//   gi_hub     x20  joins twelve stakes where three points meet
//   gi_corner  x60  joins three stakes at the bottom of a flute
//
// The geometry comes from gi_geom.scad, which platonic/gi.py writes. The echo
// below the constants prints every stake length, cut to fit, for any length
// of the longest stake.
//
// Render one part at a time:
//   openscad -o gi_tip.stl -D 'part="gi_tip"' gi.scad
//   openscad -o gi_hub.stl -D 'part="gi_hub"' gi.scad
//   openscad -o gi_corner.stl -D 'part="gi_corner"' gi.scad
//   openscad -o gi_model.stl -D 'part="gi_model"' gi.scad
//   openscad -o gi_frame.stl -D 'part="gi_frame"' gi.scad
//
// For 5 mm stakes add -D bore_d=5.1 -D wall=1.8.

include <gi_geom.scad>
use <yarn.scad>

part = "gi_hub"; // [gi_tip, gi_hub, gi_corner, gi_model, gi_frame]

// --- stake and fit --------------------------------------------------------

bore_d    = 4.1;   // socket bore for a 4 mm stake, mm
wall      = 1.6;   // wall around a bore, mm
web       = 1.0;   // material between two neighbouring bores, mm
socket    = 14;    // how far a stake end sits in a connector, mm
long_len  = 300;   // length of the longest stake, tip to corner, mm

// --- hub ------------------------------------------------------------------

fin_t  = 2.0;   // thickness of a gusset under a shallow arm, mm
foot_t = 1.2;   // thickness of the ring joining the feet, mm
band   = 2.4;   // width of that ring, mm
yarn_d = 3.0;   // yarn hole through each gusset, mm

// --- resolution -----------------------------------------------------------

$fn = 48;

// -------------------------------------------------------------------------

outer = bore_d + 2 * wall;

function vec(row) = row[0];
function angle(a, b) = acos(max(-1, min(1, a * b)));

// The closest pair of stakes at a corner sets how far out their bores clear
// each other, and every stake end at that corner stops there.
function min_angle(rows) =
    min([for (i = [0 : len(rows) - 2], j = [i + 1 : len(rows) - 1])
           angle(vec(rows[i]), vec(rows[j]))]);
function gap_for(rows) = (bore_d + web) / (2 * sin(min_angle(rows) / 2));

tip_gap    = gap_for(gi_tip_dirs);
hub_gap    = gap_for(gi_hub_dirs);
corner_gap = gap_for(gi_corner_dirs);
gaps       = [tip_gap, hub_gap, corner_gap];

// The longest stake runs from a tip to a corner. Its centre to centre length
// sets the scale, and every other stake is cut short of the centres it joins
// by the gaps at its two ends.
long_edge = long_len + tip_gap + corner_gap;
tip_r     = long_edge / gi_longest;   // centre to tip, mm
cut_lens  = [for (k = [0 : len(gi_len) - 1])
               gi_len[k] * long_edge - gaps[gi_len_ends[k][0]] - gaps[gi_len_ends[k][1]]];
echo(stake_lengths = cut_lens, counts = [60, 60, 30, 120], span = 2 * tip_r + outer);

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// A connector printed with its arms on the bed. dirs are unit vectors in the
// print frame. Every arm at least `steep` below the horizontal runs down to
// one cut on the bed with its bore opening into it, as on the star tips. The
// deepest of those arms ends at full socket depth and the others run on to the
// same cut. Shallower arms keep a square end and get a gusset down to the bed,
// and a disc joins the feet when there are any.
module connector(dirs, gap, steep) {
    reach   = gap + socket;
    over    = outer;
    deep    = [for (d = dirs) if (-d[2] >= steep) d];
    shallow = [for (d = dirs) if (-d[2] < steep) d];
    base_z  = -reach * max([for (d = deep) -d[2]]);
    function run(d) = -base_z / -d[2];
    foot_r  = min([for (d = deep) run(d) * sqrt(1 - d[2] * d[2])]);
    difference() {
        union() {
            sphere(d = outer);
            for (d = deep) along(d) cylinder(d = outer, h = run(d) + over);
            for (d = shallow) along(d) cylinder(d = outer, h = reach);
            // A gusset under each shallow arm, running the full length of the
            // arm and flat on the bed. The third solid cuts it off at the end
            // face of the arm, so the gusset does not close over the socket.
            for (d = shallow)
                intersection() {
                    hull() {
                        along(d) cylinder(d = outer, h = reach);
                        translate([0, 0, base_z]) linear_extrude(0.01)
                            projection() along(d) cylinder(d = outer, h = reach);
                    }
                    rotate([0, 0, atan2(d[1], d[0])])
                        translate([0, -fin_t / 2, base_z])
                            cube([reach + outer, fin_t, 3 * reach]);
                    along(d) translate([0, 0, -2 * reach])
                        cylinder(d = 4 * reach, h = 3 * reach);
                }
            if (len(shallow) > 0)
                translate([0, 0, base_z]) outline(foot_r + band / 2, band, foot_t, 60);
        }
        for (d = deep) along(d)
            translate([0, 0, gap]) cylinder(d = bore_d, h = run(d) + over);
        for (d = shallow) along(d)
            translate([0, 0, gap]) cylinder(d = bore_d, h = socket + 1);
        // The steep arms crowd the centre, so the yarn holes sit halfway out
        // along the gussets, clear of them.
        for (d = shallow) yarn_hole(d, base_z, outer, fin_t, yarn_d, x = 0.55 * reach);
        translate([0, 0, base_z - 200]) cube(400, center = true);
    }
}

// A point of the star, outward on +z. Its ten stakes all run down into the
// star, five ridges and five valleys alternating, so the part stands on their
// ends.
module gi_tip() {
    connector([for (r = gi_tip_dirs) vec(r)], tip_gap, 0.5);
}

// Where three points meet, outward on +z. Six short stakes run steeply down
// to the corners at the bottom of the flutes, and the part stands on those.
// Three ridges rise to the tips and three valleys run across to the next
// hubs, all six only 21 degrees off the horizontal, and each gets a gusset.
// The gussets point into the solid, under the crochet.
module gi_hub() {
    connector([for (r = gi_hub_dirs) vec(r)], hub_gap, 0.7);
}

// The bottom of a flute. All three stakes rise from it, so it prints upside
// down, outward on -z, standing on the ends of its three arms.
module gi_corner() {
    connector([for (r = gi_corner_dirs) let(d = vec(r)) [d[0], -d[1], -d[2]]],
              corner_gap, 0.5);
}

// The whole shape as a solid, at the size the stake lengths give. The solid
// is the union of the twenty pyramids from the centre to each big triangle.
module gi_model() {
    for (f = gi_faces)
        polyhedron(points = [[0, 0, 0], for (i = f) gi_points[i] * tip_r],
                   faces = [[3, 2, 1], [0, 1, 2], [0, 2, 3], [0, 3, 1]]);
}

// The frame: every stake as a 4 mm rod centre to centre, and a ball at every
// corner, for checking the build against the plan.
module gi_frame() {
    $fn = 12;
    for (e = gi_edges) {
        a = gi_points[e[0]] * tip_r;
        b = gi_points[e[1]] * tip_r;
        translate(a) along(b - a) cylinder(d = 4, h = norm(b - a));
    }
    for (p = gi_points) translate(p * tip_r) sphere(d = outer + 4);
}

if (part == "gi_tip")    gi_tip();
if (part == "gi_hub")    gi_hub();
if (part == "gi_corner") gi_corner();
if (part == "gi_model")  gi_model();
if (part == "gi_frame")  gi_frame();
