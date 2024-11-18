import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OkDialog } from "@/components/ui/ok-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useBookGoogleTimeslot } from "@/hooks/useBookGoogleTimeslot";
import { useGoogleTimeslots } from "@/hooks/useGoogleTimeslots";

import { ModeToggle } from "@/components/mode-toggle";
import { Else, Show, When } from "@/components/WhenShowElse";
import { Timeslots } from "@/models/Timeslots";
import { addMonths, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
} from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTimezoneDropdown } from "./timezone-dropdown";

export function CalendarPicker() {
  const [TimezoneDropdown, timezone] = useTimezoneDropdown();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | undefined>(
    undefined
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [
    googleSlots,
    durationMinutes,
    slotsStatus,
    timeslotError,
    resetGoogleTimeslot,
  ] = useGoogleTimeslots();
  const [bookingStatus, bookingError, makeBooking, resetBookGoogle] =
    useBookGoogleTimeslot();
  const availableSlots = useMemo(
    () => new Timeslots(googleSlots, timezone),
    [googleSlots, timezone]
  );
  const resetSelectedDate = () => setSelectedDate(undefined);
  useEffect(() => {
    //reset the selected date when the timezone changes
    if (timezone) resetSelectedDate();
  }, [timezone]);
  useEffect(() => {
    if (!selectedDate) {
      const firstTimeslot = [...availableSlots.timeslots].sort().reverse()[0];
      if (!firstTimeslot) return;
      setCurrentMonth(firstTimeslot);
    }
  }, [timezone, availableSlots, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth()));
    }
    setSelectedTimeSlot(undefined);
  };

  const handleTimeSlotSelect = (timeSlot: Date) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name")?.toString() || "none",
      email: formData.get("email")?.toString() || "none",
      phone: formData.get("phone")?.toString() || "none",
      note: formData.get("note")?.toString() || "none",
    };
    if (!selectedTimeSlot) throw new Error("No timeslot selected");
    makeBooking({
      timeslot: selectedTimeSlot,
      ...payload,
    });
  };

  const handlePreviousMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, 1));
  };
  const isDayDisabled = (date: Date) => {
    return !availableSlots.hasSlotsForDate(date);
  };

  const handleBack = () => {
    setShowForm(false);
    setSelectedTimeSlot(undefined);
  };

  if (selectedTimeSlot && bookingStatus === "success") {
    return (
      <Card className="sm:w-[600px] p-4 mx-auto min-h-[600px] flex flex-col justify-center space-y-4">
        <h1>Thank You!</h1>
        <h2>Your appointment has been booked successfully.</h2>
        <div className="font-bold font-mono">
          {formatInTimeZone(selectedTimeSlot!, timezone, "MMMM d, yyyy h:mm a")}
        </div>
      </Card>
    );
  }
  return (
    <>
      <OkDialog
        open={slotsStatus === "error"}
        description={timeslotError?.message ?? "Unknown Error 1"}
        confirm={resetGoogleTimeslot}
      />
      <OkDialog
        open={bookingStatus === "error"}
        description={bookingError?.message ?? "Unknown error 2"}
        confirm={resetBookGoogle}
      />

      {slotsStatus === "pending" && (
        <div className="w-[356px] sm:w-[600px] h-[620px] bg-primary absolute rounded-xl z-50 opacity-70">
          <div className="flex justify-center items-center h-full flex-col stroke-primary-foreground">
            <Loader2 size={60} className="animate-spin" stroke="current" />
            <p className="text-lg font-semibold text-primary-foreground">
              Loading...
            </p>
          </div>
        </div>
      )}
      <Card className="sm:w-[600px] mx-auto min-h-[600px] flex flex-col justify-between">
        <div className="relative max-h-0">
          <ModeToggle className="md:hidden absolute right-1 top-1" />
          <ModeToggle className="absolute -right-10 -top-10 md:block hidden" />
        </div>
        <When condition={!showForm}>
          <Show>
            <CardHeader className="max-w-full pl-4 pr-12 md:pr-6 md:pl-6">
              <div className="flex justify-between items-center flex-col sm:flex-row gap-4 relative">
                <CardTitle className="max-w-64">
                  <div className="overflow-hidden">
                    <div className="whitespace-nowrap overflow-ellipsis overflow-hidden">
                      Appointment Scheduler
                    </div>
                    <div className="whitespace-nowrap overflow-ellipsis overflow-hidden">
                      ({durationMinutes} minutes)
                    </div>
                  </div>
                </CardTitle>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    Your Timezone
                  </Label>
                  <TimezoneDropdown />
                </div>
              </div>
            </CardHeader>
          </Show>
          <Else>
            <h2 className="text-xl font-semibold mb-4 mt-10">
              Appointment for{" "}
              {selectedDate
                ? format(selectedDate, "MMMM d, yyyy")
                : "Date not selected"}{" "}
              at{" "}
              {selectedTimeSlot
                ? selectedTimeSlot.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Time not selected"}
            </h2>
          </Else>
        </When>

        <CardContent className="p-6 pt-0 sm:pt-6 min-h-[420px] pb-0">
          <When condition={!showForm}>
            <Show>
              <CalendarTimeslotPicker
                handlePreviousMonth={handlePreviousMonth}
                currentMonth={currentMonth}
                handleNextMonth={handleNextMonth}
                selectedDate={selectedDate}
                handleDateSelect={handleDateSelect}
                setCurrentMonth={setCurrentMonth}
                isDayDisabled={isDayDisabled}
                availableSlots={availableSlots}
                selectedTimeSlot={selectedTimeSlot}
                handleTimeSlotSelect={handleTimeSlotSelect}
              />
            </Show>
            <Else>
              <ContactForm handleSubmit={handleSubmit} />
            </Else>
          </When>
        </CardContent>
        <CardFooter className="flex justify-between">
          <When condition={showForm}>
            <Show>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                form="appointment-form"
                disabled={bookingStatus === "pending"}
              >
                {bookingStatus === "pending" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send
              </Button>
            </Show>
            <Else>
              <Button
                className="w-full"
                onClick={() => setShowForm(true)}
                disabled={!selectedDate || !selectedTimeSlot}
              >
                Continue
              </Button>
            </Else>
          </When>
        </CardFooter>
      </Card>
    </>
  );
}
function CalendarTimeslotPicker({
  handlePreviousMonth,
  currentMonth,
  handleNextMonth,
  selectedDate,
  handleDateSelect,
  setCurrentMonth,
  isDayDisabled,
  availableSlots,
  selectedTimeSlot,
  handleTimeSlotSelect,
}: {
  handlePreviousMonth: () => void;
  currentMonth: Date;
  handleNextMonth: () => void;
  selectedDate: Date | undefined;
  handleDateSelect: (date: Date | undefined) => void;
  setCurrentMonth: (date: Date) => void;
  isDayDisabled: (date: Date) => boolean;
  availableSlots: Timeslots;
  selectedTimeSlot: Date | undefined;
  handleTimeSlotSelect: (timeSlot: Date) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous month</span>
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next month</span>
          </Button>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-md border shadow"
          disabled={isDayDisabled}
        />
      </div>
      <div className="flex-1 w-full lg:w-64">
        <h3 className="text-lg font-semibold mb-4">
          {selectedDate
            ? format(selectedDate, "MMMM d, yyyy")
            : "Select a date"}
        </h3>
        {selectedDate && (
          <ScrollArea className="h-72">
            <div
              className="grid grid-cols-2 gap-4 pr-4"
              key={"" + selectedDate?.getTime()}
            >
              {availableSlots.slotsForDate(selectedDate).map((timeslot, i) => (
                <Button
                  key={"" + selectedDate?.getTime() + timeslot + i}
                  variant={
                    selectedTimeSlot === timeslot ? "default" : "outline"
                  }
                  onClick={() => handleTimeSlotSelect(timeslot)}
                  className="w-full"
                >
                  {timeslot.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function ContactForm({
  handleSubmit,
}: {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      id="appointment-form"
      onSubmit={handleSubmit}
      className="text-left space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" name="phone" type="tel" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" />
      </div>
    </form>
  );
}
