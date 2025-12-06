import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import type { Cultivo } from '../../types/cultivos.types';
import { getCosechasByCultivo } from '../../services/cosechasService';
import { usePermission } from '../../contexts/PermissionContext';
import Swal from 'sweetalert2';

interface HarvestSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  cultivo: Cultivo | null;
  onHarvest: () => void;
  onSell: () => void;
  onFinalize: () => void;
  onCloseHarvest?: () => void;
}

interface CosechaDisponible {
  id: string;
  fecha?: string;
  cantidad: number;
  unidadMedida: string;
  cantidadDisponible: number;
  cerrado: boolean;
}

const HarvestSellModal: React.FC<HarvestSellModalProps> = ({
  isOpen,
  onClose,
  cultivo,
  onHarvest,
  onSell,
  onFinalize,
  onCloseHarvest
}) => {
  const [cosechasDisponibles, setCosechasDisponibles] = useState<CosechaDisponible[]>([]);
  const [loading, setLoading] = useState(false);
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (isOpen && cultivo) {
      loadCosechasDisponibles();
    }
  }, [isOpen, cultivo]);

  const loadCosechasDisponibles = async () => {
    if (!cultivo) return;

    setLoading(true);
    try {
      console.log('[DEBUG] HarvestSellModal - Cargando cosechas para cultivo:', cultivo.cvzid);
      const cosechas = await getCosechasByCultivo(cultivo.cvzid);
      console.log('[DEBUG] HarvestSellModal - Cosechas obtenidas:', cosechas?.map(c => ({
        id: c.id,
        cantidad: c.cantidad,
        cantidadDisponible: c.cantidadDisponible,
        cerrado: c.cerrado
      })));
      setCosechasDisponibles(cosechas || []);
    } catch (error) {
      console.error('Error loading cosechas:', error);
      setCosechasDisponibles([]);
    } finally {
      setLoading(false);
    }
  };

  if (!cultivo) return null;

  const isPerenne = cultivo.tipoCultivo?.esPerenne || false;
  const hasCosecha = !!cultivo.cosechaid;
  const hasRemainingQuantity = cosechasDisponibles.some(c => c.cantidadDisponible > 0);
  const allSold = !isPerenne && hasCosecha && !hasRemainingQuantity && cosechasDisponibles.length > 0;
  const isFinalizado = cultivo.estado === 0 || allSold;
  const hasCosechasAbiertas = cosechasDisponibles.some(c => !c.cerrado);


  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="lg">
      <ModalContent className="bg-white">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Gestión de Cosecha y Venta</h2>
        </ModalHeader>

        <ModalBody>
           {/* Para cultivos finalizados - mostrar solo mensaje informativo */}
           {isFinalizado ? (
             <div className="text-center py-8">
               <div className="text-primary-600 text-2xl font-semibold">✅ Cultivo Finalizado</div>
             </div>
           ) : (
            <>
              {/* Información del cultivo */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="mb-3">
                  <strong className="text-sm">Cultivo:</strong> {cultivo.tipoCultivo?.nombre} {cultivo.nombrecultivo}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Tipo:</strong> {isPerenne ? 'Perenne' : 'Transitorio'}
                  </div>
                  <div>
                    <strong>Estado:</strong>
                    <span className={`px-2 py-1 rounded text-xs ${
                      isFinalizado ? 'bg-red-100 text-red-800' : 'bg-primary-100 text-primary-800'
                    }`}>
                      {isFinalizado ? 'Finalizado' : 'Activo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opciones disponibles */}
              <div className="space-y-3">
            {/* Cosechar */}
            <CustomButton
              label="🌾 Registrar Nueva Cosecha"
              onClick={() => {
                onHarvest(); onClose();
              }}
              disabled={isFinalizado || (!isPerenne && hasCosecha)}
              size="md"
              variant="bordered"
              className="w-full justify-start"
            />
            {isFinalizado && (
              <p className="text-xs text-red-600 ml-2">Cultivo finalizado</p>
            )}
            {!isPerenne && hasCosecha && !isFinalizado && (
              <p className="text-xs text-orange-600 ml-2">Ya cosechado (transitorio)</p>
            )}
            {isPerenne && !isFinalizado && (
              <p className="text-xs text-primary-600 ml-2">Cultivos perennes pueden cosechar múltiples veces</p>
            )}

            {/* Vender */}
            <CustomButton
              label="💰 Registrar Venta"
              onClick={() => {
                onSell(); onClose();
              }}
              disabled={(isPerenne && isFinalizado) || (!isPerenne && !hasCosecha) || (isPerenne && cosechasDisponibles.filter(c => !c.cerrado && c.cantidadDisponible > 0).length === 0) || (!isPerenne && hasCosecha && cosechasDisponibles.every(c => c.cerrado))}
              size="md"
              variant="bordered"
              className="w-full justify-start"
            />
            {!hasCosecha && !isPerenne && (
              <p className="text-xs text-orange-600 ml-2">Requiere cosecha previa</p>
            )}
            {isPerenne && isFinalizado && (
              <p className="text-xs text-red-600 ml-2">Cultivo finalizado - no se permiten ventas</p>
            )}
            {isPerenne && cosechasDisponibles.filter(c => !c.cerrado && c.cantidadDisponible > 0).length === 0 && !isFinalizado && (
              <p className="text-xs text-orange-600 ml-2">No hay cosechas disponibles para vender</p>
            )}
            {isPerenne && cosechasDisponibles.filter(c => !c.cerrado && c.cantidadDisponible > 0).length > 0 && (
              <p className="text-xs text-blue-600 ml-2">Disponible para múltiples ventas parciales</p>
            )}
            {!isPerenne && hasCosecha && cosechasDisponibles.every(c => c.cerrado) && !isFinalizado && (
              <p className="text-xs text-orange-600 ml-2">Todas las cosechas están cerradas - presiona "Cerrar venta de cosecha actual" para finalizar</p>
            )}
            {!isPerenne && hasCosecha && cosechasDisponibles.some(c => !c.cerrado) && (
              <p className="text-xs text-primary-600 ml-2">Disponible para ventas parciales mientras esté abierto</p>
            )}
            {!isPerenne && isFinalizado && (
              <p className="text-xs text-primary-600 ml-2">Cultivos transitorios permiten ventas post-finalización</p>
            )}

            {/* Cerrar Venta de Cosecha Actual */}
            {!isFinalizado && onCloseHarvest && hasCosechasAbiertas && (
              <CustomButton
                label="🔒 Cerrar Venta de Cosecha Actual"
                onClick={async () => {
                  if (!isInitializing && hasPermission('Cultivos', 'cultivos', 'actualizar')) {
                    const confirmMessage = isPerenne
                      ? '¿Estás seguro de cerrar la venta de cosecha actual?\n\nEsto deshabilitará las ventas de todas las cosechas actuales hasta que registres una nueva cosecha.'
                      : '¿Estás seguro de cerrar la venta de cosecha actual?\n\nEsto finalizará el cultivo transitorio y deshabilitará futuras ventas.';
                    const result = await Swal.fire({
                      title: '¿Estás seguro?',
                      text: confirmMessage,
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#d33',
                      cancelButtonColor: '#3085d6',
                      confirmButtonText: 'Sí, cerrar',
                      cancelButtonText: 'Cancelar'
                    });

                    if (result.isConfirmed) {
                      onCloseHarvest();
                      onClose();
                      await Swal.fire({
                        title: 'Cerrado',
                        text: 'La venta de cosecha ha sido cerrada exitosamente.',
                        icon: 'success',
                        timer: 5000,
                        showConfirmButton: false
                      });
                    }
                  }
                }}
                disabled={!isInitializing && !hasPermission('Cultivos', 'cultivos', 'actualizar')}
                size="md"
                variant="solid"
                color="warning"
                className="w-full justify-start"
              />
            )}
            {!isFinalizado && onCloseHarvest && hasCosechasAbiertas && (
              <p className="text-xs text-orange-600 ml-2">
                {isPerenne
                  ? 'Cierra todas las cosechas actuales y deshabilita ventas hasta nueva cosecha'
                  : 'Finaliza el cultivo transitorio y cierra todas las ventas'
                }
              </p>
            )}

            {/* Finalizar Cultivo (solo perennes cuando todas las cosechas estén cerradas) */}
            {isPerenne && !isFinalizado && (
              <CustomButton
                label="🏁 Finalizar Cultivo"
                onClick={async () => {
                  if (!isInitializing && hasPermission('Cultivos', 'cultivos', 'eliminar')) {
                    const result = await Swal.fire({
                      title: '¿Estás seguro?',
                      text: '¿Estás seguro de finalizar este cultivo?\n\nEsta acción marcará el cultivo como finalizado y no se podrán registrar más actividades ni cosechas.',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#d33',
                      cancelButtonColor: '#3085d6',
                      confirmButtonText: 'Sí, finalizar',
                      cancelButtonText: 'Cancelar'
                    });

                    if (result.isConfirmed) {
                      onFinalize();
                      onClose();
                      await Swal.fire({
                        title: 'Finalizado',
                        text: 'El cultivo ha sido finalizado exitosamente.',
                        icon: 'success',
                        timer: 5000,
                        showConfirmButton: false
                      });
                    }
                  }
                }}
                disabled={!isInitializing && !hasPermission('Cultivos', 'cultivos', 'eliminar')}
                size="md"
                variant="solid"
                color="danger"
                className="w-full justify-start"
              />
            )}
            {isPerenne && !isFinalizado && (
              <p className="text-xs text-red-600 ml-2">
                Finaliza el cultivo permanentemente - no se podrán registrar más actividades
              </p>
            )}
          </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <CustomButton onClick={onClose} variant="bordered">
            Cerrar
          </CustomButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default HarvestSellModal;