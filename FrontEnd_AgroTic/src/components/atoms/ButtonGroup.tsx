import React from "react";
import CustomButton from "./Boton";

interface ButtonOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ButtonGroupProps {
  label?: string;
  options: ButtonOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "bordered" | "light";
  color?: "primary" | "secondary" | "danger" | "ghost";
  layout?: "horizontal" | "vertical" | "responsive";
  className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  label,
  options,
  value,
  onChange,
  size = "sm",
  variant = "solid",
  color = "primary",
  layout = "horizontal",
  className = "",
}) => {
  const getButtonColor = (optionValue: string) => {
    return optionValue === value ? color : "ghost";
  };

  const getButtonVariant = (optionValue: string) => {
    return optionValue === value ? variant : "light";
  };

  const containerClasses = `
    ${layout === "horizontal" ? "flex gap-1" : ""}
    ${layout === "vertical" ? "flex flex-col gap-1" : ""}
    ${layout === "responsive" ? "grid grid-cols-2 gap-1 sm:flex sm:flex-row" : ""}
    ${className}
  `;

  return (
    <div className="flex flex-col">
      {label && (
        <label className="text-gray-700 text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <div className={containerClasses}>
        {options.map((option) => (
          <CustomButton
            key={option.value}
            text={option.label}
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            size={size}
            variant={getButtonVariant(option.value)}
            color={getButtonColor(option.value)}
            className="flex-1"
          />
        ))}
      </div>
    </div>
  );
};

export default ButtonGroup;