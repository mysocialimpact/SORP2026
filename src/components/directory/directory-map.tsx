"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Bounds, Firm, Point } from "@/lib/accountants";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export type MapView = { point?: Point; nationwide?: boolean; revision: number };
type Props = {
  firms: Firm[]; selected: string | null; origin: Point | null; view: MapView;
  onSelect: (slug: string) => void; onMove: (bounds: Bounds) => void;
};
export default function DirectoryMap({ firms, selected, origin, view, onSelect, onMove }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const library = useRef<typeof Leaflet | null>(null);
  const group = useRef<Leaflet.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, Leaflet.Marker>());
  const callbacks = useRef({ onSelect, onMove });
  const latestView = useRef({ view, selected });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  useEffect(() => { callbacks.current = { onSelect, onMove }; }, [onSelect, onMove]);
  useLayoutEffect(() => { latestView.current = { view, selected }; }, [view, selected]);

  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    async function start() {
      const leafletModule = await import("leaflet");
      // Markercluster extends Leaflet's mutable UMD export, not an ES module namespace.
      const L = leafletModule.default;
      (window as Window & { L?: typeof Leaflet }).L = L;
      await import("leaflet.markercluster");
      if (disposed || !container.current) return;
      library.current = L;
      const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      const instance = L.map(container.current, { scrollWheelZoom: false, minZoom: 4, maxZoom: 18, zoomControl: false, zoomAnimation: motion, fadeAnimation: motion, markerZoomAnimation: motion }).setView([54.3,-3.4], 5);
      map.current = instance;
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.control.scale({ imperial: true, metric: false, position: "bottomleft" }).addTo(instance);
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(instance);
      tiles.on("tileerror", () => { if (!disposed) setTilesFailed(true); });
      tiles.on("tileload", () => { if (!disposed) setTilesFailed(false); });
      group.current = L.markerClusterGroup({ maxClusterRadius: 40, showCoverageOnHover: false, spiderfyOnMaxZoom: true,
        // Avoid stale animated cluster layers when the mobile map is hidden/revealed.
        animate: false,
        iconCreateFunction(cluster) {
          return L.divIcon({ className: "directory-cluster", html: `<span>${cluster.getChildCount()}</span>`, iconSize: [42,42] });
        },
      }).addTo(instance);
      instance.on("moveend", () => {
        const b = instance.getBounds();
        callbacks.current.onMove({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
      });
      let wasVisible = false;
      resize = new ResizeObserver(entries => {
        const visible = entries[0].contentRect.width > 0 && entries[0].contentRect.height > 0;
        instance.invalidateSize();
        if (visible && !wasVisible) {
          const { view: currentView, selected: currentSelected } = latestView.current;
          const marker = currentSelected && markers.current.get(currentSelected);
          if (marker) { instance.stop(); instance.setView(marker.getLatLng(), 12, { animate: false }); group.current?.zoomToShowLayer(marker, () => marker.openTooltip()); }
          else if (currentView.point) instance.setView([currentView.point.lat,currentView.point.lng],10,{animate:false});
          else instance.fitBounds([[49.8,-8.3],[59,1.8]],{padding:[30,30],animate:false});
        }
        wasVisible = visible;
      });
      resize.observe(container.current);
      setReady(true);
    }
    start().catch(error => { console.error("Directory map initialization failed", error); if (!disposed) setFailed(true); });
    return () => { disposed = true; resize?.disconnect(); map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const L = library.current, cluster = group.current;
    if (!ready || !L || !cluster) return;
    cluster.clearLayers(); markers.current.clear();
    for (const firm of firms) {
      if (!firm.coordinates) continue;
      const icon = L.divIcon({ className: `directory-pin${firm.featured ? " is-featured" : ""}`,
        html: `<span aria-hidden="true">${firm.featured ? "★" : ""}</span>`, iconSize: [28,36], iconAnchor: [14,36] });
      const marker = L.marker([firm.coordinates.lat, firm.coordinates.lng], { icon, title: firm.name, alt: firm.name, keyboard: true });
      const tooltip = document.createElement("span"); tooltip.textContent = firm.name;
      marker.bindTooltip(tooltip, { direction: "top", offset: [0,-34] });
      marker.on("click", () => callbacks.current.onSelect(firm.slug));
      cluster.addLayer(marker); markers.current.set(firm.slug, marker);
    }
  }, [firms, ready]);

  useEffect(() => {
    const marker = selected && markers.current.get(selected), instance = map.current, L = library.current;
    if (!ready || !instance || !L) return;
    for (const firm of firms) markers.current.get(firm.slug)?.setIcon(L.divIcon({
      className: `directory-pin${firm.featured ? " is-featured" : ""}${firm.slug === selected ? " is-selected" : ""}`,
      html: `<span aria-hidden="true">${firm.featured ? "★" : ""}</span>`, iconSize: [28,36], iconAnchor: [14,36],
    }));
    if (!marker || !container.current?.clientWidth) return;
    const p = marker.getLatLng();
    instance.stop();
    instance.setView(p, Math.max(instance.getZoom(), 12), { animate: false });
    group.current?.zoomToShowLayer(marker, () => marker.openTooltip());
  }, [ready, selected, firms]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !container.current?.clientWidth) return;
    if (view.point) instance.setView([view.point.lat, view.point.lng], 10);
    else if (view.nationwide) instance.fitBounds([[49.8,-8.3],[59,1.8]], { padding: [30,30] });
  }, [view, ready]);

  useEffect(() => {
    const L = library.current, instance = map.current;
    if (!ready || !origin || !L || !instance) return;
    const marker = L.circleMarker([origin.lat,origin.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#6148bc", fillOpacity: 1 }).addTo(instance);
    marker.bindTooltip("Your postcode", { direction: "top" });
    return () => { marker.remove(); };
  }, [origin, ready]);

  return <><div ref={container} role="region" className="directory-map-canvas" aria-label="Interactive map of charity accountants. Use the result list for an equivalent keyboard-accessible view." />
    {failed && <p className="directory-map-error" role="alert">The map couldn’t load. All firms and profiles are available in the list.</p>}
    {tilesFailed && !failed && <p className="directory-map-error" role="status">Map tiles are unavailable on this connection. Firm locations and the list remain available.</p>}
  </>;
}
