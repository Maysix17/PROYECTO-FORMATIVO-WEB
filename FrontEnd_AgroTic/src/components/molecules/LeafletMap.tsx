import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Zona {
  id: string;
  nombre: string;
  coorX: number;
  coorY: number;
  coordenadas?: any;
}

interface LeafletMapProps {
  zonas: Zona[];
  selectedZona?: Zona;
  onZonaSelect?: (zona: Zona) => void;
  showSatellite?: boolean;
  modalOpen?: boolean;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  zonas,
  selectedZona,
  onZonaSelect,
  showSatellite = true,
  modalOpen = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      maxZoom: 18,
      minZoom: 12,
    }).setView([1.8920, -76.0890], 16);

    // Remove attribution
    map.attributionControl.remove();

    // Add tile layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: ''
    });

    // Default to satellite
    if (showSatellite) {
      satelliteLayer.addTo(map);
    } else {
      osmLayer.addTo(map);
    }

    // Add layer control
    L.control.layers({
      'Mapa': osmLayer,
      'Satelital': satelliteLayer
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showSatellite]);

  // Update markers and polygons
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing markers and polygons
    markersRef.current.forEach(marker => map.removeLayer(marker));
    polygonsRef.current.forEach(polygon => map.removeLayer(polygon));
    markersRef.current.clear();
    polygonsRef.current.clear();

    // Add markers and polygons for zones
    zonas.forEach(zona => {
      // Add marker at center coordinates
      const marker = L.marker([zona.coorY, zona.coorX])
        .addTo(map)
        .bindPopup(`<strong>${zona.nombre}</strong>`);

      if (onZonaSelect) {
        marker.on('click', () => onZonaSelect(zona));
      }

      markersRef.current.set(zona.id, marker);

      // Add polygon if coordinates exist
      if (zona.coordenadas && Array.isArray(zona.coordenadas)) {
        const latlngs = zona.coordenadas.map((coord: any) => [coord.lat, coord.lng]);
        const polygon = L.polygon(latlngs, {
          color: selectedZona?.id === zona.id ? 'red' : 'blue',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.1,
        }).addTo(map);

        polygonsRef.current.set(zona.id, polygon);
      }
    });
  }, [zonas, selectedZona, onZonaSelect]);

  // Center on selected zone
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedZona) return;

    const map = mapInstanceRef.current;
    map.flyTo([selectedZona.coorY, selectedZona.coorX], 16, { duration: 0.8 });
  }, [selectedZona]);

  return <div ref={mapRef} style={{ height: '100%', width: '90%', borderRadius: '8px', zIndex: modalOpen ? 0 : 1 }} />;
};

export default LeafletMap;