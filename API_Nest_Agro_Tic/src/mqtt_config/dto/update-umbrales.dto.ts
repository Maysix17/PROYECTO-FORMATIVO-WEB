import {
  IsObject,
  IsNumber,
  IsOptional,
  Min,
  ValidatorConstraint,
  ValidationArguments,
  ValidateIf,
} from 'class-validator';
import { registerDecorator } from 'class-validator';
import { UmbralResponseDto } from './umbrales-response.dto';

/**
 * Función de validación personalizada para asegurar que minimo < maximo
 * y ambos valores son números válidos
 */
export function IsThresholdValid(validationOptions?: any) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isThresholdValid',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') {
            return false;
          }

          for (const [sensorKey, threshold] of Object.entries(value)) {
            if (!threshold || typeof threshold !== 'object') {
              return false;
            }

            // Tipificar threshold para que TypeScript reconozca las propiedades minimo y maximo
            const typedThreshold = threshold as UmbralResponseDto;

            // Verificar que minimo y maximo existen y son números
            if (
              typeof typedThreshold.minimo !== 'number' ||
              typeof typedThreshold.maximo !== 'number'
            ) {
              return false;
            }

            // Verificar que no son NaN
            if (isNaN(typedThreshold.minimo) || isNaN(typedThreshold.maximo)) {
              return false;
            }

            // Verificar que minimo < maximo
            if (typedThreshold.minimo >= typedThreshold.maximo) {
              return false;
            }

            // Verificar que ambos valores son positivos
            if (typedThreshold.minimo < 0 || typedThreshold.maximo < 0) {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Cada umbral debe tener minimo < maximo y ambos valores deben ser números positivos';
        },
      },
    });
  };
}

/**
 * DTO para validar la estructura completa de umbrales
 * Debe cumplir la condición: minimo < maximo para cada sensor
 */
export class UpdateUmbralesDto {
  @IsObject()
  @IsThresholdValid({
    message:
      'Cada umbral debe tener minimo < maximo y ambos valores deben ser números positivos',
  })
  umbrales: Record<string, { minimo: number; maximo: number }>;
}
