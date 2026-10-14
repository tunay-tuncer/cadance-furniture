"use client";

import React, { useState } from "react";
import styles from "./modeler.module.css";

interface CadNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label?: string;
}

export default function CadNumberInput({
  value,
  onChange,
  min,
  max,
  unit = "mm",
}: CadNumberInputProps) {
  const [localStr, setLocalStr] = useState<string>(String(value));
  const [prevValue, setPrevValue] = useState<number>(value);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync state during render when external prop changes (React recommended pattern)
  if (value !== prevValue) {
    setPrevValue(value);
    if (!isFocused) {
      setLocalStr(String(value));
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalStr(val);

    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    let parsed = parseFloat(localStr);
    if (isNaN(parsed)) {
      parsed = value;
    } else {
      parsed = Math.max(min, Math.min(max, Math.round(parsed)));
    }
    setLocalStr(String(parsed));
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={styles.numericInputWrapper}>
      <input
        type="text"
        inputMode="numeric"
        value={localStr}
        onFocus={() => setIsFocused(true)}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={styles.numInput}
      />
      {unit && <span className={styles.unitLabel}>{unit}</span>}
    </div>
  );
}
