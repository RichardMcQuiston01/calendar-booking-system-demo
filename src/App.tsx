import { AvailabilityPanel } from './features/availability/AvailabilityPanel';
import { CalendarViewPanel } from './features/availability/CalendarViewPanel';
import { BookingPanel } from './features/booking/BookingPanel';
import { BookingsList } from './features/booking/BookingsList';
import { InheritancePanel } from './features/inheritance/InheritancePanel';
import { SnapshotInspector } from './features/inheritance/SnapshotInspector';
import { useCalendarStore } from './store';
import { Button } from './ui/Button';

function formatWeekStart(weekStart: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${weekStart}T00:00:00Z`),
  );
}

function App() {
  const store = useCalendarStore();

  return (
    <div className="min-h-screen">
      <header className="border-b border-brand-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-950">
              Riverside Tutoring Center — Calendar Booking Demo
            </h1>
            <p className="text-sm text-brand-700">Demo week of {formatWeekStart(store.directory.weekStart)}</p>
          </div>
          <Button variant="secondary" onClick={() => store.resetToSeed()}>
            Reset demo
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <AvailabilityPanel />
          <CalendarViewPanel />
        </div>
        <div className="flex flex-col gap-6">
          <BookingPanel />
          <BookingsList />
        </div>
        <div className="flex flex-col gap-6">
          <InheritancePanel />
          <SnapshotInspector />
        </div>
      </main>
    </div>
  );
}

export default App;
