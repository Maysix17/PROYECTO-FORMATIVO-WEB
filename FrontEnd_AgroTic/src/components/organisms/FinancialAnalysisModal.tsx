import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import { PieChart, Pie, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import apiClient from '../../lib/axios/axios';
import * as XLSX from 'xlsx';

interface FinanzasCosecha {
  id?: string;
  fkCosechaId: string;
  cantidadCosechada: number;
  precioPorKilo: number;
  fechaVenta?: string;
  cantidadVendida: number;
  costoInventario: number;
  costoManoObra: number;
  costoTotalProduccion: number;
  ingresosTotales: number;
  ganancias: number;
  margenGanancia: number;
  fechaCalculo: Date;
}

interface FinancialAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  cosechaId?: string;
  cultivoId?: string;
}

export const FinancialAnalysisModal: React.FC<FinancialAnalysisModalProps> = ({
  isOpen,
  onClose,
  cosechaId,
  cultivoId
}) => {
  const [finanzas, setFinanzas] = useState<FinanzasCosecha | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && (cosechaId || cultivoId)) {
      loadFinancialData();
    }
  }, [isOpen, cosechaId, cultivoId]);

  const loadFinancialData = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';

      if (cultivoId) {
        // Verificar si el cultivo tiene cosechas para usar análisis dinámico o basado en actividades
        try {
          const cosechasResponse = await apiClient.get(`/cosechas/cultivo/${cultivoId}`);
          const cosechas = cosechasResponse.data;

          if (cosechas && cosechas.length > 0) {
            // Tiene cosechas, usar análisis dinámico completo
            endpoint = `/finanzas/cultivo/${cultivoId}/dinamico`;
          } else {
            // No tiene cosechas, usar análisis basado en actividades
            endpoint = `/finanzas/cultivo/${cultivoId}/actividades`;
          }
        } catch (cosechasError) {
          // Si no puede verificar cosechas, asumir análisis basado en actividades
          endpoint = `/finanzas/cultivo/${cultivoId}/actividades`;
        }
      } else if (cosechaId) {
        // Análisis de cosecha individual
        endpoint = `/finanzas/cosecha/${cosechaId}/calcular`;
      }

      if (endpoint) {
        const response = await apiClient.get(endpoint);
        setFinanzas(response.data);
      }
    } catch (err) {
      setError('Error al cargar los datos financieros');
      console.error('Error loading financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-CO').format(num);
  };

  const exportToExcel = () => {
    if (!finanzas) {
      alert('No hay datos financieros para exportar.');
      return;
    }

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Resumen Financiero
      const resumenData = [
        ["Concepto", "Valor"],
        ["Cantidad Cosechada", finanzas.cantidadCosechada.toString() + " KG"],
        ["Precio por Kilo", formatCurrency(finanzas.precioPorKilo)],
        ["Fecha de Venta", finanzas.fechaVenta ? new Date(finanzas.fechaVenta).toLocaleDateString('es-CO') : "N/A"],
        ["Cantidad Vendida", finanzas.cantidadVendida.toString() + " KG"],
        ["Costo Inventario", formatCurrency(finanzas.costoInventario)],
        ["Costo Mano de Obra", formatCurrency(finanzas.costoManoObra)],
        ["Costo Total de Producción", formatCurrency(finanzas.costoTotalProduccion)],
        ["Ingresos Totales", formatCurrency(finanzas.ingresosTotales)],
        ["Ganancias", formatCurrency(finanzas.ganancias)],
        ["Margen de Ganancia", (finanzas.margenGanancia * 100).toFixed(2) + "%"],
        ["Fecha de Cálculo", new Date(finanzas.fechaCalculo).toLocaleDateString('es-CO')],
        ["Fecha de Exportación", new Date().toLocaleDateString('es-CO')]
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

      // Set column widths for Resumen Financiero sheet
      wsResumen['!cols'] = [
        { wch: 30 }, // Concepto
        { wch: 25 }  // Valor
      ];

      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Financiero");

      // Sheet 2: Detalle de Costos
      const costosData = [
        ["Categoría", "Descripción", "Monto"],
        ["Producción", "Costo total de producción", finanzas.costoTotalProduccion.toString()],
        ["Inventario", "Costo de insumos y materiales", finanzas.costoInventario.toString()],
        ["Mano de Obra", "Costo de mano de obra", finanzas.costoManoObra.toString()],
        ["Total Costos", "Suma de todos los costos", finanzas.costoTotalProduccion.toString()]
      ];
      const wsCostos = XLSX.utils.aoa_to_sheet(costosData);

      // Set column widths for Detalle de Costos sheet
      wsCostos['!cols'] = [
        { wch: 15 }, // Categoría
        { wch: 35 }, // Descripción
        { wch: 20 }  // Monto
      ];

      XLSX.utils.book_append_sheet(wb, wsCostos, "Detalle de Costos");

      // Sheet 3: Ingresos y Rentabilidad
      const ingresosData = [
        ["Concepto", "Cantidad", "Precio Unitario", "Total"],
        ["Producción Total", finanzas.cantidadCosechada.toString() + " KG", formatCurrency(finanzas.precioPorKilo), formatCurrency(finanzas.cantidadCosechada * finanzas.precioPorKilo)],
        ["Ventas Realizadas", finanzas.cantidadVendida.toString() + " KG", formatCurrency(finanzas.precioPorKilo), formatCurrency(finanzas.ingresosTotales)],
        ["Eficiencia de Ventas", ((finanzas.cantidadVendida / finanzas.cantidadCosechada) * 100).toFixed(2) + "%", "", ""],
        ["Resultado Final", "", "", formatCurrency(finanzas.ganancias)]
      ];
      const wsIngresos = XLSX.utils.aoa_to_sheet(ingresosData);

      // Set column widths for Ingresos y Rentabilidad sheet
      wsIngresos['!cols'] = [
        { wch: 25 }, // Concepto
        { wch: 20 }, // Cantidad
        { wch: 20 }, // Precio Unitario
        { wch: 20 }  // Total
      ];

      XLSX.utils.book_append_sheet(wb, wsIngresos, "Ingresos y Rentabilidad");

      // Generate and download file
      const tipo = cultivoId ? 'Cultivo' : 'Cosecha';
      const id = cultivoId || cosechaId;
      const fileName = `Analisis_Financiero_${tipo}_${id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar el análisis financiero. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent className="max-h-[90vh]">
        <ModalHeader>
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-primary-600 rounded text-white flex items-center justify-center font-bold">💰</div>
            <h2 className="text-2xl font-semibold">
              {cultivoId ? 'Análisis Financiero del Cultivo' : 'Análisis Financiero de Cosecha'}
            </h2>
            {cultivoId && finanzas && finanzas.cantidadCosechada === 0 && (
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Basado en actividades
              </div>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="max-h-[calc(90vh-120px)] overflow-y-auto">

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Calculando análisis financiero...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {finanzas && (
            <div className="space-y-6">
              {/* Resumen Ejecutivo y Gráfico */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary Cards Grid */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="space-y-6">
                    {/* Top Row: Producción and Ingresos Totales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-blue-600 rounded text-white flex items-center justify-center">📦</div>
                          <div>
                            <p className="text-sm font-medium text-blue-600">Producción</p>
                            <p className="text-xl font-bold text-blue-900">
                              {finanzas.cantidadCosechada > 0
                                ? `${formatNumber(finanzas.cantidadCosechada)} KG`
                                : 'Sin cosecha aún'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg ${finanzas.ingresosTotales > 0 ? 'bg-primary-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded text-white flex items-center justify-center ${finanzas.ingresosTotales > 0 ? 'bg-primary-600' : 'bg-gray-600'}`}>💵</div>
                          <div>
                            <p className={`text-sm font-medium ${finanzas.ingresosTotales > 0 ? 'text-primary-600' : 'text-gray-600'}`}>Ingresos Totales</p>
                            <p className={`text-xl font-bold ${finanzas.ingresosTotales > 0 ? 'text-primary-900' : 'text-gray-900'}`}>
                              {finanzas.ingresosTotales > 0
                                ? formatCurrency(finanzas.ingresosTotales)
                                : 'Sin ventas aún'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Second Row: Ganancias */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className={`p-4 rounded-lg ${finanzas.ganancias >= 0 ? 'bg-primary-50' : 'bg-red-50'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded text-white flex items-center justify-center ${finanzas.ganancias >= 0 ? 'bg-primary-600' : 'bg-red-600'}`}>
                            {finanzas.ganancias >= 0 ? '📈' : '📉'}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${finanzas.ganancias >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                              {finanzas.ganancias >= 0 ? 'Ganancias' : 'Pérdidas'}
                            </p>
                            <p className={`text-xl font-bold ${finanzas.ganancias >= 0 ? 'text-primary-900' : 'text-red-900'}`}>
                              {formatCurrency(Math.abs(finanzas.ganancias))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Third Row: Costos Totales */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-red-600 rounded text-white flex items-center justify-center">💸</div>
                          <div>
                            <p className="text-sm font-medium text-red-600">Costo Total de Producción</p>
                            <p className="text-xl font-bold text-red-900">
                              {formatCurrency(finanzas.costoTotalProduccion)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {finanzas.cantidadCosechada > 0 ? 'Total de Ingresos totales y Costos de produccion' : 'Costos Estimados'}
                  </h3>
                  <div style={{ width: '100%', height: '300px', minWidth: '300px', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'Costo total\n de Producción',
                              value: parseFloat(finanzas.costoTotalProduccion.toString()),
                              fill: '#DC2626'
                            },
                            ...(finanzas.ingresosTotales > 0 ? [{
                              name: 'Ingresos\nTotales',
                              value: parseFloat(finanzas.ingresosTotales.toString()),
                              fill: '#16A34A'
                            }] : [])
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }) => `${((percent as number) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {finanzas.cantidadCosechada === 0 && (
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      * Costos estimados basados en actividades realizadas
                    </p>
                  )}
                </div>
              </div>

              {/* Tabla Detallada */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalle Financiero
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Concepto
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Unitario
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {finanzas.cantidadCosechada > 0 && (
                        <>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Producción Cosechada
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatNumber(finanzas.cantidadCosechada)} KG
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency(finanzas.precioPorKilo)}/KG
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              {formatCurrency(finanzas.cantidadCosechada * finanzas.precioPorKilo)}
                            </td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Cantidad Vendida
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatNumber(finanzas.cantidadVendida)} KG
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency(finanzas.precioPorKilo)}/KG
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              {formatCurrency(finanzas.ingresosTotales)}
                            </td>
                          </tr>
                        </>
                      )}
                      {finanzas.cantidadCosechada === 0 && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            Costos Estimados
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            -
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            Basado en actividades
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {formatCurrency(finanzas.costoTotalProduccion)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          Costo Inventario
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                          -{formatCurrency(finanzas.costoInventario)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          Costo Mano de Obra
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                          -{formatCurrency(finanzas.costoManoObra)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          Resultado Final
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                          finanzas.ganancias >= 0 ? 'text-primary-600' : 'text-red-600'
                        }`}>
                          {finanzas.ganancias >= 0 ? '+' : ''}{formatCurrency(finanzas.ganancias)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Métricas Adicionales */}
              {finanzas.cantidadCosechada > 0 && (
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Eficiencia de Ventas</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {finanzas.cantidadCosechada > 0 ?
                        ((finanzas.cantidadVendida / finanzas.cantidadCosechada) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatNumber(finanzas.cantidadVendida)} de {formatNumber(finanzas.cantidadCosechada)} KG vendidos
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <CustomButton
              onClick={exportToExcel}
              disabled={!finanzas}
              variant="solid"
              color="success"
              label="Exportar Excel"
            />
            <div className="flex space-x-3">
              <CustomButton onClick={onClose} variant="light" label="Cerrar" />
              <CustomButton
                onClick={loadFinancialData}
                disabled={loading}
                color="primary"
                label={loading ? 'Recalculando...' : 'Recalcular'}
              />
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};