import React, { useState, useEffect } from "react";
import CustomButton from "../atoms/Boton";
import type { CreateCultivoData } from "../../types/cultivos.types";
import type { TipoCultivoData } from "../../types/tipoCultivo.types";
import type { VariedadData } from "../../types/variedad.types";
import type { Zona } from "../../services/zonasService";
import { createCultivo } from "../../services/cultivosService";
import { getTipoCultivos } from "../../services/tipoCultivo";
import { getVariedades } from "../../services/variedad";
import { zonasService } from "../../services/zonasService";

interface CultivoFormProps {
  onSuccess?: () => void;
}

const CultivoForm: React.FC<CultivoFormProps> = ({ onSuccess }) => {
  const [cultivoData, setCultivoData] = useState<CreateCultivoData>({
    tipoCultivoId: "",
    variedadId: "",
    zonaId: "",
    cantidad_plantas_inicial: undefined,
  });
  const [tipoCultivos, setTipoCultivos] = useState<TipoCultivoData[]>([]);
  const [variedades, setVariedades] = useState<VariedadData[]>([]);
  const [filteredVariedades, setFilteredVariedades] = useState<VariedadData[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tipos = await getTipoCultivos();
        setTipoCultivos(tipos);
        const vars = await getVariedades();
        setVariedades(vars);
        setFilteredVariedades(vars); // Inicialmente mostrar todas las variedades
        const zons = await zonasService.getAllZonas();
        setZonas(zons);
      } catch (error) {
        setMessage("Error al cargar datos");
      }
    };
    fetchData();
  }, []);

  // Filtrar variedades cuando cambia el tipo de cultivo seleccionado
  useEffect(() => {
    if (cultivoData.tipoCultivoId) {
      const filtered = variedades.filter(v => v.fkTipoCultivoId === cultivoData.tipoCultivoId);
      setFilteredVariedades(filtered);
      // Resetear la variedad seleccionada si no pertenece al nuevo tipo de cultivo
      if (cultivoData.variedadId && !filtered.find(v => v.id === cultivoData.variedadId)) {
        setCultivoData({ ...cultivoData, variedadId: "" });
      }
    } else {
      setFilteredVariedades(variedades); // Mostrar todas si no hay tipo seleccionado
    }
  }, [cultivoData.tipoCultivoId, variedades]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createCultivo(cultivoData);
      setMessage("Cultivo registrado con éxito");
      setCultivoData({
        tipoCultivoId: "",
        variedadId: "",
        zonaId: "",
        cantidad_plantas_inicial: undefined,
      });
      onSuccess?.();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Tipo de Cultivo</label>
        <select
          className="w-full border border-gray-300 rounded-lg p-2"
          value={cultivoData.tipoCultivoId}
          onChange={(e) =>
            setCultivoData({ ...cultivoData, tipoCultivoId: e.target.value })
          }
        >
          <option value="">Seleccione un tipo de cultivo</option>
          {tipoCultivos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Variedad</label>
        <select
          className="w-full border border-gray-300 rounded-lg p-2"
          value={cultivoData.variedadId}
          onChange={(e) =>
            setCultivoData({ ...cultivoData, variedadId: e.target.value })
          }
        >
          <option value="">
            {cultivoData.tipoCultivoId ? "Seleccione una variedad" : "Primero seleccione un tipo de cultivo"}
          </option>
          {filteredVariedades.map((varie) => (
            <option key={varie.id} value={varie.id}>
              {varie.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Ubicación</label>
        <select
          className="w-full border border-gray-300 rounded-lg p-2"
          value={cultivoData.zonaId}
          onChange={(e) =>
            setCultivoData({ ...cultivoData, zonaId: e.target.value })
          }
        >
          <option value="">Seleccione una zona</option>
          {zonas.map((zona) => (
            <option key={zona.id} value={zona.id}>
              {zona.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* NUEVOS CAMPOS PARA CARACTERÍSTICAS DEL CULTIVO */}
      <div>
        <label className="block text-sm font-medium mb-1">Cantidad Inicial de Plantas</label>
        <input
          type="number"
          min="0"
          className="w-full border border-gray-300 rounded-lg p-2"
          value={cultivoData.cantidad_plantas_inicial || ""}
          onChange={(e) =>
            setCultivoData({
              ...cultivoData,
              cantidad_plantas_inicial: e.target.value ? parseInt(e.target.value) : undefined
            })
          }
          placeholder="Opcional - se puede actualizar después"
        />
      </div>


      {message && <p className="text-center text-primary-600">{message}</p>}

      <CustomButton
        type="submit"
        text="Registrar Cultivo"
        className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 w-full"
      />
    </form>
  );
};

export default CultivoForm;
