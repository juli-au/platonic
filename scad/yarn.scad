// Yarn: shared pieces for the connectors that stand on gussets.
//
// A gusset fills the wedge under a shallow arm so the arm prints. A yarn hole
// through the gusset, just under the arm and as close to the centre as the
// gusset allows, lets the crochet be tied round the arm next to the corner.
// The base under the gussets is an outline rather than a filled plate. It
// ties the feet together on the bed, which is all the plate was for, and
// leaves the middle open for the yarn.
//
// Use from a connector file:
//   use <yarn.scad>

// A triangular hole through the gusset under the arm along d, a unit vector
// with the part's centre at the origin. bed is the height of the bed. The
// triangle is yarn_d tall with its point up, so its two upper sides lean 60
// degrees and print without bridging. Its point sits rim below the underside
// of the arm, x out from the centre. By default x is just outside the ball at
// the centre, where the gusset is tallest. A part whose other arms crowd the
// centre passes a larger x. Where the gusset is too short to keep rim of
// material below the triangle as well, no hole is cut.
module yarn_hole(d, bed, outer, fin_t, yarn_d = 3, rim = 1.2, x = undef) {
    el   = asin(d[2]);
    x    = is_undef(x) ? outer / 2 + 0.5 : x;
    top  = x * tan(el) - outer / 2 / cos(el) - rim;
    base = top - yarn_d;
    half = yarn_d / sqrt(3);
    if (base - rim >= bed)
        rotate([0, 0, atan2(d[1], d[0])]) rotate([90, 0, 0])
            linear_extrude(height = fin_t + 0.4, center = true)
                polygon([[x - half, base], [x + half, base], [x, top]]);
}

// A flat outline of an n-sided polygon of corner radius r, band wide and t
// thick, standing on z = 0. A large n gives a ring.
module outline(r, band, t, n) {
    difference() {
        cylinder(r = r, h = t, $fn = n);
        translate([0, 0, -1]) cylinder(r = r - band / cos(180 / n), h = t + 2, $fn = n);
    }
}
