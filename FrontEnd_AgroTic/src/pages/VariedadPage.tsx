import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { VariedadData } from "../types/variedad.types";
import type { TipoCultivoData } from "../types/tipoCultivo.types";
import {
  registerVariedad,
  getVariedades,
  updateVariedad,
  deleteVariedad,
} from "../services/variedad";
import { getTipoCultivos } from "../services/tipoCultivo";
import Swal from 'sweetalert2';

const VariedadPage = () => {
  const [variedadData, setVariedadData] = useState<VariedadData>({
    nombre: "",
    fkTipoCultivoId: "",
  });
  const [tiposCultivo, setTiposCultivo] = useState<TipoCultivoData[]>([]);
  const [variedades, setVariedades] = useState<VariedadData[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const navigate = useNavigate();

  // Cargar lista al iniciar
  useEffect(() => {
    fetchVariedades();
    fetchTiposCultivo();
  }, []);

  const fetchVariedades = async () => {
    try {
      const data = await getVariedades();
      setVariedades(data);
    } catch (err) {
      console.error("Error al cargar variedades", err);
    }
  };

  const fetchTiposCultivo = async () => {
    try {
      const data = await getTipoCultivos();
      setTiposCultivo(data);
    } catch (err) {
      console.error("Error al cargar tipos de cultivo", err);
    }
  };

  // Crear o actualizar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateVariedad(editId, variedadData);
        setMessage("Actualizado con éxito");
      } else {
        await registerVariedad(variedadData);
        setMessage("Registro exitoso");
      }

      setVariedadData({ nombre: "", fkTipoCultivoId: "" });
      setEditId(null);
      fetchVariedades();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Error en la operación");
    }
  };

  const handleEdit = (variedad: VariedadData) => {
    setEditId(variedad.id!);
    setVariedadData({ nombre: variedad.nombre, fkTipoCultivoId: variedad.fkTipoCultivoId });
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Seguro que deseas eliminar esta variedad?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await deleteVariedad(id);
        fetchVariedades();
        await Swal.fire({
          title: 'Eliminado',
          text: 'Variedad eliminada exitosamente.',
          icon: 'success',
          timer: 5000,
          showConfirmButton: false
        });
      } catch (error: any) {
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Error al eliminar la variedad.',
          icon: 'error',
          timer: 5000,
          showConfirmButton: false
        });
      }
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div
      className="fixed inset-0 bg-gray-500 bg-opacity-10 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white shadow-lg rounded-xl p-6 w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {editId ? "Editar Variedad" : "Registrar Variedad"}
          </h2>
          <button
            type="button"
            className="text-gray-500 hover:text-red-500 text-lg"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={variedadData.nombre}
              onChange={(e) =>
                setVariedadData({ ...variedadData, nombre: e.target.value })
              }
              placeholder="Ingrese el nombre de la variedad"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Cultivo
            </label>
            <select
              value={variedadData.fkTipoCultivoId}
              onChange={(e) =>
                setVariedadData({ ...variedadData, fkTipoCultivoId: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              <option value="">Seleccione un tipo de cultivo</option>
              {tiposCultivo.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <p className="text-center text-primary-600 text-sm">{message}</p>
          )}

          <button
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-md font-medium"
          >
            {editId ? "Actualizar" : "Registrar"}
          </button>
        </form>

        {/* Tabla */}
        <table className="w-full border text-sm text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Tipo de Cultivo</th>
              <th className="p-2 border text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {variedades.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="p-2 border">{v.nombre}</td>
                <td className="p-2 border">{v.tipoCultivo?.nombre || "N/A"}</td>
                <td className="p-2 border flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(v)}
                    className="text-blue-600 hover:underline"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(v.id!)}
                    className="text-red-600 hover:underline"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {variedades.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-2">
                  No hay registros aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VariedadPage;
