import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Alert, Chip, Stack } from '@mui/material';
import api from '../../api/client';
import { ScheduleGrid, SCHEDULE_DAYS } from '../../components/ScheduleGrid';

export default function StudentSchedule() {
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['student-schedule'],
    queryFn: async () => (await api.get('/student/schedule')).data,
  });

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();

  const todayLessons = useMemo(
    () => slots.filter((s: { dayOfWeek: number }) => s.dayOfWeek === todayDow),
    [slots, todayDow]
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Мій розклад
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Розклад вашого класу на тиждень
      </Typography>

      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        <Chip label={`${slots.length} уроків на тиждень`} color="primary" variant="outlined" />
        {todayDow <= 5 && (
          <Chip
            label={`Сьогодні (${SCHEDULE_DAYS[todayDow]}): ${todayLessons.length} уроків`}
            color="secondary"
            variant="outlined"
          />
        )}
      </Stack>

      {isLoading && <Typography>Завантаження...</Typography>}

      {!isLoading && slots.length === 0 && (
        <Alert severity="info">Розклад ще не заповнений адміністратором</Alert>
      )}

      {slots.length > 0 && <ScheduleGrid slots={slots} />}
    </Box>
  );
}
