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
  Badge,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GradeIcon from '@mui/icons-material/Grade';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import QuizIcon from '@mui/icons-material/Quiz';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';
import { useParentChild } from '../../context/ParentChildContext';
import { ChildSelectorField } from '../../components/ChildSelector';

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
    absencesWeek?: number;
  } | null;
  todayLessons: {
    lessonNumber: number;
    room: string | null;
    subjectName: string;
    teacherName: string;
  }[];
  upcomingHomework: { id: string; title: string; dueDate: string; subject: { name: string } }[];
  recentGrades: { id: string; grade: number; subject: { name: string }; date: string }[];
  upcomingEvents: { id: string; title: string; startDate: string; isHoliday: boolean }[];
  tasks: { type: string; title: string; count: number; path: string }[];
  alerts: { type: string; title: string; severity: 'warning' | 'error' | 'info' }[];
};

type ChildSummary = {
  child: { id: string; firstName: string; lastName: string; classGroup?: { name: string } };
  summary: Dashboard['summary'];
  alertCount: number;
};

export default function ParentDashboard() {
  const { childId, childParams, pathWithChild, setChildId } = useParentChild();

  const { data: summaries = [], isLoading: loadingSummary } = useQuery({
    queryKey: ['children-summary'],
    queryFn: async () => (await api.get('/student/children-summary')).data as ChildSummary[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['parent-dashboard', childId],
    queryFn: async () => (await api.get('/student/dashboard', childParams)).data as Dashboard,
    enabled: !!childId,
  });

  const todayName = DAY_NAMES[new Date().getDay() === 0 ? 7 : new Date().getDay()];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Кабінет батька
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Успішність, розклад і завдання ваших дітей
      </Typography>

      <ChildSelectorField />

      {loadingSummary ? (
        <Skeleton variant="rounded" height={100} sx={{ mb: 3 }} />
      ) : summaries.length > 0 ? (
        <Grid container spacing={2} mb={3}>
          {summaries.map((s) => (
            <Grid key={s.child.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                variant={childId === s.child.id ? 'outlined' : undefined}
                sx={{
                  cursor: 'pointer',
                  borderColor: childId === s.child.id ? 'primary.main' : undefined,
                  borderWidth: childId === s.child.id ? 2 : undefined,
                }}
                onClick={() => setChildId(s.child.id)}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h6">
                        {s.child.lastName} {s.child.firstName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Клас {s.child.classGroup?.name ?? '—'}
                      </Typography>
                    </Box>
                    {s.alertCount > 0 && (
                      <Badge badgeContent={s.alertCount} color="error">
                        <WarningAmberIcon color="warning" />
                      </Badge>
                    )}
                  </Stack>
                  {s.summary && (
                    <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={`Сер. ${s.summary.overallAverage ?? '—'}`}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`ДЗ: ${s.summary.pendingHomework + s.summary.overdueHomework}`}
                        color={
                          s.summary.overdueHomework > 0
                            ? 'error'
                            : s.summary.pendingHomework > 0
                              ? 'warning'
                              : 'default'
                        }
                        variant="outlined"
                      />
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          До вашого облікового запису ще не прив’язано дітей. Зверніться до адміністратора школи.
        </Alert>
      )}

      {!childId && summaries.length > 0 && (
        <Alert severity="info">Оберіть дитину, щоб переглянути детальне зведення</Alert>
      )}

      {childId && isLoading && (
        <>
          <Skeleton variant="text" width={280} height={48} />
          <Grid container spacing={2} mt={1}>
            {[1, 2, 3, 4].map((i) => (
              <Grid key={i} size={{ xs: 6, md: 3 }}>
                <Skeleton variant="rounded" height={88} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {childId && data && (
        <>
          <Typography variant="h5" gutterBottom>
            {data.student.lastName} {data.student.firstName}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
            {data.student.classGroup && (
              <Chip label={`Клас ${data.student.classGroup.name}`} color="primary" />
            )}
            <Typography variant="body2" color="text.secondary">
              {todayName}, {format(new Date(), 'd MMMM yyyy', { locale: uk })}
            </Typography>
          </Stack>

          {data.alerts.length > 0 && (
            <Stack spacing={1} mb={2}>
              {data.alerts.map((a) => (
                <Alert key={a.type + a.title} severity={a.severity}>
                  {a.title}
                </Alert>
              ))}
            </Stack>
          )}

          {data.summary && (
            <>
              <Grid container spacing={2} mb={2}>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" color="primary.main">
                        {data.summary.lessonsToday}
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
                      <Typography variant="h4">{data.summary.overallAverage ?? '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Середній бал
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant="h4"
                        color={data.summary.overdueHomework > 0 ? 'error.main' : undefined}
                      >
                        {data.summary.overdueHomework}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Прострочено ДЗ
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4">{data.summary.pendingHomework}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ДЗ до здачі
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4">{data.summary.absencesWeek ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Відсутності / тижд.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
                <Button
                  component={RouterLink}
                  to={pathWithChild('/parent/homework')}
                  variant="contained"
                  startIcon={<AssignmentIcon />}
                >
                  Домашні завдання
                </Button>
                <Button
                  component={RouterLink}
                  to={pathWithChild('/parent/grades')}
                  variant="outlined"
                  startIcon={<GradeIcon />}
                >
                  Оцінки
                </Button>
                <Button
                  component={RouterLink}
                  to={pathWithChild('/parent/schedule')}
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                >
                  Розклад
                </Button>
                <Button
                  component={RouterLink}
                  to={pathWithChild('/parent/materials')}
                  variant="outlined"
                  startIcon={<MenuBookIcon />}
                >
                  Матеріали
                </Button>
                <Button
                  component={RouterLink}
                  to={pathWithChild('/parent/quizzes')}
                  variant="outlined"
                  startIcon={<QuizIcon />}
                >
                  Тести
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
                            secondary={`${h.subject.name} · ${format(new Date(h.dueDate), 'd MMM', { locale: uk })}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  <Button
                    component={RouterLink}
                    to={pathWithChild('/parent/homework')}
                    size="small"
                    sx={{ mt: 1 }}
                  >
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
                  <Button
                    component={RouterLink}
                    to={pathWithChild('/parent/grades')}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Усі оцінки
                  </Button>
                </Grid>

                {data.upcomingEvents.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom>
                      Події
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {data.upcomingEvents.map((e) => (
                        <Chip
                          key={e.id}
                          icon={e.isHoliday ? <BeachAccessIcon /> : undefined}
                          label={`${e.title} · ${format(new Date(e.startDate), 'd MMM', { locale: uk })}`}
                          variant="outlined"
                          component={RouterLink}
                          to={pathWithChild('/events')}
                          clickable
                        />
                      ))}
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </>
      )}
    </Box>
  );
}
