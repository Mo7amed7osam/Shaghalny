import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Wifi, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '@/services/api';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const EventsPage: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: getEvents });
  const navigate = useNavigate();
  const events = data?.events || [];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Community" title="Upcoming Events" description="Stay up to date with workshops, networking meetups, and freelance opportunities." />

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <EmptyState title="No upcoming events" description="Check back soon for new events and opportunities." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((ev: any) => (
            <button key={ev._id} type="button" onClick={() => navigate(`/events/${ev._id}`)} className="group glass-panel overflow-hidden rounded-xl text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1" aria-label={`View event: ${ev.title}`}>
              <div className="relative w-full overflow-hidden">
                {ev.imageUrl ? (
                  <img src={ev.imageUrl} alt={ev.title} className="w-full bg-black object-contain" />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-brand-50 dark:bg-brand-900/20">
                    <Calendar size={48} className="text-brand-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white">
                  {ev.isOnline ? <Wifi size={13} /> : <MapPin size={13} />}
                  {ev.isOnline ? 'Online' : ev.location}
                </div>
              </div>
              <div className="space-y-3 p-5">
                <h3 className="text-lg font-semibold leading-snug group-hover:text-brand-600 transition-colors">{ev.title}</h3>
                <p className="text-sm text-ink-500 dark:text-ink-300 line-clamp-2">{ev.description}</p>
                <div className="flex flex-wrap gap-3 pt-1 text-sm text-ink-400">
                  <span className="flex items-center gap-1"><Calendar size={13} />{new Date(ev.date).toLocaleDateString('en-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="flex items-center gap-1"><Clock size={13} />{ev.time}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
