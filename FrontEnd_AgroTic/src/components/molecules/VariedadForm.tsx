import React, { useState, useEffect } from "react";
import TextInput from "../atoms/TextInput";
import CustomButton from "../atoms/Boton";
import type { VariedadData } from "../../types/variedad.types";
import type { TipoCultivoData } from "../../types/tipoCultivo.types";
import {
  registerVariedad,
  updateVariedad,
} from "../../services/variedad";
import { getTipoCultivos } from "../../services/tipoCultivo";
import { usePermission } from "../../contexts/PermissionContext";

interface VariedadFormProps {
  editData?: VariedadData | null;
  onSuccess?: () => void;
}

const VariedadForm: React.FC<VariedadFormProps> = ({ editData, onSuccess }) => {
  const [variedadData, setVariedadData] = useState<VariedadData>({
    nombre: "",
    fkTipoCultivoId: "",
  });
  const [tiposCultivo, setTiposCultivo] = useState<TipoCultivoData[]>([]);
  const [message, setMessage] = useState<string>("");
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    fetchTiposCultivo();
    if (editData) {
      setVariedadData({
        nombre: editData.nombre,
        fkTipoCultivoId: editData.fkTipoCultivoId,
      });
    }
  }, [editData]);

  const fetchTiposCultivo = async () => {
    try {
      const data = await getTipoCultivos();
      setTiposCultivo(data);
    } catch (err) {
      console.error("Error fetching tipos cultivo:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editData?.id) {
        await updateVariedad(editData.id, variedadData);
        setMessage("Actualizado con éxito");
      } else {
        await registerVariedad(variedadData);
        setMessage("Registro exitoso");
      }

      setVariedadData({ nombre: "", fkTipoCultivoId: "" });
      onSuccess?.();
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextInput
        label="Nombre Variedad"
        placeholder="Ingrese el nombre de la variedad"
        value={variedadData.nombre}
        onChange={(e) =>
          setVariedadData({ ...variedadData, nombre: e.target.value })
        }
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Cultivo
        </label>
        <select
          value={variedadData.fkTipoCultivoId}
          onChange={(e) =>
            setVariedadData({ ...variedadData, fkTipoCultivoId: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Seleccione un tipo de cultivo</option>
          {tiposCultivo.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </select>
      </div>

      {message && <p className="text-center text-primary-600">{message}</p>}

      {!isInitializing && hasPermission('Cultivos', 'cultivos', 'crear') && (
        <CustomButton
          type="submit"
          text={editData ? "Actualizar" : "Registrar"}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 w-full"
        />
      )}
    </form>
  );
};

export default VariedadForm;