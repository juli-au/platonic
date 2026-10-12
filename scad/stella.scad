// Stella octangula: two regular tetrahedra passing through each other.
//
// Every edge of one tetrahedron crosses an edge of the other at its
// midpoint, at a right angle. Each edge is two stakes, point to cross to
// point, so all 24 stakes are cut to the same length. With inner = true the
// cross carries four more arms for the twelve struts of the inner
// octahedron, and those struts take the same length too.
//
//   stella_tip     x8  joins three stakes at a star point
//   stella_cross   x6  joins four stakes where two edges cross
//   stella_cross8  x6  the cross with the four inner octahedron arms
//
// The parts are the round-stake tip and crosses from yarnitti's
// platonic.scad (stake_tip, stake_cross and stake_cross8), with the
// variable names the other solids use.
//
// Render one part at a time:
//   openscad -o stella_tip.stl -D 'part="stella_tip"' stella.scad
//   openscad -o stella_cross.stl -D 'part="stella_cross"' stella.scad
//   openscad -o stella_cross8.stl -D 'part="stella_cross8"' -D inner=true stella.scad

/* [Part] */
part = "stella_tip"; // [stella_tip, stella_cross, stella_cross8]

/* [Stakes] */
bore_d    = 4.1;    // socket bore for a 4 mm stake, mm
wall      = 1.6;    // wall around a bore, mm
web       = 1.0;    // material between two neighbouring bores, mm
socket    = 14;     // how far a stake end sits in a connector, mm
dowel_len = 150;    // length of one stake, mm
inner     = false;  // true to build the inner octahedron as well

/* [Hidden] */
$fn = 48;

outer = bore_d + 2 * wall;

// Edge directions leaving a tetrahedron vertex, with the vertex axis on +z
// and the edges running down and out, 60 degrees apart from each other.
tilt = atan(1 / sqrt(2));
function edge_dir(i) = [sin(tilt) * cos(120 * i), sin(tilt) * sin(120 * i), -cos(tilt)];

// Two bores 60 degrees apart clear each other this far from the centre,
// and two bores 90 degrees apart clear each other closer in. The cross8
// keeps every bore at the 60 degree gap, so an inner strut is as long as a
// half edge.
tip_gap   = (bore_d + web) / (2 * sin(30));
cross_gap = inner ? tip_gap : (bore_d + web) / (2 * sin(45));

// The eight star points are the corners of a cube. A tetrahedron edge is a
// face diagonal, and two opposite points are a cube diagonal, sqrt(1.5)
// edges apart.
edge = 2 * (dowel_len + tip_gap + cross_gap);
echo(dowel_len = dowel_len, edge = edge, span = sqrt(1.5) * edge + outer);

// Rotate a child so its +z axis lies along v.
module along(v) {
    rotate([0, acos(v[2] / norm(v)), atan2(v[1], v[0])]) children();
}

// Three tubes on a sphere. The part stands on the three arm ends with every
// bore opening into the bed.
module stella_tip() {
    reach  = tip_gap + socket;
    base_z = -reach * cos(tilt);
    difference() {
        union() {
            sphere(d = outer);
            for (i = [0 : 2]) along(edge_dir(i)) cylinder(d = outer, h = reach + outer);
        }
        for (i = [0 : 2]) along(edge_dir(i))
            translate([0, 0, tip_gap]) cylinder(d = bore_d, h = socket + outer);
        translate([0, 0, base_z - 500]) cube(1000, center = true);
    }
}

// Four tubes on a sphere in one plane, printed flat with 0.6 mm of
// material kept under each bore.
module stella_cross() {
    difference() {
        union() {
            sphere(d = outer);
            for (a = [0 : 90 : 270]) rotate([0, 90, a]) cylinder(d = outer, h = cross_gap + socket);
        }
        for (a = [0 : 90 : 270]) rotate([0, 90, a])
            translate([0, 0, cross_gap]) cylinder(d = bore_d, h = socket + 1);
        translate([0, 0, -bore_d / 2 - 0.6 - 500]) cube(1000, center = true);
    }
}

// The cross with four more arms rising 45 degrees on the azimuths between
// the flat arms, one per inner octahedron strut.
module stella_cross8() {
    module arms() {
        for (a = [0 : 90 : 270]) rotate([0, 90, a]) children();
        for (a = [45 : 90 : 315]) rotate([0, 0, a]) rotate([0, 45, 0]) children();
    }
    difference() {
        union() {
            sphere(d = outer);
            arms() cylinder(d = outer, h = tip_gap + socket);
        }
        arms() translate([0, 0, tip_gap]) cylinder(d = bore_d, h = socket + 1);
        translate([0, 0, -bore_d / 2 - 0.6 - 500]) cube(1000, center = true);
    }
}

if (part == "stella_tip") stella_tip();
else if (part == "stella_cross") stella_cross();
else if (part == "stella_cross8") stella_cross8();
