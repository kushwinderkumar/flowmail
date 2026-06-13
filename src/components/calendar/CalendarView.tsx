'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  startOfDay, addHours, parseISO
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Video, MapPin, Users } from 'lucide-react'
import { cn, formatEventTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import CreateEventModal from './CreateEventModal'

interface CalendarEvent {
  id: string
  googleId: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  allDay: boolean
  attendees?: string[]
  meetLink?: string
  status?: string
}

type ViewMode = 'month' | 'week' | 'agenda'

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [newEventDate, setNewEventDate] = useState<Date | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const timeMin = startOfMonth(subMonths(currentDate, 1)).toISOString()
      const timeMax = endOfMonth(addMonths(currentDate, 1)).toISOString()
      const res = await fetch(`/api/calendar?timeMin=${timeMin}&timeMax=${timeMax}`)
      const data = await res.json()
      if (data.events) setEvents(data.events)
    } catch {
      toast.error('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      switch (e.key) {
        case 'n': case 'N':
          e.preventDefault()
          setShowCreate(true)
          break
        case 'ArrowLeft':
          setCurrentDate((d) => subMonths(d, 1))
          break
        case 'ArrowRight':
          setCurrentDate((d) => addMonths(d, 1))
          break
        case 't': case 'T':
          if (!e.ctrlKey && !e.metaKey) { setCurrentDate(new Date()) }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.startTime), day))

  const upcomingEvents = events
    .filter((e) => parseISO(e.startTime) >= new Date())
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
    .slice(0, 10)

  return (
    <div className="flex h-full">
      {/* Main calendar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e1e1e]">
          <h1 className="text-sm font-semibold text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate((d) => subMonths(d, 1))}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#1e1e1e] transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate((d) => addMonths(d, 1))}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-0.5">
            {(['month', 'week', 'agenda'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs capitalize transition-colors cursor-pointer',
                  viewMode === v ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={fetchEvents}
              className="text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={13} />
              New event
              <span className="text-blue-200 text-[10px]">N</span>
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        {viewMode === 'month' && (
          <div className="flex-1 overflow-auto p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs text-gray-600 pb-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {(() => {
              const monthStart = startOfMonth(currentDate)
              const monthEnd = endOfMonth(currentDate)
              const startDate = startOfWeek(monthStart)
              const endDate = endOfWeek(monthEnd)
              const rows: Date[][] = []
              let day = startDate
              while (day <= endDate) {
                const week: Date[] = []
                for (let i = 0; i < 7; i++) {
                  week.push(day)
                  day = addDays(day, 1)
                }
                rows.push(week)
              }

              return (
                <div className="grid" style={{ gridTemplateRows: `repeat(${rows.length}, minmax(80px, 1fr))` }}>
                  {rows.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 border-t border-[#1e1e1e]">
                      {week.map((d, di) => {
                        const dayEvents = getEventsForDay(d)
                        const inMonth = isSameMonth(d, currentDate)
                        const today = isToday(d)
                        return (
                          <div
                            key={di}
                            onClick={() => { setNewEventDate(d); setShowCreate(true) }}
                            className={cn(
                              'p-1.5 min-h-[80px] border-r border-[#1e1e1e] cursor-pointer hover:bg-[#141414] transition-colors',
                              !inMonth && 'opacity-40',
                              di === 6 && 'border-r-0'
                            )}
                          >
                            <div className={cn(
                              'w-6 h-6 flex items-center justify-center text-xs rounded-full mb-1',
                              today ? 'bg-blue-500 text-white font-bold' : 'text-gray-400'
                            )}>
                              {format(d, 'd')}
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 3).map((evt) => (
                                <div
                                  key={evt.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt) }}
                                  className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-blue-500/30"
                                >
                                  {!evt.allDay && (
                                    <span className="opacity-70 mr-1">
                                      {format(parseISO(evt.startTime), 'h:mm')}
                                    </span>
                                  )}
                                  {evt.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-[9px] text-gray-500 px-1">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {viewMode === 'agenda' && (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Upcoming events</h2>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="text-2xl mb-2">🗓️</p>
                <p className="text-sm">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:border-[#3a3a3a] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{evt.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatEventTime(parseISO(evt.startTime), parseISO(evt.endTime))}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                          {evt.location && (
                            <span className="flex items-center gap-1"><MapPin size={11} />{evt.location}</span>
                          )}
                          {evt.meetLink && (
                            <a
                              href={evt.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            >
                              <Video size={11} />Join
                            </a>
                          )}
                          {(evt.attendees as any)?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users size={11} />{(evt.attendees as any).length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event detail sidebar */}
      {selectedEvent && (
        <div className="w-80 border-l border-[#1e1e1e] p-5 flex flex-col gap-4 overflow-y-auto animate-slide-in">
          <div className="flex items-start justify-between">
            <h3 className="text-base font-semibold text-white leading-tight">{selectedEvent.title}</h3>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-gray-500 hover:text-white cursor-pointer text-lg leading-none ml-2"
            >×</button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-gray-600">🕐</span>
              {formatEventTime(parseISO(selectedEvent.startTime), parseISO(selectedEvent.endTime))}
            </div>
            {selectedEvent.location && (
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin size={13} className="text-gray-600" />
                {selectedEvent.location}
              </div>
            )}
            {selectedEvent.meetLink && (
              <a
                href={selectedEvent.meetLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
              >
                <Video size={13} />
                Join Google Meet
              </a>
            )}
            {(selectedEvent.attendees as any)?.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-1.5">Attendees</p>
                <div className="space-y-1">
                  {(selectedEvent.attendees as any[]).map((a: string, i: number) => (
                    <div key={i} className="text-xs text-gray-400">{a}</div>
                  ))}
                </div>
              </div>
            )}
            {selectedEvent.description && (
              <div>
                <p className="text-xs text-gray-600 mb-1">Description</p>
                <p className="text-xs text-gray-400 whitespace-pre-wrap">{selectedEvent.description}</p>
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              if (!confirm('Delete this event?')) return
              await fetch(`/api/calendar/events/${selectedEvent.id}`, { method: 'DELETE' })
              setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id))
              setSelectedEvent(null)
              toast.success('Event deleted')
            }}
            className="mt-auto text-xs text-red-400 hover:text-red-300 cursor-pointer py-2"
          >
            Delete event
          </button>
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          defaultDate={newEventDate || new Date()}
          onClose={() => { setShowCreate(false); setNewEventDate(null) }}
          onCreated={(evt) => {
            setEvents((prev) => [...prev, evt])
            setShowCreate(false)
            setNewEventDate(null)
            toast.success('Event created!')
          }}
        />
      )}
    </div>
  )
}
