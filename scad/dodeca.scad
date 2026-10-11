// Dodeca: the vertex connector for a dowel dodecahedron.
//
// A dodecahedron has twenty vertices and thirty edges. Three edges meet at
// every vertex, 108 degrees apart, the interior angle of the pentagon they
// bound. Every edge is its own dowel, and no dowel passes through a
// connector, so the frame is one printed part:
//
//   dodeca_vertex  x20  joins three dowel ends at a vertex
//
// With 300 mm dowels the edge is 306.3 mm and the frame is 866 mm across.
// The echo below the constants prints both for any dowel_len.
//
// Render:
//   openscad -o dodeca_vertex.stl -D 'part="dodeca_vertex"' dodeca.scad
//
// For 5 mm stakes add -D bore_d=5.1 -D wall=1.8.

part = "dodeca_vertex"; // [dodeca_vertex]

// --- dowel and fit --------------------------------------------------------

bore_d    = 4.1;   // socket bore for a 4 mm dowel, mm
wall      = 1.6;   // wall around a bore, mm
web       = 1.0;   // material between two neighbouring bores, mm
socket    = 14;    // how far a dowel end sits in a connector, mm
dowel_len = 300;   // length of one dowel, mm

// --- gusset and base ------------------------------------------------------

fin_t  = 2.0;   // thickness of the gusset under an arm, mm
tri_r  = 14;    // corner radius of the triangle joining the gusset feet, mm
tri_t  = 1.2;   // thickness of that triangle, mm

// --- resolution -----------------------------------------------------------

$fn = 48;

// -------------------------------------------------------------------------

phi   = (1 + sqrt(5)) / 2;
outer = bore_d + 2 * wall;

// The three arms leave the vertex atan(1/phi^2) below the horizontal, 120
// degrees apart in azimuth, which puts 108 degrees between any two of them.
lean = atan(1 / (phi * phi));
dirs = [for (i = [0 : 2]) let(a = 120 * i)
          [cos(lean) * cos(a), cos(lean) * sin(a), -sin(lean)]];

// Two neighbouring bores are 108 degrees apart, so each one leans 54 degrees
// off the line between them. Their walls clear each other only this far out
// from the vertex, and a dowel end stops there.
gap  = (bore_d + web) / (2 * sin(54));
edge = dowel_len + 2 * gap;
echo(dowel_len = dowel_len, edge = edge, span = sqrt(3) * phi * edge + outer);

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// A vertex, with the outward direction from the frame centre on +z. Three
// arms run down and out, and the part stands on their ends.
//
// The arms lean only 21 degrees below the horizontal, so a cut through their
// end centres would slice them lengthwise. Each arm keeps a square end
// instead, and one shallow cut puts a small flat on the three that touch the
// bed. At that lean an arm also rises 0.39 mm for every 0.15 mm layer, which
// no perimeter can bridge, so each one gets a gusset.
module dodeca_vertex() {
    reach = gap + socket;
    low   = -reach * sin(lean) - outer / 2 * cos(lean);
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
            for (i = [0 : 2]) let(a = 120 * i)
                intersection() {
                    hull() {
                        along(dirs[i]) cylinder(d = outer, h = reach);
                        translate([0, 0, low]) linear_extrude(0.01)
                            projection() along(dirs[i])
                                cylinder(d = outer, h = reach);
                    }
                    rotate([0, 0, a])
                        translate([0, -fin_t / 2, low])
                            cube([reach + outer, fin_t, 2 * reach]);
                    along(dirs[i]) translate([0, 0, -2 * reach])
                        cylinder(d = 4 * reach, h = 3 * reach);
                }
            // A thin triangle on the bed joining the three gusset feet, so no
            // foot stands alone. Its corners are on the gussets, and tri_r
            // keeps it inside the socket mouths, clear of the dowels.
            translate([0, 0, low + 0.6]) cylinder(r = tri_r, h = tri_t, $fn = 3);
        }
        for (d = dirs) along(d)
            translate([0, 0, gap]) cylinder(d = bore_d, h = socket + 1);
        translate([0, 0, low + 0.6 - 50]) cube(100, center = true);
    }
}

if (part == "dodeca_vertex") dodeca_vertex();
