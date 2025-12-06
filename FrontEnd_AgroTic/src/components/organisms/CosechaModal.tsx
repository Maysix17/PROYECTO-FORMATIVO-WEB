import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import TextInput from '../atoms/TextInput';
import type { CreateCosechaDto } from '../../types/cosechas.types';
import { createCosecha } from '../../services/cosechasService';
import { usePermission } from '../../contexts/PermissionContext';

interface CosechaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvzId: string;
  onSuccess: () => void;
  isPerenne?: boolean;
  cultivo?: any; // Para mostrar información del cultivo
}

const CosechaModal: React.FC<CosechaModalProps> = ({ isOpen, onClose, cvzId, onSuccess, cultivo }) => {
  // Función para obtener la fecha local en formato YYYY-MM-DD
  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<CreateCosechaDto>({
    unidadMedida: 'kg',
    cantidad: 0,
    fecha: getLocalDateString(), // Fecha automática del día actual en zona local
    fkCultivosVariedadXZonaId: cvzId,
    cantidad_plantas_cosechadas: undefined,
  });
  const [loading, setLoading] = useState(false);
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        fkCultivosVariedadXZonaId: cvzId,
        fecha: getLocalDateString() // Asegurar fecha actual al abrir
      }));
    }
  }, [isOpen, cvzId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fkCultivosVariedadXZonaId) return;

    // Asegurar que la fecha se envíe como fecha local correcta
    const fechaLocal = new Date(formData.fecha + 'T12:00:00'); // Mediodía local para evitar problemas de zona horaria
    const fechaISO = fechaLocal.toISOString();

    const dataToSend = {
      ...formData,
      fecha: fechaISO // Enviar como ISO string con zona horaria
    };
    if (formData.cantidad_plantas_cosechadas && formData.cantidad_plantas_cosechadas > 0) {
      dataToSend.rendimiento_por_planta = formData.cantidad / formData.cantidad_plantas_cosechadas;
    }

    setLoading(true);
    try {
      await createCosecha(dataToSend);

      // Nota: No finalizamos automáticamente cultivos perennes después de cosechar
      // Solo se finalizan cuando el usuario presiona el botón "Finalizar Cultivo"
      // Los cultivos transitorios se finalizan automáticamente después de vender

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating cosecha:', error);
      alert('Error al registrar cosecha: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateCosechaDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="md">
      <ModalContent className="bg-white p-6">
        <ModalHeader>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Registrar Cosecha</h2>
            {cultivo && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Cultivo:</strong> {cultivo.tipoCultivo?.nombre || 'N/A'} {cultivo.nombrecultivo || 'N/A'}</div>
                  <div><strong>Zona:</strong> {cultivo.lote || 'N/A'}</div>
                </div>
              </div>
            )}
          </div>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unidad de Medida</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={formData.unidadMedida}
                  onChange={(e) => handleChange('unidadMedida', e.target.value)}
                >
                  <option value="kg">Kilogramos</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Solo se permite cosechar en kilogramos para mantener consistencia en el sistema.
                </p>
              </div>
              <TextInput
                label="Cantidad"
                type="number"
                value={formData.cantidad.toString()}
                onChange={(e) => handleChange('cantidad', parseFloat(e.target.value))}
              />
              <TextInput
                label="Fecha"
                type="date"
                value={formData.fecha || ''}
                onChange={(e) => handleChange('fecha', e.target.value)}
              />
              <TextInput
                label="Cantidad de Plantas Cosechadas"
                type="number"
                value={formData.cantidad_plantas_cosechadas?.toString() || ''}
                onChange={(e) => handleChange('cantidad_plantas_cosechadas', parseInt(e.target.value) || undefined)}
                placeholder="Opcional - para calcular rendimiento por planta"
              />
              {formData.cantidad_plantas_cosechadas && formData.cantidad > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Rendimiento por planta: {(formData.cantidad / formData.cantidad_plantas_cosechadas).toFixed(2)} {formData.unidadMedida}/planta
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <CustomButton type="button" onClick={onClose} variant="bordered">
              Cancelar
            </CustomButton>
            {!isInitializing && hasPermission('Cultivos', 'cultivos', 'crear') && (
              <CustomButton type="submit" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrar'}
              </CustomButton>
            )}
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default CosechaModal;