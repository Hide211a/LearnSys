import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, Chip, Stack, Alert } from '@mui/material';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventIcon from '@mui/icons-material/Event';
import { format, isWithinInterval } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../api/client';
import { useParentChild } from '../context/ParentChildContext';
import { ChildSelectorField } from '../components/ChildSelector';

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  isHoliday: boolean;
  classGroup?: { name: string } | null;
};

function formatRange(e: EventRow) {
  const start = new Date(e.startDate);
  const end = e.endDate ? new Date(e.endDate) : null;
  if (end) {
    return `${format(start, 'd MMMM yyyy', { locale: uk })} — ${format(end, 'd MMMM yyyy', { locale: uk })}`;
  }
  return format(start, e.isHoliday ? 'd MMMM yyyy' : 'd MMMM yyyy, HH:mm', { locale: uk });
}

function isNow(e: EventRow) {
  const start = new Date(e.startDate);
  const end = e.endDate ? new Date(e.endDate) : start;
  return isWithinInterval(new Date(), { start, end: end >= start ? end : start });
}

export default function EventsPage() {
  const { isParent, childId, childParams } = useParentChild();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-public', isParent ? childId || 'all' : 'me'],
    queryFn: async () =>
      (await api.get('/events', isParent && childId ? childParams : undefined)).data as EventRow[],
  });

  const { upcoming, holidays, current } = useMemo(() => {
    const now = new Date();
    return {
      holidays: events.filter((e) => e.isHoliday),
      current: events.filter((e) => isNow(e)),
      upcoming: events.filter((e) => new Date(e.endDate ?? e.startDate) >= now),
    };
  }, [events]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Календар подій
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Канікули та події школи та класу{isParent ? ' дитини' : ''}
      </Typography>
      {isParent && <ChildSelectorField />}

      {current.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Зараз: {current.map((e) => e.title).join(', ')}
        </Alert>
      )}

      {isLoading && <Typography color="text.secondary">Завантаження...</Typography>}

      {!isLoading && events.length === 0 && (
        <Alert severity="info">Подій поки немає</Alert>
      )}

      {holidays.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Канікули
          </Typography>
          <Stack spacing={1} mb={3}>
            {holidays.map((e) => (
              <EventCard key={e.id} e={e} formatRange={formatRange} highlight={isNow(e)} />
            ))}
          </Stack>
        </>
      )}

      <Typography variant="h6" gutterBottom>
        Події {upcoming.length > 0 && `(${upcoming.length})`}
      </Typography>
      <Stack spacing={1}>
        {events
          .filter((e) => !e.isHoliday)
          .map((e) => (
            <EventCard key={e.id} e={e} formatRange={formatRange} highlight={isNow(e)} />
          ))}
      </Stack>
    </Box>
  );
}

function EventCard({
  e,
  formatRange,
  highlight,
}: {
  e: EventRow;
  formatRange: (e: EventRow) => string;
  highlight: boolean;
}) {
  return (
    <Card variant={highlight ? 'elevation' : 'outlined'} sx={highlight ? { borderColor: 'success.main', borderWidth: 1 } : undefined}>
      <CardContent>
        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" mb={1}>
          <Typography variant="h6">{e.title}</Typography>
          {e.isHoliday ? (
            <Chip icon={<BeachAccessIcon />} label="Канікули" size="small" color="secondary" />
          ) : (
            <Chip icon={<EventIcon />} label="Подія" size="small" variant="outlined" />
          )}
          {highlight && <Chip label="Зараз" size="small" color="success" />}
          {e.classGroup ? (
            <Chip label={e.classGroup.name} size="small" />
          ) : (
            <Chip label="Вся школа" size="small" color="primary" variant="outlined" />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {formatRange(e)}
        </Typography>
        {e.description && (
          <Typography mt={1} variant="body2">
            {e.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
