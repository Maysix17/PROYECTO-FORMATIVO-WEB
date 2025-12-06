import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import TextInput from '../atoms/TextInput';
import type { CreateVentaDto } from '../../types/venta.types';
import { createVenta } from '../../services/ventaService';
import type { Cultivo } from '../../types/cultivos.types';
import { getCosechasAbiertasByCultivo } from '../../services/cosechasService';
import type { Cosecha } from '../../types/cosechas.types';
import jsPDF from 'jspdf';
import { usePermission } from '../../contexts/PermissionContext';

interface VentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cultivo: Cultivo | null;
  onSuccess: () => void;
}

const VentaModal: React.FC<VentaModalProps> = ({ isOpen, onClose, cultivo, onSuccess }) => {
    // Función para obtener la fecha local en formato YYYY-MM-DD
    const getLocalDateString = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
  
    const [formData, setFormData] = useState<CreateVentaDto>({
      cantidad: 0,
      fecha: getLocalDateString(), // Fecha automática del día actual en zona local
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
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [saleData, setSaleData] = useState<any>(null);
    const { hasPermission, isInitializing } = usePermission();

   const isPerenne = cultivo?.tipoCultivo?.esPerenne || false;

   // Check if this is a transient crop that has been completely sold
   const hasNoAvailableHarvests = !isPerenne && cosechasDisponibles.length > 0 && cosechasDisponibles.every(c => c.cantidadDisponible === 0);

   useEffect(() => {
     if (isOpen && cultivo) {
       loadCosechasDisponibles();
       setSaleCompleted(false);
       setSaleData(null);
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

    // Asegurar que la fecha se envíe como fecha local correcta
    const fechaLocal = new Date(fechaValue + 'T12:00:00'); // Mediodía local para evitar problemas de zona horaria
    const fechaISO = fechaLocal.toISOString();

    let ventaData: any = {
      ...formData,
      fecha: fechaISO, // Enviar como ISO string con zona horaria
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

      // Set sale data for success view
      const total = formData.cantidad * (formData.precioUnitario || 0);
      setSaleData({
        cultivo: cultivo?.tipoCultivo?.nombre + ' - ' + cultivo?.nombrecultivo,
        zona: cultivo?.lote,
        cantidad: formData.cantidad,
        unidadMedida: formData.unidadMedida,
        precioUnitario: formData.precioUnitario,
        total: total,
        fecha: fechaValue,
        cosechasSeleccionadas: selectedHarvests.length
      });
      setSaleCompleted(true);

      onSuccess();
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

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && saleData) {
      const today = new Date();
      const fechaRecibo = today.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const horaRecibo = today.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Recibo de Venta</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                margin: 0;
                padding: 10px;
                max-width: 300px;
                margin: 0 auto;
              }
              .receipt {
                border: 1px dashed #000;
                padding: 15px;
                text-align: center;
              }
              .header {
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 10px;
                border-bottom: 1px dashed #000;
                padding-bottom: 5px;
              }
              .line {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
              }
              .total {
                font-weight: bold;
                font-size: 14px;
                border-top: 1px dashed #000;
                padding-top: 5px;
                margin-top: 10px;
              }
              .footer {
                margin-top: 15px;
                font-size: 10px;
                border-top: 1px dashed #000;
                padding-top: 5px;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                AGROTIC<br>
                Sistema de Gestión Agrícola<br>
                RECIBO DE VENTA
              </div>
              <div class="line"><span>Fecha:</span><span>${fechaRecibo}</span></div>
              <div class="line"><span>Hora:</span><span>${horaRecibo}</span></div>
              <div class="line"><span>Cultivo:</span><span>${saleData.cultivo}</span></div>
              <div class="line"><span>Zona:</span><span>${saleData.zona}</span></div>
              <div class="line"><span>Cantidad:</span><span>${saleData.cantidad} ${saleData.unidadMedida}</span></div>
              <div class="line"><span>Precio ${saleData.unidadMedida === 'kg' ? 'Kilo' : 'Libra'}.:</span><span>$${saleData.precioUnitario}</span></div>
              <div class="line"><span>Cosechas Sel.:</span><span>${saleData.cosechasSeleccionadas}</span></div>
              <div class="total">
                <div class="line"><span>TOTAL:</span><span>$${saleData.total.toFixed(2)}</span></div>
              </div>
              <div class="footer">
                ¡Gracias por su compra!<br>
                AgroTic - Tecnología Agrícola
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadPDF = () => {
    if (!saleData) return;

    const today = new Date();
    const fechaRecibo = today.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const horaRecibo = today.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150] // Receipt size
    });

    // Set font
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);

    let y = 10;

    // Header
    doc.setFontSize(12);
    doc.text('AGROTIC', 40, y, { align: 'center' });
    y += 5;
    doc.setFontSize(8);
    doc.text('Sistema de Gestión Agrícola', 40, y, { align: 'center' });
    y += 5;
    doc.text('RECIBO DE VENTA', 40, y, { align: 'center' });
    y += 8;

    // Line
    doc.line(5, y, 75, y);
    y += 5;

    // Details
    doc.setFontSize(8);
    doc.text(`Fecha: ${fechaRecibo}`, 5, y);
    y += 4;
    doc.text(`Hora: ${horaRecibo}`, 5, y);
    y += 4;
    doc.text(`Cultivo: ${saleData.cultivo}`, 5, y);
    y += 4;
    doc.text(`Zona: ${saleData.zona}`, 5, y);
    y += 4;
    doc.text(`Cantidad: ${saleData.cantidad} ${saleData.unidadMedida}`, 5, y);
    y += 4;
    doc.text(`Precio ${saleData.unidadMedida === 'kg' ? 'Kilo' : 'Libra'}.: $${saleData.precioUnitario}`, 5, y);
    y += 4;
    doc.text(`Cosechas Sel.: ${saleData.cosechasSeleccionadas}`, 5, y);
    y += 8;

    // Total line
    doc.line(5, y, 75, y);
    y += 5;
    doc.setFontSize(10);
    doc.text(`TOTAL: $${saleData.total.toFixed(2)}`, 5, y);
    y += 8;

    // Footer
    doc.line(5, y, 75, y);
    y += 5;
    doc.setFontSize(6);
    doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });
    y += 3;
    doc.text('AgroTic - Tecnología Agrícola', 40, y, { align: 'center' });

    // Save the PDF
    doc.save(`recibo-venta-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // If this is a transient crop that has been completely sold, show completion message with print options
  if (hasNoAvailableHarvests && saleCompleted && saleData) {
    return (
      <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
        <ModalContent className="bg-white p-6">
          <ModalHeader>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Venta Completada - Cultivo Finalizado</h2>
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
              <div className="text-green-600 text-2xl font-semibold mb-4">✅ Venta y Cultivo Completados</div>
              <p className="text-gray-700 mb-6">Se vendió toda la cantidad disponible. El cultivo transitorio ha sido completado.</p>
              <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                <h3 className="font-semibold mb-2">Detalles de la Venta Final:</h3>
                <p><strong>Cultivo:</strong> {saleData?.cultivo}</p>
                <p><strong>Zona:</strong> {saleData?.zona}</p>
                <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}</p>
                <p><strong>Cantidad:</strong> {saleData?.cantidad} {saleData?.unidadMedida}</p>
                <p><strong>Precio {saleData?.unidadMedida === 'kg' ? 'Kilo' : 'Libra'}:</strong> ${saleData?.precioUnitario}</p>
                <p><strong>Total:</strong> ${saleData?.total?.toFixed(2)}</p>
                <p><strong>Cosechas Seleccionadas:</strong> {saleData?.cosechasSeleccionadas}</p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <CustomButton onClick={handlePrintReceipt} variant="solid">
              Imprimir Recibo
            </CustomButton>
            <CustomButton onClick={handleDownloadPDF} variant="solid">
              Descargar PDF
            </CustomButton>
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
        {saleCompleted ? (
          <>
            <ModalBody>
              <div className="text-center py-8">
                <div className="text-green-600 text-2xl font-semibold mb-4">✅ Venta Exitosa</div>
                <p className="text-gray-700 mb-6">La venta ha sido registrada correctamente.</p>
                <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                  <h3 className="font-semibold mb-2">Detalles de la Venta:</h3>
                  <p><strong>Cultivo:</strong> {saleData?.cultivo}</p>
                  <p><strong>Zona:</strong> {saleData?.zona}</p>
                  <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}</p>
                  <p><strong>Cantidad:</strong> {saleData?.cantidad} {saleData?.unidadMedida}</p>
                  <p><strong>Precio {saleData?.unidadMedida === 'kg' ? 'Kilo' : 'Libra'}:</strong> ${saleData?.precioUnitario}</p>
                  <p><strong>Total:</strong> ${saleData?.total?.toFixed(2)}</p>
                  <p><strong>Cosechas Seleccionadas:</strong> {saleData?.cosechasSeleccionadas}</p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <CustomButton onClick={handlePrintReceipt} variant="solid">
                Imprimir Recibo
              </CustomButton>
              <CustomButton onClick={handleDownloadPDF} variant="solid">
                Descargar PDF
              </CustomButton>
              <CustomButton onClick={onClose} variant="bordered">
                Cerrar
              </CustomButton>
            </ModalFooter>
          </>
        ) : (
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
                  min="0"
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
                  min="0"
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
            {!isInitializing && hasPermission('Cultivos', 'cultivos', 'crear') && (
              <CustomButton type="submit" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrar'}
              </CustomButton>
            )}
          </ModalFooter>
        </form>
        )}
      </ModalContent>
    </Modal>
  );
};

export default VentaModal;