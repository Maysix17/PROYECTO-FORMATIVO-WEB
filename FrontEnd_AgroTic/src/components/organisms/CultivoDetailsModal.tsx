import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import type { Cultivo } from '../../types/cultivos.types';
import { calcularEdadCultivo } from '../../services/cultivosVariedadZonaService';
import * as XLSX from 'xlsx';
import { getActividadesByCultivoVariedadZonaId } from '../../services/actividadesService';
import { getCosechasByCultivo } from '../../services/cosechasService';
import { getVentas } from '../../services/ventaService';
import type { Actividad } from '../../services/actividadesService';
import type { Cosecha } from '../../types/cosechas.types';

interface CultivoDetailsModalProps {
   isOpen: boolean;
   onClose: () => void;
   cultivo: Cultivo | null;
 }

const CultivoDetailsModal: React.FC<CultivoDetailsModalProps> = ({
   isOpen,
   onClose,
   cultivo
 }) => {
  console.log('CultivoDetailsModal - isOpen:', isOpen, 'cultivo:', cultivo);

  const [currentCultivo, setCurrentCultivo] = useState<Cultivo | null>(cultivo);

  // Update local state when cultivo prop changes
  useEffect(() => {
    console.log('CultivoDetailsModal - cultivo prop changed:', cultivo);
    setCurrentCultivo(cultivo);
  }, [cultivo]);


  if (!currentCultivo) return null;

  const exportToExcel = async () => {
    if (!currentCultivo) return;

    try {
      // Fetch all related data
      const [actividades, cosechas, ventas] = await Promise.all([
        getActividadesByCultivoVariedadZonaId(currentCultivo.cvzid),
        getCosechasByCultivo(currentCultivo.cvzid),
        getVentas()
      ]);

      // Filter ventas related to this cultivo's cosechas
      const cultivoVentas = ventas.filter(venta =>
        cosechas.some(cosecha => cosecha.id === venta.fkCosechaId)
      );

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Resumen del Cultivo
      const resumenData = [
        ["Campo", "Valor"],
        ["ID del Cultivo", currentCultivo.cvzid],
        ["Ficha", currentCultivo.ficha],
        ["Lote", currentCultivo.lote],
        ["Nombre del Cultivo", `${currentCultivo.tipoCultivo?.nombre || ''} ${currentCultivo.nombrecultivo}`.trim()],
        ["Fecha de Siembra", currentCultivo.fechasiembra ? new Date(currentCultivo.fechasiembra).toLocaleDateString('es-CO') : "N/A"],
        ["Fecha de Cosecha", currentCultivo.fechacosecha ? new Date(currentCultivo.fechacosecha).toLocaleDateString('es-CO') : "N/A"],
        ["Edad del Cultivo", currentCultivo.fechasiembra ? `${calcularEdadCultivo(currentCultivo.fechasiembra)} días` : "N/A"],
        ["Cantidad de Plantas Inicial", currentCultivo.cantidad_plantas_inicial || "No registrado"],
        ["Cantidad de Plantas Actual", currentCultivo.cantidad_plantas_actual || "No registrado"],
        ["Estado Fenológico", currentCultivo.estado_fenologico_nombre || (typeof currentCultivo.estado_fenologico === 'object' ? currentCultivo.estado_fenologico.nombre : (currentCultivo.estado_fenologico || "No definido"))],
        ["Área del Terreno", currentCultivo.area_terreno ? `${currentCultivo.area_terreno} m²` : "N/A"],
        ["Rendimiento Promedio", currentCultivo.rendimiento_promedio ? `${currentCultivo.rendimiento_promedio.toFixed(2)} kg/planta` : "Sin datos"],
        ["Estado", currentCultivo.estado === 1 ? "En Curso" : "Finalizado"],
        ["Total Actividades", actividades.length],
        ["Total Cosechas", cosechas.length],
        ["Total Ventas", cultivoVentas.length],
        ["Ingresos Totales", cultivoVentas.reduce((sum, venta) => sum + (venta.precioUnitario || 0) * venta.cantidad, 0).toFixed(2)],
        ["Fecha de Exportación", new Date().toLocaleDateString('es-CO')]
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen del Cultivo");

      // Sheet 2: Actividades Realizadas
      const actividadesData = [
        ["ID", "Descripción", "Fecha Asignación", "Horas Dedicadas", "Estado", "Observación", "Responsable"]
      ];
      actividades.forEach((act: Actividad) => {
        actividadesData.push([
          act.id,
          act.descripcion,
          act.fechaAsignacion ? new Date(act.fechaAsignacion + 'T00:00:00').toLocaleDateString('es-CO') : "N/A",
          (act.horasDedicadas || 0).toString(),
          act.estado ? "Completada" : "Pendiente",
          act.observacion || "",
          (act.dniResponsable || "N/A").toString()
        ]);
      });
      const wsActividades = XLSX.utils.aoa_to_sheet(actividadesData);
      XLSX.utils.book_append_sheet(wb, wsActividades, "Actividades");

      // Sheet 3: Detalles Financieros (simplified - assuming costs from activities)
      const costosTotales = actividades.reduce((sum, act) => sum + (act.horasDedicadas || 0) * 10, 0); // Assuming $10/hour
      const ingresosTotales = cultivoVentas.reduce((sum, venta) => sum + (venta.precioUnitario || 0) * venta.cantidad, 0);
      const financierosData = [
        ["Categoría", "Descripción", "Monto", "Tipo"],
        ["Mano de Obra", "Costo estimado de actividades", costosTotales.toFixed(2), "Gasto"],
        ["Ventas", "Ingresos por ventas", ingresosTotales.toFixed(2), "Ingreso"],
        ["Total Gastos", "", costosTotales.toFixed(2), ""],
        ["Total Ingresos", "", ingresosTotales.toFixed(2), ""],
        ["Ganancia Neta", "", (ingresosTotales - costosTotales).toFixed(2), ""]
      ];
      const wsFinancieros = XLSX.utils.aoa_to_sheet(financierosData);
      XLSX.utils.book_append_sheet(wb, wsFinancieros, "Financieros");

      // Sheet 4: Cosechas y Ventas
      const cosechasVentasData = [
        ["ID Cosecha", "Fecha Cosecha", "Cantidad", "Unidad", "Disponible", "Estado", "ID Venta", "Fecha Venta", "Precio Unitario", "Total Venta"]
      ];
      cosechas.forEach((cosecha: Cosecha) => {
        const venta = cultivoVentas.find(v => v.fkCosechaId === cosecha.id);
        cosechasVentasData.push([
          cosecha.id,
          cosecha.fecha ? new Date(cosecha.fecha).toLocaleDateString('es-CO') : "N/A",
          cosecha.cantidad.toString(),
          cosecha.unidadMedida,
          cosecha.cantidadDisponible.toString(),
          cosecha.cerrado ? "Cerrada" : "Abierta",
          venta?.id || "Sin venta",
          venta?.fecha ? new Date(venta.fecha).toLocaleDateString('es-CO') : "N/A",
          (venta?.precioUnitario || 0).toString(),
          venta ? ((venta.precioUnitario || 0) * venta.cantidad).toFixed(2) : "0.00"
        ]);
      });
      const wsCosechasVentas = XLSX.utils.aoa_to_sheet(cosechasVentasData);
      XLSX.utils.book_append_sheet(wb, wsCosechasVentas, "Cosechas y Ventas");

      // Generate and download file
      const fileName = `Informe_Cultivo_${currentCultivo.ficha}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar el informe. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
      <ModalContent className="bg-white">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Detalles del Cultivo</h2>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Información Básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ficha</label>
              <p className="text-sm text-gray-900">{currentCultivo.ficha}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lote</label>
              <p className="text-sm text-gray-900">{currentCultivo.lote}</p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nombre del Cultivo</label>
              <p className="text-sm text-gray-900">{currentCultivo.tipoCultivo?.nombre} {currentCultivo.nombrecultivo}</p>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Siembra</label>
              <p className="text-sm text-gray-900">
                {currentCultivo.fechasiembra ? new Date(currentCultivo.fechasiembra).toLocaleDateString() : "Sin fecha"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Cosecha</label>
              <p className="text-sm text-gray-900">
                {currentCultivo.fechacosecha ? new Date(currentCultivo.fechacosecha).toLocaleDateString() : "Sin cosecha"}
              </p>
            </div>
          </div>

          {/* Características del Cultivo */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Características del Cultivo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Edad del Cultivo</label>
                <p className="text-sm text-gray-900">
                  {currentCultivo.fechasiembra ? `${calcularEdadCultivo(currentCultivo.fechasiembra)} días` : "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cantidad de Plantas Inicial</label>
                <p className="text-sm text-gray-900">{currentCultivo.cantidad_plantas_inicial || "No registrado"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cantidad de Plantas Actual</label>
                <p className="text-sm text-gray-900">{currentCultivo.cantidad_plantas_actual || "No registrado"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado Fenológico</label>
                <p className="text-sm text-gray-900">
                  {currentCultivo.estado_fenologico_nombre || (typeof currentCultivo.estado_fenologico === 'object' ? currentCultivo.estado_fenologico.nombre : (currentCultivo.estado_fenologico || "No definido"))}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Área del Terreno</label>
                <p className="text-sm text-gray-900">
                  {currentCultivo.area_terreno ? `${currentCultivo.area_terreno} m²` : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado del Cultivo</label>
            <span className={`px-2 py-1 rounded-full text-xs ${
              currentCultivo.estado === 1 ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-800'
            }`}>
              {currentCultivo.estado === 1 ? 'En Curso' : 'Finalizado'}
            </span>
          </div>
        </ModalBody>

        <ModalFooter className="flex justify-between">
          <CustomButton onClick={onClose} variant="bordered">
            Cerrar
          </CustomButton>

          {/* BOTÓN DE INFORMACIÓN EN ESQUINA DERECHA */}
          <CustomButton onClick={exportToExcel} variant="solid" color="success">
            Exportar Excel
          </CustomButton>
        </ModalFooter>
      </ModalContent>

    </Modal>
  );
};

export default CultivoDetailsModal;