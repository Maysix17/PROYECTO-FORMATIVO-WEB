import React from "react";
import { useNavigate } from "react-router-dom";
import RegisterCard from "../components/organisms/RegisterCard";
import logo from "../assets/AgroTic_normal.png";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRegister = (data: {
    nombres: string;
    apellidos: string;
    dni: string;
    telefono: string;
    password: string;
  }) => {
    console.log("Registrando usuario:", data);
    navigate("/app");
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-white px-6 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <img
          src={logo}
          alt="Logo"
          className="w-40 sm:w-56 md:w-80 lg:w-96 h-auto mb-6 object-contain"
        />
      </div>

      <div className="flex-1 flex justify-center w-full mt-6 md:mt-0">
          <RegisterCard onRegister={handleRegister} />
      </div>
    </div>
  );
};

export default RegisterPage;

