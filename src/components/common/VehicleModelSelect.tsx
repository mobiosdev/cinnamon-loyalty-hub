import { useState, useEffect } from 'react';
import { LAND_CRUISER_MODELS } from '@/constants/vehicleData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VehicleModelSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const VehicleModelSelect = ({
  value = 'Toyota Land Cruiser 300 Series (LC300)',
  onChange,
  className,
  disabled = false,
}: VehicleModelSelectProps) => {
  const isKnownModel = LAND_CRUISER_MODELS.some(
    (m) => m !== 'Other / Custom Model' && m.toLowerCase() === (value || '').toLowerCase()
  );

  const [selectedOption, setSelectedOption] = useState<string>(() => {
    if (!value) return 'Toyota Land Cruiser 300 Series (LC300)';
    if (isKnownModel) {
      return (
        LAND_CRUISER_MODELS.find(
          (m) => m.toLowerCase() === value.toLowerCase()
        ) || value
      );
    }
    return 'Other / Custom Model';
  });

  const [customModel, setCustomModel] = useState<string>(() => {
    if (!isKnownModel && value && value !== 'Other / Custom Model') {
      return value;
    }
    return '';
  });

  useEffect(() => {
    if (value && isKnownModel) {
      setSelectedOption(
        LAND_CRUISER_MODELS.find(
          (m) => m.toLowerCase() === value.toLowerCase()
        ) || value
      );
    }
  }, [value, isKnownModel]);

  const handleSelectChange = (newVal: string) => {
    setSelectedOption(newVal);
    if (newVal === 'Other / Custom Model') {
      onChange(customModel.trim() || 'Custom Land Cruiser');
    } else {
      onChange(newVal);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomModel(text);
    onChange(text);
  };

  return (
    <div className="space-y-2">
      <Select
        value={selectedOption}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className={`h-10 bg-white shadow-sm text-sm ${className || ''}`}>
          <SelectValue placeholder="Select vehicle model" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {LAND_CRUISER_MODELS.map((model) => (
            <SelectItem key={model} value={model} className="text-sm">
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedOption === 'Other / Custom Model' && (
        <div className="space-y-1 pt-1">
          <Label htmlFor="custom-vehicle-model" className="text-xs text-muted-foreground">
            Specify Custom Vehicle Model
          </Label>
          <Input
            id="custom-vehicle-model"
            value={customModel}
            onChange={handleCustomChange}
            placeholder="e.g. Toyota Land Cruiser Heritage Edition / 79 Double Cab"
            disabled={disabled}
            className="h-10 bg-white text-sm shadow-sm"
          />
        </div>
      )}
    </div>
  );
};
