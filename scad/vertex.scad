// Vertex: the connector for a dowel solid whose vertices all look alike.
//
// n arms leave the vertex lean degrees below the horizontal, evenly spaced in
// azimuth, with the outward direction from the frame centre on +z. There are
// two ways to print it. tip_vertex is cut flat through the arm ends with every
// bore opening into the bed, like the star tips, and needs nothing else.
// regular_vertex stands on square arm ends with a gusset and yarn hole under
// each arm and an outline joining the feet, like the icosahedron vertex. The
// octahedron and cube use tip_vertex.
//
// Use from a solid's file:
//   use <vertex.scad>

use <yarn.scad>

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// How far out from the vertex a dowel end stops: where two neighbouring bores
// angle degrees apart clear each other.
function vertex_gap(angle, bore_d, web) = (bore_d + web) / (2 * sin(angle / 2));

// A vertex printed like a star tip. The arms run down past one horizontal cut
// through their end centres, so the part stands on the arm ends with every
// bore opening into the bed.
module tip_vertex(n, lean, gap, bore_d, wall, socket) {
    outer  = bore_d + 2 * wall;
    reach  = gap + socket;
    over   = outer;   // run arms and bores past the cut plane
    dirs   = [for (i = [0 : n - 1]) let(a = 360 / n * i)
                [cos(lean) * cos(a), cos(lean) * sin(a), -sin(lean)]];
    base_z = -reach * sin(lean);
    difference() {
        union() {
            sphere(d = outer);
            for (d = dirs) along(d) cylinder(d = outer, h = reach + over);
        }
        for (d = dirs) along(d)
            translate([0, 0, gap]) cylinder(d = bore_d, h = socket + over);
        translate([0, 0, base_z - 50]) cube(100, center = true);
    }
}

// gap is from vertex_gap. plate_r is the corner radius of the outline on the
// bed, which keeps it inside the socket mouths and clear of the dowels. rim is
// the material kept above and below each yarn hole.
module regular_vertex(n, lean, gap, bore_d, wall, socket, fin_t, plate_r,
                      plate_t, band, yarn_d, rim) {
    outer = bore_d + 2 * wall;
    reach = gap + socket;
    dirs  = [for (i = [0 : n - 1]) let(a = 360 / n * i)
               [cos(lean) * cos(a), cos(lean) * sin(a), -sin(lean)]];
    low   = -reach * sin(lean) - outer / 2 * cos(lean);
    bed   = low + 0.6;
    difference() {
        union() {
            sphere(d = outer);
            for (d = dirs) along(d) cylinder(d = outer, h = reach);
            // A gusset under each arm, running the full length of the arm and
            // flat on the bed. The third solid cuts it off at the end face of
            // the arm, so the gusset does not close over the socket.
            for (i = [0 : n - 1]) let(a = 360 / n * i)
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
            // The outline on the bed joining the gusset feet. Its corners are
            // on the gussets and the middle stays open for the yarn.
            translate([0, 0, bed]) outline(plate_r, band, plate_t, n);
        }
        for (d = dirs) along(d)
            translate([0, 0, gap]) cylinder(d = bore_d, h = socket + 1);
        for (d = dirs) yarn_hole(d, bed, outer, fin_t, yarn_d, rim);
        translate([0, 0, bed - 50]) cube(100, center = true);
    }
}
