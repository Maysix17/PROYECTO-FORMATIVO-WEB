import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import TextInput from '../atoms/TextInput';
import type { CreateVentaDto } from '../../types/venta.types';
import { createVenta } from '../../services/ventaService';
import type { Cultivo } from '../../types/cultivos.types';
import { getCosechasAbiertasByCultivo } from '../../services/cosechasService';
import type { Cosecha } from '../../types/cosechas.types';

interface VentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cultivo: Cultivo | null;
  onSuccess: () => void;
}

const VentaModal: React.FC<VentaModalProps> = ({ isOpen, onClose, cultivo, onSuccess }) => {
   const [formData, setFormData] = useState<CreateVentaDto>({
     cantidad: 0,
     fecha: new Date().toISOString().split('T')[0], // Fecha automática del día actual
     fkCosechaId: '', // This needs to be set properly
     unidadMedida: 'kg',
     precioUnitario: 0,
   });

   // Ensure fecha is always a string
   const fechaValue = formData.fecha || '';
   const [loading, setLoading] = useState(false);
   const [cosechasDisponibles, setCosechasDisponibles] = useState<Cosecha[]>([]);
   const [selectedHarvests, setSelectedHarvests] = useState<Array<{id: string, cantidad: number}>>([]);
   const [totalAvailable, setTotalAvailable] = useState<number>(0);

   const isPerenne = cultivo?.tipoCultivo?.esPerenne || false;

   // Check if this is a transient crop that has been completely sold
   const hasNoAvailableHarvests = !isPerenne && cosechasDisponibles.length > 0 && cosechasDisponibles.every(c => c.cantidadDisponible === 0);

   useEffect(() => {
     if (isOpen && cultivo) {
       loadCosechasDisponibles();
     }
   }, [isOpen, cultivo]);

   useEffect(() => {
     // Calculate total available when selected harvests change
     if (selectedHarvests.length > 0) {
       const total = selectedHarvests.reduce((sum, harvest) => {
         const cosecha = cosechasDisponibles.find(c => c.id === harvest.id);
         const disponible = cosecha?.cantidadDisponible || 0;
         console.log(`[DEBUG] VentaModal - Calculando total: cosecha ${harvest.id}, disponible: ${disponible}`);
         return sum + disponible;
       }, 0);
       console.log(`[DEBUG] VentaModal - Total disponible calculado: ${total}`);
       setTotalAvailable(total);
     } else {
       setTotalAvailable(0);
     }
   }, [selectedHarvests, cosechasDisponibles]);

   const loadCosechasDisponibles = async () => {
     if (!cultivo) return;

     try {
       console.log('[DEBUG] VentaModal - Cargando cosechas abiertas para cultivo:', cultivo.cvzid);
       const cosechas = await getCosechasAbiertasByCultivo(cultivo.cvzid);
       console.log('[DEBUG] VentaModal - Cosechas abiertas obtenidas:', cosechas?.map(c => ({
         id: c.id,
         cantidad: c.cantidad,
         cantidadDisponible: c.cantidadDisponible,
         cerrado: c.cerrado
       })));

       setCosechasDisponibles(cosechas || []);

       // Resetear selecciones previas
       setSelectedHarvests([]);

       // Auto-seleccionar todas las cosechas disponibles por defecto
       if (cosechas && cosechas.length > 0) {
         const availableHarvests = cosechas.filter(c => (c.cantidadDisponible || 0) > 0);
         console.log('[DEBUG] VentaModal - Cosechas disponibles para selección automática:', availableHarvests.map(c => ({
           id: c.id,
           cantidadDisponible: c.cantidadDisponible
         })));
         setSelectedHarvests(availableHarvests.map(c => ({ id: c.id, cantidad: c.cantidadDisponible || 0 })));
       }
     } catch (error) {
       console.error('Error loading cosechas:', error);
       setCosechasDisponibles([]);
       setSelectedHarvests([]);
     }
   };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('[DEBUG] VentaModal - Iniciando registro de venta');
    console.log('[DEBUG] VentaModal - Cantidad a vender:', formData.cantidad);
    console.log('[DEBUG] VentaModal - Cosechas seleccionadas:', selectedHarvests);
    console.log('[DEBUG] VentaModal - Total disponible calculado:', totalAvailable);

    // Validate that at least one harvest is selected
    if (selectedHarvests.length === 0) {
      alert('Debe seleccionar al menos una cosecha para registrar la venta');
      return;
    }

    let ventaData: any = {
      ...formData,
      fecha: fechaValue,
      multipleHarvests: selectedHarvests,
      fkCosechaId: selectedHarvests[0].id, // Reference harvest
    };

    setLoading(true);
    try {
      console.log('[DEBUG] VentaModal - Enviando datos de venta:', ventaData);
      await createVenta(ventaData);
      console.log('[DEBUG] VentaModal - Venta registrada exitosamente');

      // Refrescar los datos de cosechas disponibles después de la venta
      console.log('[DEBUG] VentaModal - Refrescando datos de cosechas después de venta');
      await loadCosechasDisponibles();

      // NOTE: Removed auto-finalization for transient crops.
      // They should only be finalized when explicitly requested via "Cerrar venta de cosecha actual" button.
      // This prevents premature finalization when registering sales.

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating venta:', error);
      alert('Error al registrar venta: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateVentaDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // If this is a transient crop that has been completely sold, show completion message
  if (hasNoAvailableHarvests) {
    return (
      <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
        <ModalContent className="bg-white p-6">
          <ModalHeader>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Registrar Venta</h2>
              {cultivo && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>Cultivo:</strong> {cultivo.tipoCultivo?.nombre || 'N/A'} - {cultivo.nombrecultivo || 'N/A'}</div>
                    <div><strong>Zona:</strong> {cultivo.lote || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="text-center py-8">
              <div className="text-primary-600 text-lg font-semibold mb-2">✅ Cultivo Completado</div>
              <p className="text-gray-700">Ya registraste el cultivo, ya fue vendido y cosechado.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <CustomButton onClick={onClose} variant="bordered">
              Cerrar
            </CustomButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
      <ModalContent className="bg-white p-6">
        <ModalHeader>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Registrar Venta</h2>
            {cultivo && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Cultivo:</strong> {cultivo.tipoCultivo?.nombre || 'N/A'} - {cultivo.nombrecultivo || 'N/A'}</div>
                  <div><strong>Zona:</strong> {cultivo.lote || 'N/A'}</div>
                </div>
              </div>
            )}
          </div>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="grid grid-cols-2 gap-6">
              {/* Panel izquierdo: Información del cultivo y selecciones */}
              <div className="space-y-4">
                {/* Selección de cosechas para perennes y transitorios */}
                {cosechasDisponibles.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        Seleccionar Cosechas para Venta
                      </label>
                      <label className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          className="mr-1"
                          onChange={(e) => {
                            const availableHarvests = cosechasDisponibles.filter(c => (c.cantidadDisponible || 0) > 0);
                            if (e.target.checked) {
                              setSelectedHarvests(availableHarvests.map(c => ({ id: c.id, cantidad: c.cantidadDisponible || 0 })));
                            } else {
                              setSelectedHarvests([]);
                            }
                          }}
                        />
                        Seleccionar todas
                      </label>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                      {cosechasDisponibles
                        .filter(cosecha => (cosecha.cantidadDisponible || 0) > 0)
                        .map((cosecha) => (
                        <label
                          key={cosecha.id}
                          className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-colors ${
                            selectedHarvests.some(h => h.id === cosecha.id)
                              ? 'bg-primary-100 border border-primary-300'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedHarvests.some(h => h.id === cosecha.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedHarvests(prev => [...prev, { id: cosecha.id, cantidad: cosecha.cantidadDisponible || 0 }]);
                              } else {
                                setSelectedHarvests(prev => prev.filter(h => h.id !== cosecha.id));
                              }
                            }}
                            className="mr-1"
                          />
                          <span className="text-sm flex-1">
                            {cosecha.fecha ? new Date(cosecha.fecha).toLocaleDateString() : 'Sin fecha'} - {cosecha.cantidadDisponible} {cosecha.unidadMedida}
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedHarvests.length > 0 && (
                      <div className="mt-2 p-2 bg-primary-50 rounded text-sm">
                        <p><strong>Cosechas seleccionadas:</strong> {selectedHarvests.length}</p>
                        <p><strong>Total disponible:</strong> {totalAvailable} {cosechasDisponibles[0]?.unidadMedida || 'kg'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Panel derecho: Cantidad, fecha y precio */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unidad de Medida</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={formData.unidadMedida}
                    onChange={(e) => handleChange('unidadMedida', e.target.value)}
                  >
                    <option value="kg">Kilogramos</option>
                    <option value="lb">Libras</option>
                  </select>
                </div>
                <TextInput
                  label="Cantidad"
                  type="number"
                  value={formData.cantidad ? formData.cantidad.toString() : ''}
                  onChange={(e) => handleChange('cantidad', parseFloat(e.target.value) || 0)}
                />
                {selectedHarvests.length > 0 && (
                  <p className="text-xs text-gray-600">
                    Máximo disponible: {totalAvailable} {cosechasDisponibles[0]?.unidadMedida || 'kg'}
                  </p>
                )}
                <TextInput
                  label="Fecha"
                  type="date"
                  value={fechaValue}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  disabled
                />
                <TextInput
                  label={`Precio por ${formData.unidadMedida === 'kg' ? 'Kilo' : 'Libra'}`}
                  type="number"
                  value={formData.precioUnitario?.toString() || ''}
                  onChange={(e) => handleChange('precioUnitario', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <CustomButton type="button" onClick={onClose} variant="bordered">
              Cancelar
            </CustomButton>
            <CustomButton type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar'}
            </CustomButton>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default VentaModal;