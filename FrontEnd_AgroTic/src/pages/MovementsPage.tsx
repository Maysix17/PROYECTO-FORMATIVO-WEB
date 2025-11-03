import React, { useState, useEffect } from 'react';
import Table from '../components/atoms/Table';
import MobileCard from '../components/atoms/MobileCard';
import type { CardField } from '../types/MobileCard.types';
import DateRangeInput from '../components/atoms/DateRangeInput';
import InputSearch from '../components/atoms/buscador';
import { movementsService } from '../services/movementsService';
import type { MovimientoInventario, MovimientosFilters } from '../types/movements.types';

const MovementsPage: React.FC = () => {
  const [movements, setMovements] = useState<MovimientoInventario[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MovimientosFilters>({});

  useEffect(() => {
    fetchMovements();
  }, []);

  useEffect(() => {
    if (movements.length > 0) {
      applyFilters();
    }
  }, [movements, filters]);

  const fetchMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await movementsService.getAll();
      console.log('Movements data:', data);
      setMovements(data);
      setFilteredMovements(data); // Set initial filtered movements to all movements
    } catch (err: unknown) {
      console.error('Error fetching movements:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = movements;

    if (filters.startDate || filters.endDate || filters.productQuery) {
      // If any filter is applied, use the filtered endpoint
      fetchFilteredMovements();
      return;
    }

    setFilteredMovements(filtered);
  };

  const fetchFilteredMovements = async () => {
    if (!filters.startDate && !filters.endDate && !filters.productQuery) {
      setFilteredMovements(movements);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await movementsService.getFiltered(filters);
      setFilteredMovements(data);
    } catch (err: unknown) {
      console.error('Error filtering movements:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Error al filtrar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    setFilters(prev => ({
      ...prev,
      startDate: dates[0] || undefined,
      endDate: dates[1] || undefined,
    }));
  };

  const handleProductSearch = (query: string) => {
    setFilters(prev => ({
      ...prev,
      productQuery: query || undefined,
    }));
  };

  const headers = [
    'Fecha',
    'Tipo de Movimiento',
    'Producto',
    'Código',
    'Categoría',
    'Bodega',
    'Cantidad',
    'Observación',
    'Responsable'
  ];

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-left">Historial de Movimientos</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-1">
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1">
            <InputSearch
              placeholder="Buscar por nombre o código del producto..."
              value={filters.productQuery || ''}
              onChange={(e) => handleProductSearch(e.target.value)}
            />
          </div>
          <DateRangeInput
            label="Rango de Fechas"
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        {loading ? (
          <div className="text-center py-4">Cargando...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : (
          <Table headers={headers}>
            {filteredMovements.map((movement) => (
              <tr key={movement.id} className="border-b">
                <td className="px-4 py-2">
                  {new Date(movement.fechaMovimiento).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  {movement.tipoMovimiento?.nombre || 'N/A'}
                </td>
                <td className="px-4 py-2">
                  {movement.lote?.producto?.nombre || 'N/A'}
                </td>
                <td className="px-4 py-2">
                  {movement.lote?.producto?.sku || 'N/A'}
                </td>
                <td className="px-4 py-2">
                  {movement.lote?.producto?.categoria?.nombre || 'N/A'}
                </td>
                <td className="px-4 py-2">
                  {movement.lote?.bodega?.nombre || 'N/A'}
                </td>
                <td className="px-4 py-2">
                  {movement.cantidad}
                </td>
                <td className="px-4 py-2">
                  {movement.observacion || '-'}
                </td>
                <td className="px-4 py-2">
                  {movement.responsable || '-'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {loading ? (
          <div className="text-center py-4">Cargando...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No se encontraron movimientos.</div>
        ) : (
          filteredMovements.map((movement) => {
            const fields: CardField[] = [
              {
                label: 'Fecha',
                value: new Date(movement.fechaMovimiento).toLocaleDateString()
              },
              {
                label: 'Tipo de Movimiento',
                value: movement.tipoMovimiento?.nombre || 'N/A'
              },
              {
                label: 'Producto',
                value: movement.lote?.producto?.nombre || 'N/A'
              },
              {
                label: 'Código',
                value: movement.lote?.producto?.sku || 'N/A'
              },
              {
                label: 'Categoría',
                value: movement.lote?.producto?.categoria?.nombre || 'N/A'
              },
              {
                label: 'Bodega',
                value: movement.lote?.bodega?.nombre || 'N/A'
              },
              {
                label: 'Cantidad',
                value: movement.cantidad.toString()
              },
              {
                label: 'Observación',
                value: movement.observacion || '-'
              },
              {
                label: 'Responsable',
                value: movement.responsable || '-'
              },
            ];

            return <MobileCard key={movement.id} fields={fields} actions={[]} />;
          })
        )}
      </div>
    </div>
  );
};

export default MovementsPage;