// Kepler: connectors for a great stellated dodecahedron frame.
//
// The star is an icosahedron with a tall triangular pyramid on each of its
// twenty faces. Every edge of that shape is its own stake, and no stake
// passes through a connector. The frame has two stake lengths and two
// printed parts:
//
//   gsd_tip  x20  joins three ridge stakes at a star point
//   gsd_hub  x12  joins five core stakes and five ridge stakes at an
//                 icosahedron vertex
//
// A ridge runs from a star point to the core. The core stakes are the thirty
// edges of the icosahedron. A ridge is phi times a core edge, so with 300 mm
// ridge stakes the core stakes are cut to 182.4 mm and the star is 923 mm
// across. The frame takes sixty ridge stakes and thirty core stakes. The echo
// below the constants prints the core stake length for any ridge_len.
//
// Render one part at a time:
//   openscad -o gsd_tip.stl -D 'part="gsd_tip"' kepler.scad
//   openscad -o gsd_hub.stl -D 'part="gsd_hub"' kepler.scad
//
// Earlier experiments, including the small stellated dodecahedron and
// crossings that a stake passes through, are in archive/kepler-experiments.scad.

part = "gsd_hub"; // [gsd_tip, gsd_hub]

// --- stake and fit --------------------------------------------------------

bore_d    = 5.1;   // socket bore for a 5 mm stake, mm
wall      = 1.8;   // wall around a bore, mm
web       = 1.0;   // material between two neighbouring bores, mm
socket    = 14;    // how far a stake end sits in a connector, mm
ridge_len = 300;   // length of a ridge stake, mm

// --- hub ------------------------------------------------------------------

fin_t  = 2.0;   // thickness of a gusset under an upward arm, mm
pent_r = 22;    // corner radius of the pentagon joining the gusset feet, mm
pent_t = 1.2;   // thickness of that pentagon, mm

// --- resolution -----------------------------------------------------------

$fn = 48;

// -------------------------------------------------------------------------

phi   = (1 + sqrt(5)) / 2;
outer = bore_d + 2 * wall;

// Neighbouring arms of a tip are 36 degrees apart, and neighbouring arms of
// a hub are 60 degrees apart. Two bores only clear each other this far out
// from the centre of the part, so a stake end stops there.
tip_gap = (bore_d + web) / tan(18);
hub_gap = (bore_d + web) / tan(30);

// A ridge stake stops tip_gap short of its star point and hub_gap short of
// its hub centre. The core edge is the ridge over phi, and a core stake stops
// hub_gap short of the hub centre at both ends.
core_edge = (ridge_len + tip_gap + hub_gap) / phi;
core_len  = core_edge - 2 * hub_gap;
echo(ridge_len = ridge_len, core_len = core_len, star_span = 4.53452 * core_edge);

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// A star point. The three ridges leave the point atan(1/phi^2) off the tip
// axis, which is the face circumradius over the pyramid height. The point is
// at the top and the arms run down and out to one horizontal cut, so the part
// stands on the arm ends with every bore opening into the bed.
module gsd_tip() {
    tilt  = atan(1 / (phi * phi));
    reach = tip_gap + socket;
    over  = outer;   // run arms and bores past the cut plane
    dirs  = [for (i = [0 : 2])
               [sin(tilt) * cos(120 * i), sin(tilt) * sin(120 * i), -cos(tilt)]];
    base_z = -reach * cos(tilt);
    difference() {
        union() {
            sphere(d = outer);
            for (d = dirs) along(d) cylinder(d = outer, h = reach + over);
        }
        for (d = dirs) along(d)
            translate([0, 0, tip_gap]) cylinder(d = bore_d, h = socket + over);
        translate([0, 0, base_z - 50]) cube(100, center = true);
    }
}

// An icosahedron vertex, with the outward direction from the star centre on
// +z. Five core stakes run down and out, and five ridges run up and out to
// the star points around the vertex. Both rings lean atan(1/phi) off the
// horizontal, one below and one above, and they are 36 degrees apart in
// azimuth.
//
// The part stands on the ends of the five downward arms. Those arms lean only
// 32 degrees below the horizontal, so a cut through their end centres would
// slice them lengthwise. Each arm keeps a square end instead, and one shallow
// cut puts a small flat on the five that touch the bed.
module gsd_hub() {
    lean  = atan(1 / phi);
    reach = hub_gap + socket;
    dirs  = concat(
        [for (i = [0 : 4]) let(a = 18 + 72 * i)
           [cos(lean) * cos(a), cos(lean) * sin(a), -sin(lean)]],
        [for (i = [0 : 4]) let(a = 54 + 72 * i)
           [cos(lean) * cos(a), cos(lean) * sin(a), sin(lean)]]);
    low = -reach * sin(lean) - outer / 2 * cos(lean);
    difference() {
        union() {
            sphere(d = outer);
            for (d = dirs) along(d) cylinder(d = outer, h = reach);
            // A gusset under each upward arm, running the full length of the
            // arm and flat on the bed. The upward arms overhang 58 degrees
            // from vertical, so the gussets hold them up while printing and
            // brace their roots after. They sit inside the star behind each
            // ridge, where the crochet does not reach.
            for (i = [0 : 4]) let(a = 54 + 72 * i)
                intersection() {
                    hull() {
                        along(dirs[i + 5]) cylinder(d = outer, h = reach);
                        translate([0, 0, low]) linear_extrude(0.01)
                            projection() along(dirs[i + 5])
                                cylinder(d = outer, h = reach);
                    }
                    rotate([0, 0, a])
                        translate([0, -fin_t / 2, low])
                            cube([reach + outer, fin_t, 2 * reach]);
                }
            // A thin pentagon on the bed joining the five gusset feet and the
            // five downward arms. Its corners are on the gussets. Each flat
            // side runs into the wall of a downward arm, so all ten feet are
            // one piece on the bed. A core stake leaves its arm heading down
            // toward the bed, and at pent_r = 22 each flat side stays 0.7 mm
            // clear of that stake. Past about 23.5 it would block the socket.
            translate([0, 0, low + 0.6]) rotate([0, 0, 54])
                cylinder(r = pent_r, h = pent_t, $fn = 5);
        }
        for (d = dirs) along(d)
            translate([0, 0, hub_gap]) cylinder(d = bore_d, h = socket + 1);
        translate([0, 0, low + 0.6 - 50]) cube(100, center = true);
    }
}

if (part == "gsd_tip") gsd_tip();
if (part == "gsd_hub") gsd_hub();
