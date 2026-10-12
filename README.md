# platonic

Dowel connectors for Platonic solids and their stellar friends, rendered in the browser. Pick a solid and a part, set the dowel size and length, and download the STL. Print the connectors, cut the dowels to the lengths the page shows, and push them together into a frame.

Live site: https://platonic.juli.au/

The solids are the tetrahedron, cube, octahedron, dodecahedron and icosahedron, and four Kepler-Poinsot solids: the small stellated dodecahedron, the great dodecahedron, the great stellated dodecahedron and the great icosahedron.

The settings live in the URL query string, so a configured part can be shared by copying the address.

## Prints

You may sell prints made with platonic. If you print one, I'd love a photo at [julia.ogris@gmail.com](mailto:julia.ogris@gmail.com), but no pressure.

## How it works

Each solid is an OpenSCAD file in [scad/](scad/), with a `part` variable that picks the connector to render. [js/solids.js](js/solids.js) lists the solids, their parts and how many of each to print. When a setting changes, [js/main.js](js/main.js) sends the .scad files and the settings as `-D` overrides to a web worker ([js/worker.js](js/worker.js)), which runs OpenSCAD compiled to WebAssembly and returns a binary STL and the ECHO lines. The ECHO lines carry the stake lengths and the frame size shown under the controls.

The bore is the dowel size plus the bore clearance, 0.1 mm by default. The wall follows the dowel size unless "follow dowel size" is off: 1.6 mm for 4 mm dowels, 1.8 mm for 5 mm and 2.0 mm for 6 mm. Dowels from 3 mm to 10 mm are on offer. Sockets get deeper for thick dowels, and the base plates and gussets grow with the bore. Only the 4 mm and 5 mm parts have been test-printed so far.

There is no build step. The site is plain static files served by GitHub Pages; three.js is loaded from a CDN and the OpenSCAD runtime ([openscad-wasm](https://www.npmjs.com/package/openscad-wasm) 0.0.4, OpenSCAD 2025.07 with the Manifold backend) is vendored in [vendor/](vendor/).

## Development

Serve the directory with any static file server and open the page:

```sh
python3 -m http.server 18082
open http://localhost:18082
```

A part can also be rendered with desktop OpenSCAD:

```sh
openscad -o icosa_vertex.stl -D 'part="icosa_vertex"' scad/icosa.scad
```

## License

This repository is licensed under GPL-3.0 (see [LICENSE](LICENSE)) because it distributes the OpenSCAD WebAssembly build, which is GPL-licensed.
