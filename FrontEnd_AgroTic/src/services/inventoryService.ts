import apiClient from '../lib/axios/axios';

export interface Categoria {
  id: string;
  nombre: string;
  esDivisible?: boolean;
}

export interface Bodega {
  id: string;
  nombre: string;
}

export interface CreateInventoryDto {
  nombre: string;
  descripcion?: string;
  stock: number;
  precio: number;
  capacidadUnidad?: number;
  fechaVencimiento?: string;
  fkCategoriaId: string;
  fkBodegaId: string;
  imgUrl?: File;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  descripcion?: string;
  stock: number;
  precio: number;
  capacidadUnidad?: number;
  fechaVencimiento?: string;
  imgUrl?: string;
  fkCategoriaId: string;
  fkBodegaId: string;
  categoria?: Categoria;
  bodega?: Bodega;
  stock_disponible?: number;
  stock_devuelto?: number;
  stock_sobrante?: number;
}

export interface LoteInventario {
    id: string;
    fkProductoId: string;
    fkBodegaId: string;
    cantidadDisponible: string;
    cantidadParcial: string;
    fechaIngreso: string;
    fechaVencimiento?: string;
    esParcial: boolean;
    stock?: number;
    stockTotal?: number;
    cantidadDisponibleParaReservar?: number;
    cantidadReservada?: number;
    unidadAbreviatura?: string;
    producto: {
      id: string;
      nombre: string;
      descripcion?: string;
      sku: string;
      precioCompra: string;
      precioVenta: string;
      imgUrl?: string;
      capacidadPresentacion?: number;
      vidaUtilPromedioPorUsos?: number;
      categoria?: {
        id: string;
        nombre: string;
      };
      unidadMedida?: {
        id: string;
        nombre: string;
        abreviatura: string;
      };
      // Add other product fields as needed
    };
    bodega: {
      id: string;
      nombre: string;
      numero?: string;
    };
  }

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export const inventoryService = {
  create: async (data: CreateInventoryDto): Promise<any> => {
    const formData = new FormData();
    formData.append('nombre', data.nombre);
    if (data.descripcion) formData.append('descripcion', data.descripcion);
    formData.append('stock', data.stock.toString());
    formData.append('precio', data.precio.toString());
    if (data.capacidadUnidad) formData.append('capacidadUnidad', data.capacidadUnidad.toString());
    if (data.fechaVencimiento) formData.append('fechaVencimiento', data.fechaVencimiento);
    formData.append('fkCategoriaId', data.fkCategoriaId);
    formData.append('fkBodegaId', data.fkBodegaId);
    if (data.imgUrl) formData.append('imgUrl', data.imgUrl);

    const response = await apiClient.post('/inventario', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id: string, data: CreateInventoryDto): Promise<any> => {
    const formData = new FormData();
    formData.append('nombre', data.nombre);
    if (data.descripcion) formData.append('descripcion', data.descripcion);
    formData.append('stock', data.stock.toString());
    formData.append('precio', data.precio.toString());
    if (data.capacidadUnidad) formData.append('capacidadUnidad', data.capacidadUnidad.toString());
    if (data.fechaVencimiento) formData.append('fechaVencimiento', data.fechaVencimiento);
    formData.append('fkCategoriaId', data.fkCategoriaId);
    formData.append('fkBodegaId', data.fkBodegaId);
    if (data.imgUrl) formData.append('imgUrl', data.imgUrl);

    const response = await apiClient.put(`/inventario/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/inventario/${id}`);
    return response.data;
  },

  getAll: async (page: number = 1, limit: number = 10): Promise<PaginatedResponse<LoteInventario>> => {
    const response = await apiClient.get(`/inventario?page=${page}&limit=${limit}`);
    return response.data;
  },

  search: async (query: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<LoteInventario>> => {
    const response = await apiClient.get(`/inventario/search/${query}?page=${page}&limit=${limit}`);
    return response.data;
  },

  getCategorias: async (): Promise<Categoria[]> => {
    const response = await apiClient.get('/categoria');
    return response.data;
  },

  getBodegas: async (): Promise<Bodega[]> => {
    const response = await apiClient.get('/bodega');
    return response.data;
  },

  getUnidadesMedida: async (): Promise<any[]> => {
    const response = await apiClient.get('/unidades-medida');
    return response.data;
  },

  getAvailableStock: async (id: string): Promise<number> => {
    const response = await apiClient.get(`/inventario/${id}/stock-disponible`);
    return response.data;
  },

  validateStockAvailability: async (id: string, quantity: number): Promise<boolean> => {
    const response = await apiClient.get(`/inventario/${id}/validar-stock/${quantity}`);
    return response.data;
  },

  getProductos: async (): Promise<any[]> => {
    const response = await apiClient.get('/productos');
    return response.data;
  },

  createProduct: async (data: any): Promise<any> => {
    const formData = new FormData();
    formData.append('nombre', data.nombre);
    if (data.descripcion) formData.append('descripcion', data.descripcion);
    formData.append('precioCompra', data.precioCompra.toString());
    formData.append('precioVenta', data.precioVenta.toString());
    if (data.sku) formData.append('sku', data.sku);
    formData.append('fkCategoriaId', data.fkCategoriaId);
    if (data.fkUnidadMedidaId) formData.append('fkUnidadMedidaId', data.fkUnidadMedidaId);
    if (data.imgUrl) formData.append('imgUrl', data.imgUrl);

    const response = await apiClient.post('/productos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  createWarehouse: async (data: any): Promise<any> => {
    const response = await apiClient.post('/bodega', data);
    return response.data;
  },

  createLote: async (data: any): Promise<any> => {
    const response = await apiClient.post('/inventario', data);
    return response.data;
  },

  updateLote: async (id: string, data: any): Promise<any> => {
    const response = await apiClient.put(`/inventario/${id}`, data);
    return response.data;
  },

  createProductoWithLote: async (data: any): Promise<any> => {
    if (data.imgUrl && data.imgUrl instanceof File) {
      // First upload the image
      const uploadResponse = await apiClient.post('/productos/upload-image', { imgUrl: data.imgUrl }, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      data.imgUrl = uploadResponse.data.url;
    }

    // Get current user DNI from localStorage or context
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userDni = user.dni;

    const response = await apiClient.post('/productos/with-lote', {
      ...data,
      userDni: userDni,
    });
    return response.data;
  },

  uploadProductImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('imgUrl', file);
    const response = await apiClient.post('/productos/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateInventoryItem: async (id: string, data: any): Promise<any> => {
    console.log('DEBUG: updateInventoryItem called with ID:', id);
    console.log('DEBUG: updateInventoryItem data:', data);

    // Get current user DNI from localStorage or context
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userDni = user.dni;
    console.log('DEBUG: userDni from localStorage:', userDni);

    const response = await apiClient.patch(`/inventario/${id}`, {
      ...data,
      userDni: userDni,
    });
    console.log('DEBUG: updateInventoryItem response:', response);
    return response.data;
  },
};