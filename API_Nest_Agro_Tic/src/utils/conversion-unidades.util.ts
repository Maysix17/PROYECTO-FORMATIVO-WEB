// Utilidades para conversión de unidades en el sistema agropecuario
export const CONVERSION_FACTORS = {
  LB_TO_KG: 0.453592, // 1 libra = 0.453592 kg
  KG_TO_LB: 2.20462, // 1 kg = 2.20462 lb
} as const;

/**
 * Convierte una cantidad a kilogramos
 * @param cantidad Cantidad a convertir
 * @param unidad Unidad de origen ('kg' | 'lb')
 * @returns Cantidad en kilogramos
 */
export function convertirAKilos(cantidad: number, unidad: string): number {
  if (unidad === 'kg') return cantidad;
  if (unidad === 'lb') return cantidad * CONVERSION_FACTORS.LB_TO_KG;
  throw new Error(`Unidad no soportada: ${unidad}`);
}

/**
 * Convierte una cantidad a libras
 * @param cantidad Cantidad a convertir
 * @param unidad Unidad de origen ('kg' | 'lb')
 * @returns Cantidad en libras
 */
export function convertirALibras(cantidad: number, unidad: string): number {
  if (unidad === 'lb') return cantidad;
  if (unidad === 'kg') return cantidad * CONVERSION_FACTORS.KG_TO_LB;
  throw new Error(`Unidad no soportada: ${unidad}`);
}

/**
 * Convierte un precio por unidad a precio por kilo
 * @param precioUnitario Precio en la unidad especificada
 * @param unidad Unidad del precio ('kg' | 'lb')
 * @returns Precio por kilo
 */
export function convertirPrecioAKilo(
  precioUnitario: number,
  unidad: string,
): number {
  if (unidad === 'kg') return precioUnitario;
  if (unidad === 'lb') return precioUnitario / CONVERSION_FACTORS.LB_TO_KG;
  throw new Error(`Unidad no soportada: ${unidad}`);
}

/**
 * Calcula el ingreso total de una venta
 * @param cantidad Cantidad vendida
 * @param precioUnitario Precio por unidad
 * @param unidad Unidad de la venta
 * @returns Ingreso total en la moneda base
 */
export function calcularIngresoTotal(
  cantidad: number,
  precioUnitario: number,
  unidad: string,
): number {
  const cantidadEnKg = convertirAKilos(cantidad, unidad);
  const precioPorKg = convertirPrecioAKilo(precioUnitario, unidad);
  return cantidadEnKg * precioPorKg;
}
