import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Button,
  Alert,
  Paper,
  Skeleton,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GradeIcon from '@mui/icons-material/Grade';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';

const DAY_NAMES = ['', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];

type Dashboard = {
  student: {
    firstName: string;
    lastName: string;
    classGroup?: { name: string };
  };
  summary: {
    lessonsToday: number;
    pendingHomework: number;
    overdueHomework: number;
    returnedHomework: number;
    overallAverage: number | null;
    quizzesCount: number;
    materialsCount: number;
    gradesCount: number;
  } | null;
  todayLessons: {
    lessonNumber: number;
    room: string | null;
    subjectName: string;
    teacherName: string;
  }[];
  upcomingHomework: {
    id: string;
    title: string;
    dueDate: string;
    subject: { name: string };
    status: string;
  }[];
  recentGrades: { id: string; grade: number; subject: { name: string }; date: string }[];
  upcomingEvents: {
    id: string;
    title: string;
    startDate: string;
    endDate?: string | null;
    isHoliday: boolean;
  }[];
  tasks: { type: string; title: string; count: number; path: string }[];
};

export default function StudentDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: async () => (await api.get('/student/dashboard')).data as Dashboard,
  });

  const todayName = DAY_NAMES[new Date().getDay() === 0 ? 7 : new Date().getDay()];

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={280} height={48} />
        <Grid container spacing={2} mt={1}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rounded" height={88} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!data) return null;

  const { student, summary } = data;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Вітаємо, {student.firstName}!
      </Typography>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
        {student.classGroup && <Chip label={`Клас ${student.classGroup.name}`} color="primary" />}
        <Typography variant="body2" color="text.secondary">
          {todayName}, {format(new Date(), 'd MMMM yyyy', { locale: uk })}
        </Typography>
      </Stack>

      {!student.classGroup && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Вас ще не зараховано до класу. Зверніться до адміністратора школи.
        </Alert>
      )}

      {summary && (
        <>
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary.main">
                    {summary.lessonsToday}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Уроків сьогодні
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4">{summary.overallAverage ?? '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Середній бал
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card
                sx={{
                  borderColor: summary.pendingHomework + summary.overdueHomework > 0 ? 'warning.main' : undefined,
                  borderWidth: summary.pendingHomework + summary.overdueHomework > 0 ? 1 : 0,
                  borderStyle: 'solid',
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    color={
                      summary.overdueHomework > 0
                        ? 'error.main'
                        : summary.pendingHomework > 0
                          ? 'warning.main'
                          : undefined
                    }
                  >
                    {summary.pendingHomework + summary.overdueHomework}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ДЗ до здачі
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4">{summary.materialsCount}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Матеріалів
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4">{summary.quizzesCount}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Тестів
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
            <Button component={RouterLink} to="/student/homework" variant="contained" startIcon={<AssignmentIcon />}>
              Домашні завдання
            </Button>
            <Button component={RouterLink} to="/student/grades" variant="outlined" startIcon={<GradeIcon />}>
              Оцінки
            </Button>
            <Button component={RouterLink} to="/student/schedule" variant="outlined" startIcon={<ScheduleIcon />}>
              Розклад
            </Button>
            <Button component={RouterLink} to="/student/materials" variant="outlined" startIcon={<MenuBookIcon />}>
              Матеріали
            </Button>
          </Stack>

          {data.tasks.length > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.50', border: 1, borderColor: 'warning.light' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WarningAmberIcon color="warning" />
                <Typography fontWeight={600}>Зверніть увагу</Typography>
              </Box>
              <List dense disablePadding>
                {data.tasks.map((t) => (
                  <ListItem key={t.type} disablePadding>
                    <Button component={RouterLink} to={t.path} size="small">
                      {t.title} ({t.count})
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" gutterBottom>
                Уроки сьогодні
              </Typography>
              {data.todayLessons.length === 0 ? (
                <Alert severity="info">Сьогодні уроків немає</Alert>
              ) : (
                <Paper variant="outlined">
                  <List dense>
                    {data.todayLessons.map((l) => (
                      <ListItem key={l.lessonNumber}>
                        <ListItemText
                          primary={`${l.lessonNumber}. ${l.subjectName}`}
                          secondary={`${l.teacherName}${l.room ? ` · каб. ${l.room}` : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" gutterBottom>
                Найближчі ДЗ
              </Typography>
              {data.upcomingHomework.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Немає активних завдань
                </Typography>
              ) : (
                <List dense component={Paper} variant="outlined">
                  {data.upcomingHomework.map((h) => (
                    <ListItem key={h.id}>
                      <ListItemText
                        primary={h.title}
                        secondary={`${h.subject.name} · ${format(new Date(h.dueDate), 'd MMM, HH:mm', { locale: uk })}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <Button component={RouterLink} to="/student/homework" size="small" sx={{ mt: 1 }}>
                Усі завдання
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" gutterBottom>
                Останні оцінки
              </Typography>
              {data.recentGrades.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Оцінок поки немає
                </Typography>
              ) : (
                <List dense component={Paper} variant="outlined">
                  {data.recentGrades.map((r) => (
                    <ListItem
                      key={r.id}
                      secondaryAction={<Chip label={r.grade} size="small" color="primary" />}
                    >
                      <ListItemText
                        primary={r.subject.name}
                        secondary={format(new Date(r.date), 'd MMM yyyy', { locale: uk })}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <Button component={RouterLink} to="/student/grades" size="small" sx={{ mt: 1 }}>
                Усі оцінки
              </Button>
            </Grid>

            {data.upcomingEvents.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" gutterBottom>
                  Події та канікули
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {data.upcomingEvents.map((e) => (
                    <Chip
                      key={e.id}
                      icon={e.isHoliday ? <BeachAccessIcon /> : undefined}
                      label={`${e.title} · ${format(new Date(e.startDate), 'd MMM', { locale: uk })}`}
                      variant="outlined"
                      component={RouterLink}
                      to="/events"
                      clickable
                    />
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  );
}
