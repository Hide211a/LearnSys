import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CampaignIcon from '@mui/icons-material/Campaign';
import QuizIcon from '@mui/icons-material/Quiz';
import { format, isPast } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  lastGrade: number | null;
  lastAttendance: string | null;
  lastTopic: string | null;
};

type ClassAssignment = {
  id: string;
  subject: { id: string; name: string; code: string };
  classGroup: { id: string; name: string; grade: number };
  students: StudentRow[];
  stats: {
    averageGrade: number | null;
    absentLessons: number;
    submissionsToReview: number;
    overdueHomework: number;
    lessonsPerWeek: number;
    studentCount: number;
  };
  activeHomework: { id: string; title: string; dueDate: string }[];
  scheduleToday: { lessonNumber: number; room: string | null }[];
};

const ATTENDANCE_UK: Record<string, string> = {
  PRESENT: 'Присутній',
  ABSENT: 'Відсутній',
  LATE: 'Запізнення',
  EXCUSED: 'Поважна',
};

function journalLink(classGroupId: string, subjectId: string) {
  return `/teacher/journal?classGroupId=${classGroupId}&subjectId=${subjectId}`;
}

function ClassCard({ assignment }: { assignment: ClassAssignment }) {
  const [expanded, setExpanded] = useState(false);
  const { classGroup, subject, stats, students, activeHomework, scheduleToday } = assignment;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {subject.code}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {classGroup.name}
            </Typography>
            <Typography variant="subtitle1" color="primary">
              {subject.name}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            {classGroup.grade}
          </Avatar>
        </Box>

        <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
          <Chip size="small" label={`${stats.studentCount} учнів`} />
          {stats.averageGrade != null && (
            <Chip size="small" color="primary" variant="outlined" label={`Сер. бал: ${stats.averageGrade}`} />
          )}
          <Chip size="small" variant="outlined" label={`${stats.lessonsPerWeek} ур./тиждень`} />
          {stats.submissionsToReview > 0 && (
            <Chip size="small" color="warning" label={`На перевірці: ${stats.submissionsToReview}`} />
          )}
          {stats.overdueHomework > 0 && (
            <Chip size="small" color="error" label={`Прострочено: ${stats.overdueHomework}`} />
          )}
        </Stack>

        {scheduleToday.length > 0 && (
          <Box mb={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
            <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
              Сьогодні в розкладі
            </Typography>
            {scheduleToday.map((s) => (
              <Typography key={s.lessonNumber} variant="body2">
                {s.lessonNumber} урок{s.room ? ` · каб. ${s.room}` : ''}
              </Typography>
            ))}
          </Box>
        )}

        {activeHomework.length > 0 && (
          <Box mb={2}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Активні завдання
            </Typography>
            <List dense disablePadding>
              {activeHomework.map((hw) => (
                <ListItem key={hw.id} disableGutters sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={hw.title}
                    secondary={format(new Date(hw.dueDate), "d MMM, HH:mm", { locale: uk })}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      color: isPast(new Date(hw.dueDate)) ? 'error' : 'text.secondary',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
          <Button
            component={RouterLink}
            to={journalLink(classGroup.id, subject.id)}
            size="small"
            variant="contained"
            startIcon={<MenuBookIcon />}
          >
            Журнал
          </Button>
          <Button
            component={RouterLink}
            to="/teacher/homework"
            size="small"
            variant="outlined"
            startIcon={<AssignmentIcon />}
          >
            ДЗ
          </Button>
          <Button
            component={RouterLink}
            to="/teacher/materials"
            size="small"
            variant="outlined"
            startIcon={<AttachFileIcon />}
          >
            Матеріали
          </Button>
          <Button
            component={RouterLink}
            to="/announcements"
            size="small"
            variant="outlined"
            startIcon={<CampaignIcon />}
          >
            Оголошення
          </Button>
          <Button
            component={RouterLink}
            to="/teacher/quizzes"
            size="small"
            variant="outlined"
            startIcon={<QuizIcon />}
          >
            Тести
          </Button>
        </Stack>

        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ mt: 0.5 }}
        >
          {expanded ? 'Сховати учнів' : `Список учнів (${students.length})`}
        </Button>

        <Collapse in={expanded}>
          <Paper variant="outlined" sx={{ mt: 1, maxHeight: 320, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Учень</TableCell>
                  <TableCell align="center">Оцінка</TableCell>
                  <TableCell>Відвідуваність</TableCell>
                  <TableCell>Остання тема</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      {s.lastName} {s.firstName}
                    </TableCell>
                    <TableCell align="center">
                      {s.lastGrade != null ? (
                        <Chip label={s.lastGrade} size="small" color="primary" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {s.lastAttendance ? ATTENDANCE_UK[s.lastAttendance] ?? s.lastAttendance : '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Typography variant="caption" noWrap title={s.lastTopic ?? ''}>
                        {s.lastTopic || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function TeacherClasses() {
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['my-classes'],
    queryFn: async () => (await api.get('/teacher/my-classes')).data as ClassAssignment[],
  });

  const summary = useMemo(() => {
    const uniqueStudents = new Set<string>();
    let toReview = 0;
    let overdue = 0;
    for (const a of classes) {
      a.students?.forEach((s) => uniqueStudents.add(s.id));
      toReview += a.stats?.submissionsToReview ?? 0;
      overdue += a.stats?.overdueHomework ?? 0;
    }
    return {
      classCount: classes.length,
      studentCount: uniqueStudents.size,
      toReview,
      overdue,
    };
  }, [classes]);

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Мої класи
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Огляд класів, учнів та швидкий доступ до журналу, завдань і матеріалів
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{summary.classCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Предметів / класів
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{summary.studentCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Учнів загалом
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ borderColor: summary.toReview ? 'warning.main' : undefined, borderWidth: summary.toReview ? 1 : 0, borderStyle: 'solid' }}>
            <CardContent>
              <Typography variant="h4" color={summary.toReview ? 'warning.main' : undefined}>
                {summary.toReview}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Здач на перевірці
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ borderColor: summary.overdue ? 'error.main' : undefined, borderWidth: summary.overdue ? 1 : 0, borderStyle: 'solid' }}>
            <CardContent>
              <Typography variant="h4" color={summary.overdue ? 'error.main' : undefined}>
                {summary.overdue}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Прострочених ДЗ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {classes.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Alert severity="warning" sx={{ textAlign: 'left' }}>
            <Typography fontWeight={600} gutterBottom>
              Немає призначених класів
            </Typography>
            <Typography variant="body2">
              Якщо адміністратор уже створив клас (наприклад, 7-й), він <strong>не з’явиться автоматично</strong>.
              Потрібно: <strong>Адмін → Класи → іконка посилання</strong> біля класу → обрати вас як вчителя та предмет.
            </Typography>
          </Alert>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {classes.map((a) => (
            <Grid key={a.id} size={{ xs: 12, lg: 6 }}>
              <ClassCard assignment={a} />
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">
        Підказка: натисніть «Журнал» на картці класу — відкриється журнал із уже обраним класом і предметом.
      </Typography>
    </Box>
  );
}
