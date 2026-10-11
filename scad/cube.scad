// Cube: the vertex connector for a dowel cube.
//
// A cube has eight vertices and twelve edges. Three edges meet at every
// vertex, 90 degrees apart. Every edge is its own dowel, and no dowel passes
// through a connector, so the frame is one printed part:
//
//   cube_vertex  x8  joins three dowel ends at a vertex
//
// With 300 mm dowels the edge is 307.2 mm and the frame is 539 mm across,
// corner to opposite corner. The echo below the constants prints both for any
// dowel_len.
//
// Render:
//   openscad -o cube_vertex.stl -D 'part="cube_vertex"' cube.scad
//
// For 5 mm stakes add -D bore_d=5.1 -D wall=1.8, and for 6 mm
// -D bore_d=6.1 -D wall=2.0.

use <vertex.scad>

part = "cube_vertex"; // [cube_vertex]

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

// With the cube's long diagonal on +z, the three arms leave the vertex
// atan(1/sqrt(2)) below the horizontal, 35.3 degrees, which puts 90 degrees
// between any two of them.
lean = atan(1 / sqrt(2));
gap  = vertex_gap(90, bore_d, web);
edge = dowel_len + 2 * gap;

// Opposite corners of a cube are sqrt(3) edges apart.
echo(dowel_len = dowel_len, edge = edge, span = sqrt(3) * edge + outer);

if (part == "cube_vertex")
    tip_vertex(3, lean, gap, bore_d, wall, socket);
