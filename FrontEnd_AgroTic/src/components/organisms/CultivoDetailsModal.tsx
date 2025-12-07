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
import apiClient from '../../lib/axios/axios';

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

   // Estado para filtros de exportación
   const [fechaInicio, setFechaInicio] = useState<string>('');
   const [fechaFin, setFechaFin] = useState<string>('');
   const [exportarTodo, setExportarTodo] = useState<boolean>(false);

  // Update local state when cultivo prop changes
  useEffect(() => {
    console.log('CultivoDetailsModal - cultivo prop changed:', cultivo);
    setCurrentCultivo(cultivo);
  }, [cultivo]);


  if (!currentCultivo) return null;

  const exportToExcel = async (fechaInicio?: string, fechaFin?: string, exportarTodo: boolean = false) => {
    if (!currentCultivo) return;

    console.log('📊 EXCEL EXPORT: Starting export for cultivo:', currentCultivo);
    console.log('📊 EXCEL EXPORT: Filters - fechaInicio:', fechaInicio, 'fechaFin:', fechaFin, 'exportarTodo:', exportarTodo);

    try {
      // Fetch all related data
      console.log('📊 EXCEL EXPORT: Fetching data for cvzId:', currentCultivo.cvzid);
      const [actividades, cosechas, ventas] = await Promise.all([
        getActividadesByCultivoVariedadZonaId(currentCultivo.cvzid),
        getCosechasByCultivo(currentCultivo.cvzid),
        getVentas()
      ]);

      console.log('📊 EXCEL EXPORT: Raw data fetched:');
      console.log('  - Actividades:', actividades.length, 'items');
      console.log('  - Cosechas:', cosechas.length, 'items');
      console.log('  - Ventas totales:', ventas.length, 'items');

      // Filter ventas related to this cultivo's cosechas
      let cultivoVentas = ventas.filter(venta =>
        cosechas.some(cosecha => cosecha.id === venta.fkCosechaId)
      );

      console.log('📊 EXCEL EXPORT: Ventas filtradas por cultivo:', cultivoVentas.length, 'items');

      // Aplicar filtros por fecha si no se exporta todo
      let filteredActividades = actividades;
      let filteredCosechas = cosechas;
      let filteredVentas = cultivoVentas;

      if (!exportarTodo && fechaInicio && fechaFin) {
        // Crear fechas de comparación sin problemas de zona horaria
        const startDate = new Date(fechaInicio + 'T00:00:00.000Z'); // Inicio del día en UTC
        const endDate = new Date(fechaFin + 'T23:59:59.999Z'); // Fin del día en UTC

        console.log('📊 EXCEL EXPORT: Applying date filters - startDate:', startDate, 'endDate:', endDate);

        // Filtrar actividades por fechaFinalizacion
        filteredActividades = actividades.filter(actividad => {
          if (!(actividad as any).fechaFinalizacion) return false;
          const actividadDate = new Date((actividad as any).fechaFinalizacion);
          return actividadDate >= startDate && actividadDate <= endDate;
        });

        // Filtrar cosechas por fecha
        filteredCosechas = cosechas.filter(cosecha => {
          if (!cosecha.fecha) return false;
          const cosechaDate = new Date(cosecha.fecha + 'T12:00:00.000Z'); // Mediodía para evitar problemas de zona horaria
          return cosechaDate >= startDate && cosechaDate <= endDate;
        });

        // Filtrar ventas por fecha
        filteredVentas = cultivoVentas.filter(venta => {
          if (!venta.fecha) return false;
          const ventaDate = new Date(venta.fecha + 'T12:00:00.000Z'); // Mediodía para evitar problemas de zona horaria
          return ventaDate >= startDate && ventaDate <= endDate;
        });

        console.log('📊 EXCEL EXPORT: Data after filtering:');
        console.log('  - Actividades filtradas:', filteredActividades.length, 'de', actividades.length);
        console.log('  - Cosechas filtradas:', filteredCosechas.length, 'de', cosechas.length);
        console.log('  - Ventas filtradas:', filteredVentas.length, 'de', cultivoVentas.length);
      } else {
        console.log('📊 EXCEL EXPORT: No date filters applied, using all data');
      }

      // Fetch financial data for the cultivo
      let finanzas = null;
      try {
        const cosechasResponse = await apiClient.get(`/cosechas/cultivo/${currentCultivo.cvzid}`);
        const cosechasCultivo = cosechasResponse.data;
        if (cosechasCultivo && cosechasCultivo.length > 0) {
          const response = await apiClient.get(`/finanzas/cultivo/${currentCultivo.cvzid}/dinamico`);
          finanzas = response.data;
        } else {
          const response = await apiClient.get(`/finanzas/cultivo/${currentCultivo.cvzid}/actividades`);
          finanzas = response.data;
        }
      } catch (finanzasError) {
        console.warn('Could not fetch financial data:', finanzasError);
      }

      // Calculate total production cost from activities
      const calculateCostoManoObra = (activity: Actividad) => {
        return (activity.horasDedicadas || 0) * ((activity as any).precioHora || 0);
      };

      const getAssignedUsers = (activity: Actividad) => {
        if (!(activity as any).usuariosAsignados || (activity as any).usuariosAsignados.length === 0) {
          return 'Sin usuarios asignados';
        }
        return (activity as any).usuariosAsignados
          .map((uxa: any) => `${uxa.usuario.nombres} ${uxa.usuario.apellidos} (${uxa.usuario.dni})`)
          .join(', ');
      };

      const calculateCostoInventario = (activity: Actividad) => {
        if (!(activity as any).reservas || (activity as any).reservas.length === 0) return 0;
        let total = 0;
        for (const reserva of (activity as any).reservas) {
          const cantidadUsada = reserva.cantidadUsada || 0;
          if (cantidadUsada > 0) {
            const esDivisible = reserva.lote?.producto?.categoria?.esDivisible ?? true;
            if (esDivisible) {
              const precioUnitario = (reserva.precioProducto || 0) / (reserva.capacidadPresentacionProducto || 1);
              total += cantidadUsada * precioUnitario;
            } else {
              const vidaUtil = reserva.lote?.producto?.categoria?.vidaUtilPromedioPorUsos;
              if (vidaUtil && vidaUtil > 0) {
                const valorResidual = (reserva.precioProducto || 0) * 0.1;
                const costoPorUso = ((reserva.precioProducto || 0) - valorResidual) / vidaUtil;
                total += costoPorUso;
              } else {
                const precioUnitario = (reserva.precioProducto || 0) / (reserva.capacidadPresentacionProducto || 1);
                total += cantidadUsada * precioUnitario;
              }
            }
          }
        }
        return total;
      };


      // Create workbook
      const wb = XLSX.utils.book_new();

      // Calculate dynamic financial data from filtered data
      const cantidadCosechada = filteredCosechas.reduce((sum, cosecha) => sum + (Number(cosecha.cantidad) || 0), 0);
      const cantidadVendida = filteredVentas.reduce((sum, venta) => sum + (Number(venta.cantidad) || 0), 0);
      const ingresosTotales = filteredVentas.reduce((sum, venta) => sum + (Number(venta.precioUnitario) || 0) * (Number(venta.cantidad) || 0), 0);
      const precioPromedioPorKilo = cantidadVendida > 0 ? ingresosTotales / cantidadVendida : 0;

      // Filter finalized activities for the activity sheets
      const finalizedActivities = filteredActividades.filter(act => act.estado === false);

      const costoManoObra = finalizedActivities.reduce((sum, act) => sum + calculateCostoManoObra(act), 0);
      const costoInventario = finalizedActivities.reduce((sum, act) => sum + calculateCostoInventario(act), 0);
      const costoTotalProduccion = costoManoObra + costoInventario;
      const ganancias = ingresosTotales - costoTotalProduccion;
      const margenGanancia = costoTotalProduccion > 0 ? (ganancias / costoTotalProduccion) * 100 : 0;

      console.log('📊 EXCEL EXPORT: Calculated totals:');
      console.log('  - Finalized activities:', finalizedActivities.length);
      console.log('  - Cantidad cosechada:', cantidadCosechada);
      console.log('  - Cantidad vendida:', cantidadVendida);
      console.log('  - Ingresos totales:', ingresosTotales);
      console.log('  - Costo mano de obra:', costoManoObra);
      console.log('  - Costo inventario:', costoInventario);
      console.log('  - Costo total producción:', costoTotalProduccion);
      console.log('  - Ganancias:', ganancias);

      // Determinar el rango de fechas del reporte
      let rangoFechasTexto = "Toda la trazabilidad";
      if (!exportarTodo && fechaInicio && fechaFin) {
        // Formatear fechas manualmente para evitar problemas de zona horaria
        const formatDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-');
          return `${day}/${month}/${year}`;
        };
        rangoFechasTexto = `Del ${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`;
      }

      // Sheet 1: Resumen del Cultivo (with added total production cost)
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
        ["Rango de Fechas del Reporte", rangoFechasTexto],
        ["Total Actividades", filteredActividades.length],
        ["Total Cosechas", filteredCosechas.length],
        ["Total Ventas", filteredVentas.length],
        ["Ingresos Totales", filteredVentas.reduce((sum, venta) => sum + (Number(venta.precioUnitario) || 0) * (Number(venta.cantidad) || 0), 0).toFixed(2)],
        ["Costo Total de Producción", costoTotalProduccion.toFixed(2)],
        ["Fecha de Exportación", new Date().toLocaleDateString('es-CO')]
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = [
        { wch: 30 }, // Campo
        { wch: 25 }  // Valor
      ];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen del Cultivo");


      // Sheet 2: Historial de Actividades
      const actividadesData = [
        ["ID", "Fecha Asignación", "Fecha de Finalización", "Categoría", "Usuario Responsable", "Usuarios Asignados", "Inventario Utilizado", "Zona", "Estado", "Observación", "Horas Dedicadas", "Costo de Mano de Obra", "Costo Total de la Actividad"]
      ];

      finalizedActivities.forEach((activity: Actividad) => {
        const costoManoObra = calculateCostoManoObra(activity);
        const costoTotal = costoManoObra + calculateCostoInventario(activity);
        const assignedUsers = getAssignedUsers(activity);
        actividadesData.push([
          activity.id,
          activity.fechaAsignacion ? (() => {
            const datePart = activity.fechaAsignacion.split('T')[0];
            const date = new Date(datePart);
            const adjustedDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
            return adjustedDate.toLocaleDateString('es-CO');
          })() : "N/A",
          (activity as any).fechaFinalizacion ? new Date((activity as any).fechaFinalizacion).toLocaleDateString('es-CO') : "N/A",
          (activity as any).categoriaActividad?.nombre || 'Sin categoría',
          (activity as any).nombreResponsable || 'Sin responsable',
          assignedUsers,
          (activity as any).reservas && (activity as any).reservas.length > 0
            ? (activity as any).reservas.map((r: any) => `${r.lote?.producto?.nombre} (${r.cantidadUsada || 0} ${r.lote?.producto?.unidadMedida?.abreviatura})`).join(', ')
            : 'Sin inventario',
          (currentCultivo as any).zona?.nombre || 'Sin zona',
          'Finalizada',
          activity.observacion || '',
          (activity.horasDedicadas || 0).toString(),
          costoManoObra.toFixed(2),
          costoTotal.toFixed(2)
        ]);
      });

      const wsActividades = XLSX.utils.aoa_to_sheet(actividadesData);
      wsActividades['!cols'] = [
        { wch: 15 }, // ID
        { wch: 15 }, // Fecha Asignación
        { wch: 15 }, // Fecha de Finalización
        { wch: 20 }, // Categoría
        { wch: 25 }, // Usuario Responsable
        { wch: 40 }, // Usuarios Asignados
        { wch: 40 }, // Inventario Utilizado
        { wch: 15 }, // Zona
        { wch: 12 }, // Estado
        { wch: 50 }, // Observación
        { wch: 15 }, // Horas Dedicadas
        { wch: 20 }, // Costo de Mano de Obra
        { wch: 20 }  // Costo Total de la Actividad
      ];
      XLSX.utils.book_append_sheet(wb, wsActividades, "Historial de Actividades");

      // Sheet 3: Detalle de Inventario
      const inventarioData = [
        ["ID Actividad", "Fecha Asignación", "Categoría", "Usuario Responsable", "Producto", "Cantidad Reservada", "Cantidad Usada", "Unidad de Medida", "Precio Unitario", "Subtotal", "Zona", "Estado"]
      ];

      finalizedActivities.forEach((activity: Actividad) => {
        if ((activity as any).reservas && (activity as any).reservas.length > 0) {
          (activity as any).reservas.forEach((reserva: any) => {
            const precioUnitario = (reserva.precioProducto || 0) / (reserva.capacidadPresentacionProducto || 1);
            const cantidadUsada = reserva.cantidadUsada || 0;
            const esDivisible = reserva.lote?.producto?.categoria?.esDivisible ?? true;
            let subtotal = 0;
            if (esDivisible) {
              subtotal = cantidadUsada * precioUnitario;
            } else {
              const vidaUtil = reserva.lote?.producto?.categoria?.vidaUtilPromedioPorUsos;
              if (vidaUtil && vidaUtil > 0) {
                const valorResidual = (reserva.precioProducto || 0) * 0.1;
                subtotal = ((reserva.precioProducto || 0) - valorResidual) / vidaUtil;
              } else {
                subtotal = cantidadUsada * precioUnitario;
              }
            }
            inventarioData.push([
              activity.id,
              activity.fechaAsignacion ? (() => {
                const datePart = activity.fechaAsignacion.split('T')[0];
                const date = new Date(datePart);
                const adjustedDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
                return adjustedDate.toLocaleDateString('es-CO');
              })() : "N/A",
              (activity as any).categoriaActividad?.nombre || 'Sin categoría',
              (activity as any).nombreResponsable || 'Sin responsable',
              reserva.lote?.producto?.nombre || 'Producto desconocido',
              reserva.cantidadReservada || 0,
              cantidadUsada,
              reserva.lote?.producto?.unidadMedida?.abreviatura || 'N/A',
              precioUnitario.toFixed(2),
              subtotal.toFixed(2),
              (currentCultivo as any).zona?.nombre || 'Sin zona',
              'Finalizada'
            ]);
          });
        } else {
          inventarioData.push([
            activity.id,
            activity.fechaAsignacion ? (() => {
              const datePart = activity.fechaAsignacion.split('T')[0];
              const date = new Date(datePart);
              const adjustedDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
              return adjustedDate.toLocaleDateString('es-CO');
            })() : "N/A",
            (activity as any).categoriaActividad?.nombre || 'Sin categoría',
            (activity as any).nombreResponsable || 'Sin responsable',
            'Sin inventario utilizado',
            0,
            0,
            'N/A',
            '0.00',
            '0.00',
            (currentCultivo as any).zona?.nombre || 'Sin zona',
            'Finalizada'
          ]);
        }
      });

      const wsInventario = XLSX.utils.aoa_to_sheet(inventarioData);
      wsInventario['!cols'] = [
        { wch: 15 }, // ID Actividad
        { wch: 15 }, // Fecha Asignación
        { wch: 20 }, // Categoría
        { wch: 25 }, // Usuario Responsable
        { wch: 30 }, // Producto
        { wch: 18 }, // Cantidad Reservada
        { wch: 15 }, // Cantidad Usada
        { wch: 18 }, // Unidad de Medida
        { wch: 15 }, // Precio Unitario
        { wch: 12 }, // Subtotal
        { wch: 15 }, // Zona
        { wch: 12 }  // Estado
      ];
      XLSX.utils.book_append_sheet(wb, wsInventario, "Detalle de Inventario");

      // Sheet 4: Análisis de Costos
      const costosData = [
        ["ID Actividad", "Fecha Asignación", "Categoría", "Usuario Responsable", "Costo de Mano de Obra", "Costo Total Insumos", "Costo Total Actividad", "Zona", "Estado"]
      ];

      finalizedActivities.forEach((activity: Actividad) => {
        const costoManoObra = calculateCostoManoObra(activity);
        const costoInventario = calculateCostoInventario(activity);
        const costoTotal = costoManoObra + costoInventario;
        costosData.push([
          activity.id,
          activity.fechaAsignacion ? (() => {
            const datePart = activity.fechaAsignacion.split('T')[0];
            const date = new Date(datePart);
            const adjustedDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
            return adjustedDate.toLocaleDateString('es-CO');
          })() : "N/A",
          (activity as any).categoriaActividad?.nombre || 'Sin categoría',
          (activity as any).nombreResponsable || 'Sin responsable',
          costoManoObra.toFixed(2),
          costoInventario.toFixed(2),
          costoTotal.toFixed(2),
          (currentCultivo as any).zona?.nombre || 'Sin zona',
          'Finalizada'
        ]);
      });

      const wsCostos = XLSX.utils.aoa_to_sheet(costosData);
      wsCostos['!cols'] = [
        { wch: 15 }, // ID Actividad
        { wch: 15 }, // Fecha Asignación
        { wch: 20 }, // Categoría
        { wch: 25 }, // Usuario Responsable
        { wch: 20 }, // Costo de Mano de Obra
        { wch: 20 }, // Costo Total Insumos
        { wch: 20 }, // Costo Total Actividad
        { wch: 15 }, // Zona
        { wch: 12 }  // Estado
      ];
      XLSX.utils.book_append_sheet(wb, wsCostos, "Costos Producción");

      // Sheet 5: Cosechas
      const cosechasData = [
        ["ID", "Fecha", "Cantidad (KG)", "Unidad de Medida", "Rendimiento por Planta", "Plantas Cosechadas", "Cerrada"]
      ];

      filteredCosechas.forEach((cosecha) => {
        cosechasData.push([
          cosecha.id,
          cosecha.fecha ? new Date(cosecha.fecha + 'T12:00:00.000Z').toLocaleDateString('es-CO') : "N/A",
          (Number(cosecha.cantidad) || 0).toString(),
          cosecha.unidadMedida || "N/A",
          (Number((cosecha as any).rendimientoPorPlanta || (cosecha as any).cos_rendimiento_por_planta) || 0).toString(),
          (Number((cosecha as any).cantidadPlantasCosechadas || (cosecha as any).cos_cantidad_plantas_cosechadas) || 0).toString(),
          cosecha.cerrado ? "Sí" : "No"
        ]);
      });

      const wsCosechas = XLSX.utils.aoa_to_sheet(cosechasData);
      wsCosechas['!cols'] = [
        { wch: 15 }, // ID
        { wch: 12 }, // Fecha
        { wch: 15 }, // Cantidad (KG)
        { wch: 18 }, // Unidad de Medida
        { wch: 20 }, // Rendimiento por Planta
        { wch: 18 }, // Plantas Cosechadas
        { wch: 10 }  // Cerrada
      ];
      XLSX.utils.book_append_sheet(wb, wsCosechas, "Cosechas");

      // Sheet 6: Ventas
      const ventasData = [
        ["ID", "Fecha", "Cantidad", "Unidad de Medida", "Precio Unitario", "Precio por Kilo", "Total"]
      ];

      filteredVentas.forEach((venta) => {
        const precioUnitario = Number(venta.precioUnitario) || 0;
        const precioKilo = Number(venta.precioKilo) || 0;
        const cantidad = Number(venta.cantidad) || 0;
        const total = precioUnitario * cantidad;
        ventasData.push([
          venta.id,
          venta.fecha ? new Date(venta.fecha + 'T12:00:00.000Z').toLocaleDateString('es-CO') : "N/A",
          cantidad.toString(),
          venta.unidadMedida || "N/A",
          precioUnitario > 0 ? `$${precioUnitario.toFixed(2)}` : "$0.00",
          precioKilo > 0 ? `$${precioKilo.toFixed(2)}` : "$0.00",
          `$${total.toFixed(2)}`
        ]);
      });

      const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);
      wsVentas['!cols'] = [
        { wch: 15 }, // ID
        { wch: 12 }, // Fecha
        { wch: 12 }, // Cantidad
        { wch: 18 }, // Unidad de Medida
        { wch: 15 }, // Precio Unitario
        { wch: 15 }, // Precio por Kilo
        { wch: 12 }  // Total
      ];
      XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");


      // Sheet 7: Resumen Financiero (calculated from filtered data)
      const resumenFinancieroData = [
        ["Concepto", "Valor"],
        ["Cantidad Cosechada", cantidadCosechada.toFixed(2) + " KG"],
        ["Precio por Kilo (Promedio)", `$${precioPromedioPorKilo.toFixed(2)}`],
        ["Cantidad Vendida", cantidadVendida.toFixed(2) + " KG"],
        ["Costo Inventario", `$${costoInventario.toFixed(2)}`],
        ["Costo Mano de Obra", `$${costoManoObra.toFixed(2)}`],
        ["Costo Total de Producción", `$${costoTotalProduccion.toFixed(2)}`],
        ["Ingresos Totales", `$${ingresosTotales.toFixed(2)}`],
        ["Ganancias", `$${ganancias.toFixed(2)}`],
        ["Margen de Ganancia", `${margenGanancia.toFixed(2)}%`],
        ["Fecha de Exportación", new Date().toLocaleDateString('es-CO')]
      ];
      const wsResumenFinanciero = XLSX.utils.aoa_to_sheet(resumenFinancieroData);
      wsResumenFinanciero['!cols'] = [
        { wch: 30 }, // Concepto
        { wch: 25 }  // Valor
      ];
      XLSX.utils.book_append_sheet(wb, wsResumenFinanciero, "Resumen Financiero");

      // Sheet 8: Detalle de Costos
      const detalleCostosData = [
        ["Categoría", "Descripción", "Monto"],
        ["Producción", "Costo total de producción", costoTotalProduccion.toFixed(2)],
        ["Inventario", "Costo de insumos y materiales", costoInventario.toFixed(2)],
        ["Mano de Obra", "Costo de mano de obra", costoManoObra.toFixed(2)],
        ["Total Costos", "Suma de todos los costos", costoTotalProduccion.toFixed(2)]
      ];
      const wsDetalleCostos = XLSX.utils.aoa_to_sheet(detalleCostosData);
      wsDetalleCostos['!cols'] = [
        { wch: 15 }, // Categoría
        { wch: 35 }, // Descripción
        { wch: 20 }  // Monto
      ];
      XLSX.utils.book_append_sheet(wb, wsDetalleCostos, "Detalle de Costos");

      // Sheet 9: Ingresos y Rentabilidad
      const eficienciaVentas = cantidadCosechada > 0 ? (cantidadVendida / cantidadCosechada) * 100 : 0;
      const ingresosRentabilidadData = [
        ["Concepto", "Cantidad", "Precio Unitario", "Total"],
        ["Producción Total", cantidadCosechada.toFixed(2) + " KG", `$${precioPromedioPorKilo.toFixed(2)}`, `$${(cantidadCosechada * precioPromedioPorKilo).toFixed(2)}`],
        ["Ventas Realizadas", cantidadVendida.toFixed(2) + " KG", `$${precioPromedioPorKilo.toFixed(2)}`, `$${ingresosTotales.toFixed(2)}`],
        ["Eficiencia de Ventas", `${eficienciaVentas.toFixed(2)}%`, "", ""],
        ["Resultado Final", "", "", `$${ganancias.toFixed(2)}`]
      ];
      const wsIngresosRentabilidad = XLSX.utils.aoa_to_sheet(ingresosRentabilidadData);
      wsIngresosRentabilidad['!cols'] = [
        { wch: 25 }, // Concepto
        { wch: 20 }, // Cantidad
        { wch: 20 }, // Precio Unitario
        { wch: 20 }  // Total
      ];
      XLSX.utils.book_append_sheet(wb, wsIngresosRentabilidad, "Ingresos y Rentabilidad");

      // Generate and download file
      const fileName = `Informe_Completo_Cultivo_${currentCultivo.ficha}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log('✅ EXCEL EXPORT: Successfully generated Excel file:', fileName);

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

        <ModalBody className="space-y-4 max-h-96 overflow-y-auto">
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

        <ModalFooter className="flex flex-col gap-4">
           {/* Contenedor de filtros de exportación */}
           <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg w-full">
             <div className="flex items-center gap-2">
               <input
                 type="checkbox"
                 id="exportarTodo"
                 checked={exportarTodo}
                 onChange={(e) => setExportarTodo(e.target.checked)}
                 className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
               />
               <label htmlFor="exportarTodo" className="text-sm font-medium text-gray-700">
                 Exportar toda la trazabilidad
               </label>
             </div>

             {!exportarTodo && (
               <>
                 <div className="flex items-center gap-2">
                   <label htmlFor="fechaInicio" className="text-sm font-medium text-gray-700">
                     Fecha inicio:
                   </label>
                   <input
                     type="date"
                     id="fechaInicio"
                     value={fechaInicio}
                     onChange={(e) => setFechaInicio(e.target.value)}
                     className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                   />
                 </div>

                 <div className="flex items-center gap-2">
                   <label htmlFor="fechaFin" className="text-sm font-medium text-gray-700">
                     Fecha fin:
                   </label>
                   <input
                     type="date"
                     id="fechaFin"
                     value={fechaFin}
                     onChange={(e) => setFechaFin(e.target.value)}
                     className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                   />
                 </div>
               </>
             )}
           </div>

           {/* Botones de acción */}
           <div className="flex justify-between w-full">
             <CustomButton onClick={onClose} variant="bordered">
               Cerrar
             </CustomButton>

             <CustomButton
               onClick={() => exportToExcel(fechaInicio, fechaFin, exportarTodo)}
               variant="solid"
               color="success"
               disabled={!exportarTodo && (!fechaInicio || !fechaFin)}
             >
               Exportar Excel
             </CustomButton>
           </div>
         </ModalFooter>
      </ModalContent>

    </Modal>
  );
};

export default CultivoDetailsModal;