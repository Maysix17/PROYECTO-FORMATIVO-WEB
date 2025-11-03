export interface TipoMovimiento {
  id: number;
  nombre: string;
}

export interface MovimientoInventario {
  id: string;
  fkLoteId: string;
  fkReservaId?: string;
  fkTipoMovimientoId: number;
  cantidad: number;
  fechaMovimiento: string;
  observacion?: string;
  responsable?: string;
  lote?: {
    id: string;
    producto: {
      id: string;
      nombre: string;
      sku: string;
      categoria?: {
        id: string;
        nombre: string;
      };
    };
    bodega: {
      id: string;
      nombre: string;
      numero?: string;
    };
  };
  reserva?: {
    id: string;
    cantidadUsada?: number;
  };
  tipoMovimiento?: TipoMovimiento;
}

export interface MovimientosFilters {
  startDate?: Date;
  endDate?: Date;
  productQuery?: string;
}