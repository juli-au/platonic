// Tetra: the vertex connector for a dowel tetrahedron.
//
// A tetrahedron has four vertices and six edges. Three edges meet at every
// vertex, 60 degrees apart, the corner angle of the triangles they bound.
// Every edge is its own dowel, and no dowel passes through a connector, so
// the frame is one printed part:
//
//   tetra_vertex  x4  joins three dowel ends at a vertex
//
// The part prints like a star tip, standing on its three arm ends with every
// bore opening into the bed. The echo below the constants prints the edge and
// the height for any dowel_len.
//
// Render:
//   openscad -o tetra_vertex.stl -D 'part="tetra_vertex"' tetra.scad
//
// For 5 mm stakes add -D bore_d=5.1 -D wall=1.8, and for 6 mm
// -D bore_d=6.1 -D wall=2.0.

use <vertex.scad>

part = "tetra_vertex"; // [tetra_vertex]

// --- dowel and fit --------------------------------------------------------

bore_d    = 4.1;   // socket bore for a 4 mm dowel, mm
wall      = 1.6;   // wall around a bore, mm
web       = 1.0;   // material between two neighbouring bores, mm
socket    = 14;    // how far a dowel end sits in a connector, mm
dowel_len = 300;   // length of one dowel, mm

// --- resolution -----------------------------------------------------------

$fn = 48;

// -------------------------------------------------------------------------

outer = bore_d + 2 * wall;

// With the line from the vertex to the centre on -z, the three arms leave the
// vertex atan(sqrt(2)) below the horizontal, 54.7 degrees, which puts 60
// degrees between any two of them.
lean = atan(sqrt(2));
gap  = vertex_gap(60, bore_d, web);
edge = dowel_len + 2 * gap;

// A tetrahedron standing on one face is sqrt(2/3) edges tall.
echo(dowel_len = dowel_len, edge = edge, height = sqrt(2 / 3) * edge + outer);

if (part == "tetra_vertex")
    tip_vertex(3, lean, gap, bore_d, wall, socket);
