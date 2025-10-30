console.log('zonasService.ts: Starting module execution');
import axios from '../lib/axios/axios';

export interface Zona {
  id: string;
  nombre: string;
  tipoLote: string;
  coorX: number;
  coorY: number;
  areaMetrosCuadrados?: number;
  coordenadas?: any;
  fkMapaId: string;
  mqttConfig?: MqttConfig;
  zonaMqttConfigs?: ZonaMqttConfig[];
}

export interface MqttConfig {
  id: string;
  nombre: string;
  host: string;
  port: number;
  protocol: string;
  topicBase: string;
  activa: boolean;
  zonaMqttConfigs?: ZonaMqttConfig[];
}

export interface ZonaMqttConfig {
  id: string;
  fkMqttConfigId: string;
  fkZonaId: string;
  estado: boolean;
  createdAt: string;
  updatedAt: string;
  mqttConfig?: MqttConfig;
  zona?: Zona;
}

export interface MedicionSensor {
  id: string;
  key: string;
  valor: number;
  unidad: string;
  fechaMedicion: string;
  fkMqttConfigId: string;
  fkZonaId: string;
}

export interface EstadoMqtt {
  zonaId: string;
  conectado: boolean;
  mensaje?: string;
}

class ZonasService {
  private baseUrl = '/zonas';

  async getAll(): Promise<Zona[]> {
    const response = await axios.get(this.baseUrl);
    return response.data;
  }

  async getAllZonas(): Promise<Zona[]> {
    return this.getAll();
  }

  async getById(id: string): Promise<Zona> {
    const response = await axios.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async create(zona: Omit<Zona, 'id'>): Promise<Zona> {
    const response = await axios.post(this.baseUrl, zona);
    return response.data;
  }

  async update(id: string, zona: Partial<Zona>): Promise<Zona> {
    const response = await axios.patch(`${this.baseUrl}/${id}`, zona);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }
}

class MqttConfigService {
  private baseUrl = '/mqtt-config';

  async getAll(): Promise<MqttConfig[]> {
    const response = await axios.get(this.baseUrl);
    return response.data;
  }

  async getActive(): Promise<MqttConfig[]> {
    const response = await axios.get(`${this.baseUrl}/active`);
    return response.data;
  }

  async getByZona(zonaId: string): Promise<ZonaMqttConfig | null> {
    const response = await axios.get(`${this.baseUrl}/zona/${zonaId}`);
    return response.data;
  }

  async getZonaMqttConfigs(zonaId: string): Promise<ZonaMqttConfig[]> {
    const response = await axios.get(`${this.baseUrl}/zona/${zonaId}/configs`);
    return response.data;
  }

  async getActiveZonaMqttConfig(zonaId: string): Promise<ZonaMqttConfig | null> {
    const response = await axios.get(`${this.baseUrl}/zona/${zonaId}/active`);
    return response.data;
  }

  async assignConfigToZona(zonaId: string, configId: string): Promise<{ success: boolean; data?: ZonaMqttConfig; error?: { configName: string; zonaName: string } }> {
    const response = await axios.post(`${this.baseUrl}/assign`, { zonaId, configId });
    return response.data;
  }

  async unassignConfigFromZona(zonaId: string, configId: string): Promise<void> {
    await axios.post(`${this.baseUrl}/unassign`, { zonaId, configId });
  }

  async create(config: Omit<MqttConfig, 'id' | 'zonaMqttConfigs'>): Promise<MqttConfig> {
    console.log('MqttConfigService.create: Sending data:', config);
    const response = await axios.post(this.baseUrl, config);
    console.log('MqttConfigService.create: Response:', response.data);
    return response.data;
  }

  async update(id: string, config: Partial<MqttConfig>): Promise<MqttConfig> {
    const response = await axios.patch(`${this.baseUrl}/${id}`, config);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }
}

class MedicionSensorService {
  private baseUrl = '/medicion-sensor';

  async getAll(): Promise<MedicionSensor[]> {
    const response = await axios.get(this.baseUrl);
    return response.data;
  }

  async getByZona(zonaId: string, limit?: number): Promise<MedicionSensor[]> {
    const params = limit ? { limit: limit.toString() } : {};
    const response = await axios.get(`${this.baseUrl}/zona/${zonaId}`, { params });
    return response.data;
  }

  async getByMqttConfig(mqttConfigId: string): Promise<MedicionSensor[]> {
    const response = await axios.get(`${this.baseUrl}/mqtt-config/${mqttConfigId}`);
    return response.data;
  }

  async create(medicion: Omit<MedicionSensor, 'id'>): Promise<MedicionSensor> {
    const response = await axios.post(this.baseUrl, medicion);
    return response.data;
  }

  async createBatch(mediciones: Omit<MedicionSensor, 'id'>[]): Promise<MedicionSensor[]> {
    const response = await axios.post(`${this.baseUrl}/batch`, mediciones);
    return response.data;
  }
}

export const zonasService = new ZonasService();
export const mqttConfigService = new MqttConfigService();
export const medicionSensorService = new MedicionSensorService();

console.log('zonasService.ts: Exporting services:', { zonasService, mqttConfigService, medicionSensorService });