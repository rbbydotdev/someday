/* eslint-disable react-refresh/only-export-components */
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { useEffect } from "react";

const tzlocal = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezones = [
  { value: "America/New_York", label: "New York" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/Denver", label: "Denver" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Asia/Bangkok", label: "Bangkok" },
];

let defaultIndex = timezones.findIndex((x) => x.value == tzlocal);
if (defaultIndex < 0) {
  timezones.unshift({ value: tzlocal, label: tzlocal });
  defaultIndex = 0;
}

const defaultValue = timezones[defaultIndex].value;

export function useTimezoneDropdown() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  useEffect(() => {
    if (value === "") {
      setValue(defaultValue);
    }
  }, [value]);
  const MemoTimezoneDropDown = React.useMemo(
    () => () => (
      <TimezoneDropdown
        open={open}
        setOpen={setOpen}
        value={value}
        setValue={setValue}
      />
    ),
    [open, value],
  );
  return [MemoTimezoneDropDown, value || defaultValue] as const;
}

export function TimezoneDropdown({
  open,
  setOpen,
  value,
  setValue,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[180px] justify-between"
        >
          {value
            ? timezones.find((timezone) => timezone.value === value)?.label
            : "Select timezone..."}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search timezone..." className="h-9" />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {timezones.map((timezone) => (
                <CommandItem
                  key={timezone.value + timezone.label}
                  value={timezone.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  {timezone.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === timezone.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
