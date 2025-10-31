import React from "react";
import type { TextInputProps } from "../../types/textInput.types"

const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
  min,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // For number inputs, prevent negative values by checking if the first character is '-'
    if (type === "number" && inputValue.startsWith('-')) {
      return; // Don't update if it starts with a negative sign
    }

    onChange(e);
  };

  return (
    <div className="flex flex-col">
      {/* Label visible arriba del input */}
      <label className="text-gray-700 text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default TextInput;
