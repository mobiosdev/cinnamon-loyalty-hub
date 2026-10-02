import { useState, useId } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SRI_LANKA_DISTRICTS } from '@/constants/vehicleData';
import { cn } from '@/lib/utils';

interface DistrictSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const DistrictSelect = ({
  value,
  onChange,
  placeholder = 'Select district in Sri Lanka...',
  className,
  id,
  disabled = false,
}: DistrictSelectProps) => {
  const generatedId = useId();
  const triggerId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredDistricts = SRI_LANKA_DISTRICTS.filter((district) =>
    district.toLowerCase().includes(query.toLowerCase().trim())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between bg-white text-left font-normal text-sm shadow-sm hover:bg-slate-50',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2 shadow-lg" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search district..."
            className="h-9 pl-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {filteredDistricts.length > 0 ? (
            filteredDistricts.map((district) => (
              <button
                key={district}
                type="button"
                onClick={() => {
                  onChange(district);
                  setOpen(false);
                  setQuery('');
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-sm text-left transition-colors hover:bg-slate-100',
                  value === district ? 'bg-slate-100 font-semibold text-[#173528]' : 'text-slate-700'
                )}
              >
                <span>{district}</span>
                {value === district && <Check className="h-4 w-4 text-[#2d7a50]" />}
              </button>
            ))
          ) : (
            <p className="p-3 text-center text-xs text-muted-foreground">
              No matching Sri Lankan district found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
