'use client'

import { useState, useRef, useEffect } from 'react'
import { format, addHours, parseISO } from 'date-fns'
import { X, Calendar, Video, MapPin, Users, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface CreateEventModalProps {
  defaultDate: Date
  onClose: () => void
  onCreated: (event: any) => void
}

export default function CreateEventModal({ defaultDate, onClose, onCreated }: CreateEventModalProps) {
  const defaultStart = addHours(defaultDate, 10)
  const defaultEnd = addHours(defaultDate, 11)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState(format(defaultStart, "yyyy-MM-dd'T'HH:mm"))
  const [endTime, setEndTime] = useState(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"))
  const [attendees, setAttendees] = useState<string[]>([''])
  const [addGoogleMeet, setAddGoogleMeet] = useState(true)
  const [sendEmailInvite, setSendEmailInvite] = useState(true)
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  // Cmd+Enter to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSave() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [title, startTime, endTime, attendees, description, location, addGoogleMeet])

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Please enter an event title'); return }

    setSaving(true)
    try {
      const validAttendees = attendees.filter((a) => a.trim() && a.includes('@'))

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          location: location || undefined,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          attendees: validAttendees,
          addGoogleMeet,
        }),
      })

      if (!res.ok) throw new Error('Failed to create event')
      const event = await res.json()

      // Also send email invites if requested
      if (sendEmailInvite && validAttendees.length > 0) {
        for (const email of validAttendees) {
          await fetch('/api/emails/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject: `Invitation: ${title}`,
              message: `You've been invited to "${title}".\n\nTime: ${format(new Date(startTime), 'PPPp')} - ${format(new Date(endTime), 'p')}\n${location ? `Location: ${location}\n` : ''}${addGoogleMeet ? 'A Google Meet link has been added to the event.\n' : ''}${description ? `\n${description}` : ''}`,
            }),
          }).catch(() => {})
        }
      }

      onCreated(event)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2a2a]">
          <Calendar size={15} className="text-blue-400" />
          <span className="text-sm font-medium text-white flex-1">New event</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full text-base font-medium bg-transparent text-white placeholder-gray-600 outline-none border-b border-[#2a2a2a] pb-2"
          />

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Start</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  // Auto-set end time to 1 hour after
                  const start = new Date(e.target.value)
                  setEndTime(format(addHours(start, 1), "yyyy-MM-dd'T'HH:mm"))
                }}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">End</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-gray-600 shrink-0" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
          </div>

          {/* Attendees */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-gray-600" />
              <span className="text-xs text-gray-500">Guests</span>
            </div>
            <div className="space-y-2">
              {attendees.map((attendee, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={attendee}
                    onChange={(e) => {
                      const updated = [...attendees]
                      updated[i] = e.target.value
                      setAttendees(updated)
                    }}
                    placeholder="guest@email.com"
                    className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50"
                  />
                  {attendees.length > 1 && (
                    <button
                      onClick={() => setAttendees((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-600 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setAttendees((prev) => [...prev, ''])}
                className="text-xs text-gray-500 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                Add guest
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              rows={3}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none focus:border-blue-500/50"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAddGoogleMeet(!addGoogleMeet)}
                className={cn(
                  'w-9 h-5 rounded-full relative transition-colors cursor-pointer',
                  addGoogleMeet ? 'bg-blue-500' : 'bg-[#2a2a2a]'
                )}
              >
                <div className={cn(
                  'absolute w-3.5 h-3.5 bg-white rounded-full top-0.5 transition-transform',
                  addGoogleMeet ? 'translate-x-[18px]' : 'translate-x-[2px]'
                )} />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Video size={13} className="text-blue-400" />
                Add Google Meet
              </div>
            </label>

            {attendees.filter((a) => a.trim()).length > 0 && (
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setSendEmailInvite(!sendEmailInvite)}
                  className={cn(
                    'w-9 h-5 rounded-full relative transition-colors cursor-pointer',
                    sendEmailInvite ? 'bg-blue-500' : 'bg-[#2a2a2a]'
                  )}
                >
                  <div className={cn(
                    'absolute w-3.5 h-3.5 bg-white rounded-full top-0.5 transition-transform',
                    sendEmailInvite ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  )} />
                </div>
                <span className="text-sm text-gray-300">Also send email invites</span>
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#2a2a2a]">
          <span className="text-xs text-gray-600"><span className="kbd">⌘ Enter</span> to save</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                saving ? 'bg-blue-500/50 text-white/50' : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              {saving ? 'Creating...' : 'Create event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
