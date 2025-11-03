import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { DateRangeInputProps } from "../../types/dateInput.types";

const DateRangeInput: React.FC<DateRangeInputProps> = ({ label, onChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  return (
    <div className="relative w-64 flex flex-col">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <DatePicker
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={(update: [Date | null, Date | null]) => {
          setStartDate(update[0]);
          setEndDate(update[1]);
          onChange(update);
        }}
        dateFormat="yyyy-MM-dd"
        placeholderText="Seleccionar rango de fechas..."
        className="w-full h-9 px-3 py-2 pl-10 text-sm rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        calendarClassName="calendar-responsive"
      />
     
    </div>
  );
};

export default DateRangeInput;
