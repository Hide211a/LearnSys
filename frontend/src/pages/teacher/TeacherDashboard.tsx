import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  Alert,
  Paper,
  Skeleton,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';

type Dashboard = {
  user: { firstName: string; lastName: string };
  summary: {
    assignmentCount: number;
    studentCount: number;
    submissionsToReview: number;
    overdueHomework: number;
    lessonsToday: number;
  };
  scheduleToday: {
    lessonNumber: number;
    room: string | null;
    subjectName: string;
    className: string;
    classGroupId: string;
    subjectId: string;
  }[];
  tasks: { type: string; title: string; count: number; path: string }[];
  upcomingHomework: {
    id: string;
    title: string;
    dueDate: string;
    subject: { name: string };
    classGroup: { name: string };
  }[];
  classPreviews: {
    classGroupId: string;
    subjectId: string;
    className: string;
    subjectName: string;
    averageGrade: number | null;
  }[];
};

const DAY_NAMES = ['', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];

export default function TeacherDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: async () => (await api.get('/teacher/dashboard')).data as Dashboard,
  });

  const todayName = DAY_NAMES[new Date().getDay() === 0 ? 7 : new Date().getDay()];

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={48} />
        <Grid container spacing={2} mt={1}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rounded" height={90} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!data) return null;

  const { user, summary } = data;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Вітаємо, {user.firstName} {user.lastName}!
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {todayName}, {format(new Date(), 'd MMMM yyyy', { locale: uk })} — зведення на сьогодні
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{summary.assignmentCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Класів / предметів
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{summary.studentCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Учнів
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary.main">
                {summary.lessonsToday}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Уроків сьогодні
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card
            sx={{
              borderColor: summary.submissionsToReview ? 'warning.main' : undefined,
              borderWidth: summary.submissionsToReview ? 1 : 0,
              borderStyle: 'solid',
            }}
          >
            <CardContent>
              <Typography variant="h4" color={summary.submissionsToReview ? 'warning.main' : undefined}>
                {summary.submissionsToReview}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                На перевірці
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
        <Button component={RouterLink} to="/teacher/journal" variant="contained" startIcon={<MenuBookIcon />}>
          Журнал
        </Button>
        <Button component={RouterLink} to="/teacher/homework" variant="outlined" startIcon={<AssignmentIcon />}>
          Домашні завдання
        </Button>
        <Button component={RouterLink} to="/teacher/schedule" variant="outlined" startIcon={<ScheduleIcon />}>
          Мій розклад
        </Button>
        <Button component={RouterLink} to="/teacher/classes" variant="outlined">
          Мої класи
        </Button>
      </Stack>

      {data.tasks.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.50', border: 1, borderColor: 'warning.light' }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <WarningAmberIcon color="warning" />
            <Typography fontWeight={600}>Потребує уваги</Typography>
          </Box>
          <List dense disablePadding>
            {data.tasks.map((t) => (
              <ListItem key={t.type} disablePadding>
                <ListItemButton component={RouterLink} to={t.path}>
                  <ListItemText primary={`${t.title} (${t.count})`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom>
            Розклад на сьогодні
          </Typography>
          {data.scheduleToday.length === 0 ? (
            <Alert severity="info">Сьогодні уроків у розкладі немає (або вихідний)</Alert>
          ) : (
            <Paper variant="outlined">
              <List>
                {data.scheduleToday.map((s) => (
                  <ListItem
                    key={`${s.lessonNumber}-${s.classGroupId}`}
                    secondaryAction={
                      <Button
                        size="small"
                        component={RouterLink}
                        to={`/teacher/journal?classGroupId=${s.classGroupId}&subjectId=${s.subjectId}`}
                      >
                        Журнал
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`${s.lessonNumber} урок · ${s.subjectName}`}
                      secondary={`${s.className}${s.room ? ` · каб. ${s.room}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom>
            Найближчі дедлайни ДЗ
          </Typography>
          {data.upcomingHomework.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Немає завдань на найближчі 7 днів
            </Typography>
          ) : (
            <List dense component={Paper} variant="outlined">
              {data.upcomingHomework.map((h) => (
                <ListItem key={h.id}>
                  <ListItemText
                    primary={h.title}
                    secondary={`${h.subject.name} · ${h.classGroup.name} · ${format(new Date(h.dueDate), 'd MMM, HH:mm', { locale: uk })}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Button component={RouterLink} to="/teacher/homework" size="small" sx={{ mt: 1 }}>
            Усі завдання
          </Button>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            Швидкий перехід до журналу
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {data.classPreviews.map((c) => (
              <Chip
                key={`${c.classGroupId}-${c.subjectId}`}
                component={RouterLink}
                to={`/teacher/journal?classGroupId=${c.classGroupId}&subjectId=${c.subjectId}`}
                clickable
                label={`${c.subjectName} · ${c.className}${c.averageGrade != null ? ` (${c.averageGrade})` : ''}`}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
