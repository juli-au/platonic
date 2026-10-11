// Octa: the vertex connector for a dowel octahedron.
//
// An octahedron has six vertices and twelve edges. Four edges meet at every
// vertex, 90 degrees apart in azimuth and 60 degrees apart from their
// neighbours, the corner angle of the triangles they bound. Every edge is its
// own dowel, and no dowel passes through a connector, so the frame is one
// printed part:
//
//   octa_vertex  x6  joins four dowel ends at a vertex
//
// With 300 mm dowels the edge is 310.2 mm and the frame is 446 mm across.
// The echo below the constants prints both for any dowel_len.
//
// Render:
//   openscad -o octa_vertex.stl -D 'part="octa_vertex"' octa.scad
//
// For 5 mm stakes add -D bore_d=5.1 -D wall=1.8, and for 6 mm
// -D bore_d=6.1 -D wall=2.0.

use <vertex.scad>

part = "octa_vertex"; // [octa_vertex]

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

// The four arms leave the vertex 45 degrees below the horizontal, which puts
// 60 degrees between neighbouring arms and 90 between opposite ones.
lean = 45;
gap  = vertex_gap(60, bore_d, web);
edge = dowel_len + 2 * gap;

// Opposite vertices of an octahedron are sqrt(2) edges apart.
echo(dowel_len = dowel_len, edge = edge, span = sqrt(2) * edge + outer);

if (part == "octa_vertex")
    tip_vertex(4, lean, gap, bore_d, wall, socket);
