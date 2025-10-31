import React from "react";

interface NumberInputProps {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  allowNegative?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "",
  min,
  max,
  step = 1,
  disabled = false,
  error,
  required = false,
  allowNegative = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = inputValue === "" ? undefined : parseFloat(inputValue);

    // Validate non-negative if allowNegative is false
    if (!allowNegative && numericValue !== undefined && numericValue < 0) {
      return; // Don't update if negative and not allowed
    }

    onChange(numericValue);
  };

  return (
    <div className="flex flex-col">
      <label className="text-gray-700 text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="number"
        value={value ?? ""}
        onChange={handleChange}
        placeholder={placeholder}
        min={allowNegative ? min : (min ?? 0)}
        max={max}
        step={step}
        disabled={disabled}
        className={`
          w-full h-9 px-3 py-2 border rounded-md text-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
        `}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export default NumberInput;