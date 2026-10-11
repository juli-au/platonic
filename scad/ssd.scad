// SSD: connectors for a small stellated dodecahedron frame.
//
// The star is a dodecahedron with a pentagonal pyramid on each of its twelve
// faces. Every edge is its own stake, and no stake passes through a
// connector. The frame has two stake lengths and two printed parts:
//
//   ssd_tip  x12  joins five ridge stakes at a star point
//   ssd_hub  x20  joins three core stakes and three ridge stakes at a
//                 dodecahedron vertex
//
// A ridge runs from a star point to the core. The core stakes are the thirty
// edges of the dodecahedron. A ridge is phi times a core edge, so with 280 mm
// ridge stakes the core stakes are cut to 176.8 mm and the star is 923 mm
// across. The frame takes sixty ridge stakes and thirty core stakes. The echo
// below the constants prints the core stake length for any ridge_len.
//
// At a dodecahedron vertex a ridge carries straight on from the core edge it
// meets, so the hub is three straight lines crossing at a point. The two
// stakes of a line butt inside the hub rather than pass through it. That is
// what lets the hub hold six stake ends at one vertex: every bore stops
// hub_gap short of the centre, so no two bores meet.
//
// Render one part at a time:
//   openscad -o ssd_tip.stl -D 'part="ssd_tip"' ssd.scad
//   openscad -o ssd_hub.stl -D 'part="ssd_hub"' ssd.scad
//
// The build where one skewer runs a whole edge through two crossings is in
// archive/kepler-experiments.scad. The great stellated dodecahedron, which
// is the same frame on an icosahedron core, is in kepler.scad.

part = "ssd_hub"; // [ssd_tip, ssd_hub]

// --- stake and fit --------------------------------------------------------

bore_d    = 4.1;   // socket bore for a 4 mm stake, mm
wall      = 1.8;   // wall around a bore, mm
web       = 1.0;   // material between two neighbouring bores, mm
socket    = 14;    // how far a stake end sits in a connector, mm
ridge_len = 280;   // length of a ridge stake, mm

// --- hub ------------------------------------------------------------------

fin_t = 2.0;   // thickness of a gusset under an arm, mm
hex_r = 13;    // corner radius of the hexagon joining the gusset feet, mm
hex_t = 1.2;   // thickness of that hexagon, mm

// --- resolution -----------------------------------------------------------

$fn = 48;

// -------------------------------------------------------------------------

phi   = (1 + sqrt(5)) / 2;
outer = bore_d + 2 * wall;

// Adjacent arms of a tip stand 36 degrees apart, the point angle of a
// pentagram. At a hub the closest pair stands 72 degrees apart, a core stake
// and the ridge of a different line. Each bore leans half of its pair's angle
// off the line between them, and the pair only clears this far out from the
// centre of the part, so a stake end stops there.
tip_gap = (bore_d + web) / (2 * sin(18));
hub_gap = (bore_d + web) / (2 * sin(36));

// A ridge stake stops tip_gap short of its star point and hub_gap short of
// its hub centre. The core edge is the ridge over phi, and a core stake stops
// hub_gap short of the hub centre at both ends. The twelve star points are
// the vertices of an icosahedron, and an edge of the star joins two of them
// at phi times that icosahedron's edge, which gives the span.
ridge_edge = ridge_len + tip_gap + hub_gap;
core_edge  = ridge_edge / phi;
core_len   = core_edge - 2 * hub_gap;
echo(ridge_len = ridge_len, core_len = core_len,
     star_span = sqrt(phi + 2) / phi * pow(phi, 3) * core_edge);

// The apex of a pyramid sits over the centre of a core face. tan of the angle
// an arm of a tip makes with the tip axis is the face circumradius over the
// apex height, which comes out at 1/phi.
tip_tilt = atan(1 / phi);

// The angle a core edge makes with the outward radial of its vertex, which
// comes out at 20.9 degrees below the horizontal. A ridge leaves the same
// vertex along the same line the other way, so it rises 20.9 degrees on the
// opposite azimuth.
hub_lean = atan(1 / (phi * phi));

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// A star point: five arms leaving the apex at tip_tilt off the axis, equally
// spaced in azimuth. The apex is at the top and the arms run down and out to
// one horizontal cut, so the part stands on the arm ends with every bore
// opening into the bed.
module ssd_tip() {
    reach = tip_gap + socket;
    over  = outer;   // run arms and bores past the cut plane
    dirs  = [for (i = [0 : 4]) let(a = 72 * i)
               [sin(tip_tilt) * cos(a), sin(tip_tilt) * sin(a), -cos(tip_tilt)]];
    base_z = -reach * cos(tip_tilt);
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

// A dodecahedron vertex, with the outward direction from the star centre on
// +z. Three core stakes run down and out, and three ridges run up and out to
// the star points around the vertex. Both rings lean 20.9 degrees off the
// horizontal, one below and one above, and a ridge sits opposite the core
// stake it continues.
//
// Every arm is that shallow, so a cut through the arm end centres would slice
// them lengthwise and no arm can carry its own weight while printing. Each
// arm keeps a square end, one shallow cut puts a flat on what touches the
// bed, and each arm gets a gusset.
module ssd_hub() {
    reach = hub_gap + socket;
    dirs  = concat(
        [for (i = [0 : 2]) let(a = 120 * i)
           [cos(hub_lean) * cos(a), cos(hub_lean) * sin(a), -sin(hub_lean)]],
        [for (i = [0 : 2]) let(a = 60 + 120 * i)
           [cos(hub_lean) * cos(a), cos(hub_lean) * sin(a), sin(hub_lean)]]);
    low = -reach * sin(hub_lean) - outer / 2 * cos(hub_lean);
    difference() {
        union() {
            sphere(d = outer);
            for (d = dirs) along(d) cylinder(d = outer, h = reach);
            // A gusset under each arm, running the full length of the arm and
            // flat on the bed. It fills the wedge between the underside of
            // the arm and the bed, which is where the arm would otherwise
            // print into air.
            //
            // The shadow of an arm this shallow reaches further out than the
            // arm does, so the hull below closes over the end face and the
            // socket with it. The third solid cuts the gusset off at that
            // face and leaves the mouth clear.
            for (i = [0 : 5]) let(a = 60 * i)
                intersection() {
                    hull() {
                        along(dirs[i]) cylinder(d = outer, h = reach);
                        translate([0, 0, low]) linear_extrude(0.01)
                            projection() along(dirs[i])
                                cylinder(d = outer, h = reach);
                    }
                    rotate([0, 0, a])
                        translate([0, -fin_t / 2, low])
                            cube([reach + outer, fin_t, 3 * reach]);
                    along(dirs[i]) translate([0, 0, -2 * reach])
                        cylinder(d = 4 * reach, h = 3 * reach);
                }
            // A thin hexagon on the bed joining the six gusset feet, so no
            // foot stands alone. Its corners are on the gussets, and hex_r
            // keeps it inside the socket mouths, clear of the stakes.
            translate([0, 0, low + 0.6]) cylinder(r = hex_r, h = hex_t, $fn = 6);
        }
        for (d = dirs) along(d)
            translate([0, 0, hub_gap]) cylinder(d = bore_d, h = socket + 1);
        translate([0, 0, low + 0.6 - 50]) cube(100, center = true);
    }
}

if (part == "ssd_tip") ssd_tip();
if (part == "ssd_hub") ssd_hub();
