import process from "node:process";
import { Buffer } from "node:buffer";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

// Read-only, pinned Git snapshot for repeatable local before/after reviews.
const beforeRef = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const beforePrefix = "/@moon-before/";

const outputDirectory = resolve(
  process.argv[2] || "node_modules/.cache/moon-review",
);

// Standalone, local-only review page. Uses the real Moon, texture worker, flag,
// garden and logo. Compare the same scene with the base hidden and visible.
const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Moon base review</title><style>
body{margin:0;background:#000;color:#ddd;font:14px Arial;text-align:center}
#moonRoot{width:min(740px,97vw);height:400px;margin:0 auto;overflow:hidden}
canvas{display:block;width:100%;height:100%}button,select{padding:8px;margin:4px;background:#252a30;color:#ddd;border:1px solid #777}
pre{white-space:pre-wrap;text-align:left;max-width:740px;margin:16px auto;font-size:12px}
.profileImage{display:none}h1{font-size:22px;margin:10px}p{color:#aaa}
</style><div id="profilePicContainer"><img class="profileImage" crossorigin="anonymous" src="https://avatars.githubusercontent.com/u/48375250?v=4"></div>
<div id="moonRoot"></div><h1>Sahil Singh Rana</h1><p>Software Developer</p>
<button id="compare">Measure baseline / base</button><button id="base">Hide base</button><button id="motion">Pause motion</button>
<button id="front">Front view</button><button id="back">Back view</button><button id="zoom">Close view</button>
<button id="reset">Recreate scene</button>
<button id="capture">Capture scene</button>
<button id="record">Record 8-second motion</button>
<button data-activity="garden">Preview garden</button><button data-activity="rocket">Preview rocket</button><button data-activity="conversation">Preview conversation</button><button data-activity="wave">Preview greeting</button><button data-activity="showGarden">Preview shared garden</button><button data-activity="house">Preview house</button><button data-activity="showHouse">Preview shared house</button>
<button data-activity="sit">Preview sitting</button><button data-activity="waiting">Preview playful wait</button><button data-activity="call">Preview silent call</button>
<button id="behaviorCompare">Measure behavior overhead</button><pre id="activity">Live behavior</pre>
<button id="revisionCompare">Measure this revision</button><a href="?revision=before">Before</a> / <a href="?revision=after">After</a>
<select id="phase" aria-label="Moon phase"><option value="0.5">Full Moon</option><option value="0.25">Quarter Moon</option><option value="0">New Moon</option></select>
<pre id="results">Loading real Moon scene…</pre>
<script type="module" src="/scripts/moon-review-client.js"></script></html>`;

const server = await createServer({
  configFile: false,
  root: resolve("."),
  server: { host: "127.0.0.1", port: 4235, strictPort: true },
  plugins: [
    {
      name: "moon-review-page",
      resolveId(source, importer) {
        if (source.startsWith(beforePrefix)) return `\0${source}`;
        if (
          importer?.startsWith(`\0${beforePrefix}`) &&
          /^\.\/[\w-]+\.js$/.test(source)
        )
          return `\0${beforePrefix}${source.slice(2)}`;
      },
      load(id) {
        if (!id.startsWith(`\0${beforePrefix}`)) return;
        const filename = id.slice(beforePrefix.length + 1);
        if (!/^[\w-]+\.js$/.test(filename))
          throw new Error("Invalid before module");
        return execFileSync(
          "git",
          [
            "show",
            `${beforeRef}:src/components/General/Moon/3dMoon/${filename}`,
          ],
          { encoding: "utf8" },
        );
      },
      configureServer(viteServer) {
        viteServer.middlewares.use((request, response, next) => {
          if (request.url?.startsWith("/capture?")) {
            const name = new URL(
              request.url,
              "http://localhost",
            ).searchParams.get("name");
            if (
              request.method !== "POST" ||
              !/^(?:(?:moon-(?:0|0\.25|0\.5)-(?:mobile|desktop)-(?:base|baseline)|astronaut-(?:garden|rocket|house|conversation|wave|showGarden|showHouse|sit|waiting|call|flag|stroll|gardenDance)-(?:mobile|desktop))(?:-before|-after)?\.png|astronaut-motion-(?:mobile|desktop)-(?:before|after)\.webm)$/.test(
                name || "",
              )
            ) {
              response.statusCode = 400;
              response.end("Invalid capture");
              return;
            }
            const chunks = [];
            let length = 0;
            request.on("data", (chunk) => {
              length += chunk.length;
              if (length > 4 * 1024 * 1024) request.destroy();
              else chunks.push(chunk);
            });
            request.on("end", async () => {
              try {
                await mkdir(outputDirectory, { recursive: true });
                await writeFile(
                  resolve(outputDirectory, name),
                  Buffer.concat(chunks),
                );
                response.end(`Saved ${name}`);
              } catch {
                response.statusCode = 500;
                response.end("Capture failed");
              }
            });
            return;
          }
          if (request.url?.split("?")[0] !== "/moon-review") return next();
          response.setHeader("Content-Type", "text/html");
          response.end(html);
        });
      },
    },
  ],
});
await server.listen();
console.log("Moon review: http://localhost:4235/moon-review");
