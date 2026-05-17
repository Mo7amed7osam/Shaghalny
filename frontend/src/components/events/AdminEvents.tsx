import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const emptyForm = { title: '', description: '', date: '', time: '', location: '', isOnline: false, image: null as File | null };

const AdminEvents: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: getEvents });
  const events = data?.events || [];

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => createEvent(fd),
    onSuccess: () => { toast.success('Event created!'); queryClient.invalidateQueries({ queryKey: ['events'] }); resetForm(); },
    onError: () => toast.error('Failed to create event.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) => updateEvent(id, fd),
    onSuccess: () => { toast.success('Event updated!'); queryClient.invalidateQueries({ queryKey: ['events'] }); resetForm(); },
    onError: () => toast.error('Failed to update event.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => { toast.success('Event deleted.'); queryClient.invalidateQueries({ queryKey: ['events'] }); },
  });

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleEdit = (ev: any) => {
    setForm({ title: ev.title, description: ev.description, date: ev.date?.slice(0, 10), time: ev.time, location: ev.location, isOnline: ev.isOnline, image: null });
    setEditingId(ev._id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.description || !form.date || !form.time || !form.location) {
      toast.error('Please fill all required fields.'); return;
    }
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('date', form.date);
    fd.append('time', form.time);
    fd.append('location', form.location);
    fd.append('isOnline', String(form.isOnline));
    if (form.image) fd.append('image', form.image);
    if (editingId) updateMutation.mutate({ id: editingId, fd });
    else createMutation.mutate(fd);
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin · Events" title="Manage Events" description="Create, edit, and remove events visible to all users." />

      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} className="mr-2" /> Add Event
        </Button>
      </div>

      {showForm && (
        <div className="glass-panel space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editingId ? 'Edit Event' : 'New Event'}</h3>
            <button onClick={resetForm}><X size={18} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input placeholder="Location *" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <textarea
            className="w-full rounded-xl border border-ink-200 bg-transparent p-3 text-sm dark:border-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={3} placeholder="Description *"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isOnline} onChange={e => setForm(f => ({ ...f, isOnline: e.target.checked }))} />
              Online event
            </label>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-ink-500">Event image</p>
            <input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, image: e.target.files?.[0] || null }))} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create Event'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-44 w-full rounded-3xl" />
      ) : events.length === 0 ? (
        <EmptyState title="No events yet" description="Add your first event using the button above." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((ev: any) => (
            <div key={ev._id} className="glass-panel overflow-hidden rounded-3xl">
              {ev.imageUrl && <img src={ev.imageUrl} alt={ev.title} className="w-full object-contain bg-black" />}
              <div className="space-y-2 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">{ev.isOnline ? 'Online' : ev.location}</p>
                <h3 className="text-lg font-semibold">{ev.title}</h3>
                <p className="text-sm text-ink-500 dark:text-ink-300 line-clamp-2">{ev.description}</p>
                <p className="text-sm text-ink-400">{new Date(ev.date).toLocaleDateString('en-EG', { day: 'numeric', month: 'long', year: 'numeric' })} · {ev.time}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(ev)}><Pencil size={14} className="mr-1" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(ev._id)}><Trash2 size={14} className="mr-1" /> Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
