import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LinkIcon from '@mui/icons-material/Link';
import EventIcon from '@mui/icons-material/Event';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';

type DashboardData = {
  stats: {
    classes: number;
    students: number;
    teachers: number;
    parents: number;
    subjects: number;
    assignments: number;
    scheduleSlots: number;
    unassignedStudents: number;
  };
  currentSchoolYear?: { name: string };
  classes: {
    id: string;
    name: string;
    grade: number;
    studentsCount: number;
    assignmentsCount: number;
  }[];
  warnings: {
    classesWithoutTeachers: { id: string; name: string }[];
    unassignedStudents: { id: string; firstName: string; lastName: string; email: string }[];
    teachersWithoutAssignments: { id: string; firstName: string; lastName: string }[];
  };
  upcomingEvents: {
    id: string;
    title: string;
    startDate: string;
    isHoliday: boolean;
    classGroup?: { name: string };
  }[];
};

const QUICK_ACTIONS = [
  { label: 'Додати клас', path: '/admin/classes', color: 'primary' as const },
  { label: 'Призначити вчителя', path: '/admin/assignments', color: 'secondary' as const },
  { label: 'Розклад', path: '/admin/schedule', color: 'primary' as const },
  { label: 'Користувачі', path: '/admin/users', color: 'inherit' as const },
];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await api.get('/admin/dashboard')).data as DashboardData,
  });

  const stats = data?.stats;
  const warnings = data?.warnings;
  const hasWarnings =
    (warnings?.classesWithoutTeachers.length ?? 0) > 0 ||
    (warnings?.unassignedStudents.length ?? 0) > 0 ||
    (warnings?.teachersWithoutAssignments.length ?? 0) > 0;

  const statCards = stats
    ? [
        { label: 'Класів', value: stats.classes, icon: <SchoolIcon />, path: '/admin/classes' },
        { label: 'Учнів', value: stats.students, icon: <PeopleIcon />, path: '/admin/users' },
        { label: 'Вчителів', value: stats.teachers, icon: <PeopleIcon />, path: '/admin/users' },
        { label: 'Предметів', value: stats.subjects, icon: <MenuBookIcon />, path: '/admin/subjects' },
        { label: 'Призначень', value: stats.assignments, icon: <LinkIcon />, path: '/admin/assignments' },
        { label: 'Уроків у розкладі', value: stats.scheduleSlots, icon: <EventIcon />, path: '/admin/schedule' },
      ]
    : [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Панель адміністратора
          </Typography>
          <Typography color="text.secondary">
            ЗЗСО «Кузьмівська гімназія»
            {data?.currentSchoolYear && (
              <>
                {' '}
                · навчальний рік <strong>{data.currentSchoolYear.name}</strong>
              </>
            )}
          </Typography>
        </Box>
        <Button component={RouterLink} to="/admin/school-years" variant="outlined" size="small">
          Навчальні роки
        </Button>
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 4, lg: 2 }}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {statCards.map((s) => (
            <Grid key={s.label} size={{ xs: 6, md: 4, lg: 2 }}>
              <Card
                component={RouterLink}
                to={s.path}
                sx={{
                  textDecoration: 'none',
                  height: '100%',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                <CardContent>
                  <Box color="primary.main" mb={0.5}>
                    {s.icon}
                  </Box>
                  <Typography variant="h4">{s.value}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Швидкі дії
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {QUICK_ACTIONS.map((a) => (
                <Button key={a.path} component={RouterLink} to={a.path} variant="contained" color={a.color}>
                  {a.label}
                </Button>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Класи
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Клас</TableCell>
                  <TableCell align="right">Учнів</TableCell>
                  <TableCell align="right">Вчителів (предметів)</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.classes ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="right">{c.studentsCount}</TableCell>
                    <TableCell align="right">
                      {c.assignmentsCount === 0 ? (
                        <Chip label="0" size="small" color="warning" />
                      ) : (
                        c.assignmentsCount
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={RouterLink}
                        to="/admin/classes"
                        size="small"
                      >
                        Відкрити
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          {hasWarnings && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.50', border: 1, borderColor: 'warning.light' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WarningAmberIcon color="warning" />
                <Typography variant="h6">Потребує уваги</Typography>
              </Box>
              {(warnings?.classesWithoutTeachers.length ?? 0) > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <AlertTitle>Класи без вчителів</AlertTitle>
                  {warnings!.classesWithoutTeachers.map((c) => c.name).join(', ')}
                  <Button component={RouterLink} to="/admin/assignments" size="small" sx={{ mt: 1, display: 'block' }}>
                    Призначити
                  </Button>
                </Alert>
              )}
              {(warnings?.teachersWithoutAssignments.length ?? 0) > 0 && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  <AlertTitle>Вчителі без предметів</AlertTitle>
                  {warnings!.teachersWithoutAssignments
                    .map((t) => `${t.lastName} ${t.firstName}`)
                    .join(', ')}
                </Alert>
              )}
              {(warnings?.unassignedStudents.length ?? 0) > 0 && (
                <Alert severity="info">
                  <AlertTitle>Учні без класу ({stats?.unassignedStudents})</AlertTitle>
                  <List dense disablePadding>
                    {warnings!.unassignedStudents.map((s) => (
                      <ListItem key={s.id} disablePadding>
                        <ListItemText
                          primary={`${s.lastName} ${s.firstName}`}
                          secondary={s.email}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button component={RouterLink} to="/admin/classes" size="small" sx={{ mt: 1 }}>
                    До класів
                  </Button>
                </Alert>
              )}
            </Paper>
          )}

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Найближчі події
            </Typography>
            {(data?.upcomingEvents ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Немає запланованих подій
              </Typography>
            ) : (
              <List dense>
                {data!.upcomingEvents.map((e) => (
                  <ListItem key={e.id} disablePadding sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {e.title}
                          {e.isHoliday && <Chip label="Канікули" size="small" color="success" />}
                        </Box>
                      }
                      secondary={
                        <>
                          {format(new Date(e.startDate), 'd MMMM yyyy', { locale: uk })}
                          {e.classGroup ? ` · ${e.classGroup.name}` : ' · вся школа'}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
            <Button component={RouterLink} to="/admin/events" size="small" sx={{ mt: 1 }}>
              Усі події
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
