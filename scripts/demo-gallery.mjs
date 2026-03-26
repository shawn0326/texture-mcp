import path from "node:path";
import { writeFile } from "node:fs/promises";
import { exportTexture } from "../dist/core/export.js";
import { generateTexture } from "../dist/core/generate.js";

const workspaceRoot = process.cwd();
const outputRoot = "demo";

const demoCases = [
  {
    section: "preset-gallery",
    name: "flare-core",
    description: "High-energy flare sprite with a hot center and soft bloom.",
    outputPath: `${outputRoot}/preset-gallery/flare-core.png`,
    input: {
      mode: "preset",
      preset: "flare",
      params: {
        coreSize: 0.12,
        intensity: 0.95,
        falloff: 0.58,
        heat: 0.85,
        softness: 0.38
      },
      width: 256,
      height: 256,
      seed: 4
    }
  },
  {
    section: "preset-gallery",
    name: "shockwave-pulse",
    description: "Readable impact ring with a bright inner pulse.",
    outputPath: `${outputRoot}/preset-gallery/shockwave-pulse.png`,
    input: {
      mode: "preset",
      preset: "shockwave",
      params: {
        radius: 0.32,
        thickness: 0.12,
        softness: 0.42,
        intensity: 0.9,
        innerGlow: 0.3
      },
      width: 256,
      height: 256,
      seed: 8
    }
  },
  {
    section: "preset-gallery",
    name: "beam-strip",
    description: "Directional beam strip for slashes and energy lines.",
    outputPath: `${outputRoot}/preset-gallery/beam-strip.png`,
    input: {
      mode: "preset",
      preset: "beam",
      params: {
        orientation: "horizontal",
        length: 0.88,
        thickness: 0.16,
        intensity: 0.9
      },
      width: 320,
      height: 128,
      seed: 2
    }
  },
  {
    section: "preset-gallery",
    name: "softmask-band",
    description: "Soft directional mask for beams, trails, and shader helpers.",
    outputPath: `${outputRoot}/preset-gallery/softmask-band.png`,
    input: {
      mode: "preset",
      preset: "softMask",
      params: {
        shape: "band",
        orientation: "horizontal",
        thickness: 0.18,
        width: 0.9,
        softness: 0.52
      },
      width: 320,
      height: 160,
      seed: 0
    }
  },
  {
    section: "preset-gallery",
    name: "panel-card",
    description: "Compact sci-fi panel block for HUD-style texture cards.",
    outputPath: `${outputRoot}/preset-gallery/panel-card.png`,
    input: {
      mode: "preset",
      preset: "panel",
      params: {
        width: 0.78,
        height: 0.42,
        cornerRadius: 0.08,
        glow: 0.42
      },
      width: 320,
      height: 200,
      seed: 3
    }
  },
  {
    section: "parameter-sweep",
    name: "shockwave-radius-1",
    description: "Shockwave radius sweep: compact pulse front.",
    outputPath: `${outputRoot}/parameter-sweep/shockwave-radius-1.png`,
    input: {
      mode: "preset",
      preset: "shockwave",
      params: {
        radius: 0.18,
        thickness: 0.09,
        softness: 0.35,
        intensity: 0.85,
        innerGlow: 0.2
      },
      width: 256,
      height: 256,
      seed: 1
    }
  },
  {
    section: "parameter-sweep",
    name: "shockwave-radius-2",
    description: "Shockwave radius sweep: medium pulse front.",
    outputPath: `${outputRoot}/parameter-sweep/shockwave-radius-2.png`,
    input: {
      mode: "preset",
      preset: "shockwave",
      params: {
        radius: 0.28,
        thickness: 0.09,
        softness: 0.35,
        intensity: 0.85,
        innerGlow: 0.2
      },
      width: 256,
      height: 256,
      seed: 1
    }
  },
  {
    section: "parameter-sweep",
    name: "shockwave-radius-3",
    description: "Shockwave radius sweep: wide pulse front.",
    outputPath: `${outputRoot}/parameter-sweep/shockwave-radius-3.png`,
    input: {
      mode: "preset",
      preset: "shockwave",
      params: {
        radius: 0.38,
        thickness: 0.09,
        softness: 0.35,
        intensity: 0.85,
        innerGlow: 0.2
      },
      width: 256,
      height: 256,
      seed: 1
    }
  },
  {
    section: "parameter-sweep",
    name: "shockwave-radius-4",
    description: "Shockwave radius sweep: near-edge pulse front.",
    outputPath: `${outputRoot}/parameter-sweep/shockwave-radius-4.png`,
    input: {
      mode: "preset",
      preset: "shockwave",
      params: {
        radius: 0.48,
        thickness: 0.09,
        softness: 0.35,
        intensity: 0.85,
        innerGlow: 0.2
      },
      width: 256,
      height: 256,
      seed: 1
    }
  },
  {
    section: "rotation-preview",
    name: "rotated-slashed-bar",
    description: "Simple rotated rect showing how slanted bar silhouettes work without adding a full transform system.",
    outputPath: `${outputRoot}/rotation-preview/rotated-slashed-bar.png`,
    input: {
      mode: "recipe",
      recipe: {
        version: 1,
        layers: [
          {
            type: "rect",
            origin: { x: 0.18, y: 0.43 },
            size: { width: 0.64, height: 0.12 },
            cornerRadius: 0.04,
            rotation: -22,
            color: "rgba(215, 245, 255, 0.95)"
          },
          {
            type: "blur",
            radius: 0.01
          }
        ]
      },
      width: 320,
      height: 160,
      seed: 0
    }
  },
  {
    section: "rotation-preview",
    name: "rotated-beam-ramp",
    description: "Gradient rectangle with rotation, useful for angled beams, scan streaks, and slash-like energy strokes.",
    outputPath: `${outputRoot}/rotation-preview/rotated-beam-ramp.png`,
    input: {
      mode: "recipe",
      recipe: {
        version: 1,
        layers: [
          {
            type: "gradientRect",
            origin: { x: 0.12, y: 0.4 },
            size: { width: 0.76, height: 0.14 },
            cornerRadius: 0.04,
            rotation: -18,
            direction: "horizontal",
            colors: [
              "rgba(0, 220, 255, 0)",
              "rgba(110, 235, 255, 0.75)",
              "rgba(255, 255, 255, 1)",
              "rgba(110, 235, 255, 0.75)",
              "rgba(0, 220, 255, 0)"
            ]
          },
          {
            type: "blur",
            radius: 0.03
          },
          {
            type: "rect",
            origin: { x: 0.12, y: 0.455 },
            size: { width: 0.76, height: 0.03 },
            rotation: -18,
            color: "rgba(255, 252, 245, 0.9)"
          }
        ]
      },
      width: 384,
      height: 160,
      seed: 0
    }
  },
  {
    section: "rotation-preview",
    name: "rotated-alert-label",
    description: "Tilted text label to show that the layout box and alignment rotate together around the box center.",
    outputPath: `${outputRoot}/rotation-preview/rotated-alert-label.png`,
    input: {
      mode: "recipe",
      recipe: {
        version: 1,
        layers: [
          {
            type: "gradientRect",
            origin: { x: 0.18, y: 0.28 },
            size: { width: 0.64, height: 0.24 },
            cornerRadius: 0.05,
            rotation: -10,
            direction: "vertical",
            colors: [
              "rgba(205, 238, 255, 0.3)",
              "rgba(44, 94, 158, 0.78)",
              "rgba(12, 20, 36, 0.96)"
            ]
          },
          {
            type: "text",
            text: "ALERT",
            origin: { x: 0.24, y: 0.34 },
            size: { width: 0.52, height: 0.1 },
            rotation: -10,
            color: "rgba(255, 255, 255, 1)",
            fontFamily: "sans-serif",
            fontWeight: "bold",
            align: "center",
            verticalAlign: "middle",
            clip: true
          }
        ]
      },
      width: 384,
      height: 192,
      seed: 0
    }
  },
  {
    section: "seed-variations",
    name: "smoke-seed-0",
    description: "Smoke variation with seed 0.",
    outputPath: `${outputRoot}/seed-variations/smoke-seed-0.png`,
    input: {
      mode: "preset",
      preset: "smoke",
      params: {
        density: 0.62,
        turbulence: 0.46
      },
      width: 256,
      height: 256,
      seed: 0
    }
  },
  {
    section: "seed-variations",
    name: "smoke-seed-1",
    description: "Smoke variation with seed 1.",
    outputPath: `${outputRoot}/seed-variations/smoke-seed-1.png`,
    input: {
      mode: "preset",
      preset: "smoke",
      params: {
        density: 0.62,
        turbulence: 0.46
      },
      width: 256,
      height: 256,
      seed: 1
    }
  },
  {
    section: "seed-variations",
    name: "smoke-seed-2",
    description: "Smoke variation with seed 2.",
    outputPath: `${outputRoot}/seed-variations/smoke-seed-2.png`,
    input: {
      mode: "preset",
      preset: "smoke",
      params: {
        density: 0.62,
        turbulence: 0.46
      },
      width: 256,
      height: 256,
      seed: 2
    }
  },
  {
    section: "seed-variations",
    name: "smoke-seed-3",
    description: "Smoke variation with seed 3.",
    outputPath: `${outputRoot}/seed-variations/smoke-seed-3.png`,
    input: {
      mode: "preset",
      preset: "smoke",
      params: {
        density: 0.62,
        turbulence: 0.46
      },
      width: 256,
      height: 256,
      seed: 3
    }
  }
];

function toPosixRelativePath(targetPath) {
  return targetPath.split(path.sep).join("/");
}

function groupBySection(items) {
  return {
    "preset-gallery": items.filter((item) => item.section === "preset-gallery"),
    "parameter-sweep": items.filter((item) => item.section === "parameter-sweep"),
    "rotation-preview": items.filter((item) => item.section === "rotation-preview"),
    "seed-variations": items.filter((item) => item.section === "seed-variations")
  };
}

function renderHtml(items) {
  const groups = groupBySection(items);
  const titles = {
    "preset-gallery": "Preset Gallery",
    "parameter-sweep": "Parameter Sweep",
    "rotation-preview": "Rotation Preview",
    "seed-variations": "Seed Variations"
  };

  const sections = Object.entries(groups)
    .map(([section, sectionItems]) => {
      const cards = sectionItems
        .map((item) => {
          const relativeImagePath = toPosixRelativePath(path.relative(outputRoot, item.savedPath));

          return `
        <article class="card">
          <img src="${relativeImagePath}" alt="${item.name}" />
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <code>${relativeImagePath}</code>
        </article>`;
        })
        .join("");

      return `
      <section>
        <h2>${titles[section]}</h2>
        <div class="grid">${cards}</div>
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>texture-mcp demo gallery</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0a1018;
        --panel: #111a25;
        --panel-border: #223244;
        --text: #e8f1fb;
        --muted: #93a8bd;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(68, 170, 255, 0.15), transparent 36%),
          linear-gradient(180deg, #0b1220, var(--bg));
        color: var(--text);
      }
      main { max-width: 1280px; margin: 0 auto; }
      h1 { margin: 0 0 8px; font-size: 32px; }
      p.lead { margin: 0 0 28px; color: var(--muted); max-width: 780px; }
      section { margin: 0 0 36px; }
      h2 { margin: 0 0 16px; font-size: 22px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .card {
        background: rgba(17, 26, 37, 0.92);
        border: 1px solid var(--panel-border);
        border-radius: 16px;
        padding: 14px;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
      }
      img {
        width: 100%;
        display: block;
        border-radius: 12px;
        background:
          linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%),
          linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%);
        background-position: 0 0, 8px 8px;
        background-size: 16px 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      h3 { margin: 12px 0 8px; font-size: 16px; }
      .card p {
        margin: 0 0 10px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.45;
      }
      code {
        display: block;
        overflow-wrap: anywhere;
        color: #b8d8ff;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>texture-mcp demo gallery</h1>
      <p class="lead">
        Generated from built-in presets to help preview current visual range, parameter behavior,
        and seed-driven variation without going through MCP manually.
      </p>
      ${sections}
    </main>
  </body>
</html>
`;
}

function renderMarkdown(items) {
  const groups = groupBySection(items);
  const titles = {
    "preset-gallery": "Preset Gallery",
    "parameter-sweep": "Parameter Sweep",
    "rotation-preview": "Rotation Preview",
    "seed-variations": "Seed Variations"
  };

  const sections = Object.entries(groups)
    .map(([section, sectionItems]) => {
      const rows = sectionItems
        .map((item) => {
          const relativeImagePath = toPosixRelativePath(path.relative(outputRoot, item.savedPath));
          return `- \`${item.name}\` - ${item.description}\n  - Image: \`${relativeImagePath}\``;
        })
        .join("\n");

      return `## ${titles[section]}\n\n${rows}`;
    })
    .join("\n\n");

  return `# texture-mcp demo gallery

Generated with \`npm run demo:gallery\`.

- Output root: \`${outputRoot}\`
- HTML preview: \`index.html\`

${sections}
`;
}

async function main() {
  const generatedItems = [];

  for (const demoCase of demoCases) {
    const generated = generateTexture(demoCase.input);
    const exported = await exportTexture(generated, workspaceRoot, {
      outputPath: demoCase.outputPath,
      format: "png",
      saveMeta: false
    });

    generatedItems.push({
      ...demoCase,
      savedPath: exported.savedPath,
      width: generated.meta.width,
      height: generated.meta.height
    });

    console.log(`generated ${demoCase.name} -> ${path.relative(workspaceRoot, exported.savedPath)}`);
  }

  await writeFile(path.join(workspaceRoot, outputRoot, "index.html"), renderHtml(generatedItems), "utf8");
  await writeFile(path.join(workspaceRoot, outputRoot, "README.md"), renderMarkdown(generatedItems), "utf8");

  console.log(`gallery ready: ${path.join(outputRoot, "index.html")}`);
}

await main();
