import { useState, useEffect, useRef } from "react";
import { useKPI } from "@/contexts/KPIContext";
import { KPIModel } from "@/utils/kpiEngine";
import { cn } from "@/lib/utils";

interface EditableCellProps {
    value: string | number;
    kpiKey?: keyof KPIModel;
    onChange?: (val: string | number) => void;
    suffix?: string;
    className?: string;
    type?: "text" | "number";
}

export function EditableCell({ value, kpiKey, onChange, suffix = "", className, type = "number" }: EditableCellProps) {
    const { updateKPI } = useKPI();
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (String(tempValue) !== String(value)) {
            if (onChange) {
                onChange(tempValue);
            } else if (kpiKey) {
                updateKPI(kpiKey, tempValue);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center">
                <input
                    ref={inputRef}
                    type={type === "number" ? "text" : "text"}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)} // Keep as string until submit for numbers to allow typing
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={cn("w-full min-w-[60px] rounded-sm border border-blue-500 bg-blue-50 px-1 py-0.5 text-right font-medium text-blue-700 outline-none", className)}
                />
                {suffix && <span className="ml-1 text-slate-400">{suffix}</span>}
            </div>
        );
    }

    return (
        <div
            onClick={() => (kpiKey || onChange) && setIsEditing(true)}
            className={cn(
                "cursor-pointer border-b border-dashed border-slate-400 px-1 py-0.5 text-right transition-colors hover:bg-blue-50 hover:border-blue-500",
                kpiKey ? "text-blue-600 font-medium" : "text-slate-800 cursor-default border-transparent",
                className
            )}
        >
            {value}{suffix}
        </div>
    );
}
