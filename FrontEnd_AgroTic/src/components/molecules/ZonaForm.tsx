import React, { useState, useRef, useEffect } from "react";
import TextInput from "../atoms/TextInput";
import NumberInput from "../atoms/NumberInput";
import ButtonGroup from "../atoms/ButtonGroup";
import FormField from "../atoms/FormField";
import CustomButton from "../atoms/Boton";
import { zonaService } from "../../services/zonaService";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Zona } from "../../types/zona.types";

// Fix for default markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ZonaFormProps {
  onClose: () => void;
  onSave: () => void;
  zona?: Zona | null;
}

const ZonaForm: React.FC<ZonaFormProps> = ({ onClose, onSave, zona }) => {
  const [zonaData, setZonaData] = useState({
    nombre: "",
    coordenadas: null as {
      type: 'point' | 'polygon';
      coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
    } | null,
    areaMetrosCuadrados: undefined as number | undefined,
    fkMapaId: undefined, // Sin mapa por defecto
  });

  // Load zona data when editing
  useEffect(() => {
    if (zona) {
      setZonaData({
        nombre: zona.nombre,
        coordenadas: zona.coordenadas || null,
        areaMetrosCuadrados: zona.areaMetrosCuadrados,
        fkMapaId: undefined,
      });
    }
  }, [zona]);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'point' | 'polygon'>('point');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const drawingPointsRef = useRef<L.LatLng[]>([]);

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      maxZoom: 18,
      minZoom: 12,
    }).setView([1.8920, -76.0890], 17);

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

    satelliteLayer.addTo(map);

    // Add layer control
    L.control.layers({
      'Mapa': osmLayer,
      'Satelital': satelliteLayer
    }).addTo(map);

    // Add click handler for drawing
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isDrawing) return;

      if (drawingMode === 'point') {
        // Remove existing marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        // Add new marker
        const marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
        markerRef.current = marker;

        setZonaData(prev => ({
          ...prev,
          coordenadas: {
            type: 'point',
            coordinates: {
              lat: parseFloat(e.latlng.lat.toFixed(8)),
              lng: parseFloat(e.latlng.lng.toFixed(8))
            }
          }
        }));
      } else if (drawingMode === 'polygon') {
        drawingPointsRef.current.push(e.latlng);

        // Remove existing polygon
        if (polygonRef.current) {
          map.removeLayer(polygonRef.current);
        }

        // Draw polygon if we have at least 3 points
        if (drawingPointsRef.current.length >= 3) {
          const polygon = L.polygon(drawingPointsRef.current, {
            color: 'blue',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.1,
          }).addTo(map);
          polygonRef.current = polygon;

          setZonaData(prev => ({
            ...prev,
            coordenadas: {
              type: 'polygon',
              coordinates: drawingPointsRef.current.map(p => ({
                lat: parseFloat(p.lat.toFixed(8)),
                lng: parseFloat(p.lng.toFixed(8))
              }))
            }
          }));
        }
      }
    });

    // Add right-click handler to finish polygon
    map.on('contextmenu', () => {
      if (drawingMode === 'polygon' && isDrawing && drawingPointsRef.current.length >= 3) {
        // Close the polygon by connecting back to the first point
        drawingPointsRef.current.push(drawingPointsRef.current[0]);

        // Remove existing polygon
        if (polygonRef.current) {
          map.removeLayer(polygonRef.current);
        }

        // Draw final polygon
        const polygon = L.polygon(drawingPointsRef.current, {
          color: 'blue',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.1,
        }).addTo(map);
        polygonRef.current = polygon;

        setZonaData(prev => ({
          ...prev,
          coordenadas: {
            type: 'polygon',
            coordinates: drawingPointsRef.current.map(p => ({
              lat: parseFloat(p.lat.toFixed(8)),
              lng: parseFloat(p.lng.toFixed(8))
            }))
          }
        }));

        // Stop drawing after completing polygon
        setIsDrawing(false);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isDrawing, drawingMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiar errores previos
    setFieldErrors({});
    setGeneralError("");

    // Validar que se haya seleccionado una ubicación
    if (!zonaData.coordenadas) {
      setGeneralError("Hace falta seleccionar ubicación en el mapa");
      return;
    }

    // Preparar datos para enviar
    const dataToSend = {
      nombre: zonaData.nombre,
      coordenadas: zonaData.coordenadas,
      areaMetrosCuadrados: zonaData.areaMetrosCuadrados,
      fkMapaId: zonaData.fkMapaId,
    };

    console.log('Datos a enviar:', dataToSend);

    try {
      if (zona) {
        // Update existing zona
        const response = await zonaService.update(zona.id, dataToSend);
        console.log('Respuesta del servidor (update):', response);
      } else {
        // Create new zona
        const response = await zonaService.create(dataToSend);
        console.log('Respuesta del servidor (create):', response);
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error creating zona:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      const errorData = error.response?.data;
      if (errorData?.message && Array.isArray(errorData.message)) {
        // Errores de validación específicos por campo
        const fieldErrorMap: {[key: string]: string} = {};
        errorData.message.forEach((errMsg: string) => {
          if (errMsg.includes('nombre')) {
            fieldErrorMap.nombre = "Hace falta escribir el nombre de la zona";
          } else if (errMsg.includes('coordenadas')) {
            fieldErrorMap.coordenadas = "Hace falta seleccionar ubicación";
          } else if (errMsg.includes('areaMetrosCuadrados')) {
            fieldErrorMap.areaMetrosCuadrados = "Hace falta escribir el área en metros cuadrados";
          }
        });
        setFieldErrors(fieldErrorMap);
      } else {
        // Error general - mostrar mensaje compacto
        setGeneralError("Error al registrar la zona");
      }
    }
  };

  const toggleDrawing = () => {
    setIsDrawing(!isDrawing);
    if (!isDrawing) {
      // Clear existing drawings when starting to draw
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (polygonRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(polygonRef.current);
        polygonRef.current = null;
      }
      drawingPointsRef.current = [];
    }
  };

  const clearDrawing = () => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (polygonRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    drawingPointsRef.current = [];
    setZonaData(prev => ({
      ...prev,
      coordenadas: null
    }));
  };

  return (
    <div className="flex h-[70vh]">
      {/* Left side - Form */}
      <div className="w-1/4 p-4 border-r border-gray-200 flex flex-col gap-4">


        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-4">
            <FormField
              label="Nombre de la Zona"
              required
              error={fieldErrors.nombre}
            >
              <TextInput
                label=""
                placeholder="Ingrese nombre de la zona"
                value={zonaData.nombre}
                onChange={(e) => {
                  setZonaData({ ...zonaData, nombre: e.target.value });
                  // Limpiar error cuando el usuario empiece a escribir
                  if (fieldErrors.nombre) {
                    setFieldErrors(prev => ({ ...prev, nombre: '' }));
                  }
                }}
              />
            </FormField>

            <FormField
              label="Área (m²)"
              error={fieldErrors.areaMetrosCuadrados}
            >
              <NumberInput
                label=""
                value={zonaData.areaMetrosCuadrados}
                onChange={(value) => {
                  setZonaData({ ...zonaData, areaMetrosCuadrados: value });
                  // Limpiar error cuando el usuario empiece a escribir
                  if (fieldErrors.areaMetrosCuadrados) {
                    setFieldErrors(prev => ({ ...prev, areaMetrosCuadrados: '' }));
                  }
                }}
                placeholder="Ingrese área en metros cuadrados"
                min={0}
                step={0.01}
              />
            </FormField>
          </div>

          {/* Tipo y Ubicación - Responsive layout */}
          <div className="md:col-span-2">
            <ButtonGroup
              label="Selecione tipo de ubicación"
              options={[
                { value: 'point', label: 'Punto' },
                { value: 'polygon', label: 'Lote' }
              ]}
              value={drawingMode}
              onChange={(value) => setDrawingMode(value as 'point' | 'polygon')}
              layout="responsive"
              size="sm"
              color="primary"
            />
          </div>

          {/* Acciones - Responsive layout */}
          <div className="md:col-span-2">
            <FormField
              label="Acciones"
              helpText={
                drawingMode === 'point' && isDrawing ? "Haz clic en el mapa para colocar un punto" :
                drawingMode === 'polygon' && isDrawing ? "Haz clic en varios puntos para dibujar un polígono. Haz clic derecho para finalizar." :
                "Activa el modo dibujo para interactuar con el mapa"
              }
            >
              <ButtonGroup
                options={[
                  { value: 'draw', label: isDrawing ? 'Detener' : 'Dibujar' },
                  { value: 'clear', label: 'Limpiar' }
                ]}
                value={isDrawing ? 'draw' : ''}
                onChange={(value) => {
                  if (value === 'draw') toggleDrawing();
                  else if (value === 'clear') clearDrawing();
                }}
                layout="responsive"
                size="sm"
                color="primary"
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-3 justify-end">
              <CustomButton
                type="button"
                text="Cancelar"
                onClick={onClose}
                variant="light"
                color="secondary"
                size="sm"
              />
              <CustomButton
                type="submit"
                text={zona ? "Actualizar Zona" : "Registrar Zona"}
                color="primary"
                size="sm"
              />
            </div>

            {/* General error message - below buttons */}
            {generalError && (
              <div className="bg-red-50 border border-red-200 rounded px-2 py-1">
                <p className="text-red-600 text-xs">{generalError}</p>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Right side - Map */}
      <div className="w-3/4 p-4">
        <div className="w-full h-full border border-gray-300 rounded-md overflow-hidden">
          <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>
    </div>
  );
};

export default ZonaForm;