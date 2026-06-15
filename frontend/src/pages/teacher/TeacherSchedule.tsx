import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Button, Chip, Stack } from '@mui/material';
import api from '../../api/client';
import { ScheduleGrid, SCHEDULE_DAYS } from '../../components/ScheduleGrid';

export default function TeacherSchedule() {
  const navigate = useNavigate();
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['teacher-schedule'],
    queryFn: async () => (await api.get('/teacher/schedule')).data,
  });

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();

  const todayCount = slots.filter((s: { dayOfWeek: number }) => s.dayOfWeek === todayDow).length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Мій розклад
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Усі ваші уроки на тиждень. У клітинці — клас, який ви ведете.
      </Typography>

      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        <Chip label={`${slots.length} уроків / тиждень`} color="primary" variant="outlined" />
        {todayDow <= 5 && (
          <Chip
            label={`Сьогодні (${SCHEDULE_DAYS[todayDow]}): ${todayCount} уроків`}
            color="secondary"
            variant="outlined"
          />
        )}
        <Button component={RouterLink} to="/teacher" size="small">
          На панель
        </Button>
      </Stack>

      {isLoading && <Typography>Завантаження...</Typography>}

      {!isLoading && slots.length === 0 && (
        <Alert severity="info">
          У розкладі ще немає ваших уроків. Зверніться до адміністратора.
        </Alert>
      )}

      {slots.length > 0 && (
        <ScheduleGrid
          slots={slots}
          showClass
          onSlotClick={(s) => {
            const slot = slots.find((x: { id: string }) => x.id === s.id) as {
              classGroup?: { id: string };
              subject?: { id: string };
            };
            if (slot?.classGroup?.id && slot?.subject?.id) {
              navigate(
                `/teacher/journal?classGroupId=${slot.classGroup.id}&subjectId=${slot.subject.id}`
              );
            }
          }}
        />
      )}
    </Box>
  );
}
