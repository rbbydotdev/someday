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

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { useEffect } from "react";

const tzlocal = Intl.DateTimeFormat().resolvedOptions().timeZone;

type TZ = { value: string; label: string };
const mytz = {
  value: tzlocal,
  label: tzlocal ? tzlocal.split("/").pop()?.replace("_", " ") || "" : "",
};
const timezones: TZ[] = [
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
].filter((tz) => tz.value !== tzlocal);

const defaultValue = mytz.value;
export function useTimezoneDropdown() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  useEffect(() => {
    if (value === "") {
      setValue(defaultValue);
    }
  }, [value]);
  const MemoTimezoneDropDown = React.useMemo(
    () => () =>
      (
        <TimezoneDropdown
          open={open}
          setOpen={setOpen}
          value={value}
          setValue={setValue}
        />
      ),
    [open, value]
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
  const onSelect = React.useCallback(
    (currentValue: string) => {
      setValue(currentValue === value ? "" : currentValue);
      setOpen(false);
    },
    [setOpen, setValue, value]
  );
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
            ? value === mytz.value
              ? mytz.label
              : timezones.find((timezone) => timezone.value === value)?.label
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
              {mytz && (
                <>
                  <TimezoneCommandItem
                    timezone={mytz}
                    onSelect={onSelect}
                    current={value}
                  >
                    <MapPin />
                  </TimezoneCommandItem>
                  <Separator />
                </>
              )}
              {timezones.map((timezone) => (
                <TimezoneCommandItem
                  key={timezone.value}
                  timezone={timezone}
                  onSelect={onSelect}
                  current={value}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const TimezoneCommandItem = ({
  timezone,
  onSelect,
  current,
  children,
}: {
  timezone: TZ;
  onSelect: (cv: string) => void;
  current: string;
  children?: React.ReactNode;
}) => (
  <CommandItem
    key={timezone.value + timezone.label}
    value={timezone.value}
    onSelect={onSelect}
    className="cursor-pointer"
  >
    {children}
    {timezone.label}
    <CheckIcon
      className={cn(
        "ml-auto h-4 w-4",
        current === timezone.value ? "opacity-100" : "opacity-0"
      )}
    />
  </CommandItem>
);
