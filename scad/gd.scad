// GD: connectors for a great dodecahedron frame.
//
// The great dodecahedron is twelve pentagons passing through each other.
// What the eye sees, and what the crochet covers, is an icosahedron with a
// triangular dimple pressed into each of its twenty faces. The frame builds
// that visible surface. Every edge is its own stake, and no stake passes
// through a connector:
//
//   gd_hub         x12  joins five ridge stakes and five valley stakes at an
//                       icosahedron vertex
//   dodeca_vertex  x20  joins three valley stakes at the bottom of a dimple
//
// The ridges are the thirty edges of the icosahedron. A valley runs from an
// icosahedron vertex down to the bottom of a dimple, and a ridge is phi times
// a valley. The twenty dimple bottoms are the vertices of a dodecahedron, and
// the three valleys leave each one 108 degrees apart and 20.9 degrees off its
// tangent plane. That is the dodecahedron vertex, rising outward instead of
// falling, so the part from dodeca.scad serves unchanged and nothing new is
// printed for it.
//
// With 300 mm ridge stakes the valley stakes are cut to 184.2 mm and the frame
// is 609 mm across. The frame takes thirty ridge stakes and sixty valley
// stakes. The echo below the constants prints the valley length for any
// ridge_len.
//
// Render:
//   openscad -o gd_hub.stl -D 'part="gd_hub"' gd.scad
//   openscad -o dodeca_vertex.stl -D 'part="dodeca_vertex"' dodeca.scad
//
// For 5 mm stakes add -D bore_d=5.1 -D wall=1.8 to both.

use <yarn.scad>

part = "gd_hub"; // [gd_hub]

// --- stake and fit --------------------------------------------------------

bore_d    = 4.1;   // socket bore for a 4 mm stake, mm
wall      = 1.6;   // wall around a bore, mm
web       = 1.0;   // material between two neighbouring bores, mm
socket    = 14;    // how far a stake end sits in a connector, mm
ridge_len = 300;   // length of a ridge stake, mm

// --- hub ------------------------------------------------------------------

fin_t  = 2.0;   // thickness of a gusset under a ridge arm, mm
dec_t  = 1.2;   // thickness of the ring joining the feet, mm
band   = 2.4;   // width of the ring joining the feet, mm
yarn_d = 3.0;   // yarn hole through each gusset, mm

// --- resolution -----------------------------------------------------------

$fn = 48;

// -------------------------------------------------------------------------

phi   = (1 + sqrt(5)) / 2;
outer = bore_d + 2 * wall;

// At a hub the five ridges leave atan(1/phi) below the horizontal, 72
// degrees apart. Each valley leaves atan(phi) below the horizontal, halfway
// in azimuth between the two ridges of its face. A valley is then 36 degrees
// from the ridges either side of it and from the valleys either side of it,
// the closest pairs on the part, and their bores clear each other this far
// out from the centre.
ridge_lean  = atan(1 / phi);
valley_lean = atan(phi);
hub_gap     = (bore_d + web) / (2 * sin(18));

// The gap at the bottom of a dimple, where the three valleys are 108 degrees
// apart. It matches dodeca.scad, which prints that part.
dimple_gap = (bore_d + web) / (2 * sin(54));

// A ridge stake stops hub_gap short of the hub centre at both ends. A valley
// is the ridge over phi, and its stake stops hub_gap short of the hub and
// dimple_gap short of the bottom of the dimple. The hubs are the vertices of
// an icosahedron, so opposite hubs are sqrt(phi + 2) ridges apart.
ridge_edge  = ridge_len + 2 * hub_gap;
valley_edge = ridge_edge / phi;
valley_len  = valley_edge - hub_gap - dimple_gap;
echo(ridge_len = ridge_len, valley_len = valley_len,
     span = sqrt(phi + 2) * ridge_edge + outer);

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// An icosahedron vertex, with the outward direction from the frame centre on
// +z. All ten arms run down. The five valleys are the steepest, so the part
// stands on their ends, cut flat by the bed with every valley bore opening
// into it, as on the star tips. The five ridges end higher up and each gets
// a gusset down to the bed. The gussets sit under the ridges, inside the
// solid, where the crochet does not reach.
module gd_hub() {
    reach = hub_gap + socket;
    over  = outer;   // run the valley arms and bores past the cut plane
    ridges  = [for (i = [0 : 4]) let(a = 72 * i)
                 [cos(ridge_lean) * cos(a), cos(ridge_lean) * sin(a), -sin(ridge_lean)]];
    valleys = [for (i = [0 : 4]) let(a = 36 + 72 * i)
                 [cos(valley_lean) * cos(a), cos(valley_lean) * sin(a), -sin(valley_lean)]];
    base_z = -reach * sin(valley_lean);
    difference() {
        union() {
            sphere(d = outer);
            for (d = ridges) along(d) cylinder(d = outer, h = reach);
            for (d = valleys) along(d) cylinder(d = outer, h = reach + over);
            // A gusset under each ridge arm, running the full length of the
            // arm and flat on the bed. The third solid cuts it off at the end
            // face of the arm, so the gusset does not close over the socket.
            for (i = [0 : 4]) let(a = 72 * i)
                intersection() {
                    hull() {
                        along(ridges[i]) cylinder(d = outer, h = reach);
                        translate([0, 0, base_z]) linear_extrude(0.01)
                            projection() along(ridges[i])
                                cylinder(d = outer, h = reach);
                    }
                    rotate([0, 0, a])
                        translate([0, -fin_t / 2, base_z])
                            cube([reach + outer, fin_t, 2 * reach]);
                    along(ridges[i]) translate([0, 0, -2 * reach])
                        cylinder(d = 4 * reach, h = 3 * reach);
                }
            // A thin ring on the bed through the five valley feet and across
            // the five gusset feet, so no foot stands alone. The middle stays
            // open for the yarn, and the valley bores are cut through the ring
            // below.
            translate([0, 0, base_z])
                outline(reach * cos(valley_lean) + band / 2, band, dec_t, 60);
        }
        for (d = ridges) along(d)
            translate([0, 0, hub_gap]) cylinder(d = bore_d, h = socket + 1);
        for (d = valleys) along(d)
            translate([0, 0, hub_gap]) cylinder(d = bore_d, h = socket + over);
        // The valley arms crowd the centre beside each gusset, so the yarn
        // holes sit halfway out along the gussets, clear of them.
        for (d = ridges) yarn_hole(d, base_z, outer, fin_t, yarn_d, x = 0.5 * reach);
        translate([0, 0, base_z - 50]) cube(100, center = true);
    }
}

if (part == "gd_hub") gd_hub();
