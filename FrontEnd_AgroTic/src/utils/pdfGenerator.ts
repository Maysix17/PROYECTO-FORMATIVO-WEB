import jsPDF from "jspdf";
import apiClient from "../lib/axios/axios";
import { renderLineChartToCanvas } from "./chartRenderer";
import Swal from "sweetalert2";
import { getActividadesByCultivoVariedadZonaId } from "../services/actividadesService";
import { getCosechasByCultivo } from "../services/cosechasService";
import { getVentas } from "../services/ventaService";
import type { Actividad } from "../services/actividadesService";
import { calcularEdadCultivo } from "../services/cultivosVariedadZonaService";

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

    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("AgroTIC - Reporte Completo de Cultivo", 20, 22);

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
        20,
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
  yPosition: number
): Promise<number> => {
  try {
    const {
      cultivoId,
      zonaId,
      zonaNombre,
      cultivoNombre,
      variedadNombre,
      tipoCultivoNombre,
    } = cultivoData;

    // Obtener datos del cultivo usando el cvzId (cultivoId en este contexto)
    const cvzId = cultivoId;

    // ===== SECCIÓN 2: TRAZABILIDAD COMPLETA DEL CULTIVO =====
    pdf.addPage();
    yPosition = 20;

    // Header de la sección
    pdf.setFillColor(34, 197, 94);
    pdf.rect(0, 0, 210, 25, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("SECCIÓN 2: TRAZABILIDAD COMPLETA DEL CULTIVO", 20, 17);
    pdf.setTextColor(0, 0, 0);
    yPosition = 35;

    // ===== 2.1 INFORMACIÓN GENERAL DEL CULTIVO =====
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.1 Información General del Cultivo", 20, yPosition);
    yPosition += 10;

    // Tabla de información básica
    pdf.setFillColor(248, 250, 252);
    pdf.rect(15, yPosition - 5, 180, 50, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(15, yPosition - 5, 180, 50);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    const infoData = [
      ["Tipo de Cultivo", tipoCultivoNombre || "N/A"],
      ["Variedad", variedadNombre || "N/A"],
      ["Zona", zonaNombre || "N/A"],
      ["ID del Cultivo", cvzId],
      ["Fecha de Exportación", new Date().toLocaleDateString("es-CO")],
    ];

    infoData.forEach((row, index) => {
      pdf.text(`${row[0]}:`, 25, yPosition + index * 8);
      pdf.text(row[1], 80, yPosition + index * 8);
    });

    yPosition += 60;

    // Fetch all related data
    const [actividades, cosechas, ventas] = await Promise.all([
      getActividadesByCultivoVariedadZonaId(cvzId),
      getCosechasByCultivo(cvzId),
      getVentas(),
    ]);

    // Filter ventas related to this cultivo's cosechas
    const cultivoVentas = ventas.filter((venta) =>
      cosechas.some((cosecha) => cosecha.id === venta.fkCosechaId)
    );

    // ===== 2.2 CRONOGRAMA DE ACTIVIDADES =====
    if (actividades.length > 0) {
      pdf.addPage();
      yPosition = 20;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("2.2 Cronograma de Actividades", 20, yPosition);
      yPosition += 10;

      // Filter finalized activities
      const finalizedActivities = actividades.filter(
        (act) => act.estado === false
      );

      if (finalizedActivities.length > 0) {
        // Table headers
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        const headers = [
          "Fecha",
          "Categoría",
          "Responsable",
          "Estado",
          "Costo Mano de Obra",
          "Costo Total",
        ];
        const colWidths = [25, 35, 40, 20, 30, 30];
        let xPos = 20;

        headers.forEach((header, index) => {
          pdf.text(header, xPos, yPosition);
          xPos += colWidths[index];
        });

        yPosition += 5;
        pdf.line(20, yPosition, 190, yPosition);
        yPosition += 5;

        // Table rows
        pdf.setFont("helvetica", "normal");
        finalizedActivities.forEach((activity: Actividad) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }

          xPos = 20;
          const costoManoObra =
            (activity.horasDedicadas || 0) *
            ((activity as any).precioHora || 0);
          const costoInventario = calculateCostoInventario(activity);
          const costoTotal = costoManoObra + costoInventario;

          const rowData = [
            activity.fechaAsignacion
              ? new Date(
                  activity.fechaAsignacion + "T00:00:00"
                ).toLocaleDateString("es-CO")
              : "N/A",
            (activity as any).categoriaActividad?.nombre || "Sin categoría",
            (activity as any).responsableNombre || "Sin responsable",
            "Finalizada",
            `$${costoManoObra.toFixed(2)}`,
            `$${costoTotal.toFixed(2)}`,
          ];

          rowData.forEach((data, index) => {
            pdf.text(data, xPos, yPosition);
            xPos += colWidths[index];
          });

          yPosition += 8;
        });
      }
    }

    // ===== 2.3 ANÁLISIS DE COSTOS =====
    if (actividades.length > 0) {
      pdf.addPage();
      yPosition = 20;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("2.3 Análisis de Costos", 20, yPosition);
      yPosition += 10;

      const finalizedActivities = actividades.filter(
        (act) => act.estado === false
      );
      const costoTotalProduccion = finalizedActivities.reduce(
        (sum, act) =>
          sum + calculateCostoManoObra(act) + calculateCostoInventario(act),
        0
      );

      // Summary table
      pdf.setFillColor(248, 250, 252);
      pdf.rect(15, yPosition - 5, 180, 30, "F");
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(15, yPosition - 5, 180, 30);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        `Total de Actividades Finalizadas: ${finalizedActivities.length}`,
        25,
        yPosition + 5
      );
      pdf.text(
        `Costo Total de Producción: $${costoTotalProduccion.toFixed(2)}`,
        25,
        yPosition + 15
      );
      pdf.text(
        `Costo Promedio por Actividad: $${(
          costoTotalProduccion / finalizedActivities.length || 1
        ).toFixed(2)}`,
        25,
        yPosition + 25
      );

      yPosition += 40;

      // Detailed cost breakdown
      if (finalizedActivities.length > 0 && yPosition < 200) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Desglose por Actividad:", 20, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        const costHeaders = [
          "Actividad",
          "Fecha",
          "Mano de Obra",
          "Inventario",
          "Total",
        ];
        const costColWidths = [40, 25, 25, 25, 25];
        let xPos = 20;

        costHeaders.forEach((header, index) => {
          pdf.text(header, xPos, yPosition);
          xPos += costColWidths[index];
        });

        yPosition += 5;
        pdf.line(20, yPosition, 190, yPosition);
        yPosition += 5;

        pdf.setFont("helvetica", "normal");
        finalizedActivities.slice(0, 8).forEach((activity: Actividad) => {
          // Limit to 8 activities for space
          xPos = 20;
          const costoManoObra = calculateCostoManoObra(activity);
          const costoInventario = calculateCostoInventario(activity);
          const costoTotal = costoManoObra + costoInventario;

          const activityName =
            (activity as any).categoriaActividad?.nombre || "Actividad";
          const shortName =
            activityName.length > 15
              ? activityName.substring(0, 15) + "..."
              : activityName;

          const rowData = [
            shortName,
            activity.fechaAsignacion
              ? new Date(activity.fechaAsignacion + "T00:00:00")
                  .toLocaleDateString("es-CO")
                  .split("/")[0] +
                "/" +
                new Date(activity.fechaAsignacion + "T00:00:00")
                  .toLocaleDateString("es-CO")
                  .split("/")[1]
              : "N/A",
            `$${costoManoObra.toFixed(0)}`,
            `$${costoInventario.toFixed(0)}`,
            `$${costoTotal.toFixed(0)}`,
          ];

          rowData.forEach((data, index) => {
            pdf.text(data, xPos, yPosition);
            xPos += costColWidths[index];
          });

          yPosition += 6;
        });
      }
    }

    // ===== 2.4 ESTADO FINANCIERO =====
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("2.4 Estado Financiero", 20, yPosition);
    yPosition += 10;

    // Fetch financial data
    let finanzas = null;
    try {
      const cosechasResponse = await apiClient.get(
        `/cosechas/cultivo/${cvzId}`
      );
      const cosechasCultivo = cosechasResponse.data;
      if (cosechasCultivo && cosechasCultivo.length > 0) {
        const response = await apiClient.get(
          `/finanzas/cultivo/${cvzId}/dinamico`
        );
        finanzas = response.data;
      } else {
        const response = await apiClient.get(
          `/finanzas/cultivo/${cvzId}/actividades`
        );
        finanzas = response.data;
      }
    } catch (finanzasError) {
      console.warn("Could not fetch financial data:", finanzasError);
    }

    if (finanzas) {
      // Financial summary table
      pdf.setFillColor(248, 250, 252);
      pdf.rect(15, yPosition - 5, 180, 60, "F");
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(15, yPosition - 5, 180, 60);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const financialData = [
        ["Cantidad Cosechada", `${finanzas.cantidadCosechada.toFixed(2)} KG`],
        ["Precio por Kilo", `$${finanzas.precioPorKilo.toFixed(2)}`],
        ["Ingresos Totales", `$${finanzas.ingresosTotales.toFixed(2)}`],
        [
          "Costo Total de Producción",
          `$${finanzas.costoTotalProduccion.toFixed(2)}`,
        ],
        ["Ganancias", `$${finanzas.ganancias.toFixed(2)}`],
        [
          "Margen de Ganancia",
          `${(finanzas.margenGanancia * 100).toFixed(2)}%`,
        ],
      ];

      financialData.forEach((row, index) => {
        pdf.text(`${row[0]}:`, 25, yPosition + index * 8);
        pdf.text(row[1], 120, yPosition + index * 8);
      });

      yPosition += 70;

      // Additional financial metrics
      if (yPosition < 200) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Métricas Adicionales:", 20, yPosition);
        yPosition += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(
          `• Eficiencia de Ventas: ${(
            (finanzas.cantidadVendida / finanzas.cantidadCosechada) *
            100
          ).toFixed(2)}%`,
          25,
          yPosition
        );
        yPosition += 6;
        pdf.text(
          `• Cantidad Vendida: ${finanzas.cantidadVendida.toFixed(2)} KG`,
          25,
          yPosition
        );
        yPosition += 6;
        pdf.text(
          `• Fecha de Venta: ${
            finanzas.fechaVenta
              ? new Date(finanzas.fechaVenta).toLocaleDateString("es-CO")
              : "N/A"
          }`,
          25,
          yPosition
        );
      }
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        "No hay datos financieros disponibles para este cultivo.",
        20,
        yPosition
      );
    }

    return yPosition;
  } catch (error) {
    console.error("Error generating cultivo trazabilidad:", error);
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
        await generateCultivoTrazabilidad(pdf, cultivoData, 0);

        // Update footer with new page count
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);

          // Footer background
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 280, 210, 17, "F");
          pdf.setDrawColor(226, 232, 240);
          pdf.line(0, 280, 210, 280);

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
            20,
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
