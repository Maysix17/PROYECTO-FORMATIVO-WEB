import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanzasDataDto } from './dto/finanzas-data.dto';
import { Cosecha } from '../cosechas/entities/cosecha.entity';
import { ReservasXActividad } from '../reservas_x_actividad/entities/reservas_x_actividad.entity';
import { Actividad } from '../actividades/entities/actividades.entity';
import { Venta } from '../venta/entities/venta.entity';
import { CultivosVariedadXZona } from '../cultivos_variedad_x_zona/entities/cultivos_variedad_x_zona.entity';

@Injectable()
export class FinanzasService {
  constructor(
    @InjectRepository(Cosecha)
    private readonly cosechaRepo: Repository<Cosecha>,
    @InjectRepository(ReservasXActividad)
    private readonly reservasRepo: Repository<ReservasXActividad>,
    @InjectRepository(Actividad)
    private readonly actividadRepo: Repository<Actividad>,
    @InjectRepository(Venta)
    private readonly ventaRepo: Repository<Venta>,
    @InjectRepository(CultivosVariedadXZona)
    private readonly cultivosVariedadXZonaRepo: Repository<CultivosVariedadXZona>,
  ) {}

  async calcularFinanzasCosecha(cosechaId: string): Promise<FinanzasDataDto> {
    console.log(
      `[DEBUG] ================= INICIO CÁLCULO FINANZAS COSECHA ${cosechaId} =================`,
    );

    const cosecha = await this.cosechaRepo.findOne({
      where: { id: cosechaId },
      relations: [
        'cultivosVariedadXZona',
        'cultivosVariedadXZona.cultivoXVariedad.variedad.tipoCultivo',
        'cultivosVariedadXZona.estadoFenologico',
        'ventas',
      ],
    });

    if (!cosecha) {
      console.error(`[ERROR] Cosecha con ID ${cosechaId} no encontrada.`);
      throw new NotFoundException(`Cosecha con ID ${cosechaId} no encontrada`);
    }

    console.log(`[DEBUG] Cosecha encontrada:`, {
      id: cosecha.id,
      cantidad: cosecha.cantidad,
      tipoCultivo:
        cosecha.cultivosVariedadXZona?.cultivoXVariedad?.variedad?.tipoCultivo
          ?.nombre || 'Desconocido',
      ventasCount: cosecha.ventas?.length || 0,
    });

    const costoInventario = await this.calcularCostoInventario(cosechaId);
    const costoManoObra = await this.calcularCostoManoObra(cosechaId);
    const ingresosTotales = await this.calcularIngresosTotales(cosechaId);

    const cantidadCosechada = parseFloat(cosecha.cantidad.toString());
    const cantidadVendida =
      cosecha.ventas?.reduce(
        (total, venta) => total + parseFloat(venta.cantidad.toString()),
        0,
      ) || 0;

    const costoTotalProduccion = costoInventario + costoManoObra;
    const ganancias = ingresosTotales - costoTotalProduccion;

    console.log('[DEBUG] ---------- VALORES INTERMEDIOS ----------');
    console.log(`[DEBUG] Costo Inventario: ${costoInventario}`);
    console.log(`[DEBUG] Costo Mano de Obra: ${costoManoObra}`);
    console.log(`[DEBUG] Costo Total Producción: ${costoTotalProduccion}`);
    console.log(`[DEBUG] Ingresos Totales: ${ingresosTotales}`);
    console.log(`[DEBUG] Ganancias: ${ganancias}`);
    console.log(`[DEBUG] Cantidad Cosechada: ${cantidadCosechada}`);
    console.log(`[DEBUG] Cantidad Vendida: ${cantidadVendida}`);
    console.log('[DEBUG] -----------------------------------------');

    let margenGanancia = 0;
    if (ingresosTotales > 0) {
      // Evitar división por cero o por números muy pequeños que disparen el margen
      if (ingresosTotales < 0.01) {
        console.warn(
          `[WARN] Ingresos totales (${ingresosTotales}) es muy bajo. El margen podría ser engañoso.`,
        );
      }
      const rawRatio = ganancias / ingresosTotales;
      margenGanancia = rawRatio * 100;
      console.log('[DEBUG] ---------- CÁLCULO MARGEN DE GANANCIA ----------');
      console.log(`[DEBUG] Fórmula: (ganancias / ingresosTotales) * 100`);
      console.log(
        `[DEBUG] Aplicada: (${ganancias} / ${ingresosTotales}) * 100`,
      );
      console.log(`[DEBUG] Ratio Crudo: ${rawRatio}`);
      console.log(`[DEBUG] Margen de Ganancia Calculado: ${margenGanancia}%`);
      console.log('----------------------------------------------------');
    } else {
      console.log(
        `[DEBUG] Ingresos totales es 0 o negativo, margen de ganancia se establece en 0.`,
      );
    }

    // Validar y limitar el margen de ganancia para que encaje en numeric(5, 2)
    const margenGananciaFinal = Math.max(
      -999.99,
      Math.min(999.99, margenGanancia),
    );

    if (margenGananciaFinal !== margenGanancia) {
      console.warn(
        `[WARN] Margen de ganancia (${margenGanancia}) fuera del rango. Ha sido ajustado a ${margenGananciaFinal}.`,
      );
    }

    const precioPorKilo = await this.calcularPrecioPromedioKilo(cosechaId);

    const finanzasData = {
      fkCosechaId: cosechaId,
      cantidadCosechada,
      precioPorKilo,
      cantidadVendida,
      costoInventario,
      costoManoObra,
      costoTotalProduccion,
      ingresosTotales,
      ganancias,
      margenGanancia: margenGananciaFinal,
      fechaCalculo: new Date(),
    };

    console.log('[DEBUG] ---------- DATOS CALCULADOS ----------');
    console.log(JSON.stringify(finanzasData, null, 2));
    console.log('-------------------------------------------------');

    console.log(
      `[DEBUG] ================= FIN CÁLCULO FINANZAS COSECHA ${cosechaId} =================`,
    );

    return finanzasData;
  }

  async calcularFinanzasCultivoDinamico(
    cultivoId: string,
  ): Promise<FinanzasDataDto> {
    // Obtener todas las cosechas del cultivo
    const cosechas = await this.cosechaRepo.find({
      where: { fkCultivosVariedadXZonaId: cultivoId },
      relations: ['cultivosVariedadXZona', 'ventas'],
    });

    if (cosechas.length === 0) {
      throw new NotFoundException(
        `No se encontraron cosechas para el cultivo ${cultivoId}`,
      );
    }

    // Calcular totales acumulados
    let totalCosechado = 0;
    let totalVendido = 0;
    let totalCostoInventario = 0;
    let totalCostoManoObra = 0;
    let totalIngresos = 0;
    let precioPromedioKilo = 0;

    for (const cosecha of cosechas) {
      // Costos de inventario por cosecha
      const costoInventarioCosecha = await this.calcularCostoInventario(
        cosecha.id,
      );
      totalCostoInventario += costoInventarioCosecha;

      // Costos de mano de obra por cosecha
      const costoManoObraCosecha = await this.calcularCostoManoObra(cosecha.id);
      totalCostoManoObra += costoManoObraCosecha;

      // Ingresos por cosecha
      const ingresosCosecha = await this.calcularIngresosTotales(cosecha.id);
      totalIngresos += ingresosCosecha;

      // Cantidades
      totalCosechado += parseFloat(cosecha.cantidad.toString());
      totalVendido +=
        cosecha.ventas?.reduce(
          (total, venta) => total + parseFloat(venta.cantidad.toString()),
          0,
        ) || 0;
    }

    // Calcular precio promedio ponderado
    if (totalVendido > 0) {
      precioPromedioKilo = totalIngresos / totalVendido;
    }

    const costoTotalProduccion = totalCostoInventario + totalCostoManoObra;
    const ganancias = totalIngresos - costoTotalProduccion;
    const margenGanancia =
      costoTotalProduccion > 0 ? (ganancias / totalIngresos) * 100 : 0;

    // Crear registro dinámico (no persistente, solo para visualización)
    const finanzas: FinanzasDataDto = {
      fkCosechaId: cultivoId, // Usamos el ID del cultivo como referencia
      cantidadCosechada: totalCosechado,
      precioPorKilo: precioPromedioKilo,
      cantidadVendida: totalVendido,
      costoInventario: totalCostoInventario,
      costoManoObra: totalCostoManoObra,
      costoTotalProduccion,
      ingresosTotales: totalIngresos,
      ganancias,
      margenGanancia,
      fechaCalculo: new Date(),
    };

    return finanzas;
  }

  private async calcularCostoInventario(cosechaId: string): Promise<number> {
    // Obtener todas las actividades relacionadas con la cosecha
    const actividades = await this.actividadRepo.find({
      where: {
        fkCultivoVariedadZonaId: (
          await this.cosechaRepo.findOne({
            where: { id: cosechaId },
            relations: ['cultivosVariedadXZona'],
          })
        )?.cultivosVariedadXZona?.id,
      },
      relations: [
        'reservas',
        'reservas.lote',
        'reservas.lote.producto',
        'reservas.lote.producto.categoria',
      ],
    });

    let costoTotal = 0;

    for (const actividad of actividades) {
      if (actividad.reservas) {
        for (const reserva of actividad.reservas) {
          // Verificar si el producto es divisible (consumible) o no divisible (herramienta)
          const esDivisible =
            reserva.lote?.producto?.categoria?.esDivisible ?? true; // Default true para compatibilidad

          if (esDivisible) {
            // Lógica actual para productos divisibles (consumibles)
            const costoReserva =
              (reserva.cantidadUsada || 0) *
              (reserva.precioProducto / reserva.capacidadPresentacionProducto);
            costoTotal += costoReserva;
          } else {
            // Nueva lógica para productos no divisibles (herramientas) - consumo por uso
            const vidaUtilPromedioPorUsos =
              reserva.lote?.producto?.vidaUtilPromedioPorUsos;

            if (vidaUtilPromedioPorUsos && vidaUtilPromedioPorUsos > 0) {
              // Valor residual = 10% del precio del producto
              const valorResidual = reserva.precioProducto * 0.1;
              const costoPorUso =
                (reserva.precioProducto - valorResidual) /
                vidaUtilPromedioPorUsos;

              // Cada reserva cuenta como 1 uso
              costoTotal += costoPorUso;
            } else {
              // Fallback: si no hay vida útil definida, usar lógica normal
              const costoReserva =
                (reserva.cantidadUsada || 0) *
                (reserva.precioProducto /
                  reserva.capacidadPresentacionProducto);
              costoTotal += costoReserva;
            }
          }
        }
      }
    }

    return costoTotal;
  }

  private async calcularCostoManoObra(cosechaId: string): Promise<number> {
    // Obtener todas las actividades relacionadas con la cosecha
    const actividades = await this.actividadRepo.find({
      where: {
        fkCultivoVariedadZonaId: (
          await this.cosechaRepo.findOne({
            where: { id: cosechaId },
            relations: ['cultivosVariedadXZona'],
          })
        )?.cultivosVariedadXZona?.id,
      },
    });

    let costoTotal = 0;

    for (const actividad of actividades) {
      // Costo = horas dedicadas * precio por hora
      const costoActividad =
        (actividad.horasDedicadas || 0) * (actividad.precioHora || 0);
      costoTotal += costoActividad;
    }

    return costoTotal;
  }

  private async calcularIngresosTotales(cosechaId: string): Promise<number> {
    // Obtener todas las ventas de la cosecha
    const ventas = await this.ventaRepo.find({
      where: { fkCosechaId: cosechaId },
    });

    let ingresosTotales = 0;

    for (const venta of ventas) {
      // Ingresos = cantidad vendida * precio por kilo
      const ingresosVenta =
        parseFloat(venta.cantidad.toString()) * venta.precioKilo;
      ingresosTotales += ingresosVenta;
    }

    return ingresosTotales;
  }

  private async calcularPrecioPromedioKilo(cosechaId: string): Promise<number> {
    const ventas = await this.ventaRepo.find({
      where: { fkCosechaId: cosechaId },
    });

    if (ventas.length === 0) return 0;

    const precioTotal = ventas.reduce(
      (total, venta) => total + venta.precioKilo,
      0,
    );
    return precioTotal / ventas.length;
  }

  async obtenerFinanzasCosecha(
    cosechaId: string,
  ): Promise<FinanzasDataDto | null> {
    // Since we removed persistence, this always returns null
    return null;
  }

  async obtenerFinanzasCultivo(cultivoId: string): Promise<FinanzasDataDto[]> {
    // Since we removed persistence, this always returns empty array
    return [];
  }

  async calcularFinanzasCultivoActividades(
    cultivoId: string,
  ): Promise<FinanzasDataDto> {
    console.log(
      `[DEBUG] ================= INICIO CÁLCULO FINANZAS CULTIVO ACTIVIDADES ${cultivoId} =================`,
    );

    // Buscar actividades del cultivo
    const actividades = await this.actividadRepo.find({
      where: { fkCultivoVariedadZonaId: cultivoId },
      relations: [
        'reservas',
        'reservas.lote',
        'reservas.lote.producto',
        'reservas.lote.producto.categoria',
        'reservas.estado',
      ],
    });

    if (actividades.length === 0) {
      console.error(
        `[ERROR] No se encontraron actividades para el cultivo ${cultivoId}.`,
      );
      throw new NotFoundException(
        `No se encontraron actividades para el cultivo ${cultivoId}`,
      );
    }

    console.log(
      `[DEBUG] Encontradas ${actividades.length} actividades para el cultivo ${cultivoId}`,
    );

    // Calcular costos basados en actividades
    const costoInventario =
      await this.calcularCostoInventarioPorActividades(actividades);
    const costoManoObra =
      await this.calcularCostoManoObraPorActividades(actividades);

    const costoTotalProduccion = costoInventario + costoManoObra;

    console.log('[DEBUG] ---------- COSTOS CALCULADOS ----------');
    console.log(`[DEBUG] Costo Inventario: ${costoInventario}`);
    console.log(`[DEBUG] Costo Mano de Obra: ${costoManoObra}`);
    console.log(`[DEBUG] Costo Total Producción: ${costoTotalProduccion}`);
    console.log('[DEBUG] ---------------------------------------');

    // Crear resultado con costos estimados (sin ingresos ya que no hay ventas)
    const finanzas: FinanzasDataDto = {
      fkCosechaId: cultivoId, // Usamos el ID del cultivo como referencia
      cantidadCosechada: 0, // No hay cosecha aún
      precioPorKilo: 0, // No hay ventas aún
      cantidadVendida: 0,
      costoInventario,
      costoManoObra,
      costoTotalProduccion,
      ingresosTotales: 0, // No hay ingresos aún
      ganancias: -costoTotalProduccion, // Pérdida estimada (solo costos)
      margenGanancia: 0, // No aplicable sin ingresos
      fechaCalculo: new Date(),
    };

    console.log(
      `[DEBUG] ================= FIN CÁLCULO FINANZAS CULTIVO ACTIVIDADES ${cultivoId} =================`,
    );

    return finanzas;
  }

  private async calcularCostoInventarioPorActividades(
    actividades: any[],
  ): Promise<number> {
    let costoTotal = 0;

    for (const actividad of actividades) {
      if (actividad.reservas && actividad.reservas.length > 0) {
        for (const reserva of actividad.reservas) {
          // Considerar reservas que tengan cantidad usada (incluyendo confirmadas)
          const cantidadUsada = reserva.cantidadUsada || 0;
          if (cantidadUsada > 0) {
            const esDivisible =
              reserva.lote?.producto?.categoria?.esDivisible ?? true;

            if (esDivisible) {
              // Lógica para productos divisibles (consumibles)
              const costoReserva =
                cantidadUsada *
                (reserva.precioProducto /
                  reserva.capacidadPresentacionProducto);
              costoTotal += costoReserva;
            } else {
              // Lógica para productos no divisibles (herramientas)
              const vidaUtilPromedioPorUsos =
                reserva.lote?.producto?.vidaUtilPromedioPorUsos;

              if (vidaUtilPromedioPorUsos && vidaUtilPromedioPorUsos > 0) {
                const valorResidual = reserva.precioProducto * 0.1;
                const costoPorUso =
                  (reserva.precioProducto - valorResidual) /
                  vidaUtilPromedioPorUsos;
                costoTotal += costoPorUso;
              } else {
                // Fallback
                const costoReserva =
                  cantidadUsada *
                  (reserva.precioProducto /
                    reserva.capacidadPresentacionProducto);
                costoTotal += costoReserva;
              }
            }
          }
        }
      }
    }

    return costoTotal;
  }

  private async calcularCostoManoObraPorActividades(
    actividades: any[],
  ): Promise<number> {
    let costoTotal = 0;

    for (const actividad of actividades) {
      // Costo = horas dedicadas * precio por hora
      const costoActividad =
        (actividad.horasDedicadas || 0) * (actividad.precioHora || 0);
      costoTotal += costoActividad;
    }

    return costoTotal;
  }
}
