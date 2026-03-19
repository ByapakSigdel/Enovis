"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { api } from "@/lib/api";
import type { CalendarEvent } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows: (number | null)[][] = [];
  let day = 1;

  for (let week = 0; week < 6; week++) {
    const row: (number | null)[] = [];
    for (let col = 0; col < 7; col++) {
      if (week === 0 && col < firstDay) {
        row.push(null);
      } else if (day > daysInMonth) {
        row.push(null);
      } else {
        row.push(day);
        day++;
      }
    }
    rows.push(row);
    if (day > daysInMonth) break;
  }

  return rows;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
  wellness: { label: "WELLNESS", bg: "bg-primary-100", text: "text-primary-700" },
  social: { label: "SOCIAL", bg: "bg-orange-100", text: "text-orange-700" },
  selfcare: { label: "SELF CARE", bg: "bg-pink-100", text: "text-pink-700" },
  work: { label: "WORK", bg: "bg-blue-100", text: "text-blue-700" },
  personal: { label: "PERSONAL", bg: "bg-purple-100", text: "text-purple-700" },
};

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");

  const calendarGrid = buildCalendarGrid(year, month);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await api.events.list();
      if (res.success && res.data) {
        setEvents(res.data as unknown as CalendarEvent[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDay(t.getDate());
  };

  // Map events to days for dot indicators
  const eventDays = new Set<number>();
  events.forEach((ev) => {
    const d = new Date(ev.startDatetime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      eventDays.add(d.getDate());
    }
  });

  // Filter events for selected day
  const selectedDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
  const dayEvents = events.filter((ev) => {
    const d = ev.startDatetime?.slice(0, 10);
    return d === selectedDateStr;
  });

  const addEvent = useCallback(async () => {
    if (!newTitle.trim()) return;
    const startDatetime = `${selectedDateStr}T${newStartTime}:00`;
    const endDatetime = `${selectedDateStr}T${newEndTime}:00`;
    const res = await api.events.create({
      title: newTitle.trim(),
      startDatetime,
      endDatetime,
      allDay: false,
    });
    if (res.success && res.data) {
      setEvents((prev) => [...prev, res.data as unknown as CalendarEvent]);
      setNewTitle("");
      setShowAddForm(false);
    }
  }, [newTitle, selectedDateStr, newStartTime, newEndTime]);

  const deleteEvent = useCallback(async (id: string) => {
    const res = await api.events.delete(id);
    if (res.success) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  }, []);

  const isToday = year === now.getFullYear() && month === now.getMonth();
  const currentDay = now.getDate();

  const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const selectedDate = new Date(year, month, selectedDay);
  const shortDayName = dayOfWeekNames[selectedDate.getDay()].slice(0, 3);

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">
            WELLNESS CALENDAR
          </p>
          <div className="mt-1 flex items-center gap-4">
            <h1 className="text-2xl font-bold text-neutral-900">
              {MONTH_NAMES[month]} {year}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-sage-100"
                aria-label="Previous month"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-sage-100"
                aria-label="Next month"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <button
              onClick={goToday}
              className="rounded-full bg-primary-500 px-3 py-1 text-xs font-medium text-white hover:bg-primary-600"
            >
              Today
            </button>
          </div>
        </div>

        {/* Side-by-side layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <Card variant="elevated">
              <div className="mb-2 grid grid-cols-7">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={i}
                    className="py-2 text-center text-xs font-semibold text-neutral-500"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarGrid.flat().map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }

                  const isSelected = day === selectedDay;
                  const isCurrent = isToday && day === currentDay;
                  const hasEvent = eventDays.has(day);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                        isSelected
                          ? "bg-primary-500 font-bold text-white"
                          : isCurrent
                            ? "bg-primary-50 font-semibold text-primary-700"
                            : "text-neutral-700 hover:bg-sage-50"
                      )}
                    >
                      {day}
                      {hasEvent && (
                        <span
                          className={cn(
                            "absolute bottom-1.5 h-1 w-1 rounded-full",
                            isSelected ? "bg-white" : "bg-primary-500"
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-800">
                Events for {shortDayName}, {MONTH_NAMES[month].slice(0, 3)} {selectedDay}
              </h2>
            </div>

            {/* Add Event Form */}
            {showAddForm && (
              <Card className="mb-4" variant="elevated">
                <h3 className="mb-3 font-semibold text-neutral-800">New Event</h3>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Event title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEvent()}
                    className="w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <span className="self-center text-neutral-400">to</span>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={addEvent}>
                      Add
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {loading ? (
              <p className="text-sm text-neutral-400">Loading events...</p>
            ) : dayEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {dayEvents.map((event) => {
                  const cat = categoryConfig[event.category || ""] || { label: event.category?.toUpperCase() || "EVENT", bg: "bg-sage-100", text: "text-neutral-600" };
                  const startTime = event.startDatetime ? new Date(event.startDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <Card key={event.id} variant="elevated" className="group">
                      <div className="mb-2 flex items-start justify-between">
                        <span className="text-xs font-medium text-neutral-500">
                          {startTime}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="custom" className={cn(cat.bg, cat.text)}>
                            {cat.label}
                          </Badge>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                      <p className="mb-1 font-semibold text-neutral-800">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="mb-3 text-sm text-neutral-500">
                          {event.description}
                        </p>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {event.location}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card variant="elevated" className="overflow-hidden">
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl shadow-sm">
                    <Calendar className="w-10 h-10 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-neutral-800">
                      Nothing scheduled here yet
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Add meetings, reminders, and personal events. Color-coded and organized so you never miss a moment.
                    </p>
                  </div>
                  {/* Mock event previews */}
                  <div className="w-full space-y-2">
                    {[
                      { color: "bg-primary-500", title: "Team Standup", time: "9:00 AM", tag: "Work" },
                      { color: "bg-blue-400", title: "Dentist Appointment", time: "2:30 PM", tag: "Health" },
                      { color: "bg-amber-400", title: "Gym Session", time: "6:00 PM", tag: "Personal" },
                    ].map((ev, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-left opacity-75">
                        <div className={cn("h-10 w-1.5 shrink-0 rounded-full", ev.color)} />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-neutral-800">{ev.title}</p>
                          <p className="text-[10px] text-neutral-400">{ev.time} · {ev.tag}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => setShowAddForm(true)}
                  >
                    Add First Event
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:bg-primary-700"
        aria-label="Add new event"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
