// Web worker that runs OpenSCAD (compiled to WebAssembly) off the main
// thread. It receives the design's .scad files, the file to render and the
// variables to override, and answers with a binary STL buffer and the
// ECHO lines OpenSCAD printed, or with an error message that includes
// OpenSCAD's stderr. With echoOnly set it skips the geometry and answers
// with the ECHO lines alone.
//
// A fresh instance is created per render because the Emscripten main()
// cannot safely run twice on the same instance. The vendored build is
// OpenSCAD 2025.07 with the Manifold backend, which renders the largest
// hubs in under half a second.

import { createOpenSCAD } from "../vendor/openscad.js";

self.onmessage = async (event) => {
    const { id, files, file, defines, echoOnly } = event.data;
    const stderr = [];
    const echoes = [];
    const collect = (line) => {
        if (line.startsWith("ECHO:")) echoes.push(line.slice(5).trim());
        else stderr.push(line);
    };
    try {
        const instance = (await createOpenSCAD({
            noInitialRun: true,
            print: collect,
            printErr: collect,
        })).getInstance();
        instance.FS.mkdir("/scad");
        for (const [name, text] of Object.entries(files)) {
            instance.FS.writeFile(`/scad/${name}`, text);
        }
        const args = [`/scad/${file}`];
        for (const [name, value] of Object.entries(defines)) {
            args.push("-D", `${name}=${value}`);
        }
        if (echoOnly) {
            args.push("-o", "/out.echo");
            instance.callMain(args);
            if (echoes.length === 0) {
                const text = instance.FS.readFile("/out.echo", { encoding: "utf8" });
                for (const line of text.split("\n")) collect(line);
            }
            self.postMessage({ id, echoes });
            return;
        }
        args.push("-o", "/out.stl", "--export-format=binstl", "--backend=manifold");
        instance.callMain(args);
        const stl = instance.FS.readFile("/out.stl");
        self.postMessage({ id, stl: stl.buffer, echoes }, [stl.buffer]);
    } catch (err) {
        const detail = stderr.slice(-5).join("\n");
        self.postMessage({ id, error: `${err}\n${detail}`.trim() });
    }
};
