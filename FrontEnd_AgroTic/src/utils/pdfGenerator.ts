import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import apiClient from "../lib/axios/axios";
import { renderLineChartToCanvas } from "./chartRenderer";
import Swal from "sweetalert2";
import { getActividadesByCultivoVariedadZonaId } from "../services/actividadesService";
import { getCosechasByCultivo } from "../services/cosechasService";
import { getVentas } from "../services/ventaService";
import type { Actividad } from "../services/actividadesService";
import { calcularEdadCultivo } from "../services/cultivosVariedadZonaService";
import AgroTicNormal from "../assets/AgroTic_normal.png";
import AgroTic from "../assets/AgroTic.png";

interface SelectedData {
  cultivos: string[];
  zonas: string[];
  sensores: string[];
  startDate: string;
  endDate: string;
  groupBy: "hourly" | "daily" | "weekly" | "time_slot";
  timeRanges?: string[];
}

interface ReportDataResponse {
  cultivoId: string;
  cultivoNombre: string;
  variedadNombre: string;
  zonaId: string;
  zonaNombre: string;
  cvzId: string;
  period: string;
  timeSlot?: number;
  statistics: SensorStatistics[];
}

interface SensorStatistics {
  med_key: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  stddev: number;
  unidad?: string;
}

interface SelectedSensorDetail {
  cultivoId: string;
  zonaId: string;
  sensorKey: string;
  zonaNombre: string;
  cultivoNombre: string;
  variedadNombre: string;
  tipoCultivoNombre?: string;
  sensorData?: any;
  cultivoData?: any;
  cvzId?: string;
  timeRange?: "morning" | "afternoon" | "evening" | "night";
  timeRanges?: string[];
  startDate?: string;
  endDate?: string;
}

interface ThresholdData {
  minimo: number;
  maximo: number;
}

// Utility function to format date ranges
const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return `${start.toLocaleDateString(
    "en-US",
    formatOptions
  )} - ${end.toLocaleDateString("en-US", formatOptions)}`;
};

// Utility function to format groupBy for display
const formatGroupBy = (groupBy: string): string => {
  switch (groupBy) {
    case "hourly":
      return "Por Horas";
    case "daily":
      return "Diario";
    case "weekly":
      return "Semanal";
    case "time_slot":
      return "Franjas Horarias (4 por día)";
    default:
      return groupBy;
  }
};

export const generatePDFReport = async (
  selectedData: SelectedData
): Promise<jsPDF> => {
  try {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Make API call to get report data
    const reportRequest = {
      med_keys: selectedData.sensores,
      cultivo_ids:
        selectedData.cultivos.length > 0 ? selectedData.cultivos : undefined,
      zona_ids: selectedData.zonas.length > 0 ? selectedData.zonas : undefined,
      start_date: selectedData.startDate,
      end_date: selectedData.endDate,
      group_by: selectedData.groupBy,
      time_ranges: selectedData.timeRanges,
    };

    const reportResponse = await apiClient.post(
      "/medicion-sensor/report-data",
      reportRequest
    );
    const reportData: ReportDataResponse[] = reportResponse.data;

    // ===== HEADER PROFESIONAL =====
    // Background header
    pdf.setFillColor(34, 197, 94); // Green background
    pdf.rect(0, 0, 210, 35, "F");

    // Add logo
    try {
      // Left logo (rectangular, vertically centered)
      pdf.addImage(AgroTicNormal, "PNG", 10, 10, 30, 15);
    } catch (imageError) {
      console.warn("Error adding logo to PDF:", imageError);
    }

    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("AgroTIC - Reporte Completo de Cultivo", 40, 22);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Generado: ${new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      20,
      32
    );

    pdf.setTextColor(0, 0, 0); // Reset to black
    yPosition = 45;

    // ===== INFORMACIÓN DEL REPORTE =====
    pdf.setFillColor(248, 250, 252);
    pdf.rect(15, yPosition - 5, 180, 40, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(15, yPosition - 5, 180, 40);

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Información del Reporte", 20, yPosition);
    yPosition += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    const dateRange = formatDateRange(
      selectedData.startDate,
      selectedData.endDate
    );
    pdf.text(`Período Analizado: ${dateRange}`, 20, yPosition);
    yPosition += 6;

    pdf.text(
      `Agrupamiento: ${formatGroupBy(selectedData.groupBy)}`,
      20,
      yPosition
    );
    yPosition += 6;

    if (selectedData.timeRanges && selectedData.timeRanges.length > 0) {
      const timeRangeLabels = {
        morning: "Mañana (6:00-12:00)",
        afternoon: "Tarde (12:00-18:00)",
        evening: "Noche (18:00-24:00)",
        night: "Madrugada (00:00-6:00)",
      };
      const selectedLabels = selectedData.timeRanges
        .map((range) => timeRangeLabels[range as keyof typeof timeRangeLabels])
        .join(", ");
      pdf.text(`Franjas Horarias: ${selectedLabels}`, 20, yPosition);
      yPosition += 6;
    }

    pdf.text(
      `Sensores: ${selectedData.sensores.length} | Zonas: ${selectedData.zonas.length} | Cultivos: ${selectedData.cultivos.length}`,
      20,
      yPosition
    );
    yPosition += 15;

    // ===== RESUMEN ESTADÍSTICO =====
    if (reportData.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Resumen Estadístico", 20, yPosition);
      yPosition += 10;

      const totalDataPoints = reportData.reduce(
        (sum, item) =>
          sum +
          item.statistics.reduce((statSum, stat) => statSum + stat.count, 0),
        0
      );

      const uniqueSensors = new Set(
        reportData.flatMap((item) =>
          item.statistics.map((stat) => stat.med_key)
        )
      ).size;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Total de puntos de datos: ${totalDataPoints}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Sensores únicos: ${uniqueSensors}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Períodos reportados: ${reportData.length}`, 20, yPosition);
      yPosition += 15;
    }

    // ===== TABLAS POR FRANJA HORARIA =====
    if (selectedData.groupBy === "time_slot" && reportData.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Estadísticas por Franja Horaria", 20, yPosition);
      yPosition += 10;

      // Procesar datos por sensor
      const sensorData: {
        [sensorKey: string]: {
          [slot: number]: {
            min: number;
            max: number;
            avg: number;
            count: number;
          };
        };
      } = {};

      reportData.forEach((item) => {
        item.statistics.forEach((stat) => {
          // Filtrar valores por defecto o inválidos
          if (
            stat.avg === 999 ||
            stat.avg === -999 ||
            isNaN(stat.avg) ||
            stat.min === 999 ||
            stat.min === -999 ||
            isNaN(stat.min) ||
            stat.max === 999 ||
            stat.max === -999 ||
            isNaN(stat.max)
          ) {
            return;
          }

          if (!sensorData[stat.med_key]) {
            sensorData[stat.med_key] = {};
          }
          if (item.timeSlot !== undefined) {
            sensorData[stat.med_key][item.timeSlot] = {
              min: stat.min,
              max: stat.max,
              avg: stat.avg,
              count: stat.count,
            };
          }
        });
      });

      // Crear tabla para cada sensor
      Object.entries(sensorData).forEach(([sensorKey, slots]) => {
        // Nueva página si es necesario
        if (yPosition > 150) {
          pdf.addPage();
          yPosition = 20;
        }

        // Header del sensor
        pdf.setFillColor(241, 245, 249);
        pdf.rect(15, yPosition - 3, 180, 12, "F");
        pdf.setDrawColor(176, 190, 197);
        pdf.rect(15, yPosition - 3, 180, 12);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(33, 33, 33);
        pdf.text(`Sensor: ${sensorKey}`, 20, yPosition + 5);
        yPosition += 15;

        // Tabla de franjas horarias
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");

        const headers = [
          "Franja Horaria",
          "Mínimo",
          "Máximo",
          "Promedio",
          "Conteo",
        ];
        const colWidths = [40, 25, 25, 25, 25];
        let xPosition = 20;

        headers.forEach((header, index) => {
          pdf.text(header, xPosition, yPosition);
          xPosition += colWidths[index];
        });

        yPosition += 3;
        pdf.line(20, yPosition, 190, yPosition);
        yPosition += 5;

        // Filas de datos
        pdf.setFont("helvetica", "normal");
        const slotNames = ["6am-12pm", "12pm-6pm", "6pm-12am", "12am-6am"];

        [0, 1, 2, 3].forEach((slot) => {
          xPosition = 20;
          const slotData = slots[slot];

          const rowData = [
            slotNames[slot],
            slotData ? slotData.min.toFixed(2) : "N/A",
            slotData ? slotData.max.toFixed(2) : "N/A",
            slotData ? slotData.avg.toFixed(2) : "N/A",
            slotData ? slotData.count.toString() : "0",
          ];

          rowData.forEach((data, index) => {
            pdf.text(data, xPosition, yPosition);
            xPosition += colWidths[index];
          });
          yPosition += 6;
        });

        yPosition += 10;
      });
    }

    // ===== ANÁLISIS DE TENDENCIAS =====
    if (selectedData.sensores.length > 0 && reportData.length > 0) {
      pdf.addPage();
      yPosition = 20;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Análisis de Tendencias por Sensor", 20, yPosition);
      yPosition += 10;

      if (selectedData.groupBy === "time_slot") {
        // Gráficas multi-línea para franjas horarias
        for (const sensorKey of selectedData.sensores) {
          const sensorReportData = reportData.filter((item) =>
            item.statistics.some((stat) => stat.med_key === sensorKey)
          );

          if (sensorReportData.length === 0) continue;

          // Nueva página si es necesario
          if (yPosition > 100) {
            pdf.addPage();
            yPosition = 20;
          }

          // Header del sensor
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text(`Sensor: ${sensorKey}`, 20, yPosition);
          yPosition += 8;

          // Procesar datos para gráfica
          const dateSlotData: { [date: string]: { [slot: number]: number } } =
            {};

          sensorReportData.forEach((item) => {
            const date = item.period.split("-").slice(0, 3).join("-");
            const slot = item.timeSlot || 0;
            const stat = item.statistics.find((s) => s.med_key === sensorKey);
            if (
              stat &&
              stat.avg !== 999 &&
              stat.avg !== -999 &&
              !isNaN(stat.avg)
            ) {
              if (!dateSlotData[date]) {
                dateSlotData[date] = {};
              }
              dateSlotData[date][slot] = stat.avg;
            }
          });

          // Preparar datos para gráfica
          const chartData = Object.entries(dateSlotData)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, slots]) => ({
              time: date,
              "6am-12pm": slots[0] || null,
              "12pm-6pm": slots[1] || null,
              "6pm-12am": slots[2] || null,
              "12am-6am": slots[3] || null,
            }));

          // Obtener información del sensor
          const firstItem = sensorReportData[0];
          const unidad =
            firstItem.statistics.find((s) => s.med_key === sensorKey)?.unidad ||
            "";
          const subtitle = `${firstItem.zonaNombre} | ${firstItem.cultivoNombre}`;

          try {
            // Generar gráfica multi-línea
            const canvas = await renderLineChartToCanvas({
              width: 500,
              height: 400,
              data: chartData,
              title: `Tendencias por Franja Horaria`,
              subtitle: subtitle,
              color: "#2563eb",
              type: "line",
              multiLine: true,
              yAxisLabel: `Valor Promedio (${unidad})`,
              xAxisLabel: "Fecha",
              sensorKey: sensorKey,
              unidad: unidad,
            });

            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", 20, yPosition, 170, 114); // 500x400 escalado
            yPosition += 130;

            // Leyenda de colores
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "bold");
            pdf.text("Leyenda:", 20, yPosition);
            yPosition += 6;

            pdf.setFont("helvetica", "normal");
            const legendItems = [
              { color: "#8884d8", label: "6am-12pm" },
              { color: "#82ca9d", label: "12pm-6pm" },
              { color: "#ffc658", label: "6pm-12am" },
              { color: "#ff7300", label: "12am-6am" },
            ];

            legendItems.forEach((item, index) => {
              const x = 20 + (index % 2) * 80;
              const y = yPosition + Math.floor(index / 2) * 6;

              // Dibujar rectángulo de color
              pdf.setFillColor(item.color);
              pdf.rect(x, y - 3, 6, 4, "F");

              // Texto
              pdf.text(item.label, x + 8, y);
            });

            yPosition += 15;
          } catch (chartError) {
            console.error(
              `Error generando gráfica para ${sensorKey}:`,
              chartError
            );
            pdf.setFontSize(10);
            pdf.setTextColor(255, 0, 0);
            pdf.text(
              `Error generando gráfica para sensor: ${sensorKey}`,
              20,
              yPosition
            );
            pdf.setTextColor(0, 0, 0);
            yPosition += 15;
          }
        }
      }
    }

    // ===== FOOTER PROFESIONAL =====
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      // Footer background
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 280, 210, 17, "F");
      pdf.setDrawColor(226, 232, 240);
      pdf.line(0, 280, 210, 280);

      // Add small logo to footer
      try {
        pdf.addImage(AgroTic, "PNG", 10, 282, 10, 10);
      } catch (imageError) {
        console.warn("Error adding footer logo to PDF:", imageError);
      }

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `AgroTIC - Sistema de Monitoreo Agrícola | Generado: ${new Date().toLocaleDateString(
          "es-ES"
        )} ${new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        25,
        288
      );
      pdf.text(`Página ${i} de ${totalPages}`, 170, 288);
      pdf.setTextColor(0, 0, 0);
    }

    // Return PDF instance instead of saving
    return pdf;
  } catch (error) {
    console.error("Error generando reporte PDF:", error);
    throw new Error(
      "Error al generar el reporte PDF. Verifique su conexión a internet y que los sensores seleccionados tengan datos disponibles."
    );
  }
};

// Función para generar la sección de trazabilidad completa del cultivo
const generateCultivoTrazabilidad = async (
  pdf: jsPDF,
  cultivoData: SelectedSensorDetail,
  yPosition: number,
  fechaInicio?: string,
  fechaFin?: string,
  exportarTodo: boolean = false
): Promise<number> => {
  try {
    console.log("🔍 PDF TRAZABILIDAD: Starting with cultivoData:", cultivoData);
    console.log(
      "🔍 PDF TRAZABILIDAD: Filters - fechaInicio:",
      fechaInicio,
      "fechaFin:",
      fechaFin,
      "exportarTodo:",
      exportarTodo
    );

    const {
      cultivoId,
      zonaNombre,
      cultivoNombre,
      variedadNombre,
      tipoCultivoNombre,
      cvzId: providedCvzId,
    } = cultivoData;

    // Use cvzId if provided, otherwise fall back to cultivoId (for backward compatibility)
    const cvzId = providedCvzId || cultivoId;
    console.log(
      "🔍 PDF TRAZABILIDAD: Using cvzId:",
      cvzId,
      "(provided:",
      !!providedCvzId,
      "fallback:",
      !providedCvzId && !!cultivoId + ")"
    );

    // Fetch all related data
    console.log("🔍 PDF TRAZABILIDAD: Fetching data for cvzId:", cvzId);
    const [actividades, cosechas, ventas] = await Promise.all([
      getActividadesByCultivoVariedadZonaId(cvzId),
      getCosechasByCultivo(cvzId),
      getVentas(),
    ]);

    console.log("🔍 PDF TRAZABILIDAD: Raw data fetched:");
    console.log("  - Actividades:", actividades.length, "items");
    console.log("  - Cosechas:", cosechas.length, "items");
    console.log("  - Ventas totales:", ventas.length, "items");

    // Filter ventas related to this cultivo's cosechas
    let cultivoVentas = ventas.filter((venta) =>
      cosechas.some((cosecha) => cosecha.id === venta.fkCosechaId)
    );

    console.log(
      "🔍 PDF TRAZABILIDAD: Ventas filtradas por cultivo:",
      cultivoVentas.length,
      "items"
    );

    // Aplicar filtros por fecha si no se exporta todo
    let filteredActividades = actividades;
    let filteredCosechas = cosechas;
    let filteredVentas = cultivoVentas;

    if (!exportarTodo && fechaInicio && fechaFin) {
      const startDate = new Date(fechaInicio + "T00:00:00.000Z");
      const endDate = new Date(fechaFin + "T23:59:59.999Z");

      console.log(
        "🔍 PDF TRAZABILIDAD: Applying date filters - startDate:",
        startDate,
        "endDate:",
        endDate
      );

      filteredActividades = actividades.filter((actividad) => {
        if (!(actividad as any).fechaFinalizacion) return false;
        const actividadDate = new Date((actividad as any).fechaFinalizacion);
        return actividadDate >= startDate && actividadDate <= endDate;
      });

      filteredCosechas = cosechas.filter((cosecha) => {
        if (!cosecha.fecha) return false;
        const cosechaDate = new Date(cosecha.fecha + "T12:00:00.000Z");
        return cosechaDate >= startDate && cosechaDate <= endDate;
      });

      filteredVentas = cultivoVentas.filter((venta) => {
        if (!venta.fecha) return false;
        const ventaDate = new Date(venta.fecha + "T12:00:00.000Z");
        return ventaDate >= startDate && ventaDate <= endDate;
      });

      console.log("🔍 PDF TRAZABILIDAD: Data after filtering:");
      console.log(
        "  - Actividades filtradas:",
        filteredActividades.length,
        "de",
        actividades.length
      );
      console.log(
        "  - Cosechas filtradas:",
        filteredCosechas.length,
        "de",
        cosechas.length
      );
      console.log(
        "  - Ventas filtradas:",
        filteredVentas.length,
        "de",
        cultivoVentas.length
      );
    } else {
      console.log(
        "🔍 PDF TRAZABILIDAD: No date filters applied, using all data"
      );
    }

    // Calcular totales
    const finalizedActivities = filteredActividades.filter(
      (act) => act.estado === false
    );
    const cantidadCosechada = filteredCosechas.reduce(
      (sum, cos) => sum + (Number(cos.cantidad) || 0),
      0
    );
    const cantidadVendida = filteredVentas.reduce(
      (sum, ven) => sum + (Number(ven.cantidad) || 0),
      0
    );
    const ingresosTotales = filteredVentas.reduce(
      (sum, ven) =>
        sum + (Number(ven.precioUnitario) || 0) * (Number(ven.cantidad) || 0),
      0
    );
    const costoManoObra = finalizedActivities.reduce(
      (sum, act) => sum + calculateCostoManoObra(act),
      0
    );
    const costoInventario = finalizedActivities.reduce(
      (sum, act) => sum + calculateCostoInventario(act),
      0
    );
    const costoTotalProduccion = costoManoObra + costoInventario;
    const ganancias = ingresosTotales - costoTotalProduccion;

    console.log("🔍 PDF TRAZABILIDAD: Calculated totals:");
    console.log("  - Finalized activities:", finalizedActivities.length);
    console.log("  - Cantidad cosechada:", cantidadCosechada);
    console.log("  - Cantidad vendida:", cantidadVendida);
    console.log("  - Ingresos totales:", ingresosTotales);
    console.log("  - Costo mano de obra:", costoManoObra);
    console.log("  - Costo inventario:", costoInventario);
    console.log("  - Costo total producción:", costoTotalProduccion);
    console.log("  - Ganancias:", ganancias);

    // ===== PÁGINA 1: RESUMEN DEL CULTIVO =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.1 Resumen del Cultivo", 20, yPosition);
    yPosition += 15;

    const resumenData = [
      ["Campo", "Valor"],
      ["ID del Cultivo", cvzId],
      ["Tipo de Cultivo", tipoCultivoNombre || "N/A"],
      ["Variedad", variedadNombre || "N/A"],
      ["Zona", zonaNombre || "N/A"],
      ["Estado", "Activo"],
      [
        "Rango de Fechas del Reporte",
        exportarTodo
          ? "Toda la trazabilidad"
          : `Del ${fechaInicio} al ${fechaFin}`,
      ],
      ["Total Actividades", filteredActividades.length.toString()],
      ["Total Cosechas", filteredCosechas.length.toString()],
      ["Total Ventas", filteredVentas.length.toString()],
      ["Ingresos Totales", `$${ingresosTotales.toFixed(2)}`],
      ["Costo Total de Producción", `$${costoTotalProduccion.toFixed(2)}`],
      ["Ganancias", `$${ganancias.toFixed(2)}`],
    ];

    autoTable(pdf, {
      startY: yPosition,
      head: [resumenData[0]],
      body: resumenData.slice(1),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 2: HISTORIAL DE ACTIVIDADES =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.2 Historial de Actividades", 20, yPosition);
    yPosition += 15;

    const getAssignedUsersPDF = (activity: Actividad) => {
      if (
        !(activity as any).usuariosAsignados ||
        (activity as any).usuariosAsignados.length === 0
      ) {
        return "Sin usuarios asignados";
      }
      return (activity as any).usuariosAsignados
        .map(
          (uxa: any) =>
            `${uxa.usuario.nombres} ${uxa.usuario.apellidos} (${uxa.usuario.dni})`
        )
        .join(", ");
    };

    const actividadesData = finalizedActivities.map((act) => [
      act.fechaAsignacion
        ? new Date(act.fechaAsignacion + "T00:00:00").toLocaleDateString(
            "es-CO"
          )
        : "N/A",
      (act as any).fechaFinalizacion
        ? new Date((act as any).fechaFinalizacion).toLocaleDateString("es-CO")
        : "N/A",
      (act as any).categoriaActividad?.nombre || "Sin categoría",
      (act as any).nombreResponsable || "Sin responsable",
      getAssignedUsersPDF(act),
      zonaNombre || "Sin zona",
      act.observacion || "",
      (act.horasDedicadas || 0).toString(),
      `$${calculateCostoManoObra(act).toFixed(2)}`,
      `$${(calculateCostoManoObra(act) + calculateCostoInventario(act)).toFixed(
        2
      )}`,
    ]);

    autoTable(pdf, {
      startY: yPosition,
      head: [
        [
          "Fecha Asignación",
          "Fecha Finalización",
          "Categoría",
          "Responsable",
          "Usuarios Asignados",
          "Zona",
          "Observación",
          "Horas",
          "Costo Mano Obra",
          "Costo Total",
        ],
      ],
      body: actividadesData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 3: DETALLE DE INVENTARIO =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.3 Detalle de Inventario", 20, yPosition);
    yPosition += 15;

    const inventarioData = finalizedActivities.flatMap(
      (act) =>
        (act as any).reservas?.map((reserva: any) => [
          act.fechaAsignacion
            ? new Date(act.fechaAsignacion + "T00:00:00").toLocaleDateString(
                "es-CO"
              )
            : "N/A",
          (act as any).categoriaActividad?.nombre || "Sin categoría",
          (act as any).nombreResponsable || "Sin responsable",
          reserva.lote?.producto?.nombre || "Producto desconocido",
          `${reserva.cantidadReservada || 0} ${
            reserva.lote?.producto?.unidadMedida?.abreviatura || "N/A"
          }`,
          `${reserva.cantidadUsada || 0} ${
            reserva.lote?.producto?.unidadMedida?.abreviatura || "N/A"
          }`,
          `$${(
            (reserva.precioProducto || 0) /
            (reserva.capacidadPresentacionProducto || 1)
          ).toFixed(2)}`,
          `$${(
            (reserva.cantidadUsada || 0) *
            ((reserva.precioProducto || 0) /
              (reserva.capacidadPresentacionProducto || 1))
          ).toFixed(2)}`,
          zonaNombre || "Sin zona",
        ]) || []
    );

    autoTable(pdf, {
      startY: yPosition,
      head: [
        [
          "Fecha Asignación",
          "Categoría",
          "Usuario Responsable",
          "Producto",
          "Cantidad Reservada",
          "Cantidad Usada",
          "Precio Unitario",
          "Subtotal",
          "Zona",
        ],
      ],
      body: inventarioData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 4: COSTOS PRODUCCIÓN =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.4 Costos Producción", 20, yPosition);
    yPosition += 15;

    const costosData = finalizedActivities.map((act) => [
      act.fechaAsignacion
        ? new Date(act.fechaAsignacion + "T00:00:00").toLocaleDateString(
            "es-CO"
          )
        : "N/A",
      (act as any).categoriaActividad?.nombre || "Sin categoría",
      (act as any).nombreResponsable || "Sin responsable",
      `$${calculateCostoManoObra(act).toFixed(2)}`,
      `$${calculateCostoInventario(act).toFixed(2)}`,
      `$${(calculateCostoManoObra(act) + calculateCostoInventario(act)).toFixed(
        2
      )}`,
      zonaNombre || "Sin zona",
      "Finalizada",
    ]);

    autoTable(pdf, {
      startY: yPosition,
      head: [
        [
          "Fecha Asignación",
          "Categoría",
          "Usuario Responsable",
          "Costo de Mano de Obra",
          "Costo Total Insumos",
          "Costo Total Actividad",
          "Zona",
          "Estado",
        ],
      ],
      body: costosData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 5: COSECHAS =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.5 Cosechas", 20, yPosition);
    yPosition += 15;

    const cosechasData = filteredCosechas.map((cos) => [
      cos.fecha
        ? new Date(cos.fecha + "T12:00:00.000Z").toLocaleDateString("es-CO")
        : "N/A",
      `${Number(cos.cantidad) || 0} ${cos.unidadMedida || "N/A"}`,
      (
        Number(
          (cos as any).rendimientoPorPlanta ||
            (cos as any).cos_rendimiento_por_planta
        ) || 0
      ).toString(),
      (
        Number(
          (cos as any).cantidadPlantasCosechadas ||
            (cos as any).cos_cantidad_plantas_cosechadas
        ) || 0
      ).toString(),
    ]);

    autoTable(pdf, {
      startY: yPosition,
      head: [
        ["Fecha", "Cantidad", "Rendimiento por Planta", "Plantas Cosechadas"],
      ],
      body: cosechasData,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 6: VENTAS =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.6 Ventas", 20, yPosition);
    yPosition += 15;

    const ventasData = filteredVentas.map((ven) => [
      ven.fecha
        ? new Date(ven.fecha + "T12:00:00.000Z").toLocaleDateString("es-CO")
        : "N/A",
      `${Number(ven.cantidad) || 0} ${ven.unidadMedida || "N/A"}`,
      `$${(Number(ven.precioUnitario) || 0).toFixed(2)}`,
      `$${(Number(ven.precioKilo) || 0).toFixed(2)}`,
      `$${(
        (Number(ven.precioUnitario) || 0) * (Number(ven.cantidad) || 0)
      ).toFixed(2)}`,
    ]);

    autoTable(pdf, {
      startY: yPosition,
      head: [
        ["Fecha", "Cantidad", "Precio Unitario", "Precio por Kilo", "Total"],
      ],
      body: ventasData,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 7: RESUMEN FINANCIERO =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.7 Resumen Financiero", 20, yPosition);
    yPosition += 15;

    const resumenFinancieroData = [
      ["Concepto", "Valor"],
      ["Cantidad Cosechada", `${cantidadCosechada.toFixed(2)} KG`],
      [
        "Precio por Kilo (Promedio)",
        `$${(cantidadVendida > 0
          ? ingresosTotales / cantidadVendida
          : 0
        ).toFixed(2)}`,
      ],
      ["Cantidad Vendida", `${cantidadVendida.toFixed(2)} KG`],
      ["Costo Inventario", `$${costoInventario.toFixed(2)}`],
      ["Costo Mano de Obra", `$${costoManoObra.toFixed(2)}`],
      ["Costo Total de Producción", `$${costoTotalProduccion.toFixed(2)}`],
      ["Ingresos Totales", `$${ingresosTotales.toFixed(2)}`],
      ["Ganancias", `$${ganancias.toFixed(2)}`],
      [
        "Margen de Ganancia",
        `${
          costoTotalProduccion > 0
            ? ((ganancias / costoTotalProduccion) * 100).toFixed(2)
            : 0
        }%`,
      ],
      ["Fecha de Exportación", new Date().toLocaleDateString("es-CO")],
    ];

    autoTable(pdf, {
      startY: yPosition,
      head: [resumenFinancieroData[0]],
      body: resumenFinancieroData.slice(1),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 8: DETALLE DE COSTOS =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.8 Detalle de Costos", 20, yPosition);
    yPosition += 15;

    const detalleCostosData = [
      ["Categoría", "Descripción", "Monto"],
      [
        "Producción",
        "Costo total de producción",
        costoTotalProduccion.toFixed(2),
      ],
      [
        "Inventario",
        "Costo de insumos y materiales",
        costoInventario.toFixed(2),
      ],
      ["Mano de Obra", "Costo de mano de obra", costoManoObra.toFixed(2)],
      [
        "Total Costos",
        "Suma de todos los costos",
        costoTotalProduccion.toFixed(2),
      ],
    ];

    autoTable(pdf, {
      startY: yPosition,
      head: [detalleCostosData[0]],
      body: detalleCostosData.slice(1),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    // ===== PÁGINA 9: INGRESOS Y RENTABILIDAD =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.9 Ingresos y Rentabilidad", 20, yPosition);
    yPosition += 15;

    const eficienciaVentas =
      cantidadCosechada > 0 ? (cantidadVendida / cantidadCosechada) * 100 : 0;
    const precioPromedio =
      cantidadVendida > 0 ? ingresosTotales / cantidadVendida : 0;

    const ingresosRentabilidadData = [
      ["Concepto", "Cantidad", "Precio de Venta", "Total"],
      [
        "Producción Total",
        `${cantidadCosechada.toFixed(2)} KG`,
        `$${precioPromedio.toFixed(2)}`,
        `$${(cantidadCosechada * precioPromedio).toFixed(2)}`,
      ],
      [
        "Ventas Realizadas",
        `${cantidadVendida.toFixed(2)} KG`,
        `$${precioPromedio.toFixed(2)}`,
        `$${ingresosTotales.toFixed(2)}`,
      ],
      ["Eficiencia de Ventas", `${eficienciaVentas.toFixed(2)}%`, "", ""],
      ["Resultado Final", "", "", `$${ganancias.toFixed(2)}`],
    ];

    autoTable(pdf, {
      startY: yPosition,
      head: [ingresosRentabilidadData[0]],
      body: ingresosRentabilidadData.slice(1),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    console.log(
      "✅ PDF TRAZABILIDAD: Successfully generated",
      pdf.getNumberOfPages(),
      "pages"
    );
    return pdf.getNumberOfPages() * 297; // Approximate
  } catch (error) {
    console.error(
      "❌ PDF TRAZABILIDAD: Error generating cultivo trazabilidad:",
      error
    );
    throw error;
  }
};

// Helper functions for cost calculations (copied from CultivoDetailsModal)
const calculateCostoManoObra = (activity: Actividad) => {
  return (activity.horasDedicadas || 0) * ((activity as any).precioHora || 0);
};

const calculateCostoInventario = (activity: Actividad) => {
  if (!(activity as any).reservas || (activity as any).reservas.length === 0)
    return 0;
  let total = 0;
  for (const reserva of (activity as any).reservas) {
    const cantidadUsada = reserva.cantidadUsada || 0;
    if (cantidadUsada > 0) {
      const esDivisible =
        reserva.lote?.producto?.categoria?.esDivisible ?? true;
      if (esDivisible) {
        const precioUnitario =
          (reserva.precioProducto || 0) /
          (reserva.capacidadPresentacionProducto || 1);
        total += cantidadUsada * precioUnitario;
      } else {
        const vidaUtil =
          reserva.lote?.producto?.categoria?.vidaUtilPromedioPorUsos;
        if (vidaUtil && vidaUtil > 0) {
          const valorResidual = (reserva.precioProducto || 0) * 0.1;
          const costoPorUso =
            ((reserva.precioProducto || 0) - valorResidual) / vidaUtil;
          total += costoPorUso;
        } else {
          const precioUnitario =
            (reserva.precioProducto || 0) /
            (reserva.capacidadPresentacionProducto || 1);
          total += cantidadUsada * precioUnitario;
        }
      }
    }
  }
  return total;
};

export const generateSensorSearchPDF = async (
  selectedDetails: SelectedSensorDetail[]
): Promise<void> => {
  try {
    console.log(
      "🎯 PDF GENERATOR: generateSensorSearchPDF called with:",
      selectedDetails
    );

    // Check if we have date/time filters to use report-data endpoint
    const hasFilters = selectedDetails.some(
      (detail) =>
        detail.startDate &&
        detail.endDate &&
        (detail.timeRanges?.length || detail.timeRange)
    );

    console.log(
      "📊 PDF GENERATOR: Checking for filters in selectedDetails:",
      selectedDetails.map((d) => ({
        sensorKey: d.sensorKey,
        hasStartDate: !!d.startDate,
        hasEndDate: !!d.endDate,
        hasTimeRanges: !!d.timeRanges?.length,
        timeRanges: d.timeRanges,
        hasTimeRange: !!d.timeRange,
        timeRange: d.timeRange,
      }))
    );
    console.log("📊 PDF GENERATOR: hasFilters result:", hasFilters);

    if (hasFilters) {
      // Use report-data endpoint with filters
      const firstDetail = selectedDetails.find(
        (detail) =>
          detail.startDate &&
          detail.endDate &&
          (detail.timeRanges?.length || detail.timeRange)
      );
      if (firstDetail) {
        const timeRangesToSend = firstDetail.timeRanges?.length
          ? firstDetail.timeRanges
          : firstDetail.timeRange
          ? [firstDetail.timeRange]
          : [];
        console.log(
          "🎯 PDF GENERATOR: Using report-data endpoint with filters:",
          {
            startDate: firstDetail.startDate,
            endDate: firstDetail.endDate,
            timeRanges: timeRangesToSend,
            sensorKeys: selectedDetails.map((d) => d.sensorKey),
          }
        );

        // Call generatePDFReport with the filters
        const selectedData = {
          cultivos: selectedDetails.map((d) => d.cultivoId),
          zonas: selectedDetails.map((d) => d.zonaId),
          sensores: selectedDetails.map((d) => d.sensorKey),
          startDate: firstDetail.startDate!,
          endDate: firstDetail.endDate!,
          groupBy: "time_slot" as const,
          timeRanges: timeRangesToSend,
        };

        const pdf = await generatePDFReport(selectedData);

        // ===== INTEGRAR SECCIÓN DE TRAZABILIDAD =====
        // Get the first cultivo data for trazabilidad
        const cultivoData = selectedDetails[0];
        console.log(
          "🔗 INTEGRATING TRAZABILIDAD for cultivo:",
          cultivoData.cultivoId
        );

        // Generate trazabilidad section
        await generateCultivoTrazabilidad(
          pdf,
          cultivoData,
          0,
          firstDetail.startDate,
          firstDetail.endDate,
          false
        );

        // Update footer with new page count
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);

          // Footer background
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 280, 210, 17, "F");
          pdf.setDrawColor(226, 232, 240);
          pdf.line(0, 280, 210, 280);

          // Add small logo to footer
          try {
            pdf.addImage(AgroTic, "PNG", 10, 282, 10, 10);
          } catch (imageError) {
            console.warn("Error adding footer logo to PDF:", imageError);
          }

          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 116, 139);
          pdf.text(
            `AgroTIC - Sistema de Monitoreo Agrícola | Generado: ${new Date().toLocaleDateString(
              "es-ES"
            )} ${new Date().toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
            25,
            288
          );
          pdf.text(`Página ${i} de ${totalPages}`, 170, 288);
          pdf.setTextColor(0, 0, 0);
        }

        // Save the complete PDF
        const fileName = `reporte-completo-cultivo-agrotic-${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        pdf.save(fileName);

        return;
      }
    }

    // Fallback: no filters applied, do nothing
    console.log("No filters applied, skipping PDF generation");
    return;
  } catch (error) {
    console.error(
      "❌ PDF GENERATOR: Error generating sensor search PDF:",
      error
    );
    throw new Error("Failed to generate PDF report.");
  }
};
