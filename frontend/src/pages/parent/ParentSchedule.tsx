import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Alert, Chip, Stack } from '@mui/material';
import api from '../../api/client';
import { ScheduleGrid, SCHEDULE_DAYS } from '../../components/ScheduleGrid';
import { useParentChild } from '../../context/ParentChildContext';
import { ChildSelectorField } from '../../components/ChildSelector';

export default function ParentSchedule() {
  const { childId, childParams } = useParentChild();

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['parent-schedule', childId],
    queryFn: async () => (await api.get('/student/schedule', childParams)).data,
    enabled: !!childId,
  });

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();

  const todayLessons = useMemo(
    () => slots.filter((s: { dayOfWeek: number }) => s.dayOfWeek === todayDow),
    [slots, todayDow]
  );

  if (!childId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Розклад
        </Typography>
        <Alert severity="info">Оберіть дитину на головній сторінці</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Розклад дитини
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Тижневий розклад класу
      </Typography>
      <ChildSelectorField />

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
        <Alert severity="info">Розклад ще не заповнений</Alert>
      )}
      {slots.length > 0 && <ScheduleGrid slots={slots} />}
    </Box>
  );
}
