import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { CalendarDays } from 'lucide-react';

interface CalendarHistoryProps<T> {
  data: T[];
  dateKey: keyof T;
  renderDay: (items: T[], date: Date) => React.ReactNode;
  title: string;
  getDayIndicator?: (items: T[]) => { count: number; color: string };
}

export default function CalendarHistory<T>({ data, dateKey, renderDay, title, getDayIndicator }: CalendarHistoryProps<T>) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const getItemsForDate = (date: Date): T[] => {
    return data.filter(item => {
      const itemDate = String(item[dateKey]);
      return itemDate === format(date, 'yyyy-MM-dd');
    });
  };

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  // Find dates that have data
  const datesWithData = new Set(data.map(item => String(item[dateKey])));

  return (
    <div className="kpi-card">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold font-heading">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="p-3 pointer-events-auto"
            modifiers={{
              hasData: (date) => datesWithData.has(format(date, 'yyyy-MM-dd')),
            }}
            modifiersClassNames={{
              hasData: 'bg-primary/20 font-bold',
            }}
          />
        </div>
        <div className="min-h-[200px]">
          {selectedDate && (
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No records for this date</p>
              ) : (
                renderDay(selectedItems, selectedDate)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
