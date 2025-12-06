import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import UserModal from "./UserModal";
import {
  HomeIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  CpuChipIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import logo from "../../assets/AgroTic.png";
import logoSena from "../../assets/logoSena.png";
import { usePermission } from "../../contexts/PermissionContext";
import { useMenu } from "../../contexts/MenuContext";

const Menu: React.FC = () => {
  const { permissions, isAuthenticated } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMenu();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserCardModalOpen, setIsUserCardModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Close any open submenus if needed
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const mainModules = [
    { nombre: "Inicio" },
    { nombre: "zonas" },
    { nombre: "Cultivos" },
    { nombre: "Actividades" },
    { nombre: "Inventario" },
    { nombre: "Usuarios" },
    { nombre: "IOT" },
  ];

  const getIcon = (label: string) => {
    switch (label) {
      case "Inicio":
        return HomeIcon;
      case "zonas":
        return CubeIcon;
      case "Cultivos":
        return GlobeAltIcon;
      case "Actividades":
        return ClipboardDocumentListIcon;
      case "Inventario":
        return ArchiveBoxIcon;
      case "Usuarios":
        return UserIcon;
      case "IOT":
        return CpuChipIcon;
      default:
        return HomeIcon;
    }
  };

  const getRoute = (label: string) => {
    switch (label) {
      case "Inicio":
        return "/app";
      case "zonas":
        return "/app/zonas";
      case "Cultivos":
        return "/app/cultivos";
      case "Actividades":
        return "/app/actividades";
      case "Inventario":
        return "/app/inventario";
      case "IOT":
        return "/app/iot";
      default:
        return "/app";
    }
  };

  const filteredModules = mainModules.filter(
    (module) => {
      // Special handling for zones - check for acceso_zonas permission
      if (module.nombre === "zonas") {
        return permissions.some(
          (perm) => perm.modulo === "zonas" && perm.recurso === "acceso_zonas" && perm.accion === "ver"
        );
      }
      // Special handling for IoT - check for acceso_iot permission
      if (module.nombre === "IOT") {
        return permissions.some(
          (perm) => perm.modulo === "IoT" && perm.recurso === "acceso_iot" && perm.accion === "ver"
        );
      }
      // Special handling for Actividades - check for acceso_actividades permission
      if (module.nombre === "Actividades") {
        return permissions.some(
          (perm) => perm.modulo === "Actividades" && perm.recurso === "acceso_actividades" && perm.accion === "ver"
        );
      }
      // For other modules, check for general ver permission
      return permissions.some(
        (perm) => perm.modulo === module.nombre && perm.accion === "ver"
      ) || module.nombre === "Usuarios";
    }
  );

  const priorityOrder = ["Inicio", "zonas", "IOT", "Cultivos", "Actividades", "Inventario", "Usuarios"];
  const sortedFilteredModules = [...filteredModules].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.nombre);
    const bIndex = priorityOrder.indexOf(b.nombre);
    return aIndex - bIndex;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        Cargando permisos...
      </div>
    );
  }

  return (
    <>
      {/*Botón hamburguesa visible solo en móviles */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 bg-gray-100 p-2 rounded-lg shadow-md md:hidden"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="w-6 h-6 text-gray-800" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-gray-800" />
        )}
      </button>

      {/*Menú lateral (desktop + mobile con animación) */}
      <div
        ref={menuRef}
        className={`fixed top-0 left-0 h-screen bg-white flex flex-col justify-between shadow-xl transform transition-all duration-200 ease-in-out w-20
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          z-40 border-r border-gray-200`}
      >
        <div className="p-4">
          {/* Logo AgroTic arriba */}
          <div className="flex justify-center mb-10">
            <img src={logo} alt="AgroTic" className="w-14 h-auto" />
          </div>

          {/* Botones del menú */}
          <div className="flex flex-col items-center gap-2">
            {sortedFilteredModules.map((module) => {
              const IconComponent = getIcon(module.nombre);
              const label =
                module.nombre === "Usuarios" ? "Perfil" : module.nombre;

              const onClickHandler =
                module.nombre === "Usuarios"
                  ? () => {
                      setIsUserCardModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }
                  : () => {
                      navigate(getRoute(module.nombre));
                      setIsMobileMenuOpen(false); // Cierra el menú móvil al navegar
                    };

              const active = isActive(getRoute(module.nombre));

              return (
                <div key={module.nombre} className="relative group flex justify-center">
                  <button
                    onClick={onClickHandler}
                    className={`
                      w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200
                      ${active
                        ? 'bg-primary-100 text-primary-700 shadow-md'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 hover:shadow-sm hover:-translate-y-0.5'
                      }
                    `}
                    aria-label={label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>

                  {/* Tooltip siempre visible */}
                  <div className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logo SENA abajo */}
        <div className="flex flex-col items-center mb-4">
          <img src={logoSena} alt="SENA" className="w-12 h-auto" />
        </div>

        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
        <UserModal
          isOpen={isUserCardModalOpen}
          onClose={() => setIsUserCardModalOpen(false)}
        />
      </div>
    </>
  );
};

export default Menu;
