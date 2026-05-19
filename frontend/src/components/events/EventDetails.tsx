import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Wifi, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { getEvents } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const EventDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: getEvents });
  const event = data?.events?.find((ev: any) => ev._id === id);

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  if (!event) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-lg font-semibold">Event not found.</p>
      <Button className="mt-4" onClick={() => navigate('/events')}>Back to Events</Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/events')} className="gap-1.5">
        <ArrowLeft size={16} /> Back to Events
      </Button>

      <div className="glass-panel overflow-hidden rounded-xl">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="h-72 w-full object-contain bg-black" />
        ) : (
          <div className="flex h-72 w-full items-center justify-center bg-brand-50 dark:bg-brand-900/20">
            <Calendar size={64} className="text-brand-400" />
          </div>
        )}

        <div className="space-y-6 p-8">
          <div className="space-y-2">
            <Badge variant="brand">{event.isOnline ? 'Online' : 'In Person'}</Badge>
            <h1 className="text-3xl font-semibold">{event.title}</h1>
          </div>

          <div className="flex flex-wrap gap-5 rounded-lg border border-ink-200 dark:border-ink-700 p-5">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-brand-500" />
              <span className="font-medium">{new Date(event.date).toLocaleDateString('en-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-brand-500" />
              <span className="font-medium">{event.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {event.isOnline ? <Wifi size={16} className="text-brand-500" /> : <MapPin size={16} className="text-brand-500" />}
              <span className="font-medium">{event.isOnline ? 'Online Event' : event.location}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">About this event</h2>
            <p className="text-sm leading-7 text-ink-600 dark:text-ink-300">{event.description}</p>
          </div>

          {event.agenda && event.agenda.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Agenda</h2>
              <div className="space-y-2">
                {event.agenda.map((item: any, i: number) => (
                  <div key={i} className="flex gap-4 rounded-lg border border-ink-200 dark:border-ink-700 p-4">
                    <span className="shrink-0 text-sm font-semibold text-brand-500">{item.time}</span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.description && <p className="text-sm text-ink-500 dark:text-ink-300">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
