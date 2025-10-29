import React from "react";
import RecoverPasswordCard from "../components/organisms/RecoverPasswordCard";
import logo from "../assets/AgroTic_normal.png";

const RecoverPasswordPage: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-white px-6 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <img
          src={logo}
          alt="Logo"
          className="w-40 sm:w-56 md:w-80 lg:w-96 h-auto mb-6 object-contain md:mb-0"
        />
      </div>

      <div className="flex-1 flex justify-center items-center mt-0 md:mt-0">
        <div className="w-full max-w-sm scale-100 md:scale-100">
          <RecoverPasswordCard />
        </div>
      </div>
    </div>
  );
};

export default RecoverPasswordPage;

