import * as maplibregl from "maplibre-gl";

let configured = false;
/** Point MapLibre at its worker file in /public (copied at build time). */
export function setupMaplibre() {
  if (!configured) {
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    configured = true;
  }
  return maplibregl;
}
