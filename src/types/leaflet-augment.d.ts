import "leaflet";

declare module "leaflet" {
  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    minOpacity?: number;
    gradient?: Record<number, string>;
  }
  interface HeatLayer extends Layer {
    setLatLngs(latlngs: [number, number, number?][]): this;
  }
  /** Added at runtime by the leaflet.heat plugin. */
  function heatLayer(
    latlngs: [number, number, number?][],
    options?: HeatLayerOptions,
  ): HeatLayer;
}
