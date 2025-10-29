import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import { PieChart, Pie, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import apiClient from '../../lib/axios/axios';

interface FinanzasCosecha {
  id: string;
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
  fechaCalculo: string;
  cosecha?: {
    fecha?: string;
  };
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
      // Si tenemos cultivoId, usar análisis dinámico del cultivo completo
      // Si solo tenemos cosechaId, usar análisis de cosecha individual
      const endpoint = cultivoId
        ? `/finanzas/cultivo/${cultivoId}/dinamico`
        : `/finanzas/cosecha/${cosechaId}/calcular`;

      const response = await apiClient.get(endpoint);
      setFinanzas(response.data);
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

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent className="max-h-[90vh]">
        <ModalHeader>
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-primary-600 rounded text-white flex items-center justify-center font-bold">💰</div>
            <h2 className="text-2xl font-semibold">
              {cultivoId ? 'Análisis Financiero del Cultivo' : 'Análisis Financiero de Cosecha'}
            </h2>
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
                              {formatNumber(finanzas.cantidadCosechada)} KG
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-primary-600 rounded text-white flex items-center justify-center">💵</div>
                          <div>
                            <p className="text-sm font-medium text-primary-600">Ingresos Totales</p>
                            <p className="text-xl font-bold text-primary-900">
                              {formatCurrency(finanzas.ingresosTotales)}
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
                    Cosecha
                  </h3>
                  <div style={{ width: '100%', height: '300px', minWidth: '300px', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'Costo \n de Producción',
                              value: parseFloat(finanzas.costoTotalProduccion.toString()),
                              fill: '#DC2626'
                            },
                            {
                              name: 'Ingresos\npor Ventas',
                              value: parseFloat(finanzas.ingresosTotales.toString()),
                              fill: '#16A34A'
                            }
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
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
            <CustomButton onClick={onClose} variant="light" label="Cerrar" />
            <CustomButton
              onClick={loadFinancialData}
              disabled={loading}
              color="success"
              label={loading ? 'Recalculando...' : 'Recalcular'}
            />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};