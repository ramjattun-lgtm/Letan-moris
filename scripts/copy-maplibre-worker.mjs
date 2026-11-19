// Copies MapLibre's web worker into /public so the browser can load it.
// (Bundlers can't resolve the worker URL MapLibre computes from its own module URL.)
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/maplibre", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs");
console.log("maplibre worker copied");
