console.log("zonasService.ts: Starting module execution");
import axios from "../lib/axios/axios";

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
  fkZonaMqttConfigId?: string;
}

export interface EstadoMqtt {
  zonaId: string;
  conectado: boolean;
  mensaje?: string;
}

// Interfaces para gestión de umbrales
export interface SensorThreshold {
  minimo: number;
  maximo: number;
}

export interface UmbralesConfig {
  [sensorKey: string]: SensorThreshold;
}

export interface UmbralesResponse {
  success: boolean;
  message?: string;
  data?: any;
  timestamp?: string;
}

class ZonasService {
  private baseUrl = "/zonas";

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

  async create(zona: Omit<Zona, "id">): Promise<Zona> {
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

  async getZonaCultivosVariedadXZona(zonaId: string) {
    const response = await axios.get(
      `${this.baseUrl}/${zonaId}/cultivos-variedad-zona`
    );
    return response.data;
  }
}

class MqttConfigService {
  private baseUrl = "/mqtt-config";

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

  async getActiveZonaMqttConfig(
    zonaId: string
  ): Promise<ZonaMqttConfig | null> {
    const response = await axios.get(`${this.baseUrl}/zona/${zonaId}/active`);
    return response.data;
  }

  async getAllActiveZonaMqttConfigs(): Promise<ZonaMqttConfig[]> {
    const response = await axios.get(
      `${this.baseUrl}/active-zona-mqtt-configs`
    );
    return response.data;
  }

  async assignConfigToZona(
    zonaId: string,
    configId: string
  ): Promise<{
    success: boolean;
    data?: ZonaMqttConfig;
    error?: { configName: string; zonaName: string };
  }> {
    const response = await axios.post(`${this.baseUrl}/assign`, {
      zonaId,
      configId,
    });
    return response.data;
  }

  async unassignConfigFromZona(
    zonaId: string,
    configId: string
  ): Promise<void> {
    await axios.post(`${this.baseUrl}/unassign`, { zonaId, configId });
  }

  async create(
    config: Omit<MqttConfig, "id" | "zonaMqttConfigs">
  ): Promise<MqttConfig> {
    console.log("MqttConfigService.create: Sending data:", config);
    const response = await axios.post(this.baseUrl, config);
    console.log("MqttConfigService.create: Response:", response.data);
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
  private baseUrl = "/medicion-sensor";

  async getAll(): Promise<MedicionSensor[]> {
    const response = await axios.get(this.baseUrl);
    return response.data;
  }

  async getByZona(zonaId: string, limit?: number): Promise<MedicionSensor[]> {
    const params = limit ? { limit: limit.toString() } : {};
    const response = await axios.get(`${this.baseUrl}/zona/${zonaId}`, {
      params,
    });
    return response.data;
  }

  async getByMqttConfig(mqttConfigId: string): Promise<MedicionSensor[]> {
    const response = await axios.get(
      `${this.baseUrl}/mqtt-config/${mqttConfigId}`
    );
    return response.data;
  }

  async create(medicion: Omit<MedicionSensor, "id">): Promise<MedicionSensor> {
    const response = await axios.post(this.baseUrl, medicion);
    return response.data;
  }

  async createBatch(
    mediciones: Omit<MedicionSensor, "id">[]
  ): Promise<MedicionSensor[]> {
    const response = await axios.post(`${this.baseUrl}/batch`, mediciones);
    return response.data;
  }

  async getSensorSearchData(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/sensor-search`);
    return response.data;
  }

  async getHistoricalData(sensorKeys: string[]) {
    const response = await axios.post(`${this.baseUrl}/historical-data`, {
      sensorKeys,
    });
    return response.data;
  }
}

class UmbralesService {
  private baseUrl = "/mqtt-config";

  async getUmbralesByZona(zonaId: string): Promise<UmbralesConfig> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/zona/${zonaId}/umbrales`
      );

      // Verificar si la respuesta tiene la estructura esperada
      if (response.data && response.data.umbrales) {
        return response.data.umbrales;
      }

      // Si no hay umbrales definidos, devolver objeto vacío
      return {};
    } catch (error: any) {
      console.error("Error al obtener umbrales:", error);
      throw new Error(
        `Error al obtener umbrales: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async getUmbrales(mqttConfigId: string): Promise<UmbralesConfig> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/mqtt-config/${mqttConfigId}/umbrales`
      );

      // Verificar si la respuesta tiene la estructura esperada
      if (response.data && response.data.umbrales) {
        return response.data.umbrales;
      }

      // Si no hay umbrales definidos, devolver objeto vacío
      return {};
    } catch (error: any) {
      console.error("Error al obtener umbrales:", error);
      throw new Error(
        `Error al obtener umbrales: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async getSensorsForMqttConfig(mqttConfigId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/mqtt-config/${mqttConfigId}/sensors`
      );
      return response.data;
    } catch (error: any) {
      console.error("Error al obtener sensores:", error);
      throw new Error(
        `Error al obtener sensores: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async updateUmbralesByZona(
    zonaId: string,
    umbrales: UmbralesConfig
  ): Promise<void> {
    try {
      // Validación local antes de enviar
      this.validateUmbralesData(umbrales);

      const response = await axios.put(
        `${this.baseUrl}/zona/${zonaId}/umbrales`,
        {
          umbrales,
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Error al actualizar umbrales"
        );
      }
    } catch (error: any) {
      console.error("Error al actualizar umbrales:", error);
      throw new Error(
        `Error al actualizar umbrales: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async updateUmbrales(
    mqttConfigId: string,
    umbrales: UmbralesConfig
  ): Promise<void> {
    try {
      // Validación local antes de enviar
      this.validateUmbralesData(umbrales);

      const response = await axios.put(
        `${this.baseUrl}/mqtt-config/${mqttConfigId}/umbrales`,
        {
          umbrales,
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Error al actualizar umbrales"
        );
      }
    } catch (error: any) {
      console.error("Error al actualizar umbrales:", error);
      throw new Error(
        `Error al actualizar umbrales: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async validateValue(
    sensorKey: string,
    valor: number,
    umbrales: UmbralesConfig
  ): Promise<{ isValid: boolean; status: "normal" | "bajo" | "alto" }> {
    try {
      // Validación local
      const result = this.validateThresholdLocally(sensorKey, valor, umbrales);
      return result;
    } catch (error: any) {
      console.error("Error al validar valor:", error);
      // En caso de error, devolver resultado conservador
      return { isValid: false, status: "normal" };
    }
  }

  // Método de validación local de umbrales
  private validateThresholdLocally(
    sensorKey: string,
    valor: number,
    umbrales: UmbralesConfig
  ): { isValid: boolean; status: "normal" | "bajo" | "alto" } {
    const threshold = umbrales[sensorKey];

    if (!threshold) {
      // No hay umbrales definidos para este sensor
      return { isValid: true, status: "normal" };
    }

    if (typeof valor !== "number" || isNaN(valor)) {
      throw new Error("El valor debe ser un número válido");
    }

    if (
      typeof threshold.minimo !== "number" ||
      typeof threshold.maximo !== "number"
    ) {
      throw new Error("Los umbrales deben tener valores numéricos");
    }

    if (threshold.minimo >= threshold.maximo) {
      throw new Error("El valor mínimo debe ser menor que el máximo");
    }

    if (valor < threshold.minimo) {
      return { isValid: false, status: "bajo" };
    }

    if (valor > threshold.maximo) {
      return { isValid: false, status: "alto" };
    }

    return { isValid: true, status: "normal" };
  }

  // Validación de estructura de datos de umbrales
  private validateUmbralesData(umbrales: UmbralesConfig): void {
    if (typeof umbrales !== "object" || umbrales === null) {
      throw new Error("Los umbrales deben ser un objeto válido");
    }

    for (const [sensorKey, threshold] of Object.entries(umbrales)) {
      if (typeof threshold !== "object" || threshold === null) {
        throw new Error(`El umbral para ${sensorKey} debe ser un objeto`);
      }

      const { minimo, maximo } = threshold;

      if (typeof minimo !== "number" || typeof maximo !== "number") {
        throw new Error(
          `Los valores mínimo y máximo para ${sensorKey} deben ser números`
        );
      }

      if (minimo >= maximo) {
        throw new Error(
          `El valor mínimo debe ser menor que el máximo para ${sensorKey}`
        );
      }

      if (isNaN(minimo) || isNaN(maximo)) {
        throw new Error(`Los valores para ${sensorKey} no pueden ser NaN`);
      }
    }
  }

  // Método utilitario para validar umbrales completos
  validateCompleteUmbralesStructure(umbrales: any): umbrales is UmbralesConfig {
    if (typeof umbrales !== "object" || umbrales === null) {
      return false;
    }

    try {
      this.validateUmbralesData(umbrales);
      return true;
    } catch {
      return false;
    }
  }
}

export const zonasService = new ZonasService();
export const mqttConfigService = new MqttConfigService();
export const medicionSensorService = new MedicionSensorService();
export const umbralesService = new UmbralesService();

console.log("zonasService.ts: Exporting services:", {
  zonasService,
  mqttConfigService,
  medicionSensorService,
  umbralesService,
});
