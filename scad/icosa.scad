// Icosa: the vertex connector for a dowel icosahedron.
//
// An icosahedron has twelve vertices and thirty edges. Five edges meet at
// every vertex, 60 degrees apart, the corner angle of the triangles they
// bound. Every edge is its own dowel, and no dowel passes through a
// connector, so the frame is one printed part:
//
//   icosa_vertex  x12  joins five dowel ends at a vertex
//
// With 300 mm dowels the edge is 310.2 mm and the frame is 597 mm across.
// The echo below the constants prints both for any dowel_len.
//
// Render:
//   openscad -o icosa_vertex.stl -D 'part="icosa_vertex"' icosa.scad
//
// For 5 mm stakes add -D bore_d=5.1 -D wall=1.8.

use <yarn.scad>

part = "icosa_vertex"; // [icosa_vertex]

// --- dowel and fit --------------------------------------------------------

bore_d    = 4.1;   // socket bore for a 4 mm dowel, mm
wall      = 1.6;   // wall around a bore, mm
web       = 1.0;   // material between two neighbouring bores, mm
socket    = 14;    // how far a dowel end sits in a connector, mm
dowel_len = 300;   // length of one dowel, mm

// --- gusset and base ------------------------------------------------------

fin_t  = 2.0;   // thickness of the gusset under an arm, mm
pent_r = 17;    // corner radius of the pentagon joining the gusset feet, mm
pent_t = 1.2;   // thickness of that pentagon, mm
band   = 2.4;   // width of the pentagon outline, mm
yarn_d = 3.0;   // yarn hole through each gusset, mm

// --- resolution -----------------------------------------------------------

$fn = 48;

// -------------------------------------------------------------------------

phi   = (1 + sqrt(5)) / 2;
outer = bore_d + 2 * wall;

// The five arms leave the vertex atan(1/phi) below the horizontal, 72 degrees
// apart in azimuth, which puts 60 degrees between neighbouring arms.
lean = atan(1 / phi);
dirs = [for (i = [0 : 4]) let(a = 72 * i)
          [cos(lean) * cos(a), cos(lean) * sin(a), -sin(lean)]];

// Two neighbouring bores are 60 degrees apart, so each one leans 30 degrees
// off the line between them. Their walls clear each other only this far out
// from the vertex, and a dowel end stops there.
gap  = (bore_d + web) / (2 * sin(30));
edge = dowel_len + 2 * gap;

// Opposite vertices of an icosahedron are sqrt(phi + 2) edges apart.
echo(dowel_len = dowel_len, edge = edge, span = sqrt(phi + 2) * edge + outer);

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// A vertex, with the outward direction from the frame centre on +z. Five
// arms run down and out, and the part stands on their ends.
//
// The arms lean 32 degrees below the horizontal, so a cut through their end
// centres would slice them lengthwise. Each arm keeps a square end instead,
// and one shallow cut puts a small flat on the five that touch the bed. Each
// arm also gets a gusset, as on the dodecahedron vertex, so its underside
// does not print into air.
module icosa_vertex() {
    reach = gap + socket;
    low   = -reach * sin(lean) - outer / 2 * cos(lean);
    difference() {
        union() {
            sphere(d = outer);
            for (d = dirs) along(d) cylinder(d = outer, h = reach);
            // A gusset under each arm, running the full length of the arm and
            // flat on the bed. The third solid cuts it off at the end face of
            // the arm, so the gusset does not close over the socket.
            for (i = [0 : 4]) let(a = 72 * i)
                intersection() {
                    hull() {
                        along(dirs[i]) cylinder(d = outer, h = reach);
                        // A flattened copy of the arm has the same footprint
                        // as projection(). The browser build of OpenSCAD
                        // crashes on projection() in this part.
                        translate([0, 0, low]) scale([1, 1, 0.0001])
                            along(dirs[i]) cylinder(d = outer, h = reach);
                    }
                    rotate([0, 0, a])
                        translate([0, -fin_t / 2, low])
                            cube([reach + outer, fin_t, 2 * reach]);
                    along(dirs[i]) translate([0, 0, -2 * reach])
                        cylinder(d = 4 * reach, h = 3 * reach);
                }
            // A thin pentagon outline on the bed joining the five gusset
            // feet, so no foot stands alone. Its corners are on the gussets,
            // and pent_r keeps it inside the socket mouths, clear of the
            // dowels. The middle stays open for the yarn.
            translate([0, 0, low + 0.6]) outline(pent_r, band, pent_t, 5);
        }
        for (d = dirs) along(d)
            translate([0, 0, gap]) cylinder(d = bore_d, h = socket + 1);
        for (d = dirs) yarn_hole(d, low + 0.6, outer, fin_t, yarn_d);
        translate([0, 0, low + 0.6 - 500]) cube(1000, center = true);
    }
}

if (part == "icosa_vertex") icosa_vertex();
