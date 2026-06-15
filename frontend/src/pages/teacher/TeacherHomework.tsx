import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert,
  Stack,
} from '@mui/material';
import { format, isPast } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

const STATUS_UK: Record<string, string> = {
  NOT_SUBMITTED: 'Не здано',
  SUBMITTED: 'На перевірці',
  RETURNED: 'Повернуто',
  GRADED: 'Оцінено',
};

type HomeworkRow = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  subject: { id: string; name: string };
  classGroup: { id: string; name: string };
  pendingReview?: number;
};

export default function TeacherHomework() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState(0);
  const [classFilter, setClassFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState<string | null>(null);
  const [reviewGrade, setReviewGrade] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const { data: list = [] } = useQuery({
    queryKey: ['teacher-hw'],
    queryFn: async () => (await api.get('/teacher/homework')).data as HomeworkRow[],
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ['my-classes'],
    queryFn: async () => (await api.get('/teacher/my-classes')).data,
  });

  const { data: subs = [] } = useQuery({
    queryKey: ['subs', subsOpen],
    queryFn: async () => (await api.get(`/teacher/homework/${subsOpen}/submissions`)).data,
    enabled: !!subsOpen,
  });

  const filtered = useMemo(() => {
    let items = list;
    if (classFilter) {
      items = items.filter((h) => h.classGroup.id === classFilter);
    }
    if (tab === 1) {
      items = items.filter((h) => isPast(new Date(h.dueDate)));
    } else if (tab === 0) {
      items = items.filter((h) => !isPast(new Date(h.dueDate)));
    }
    return items;
  }, [list, classFilter, tab]);

  const pendingReviewCount = useMemo(
    () => list.reduce((sum, h) => sum + (h.pendingReview ?? 0), 0),
    [list]
  );

  const create = useMutation({
    mutationFn: () => api.post('/teacher/homework', { title, description, dueDate, classGroupId, subjectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-hw'] });
      qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      qc.invalidateQueries({ queryKey: ['my-classes'] });
      setOpen(false);
      showToast('Завдання створено', 'success');
    },
    onError: () => showToast('Помилка створення', 'error'),
  });

  const review = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: string; grade?: number; feedback?: string }) =>
      api.patch(`/teacher/submissions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subs'] });
      qc.invalidateQueries({ queryKey: ['teacher-hw'] });
      qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      showToast('Збережено', 'success');
    },
  });

  const subsPending = subs.filter((s: { status: string }) => s.status === 'SUBMITTED').length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h4">Домашні завдання</Typography>
          <Typography variant="body2" color="text.secondary">
            Створення, перевірка здач і контроль дедлайнів
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Створити завдання
        </Button>
      </Box>

      {pendingReviewCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Є здачі, які очікують перевірки. Відкрийте завдання → «Перевірити здачі».
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Активні" />
        <Tab label="Прострочені" />
        <Tab label="Усі" />
      </Tabs>

      <TextField
        select
        size="small"
        label="Клас"
        value={classFilter}
        onChange={(e) => setClassFilter(e.target.value)}
        sx={{ mb: 2, minWidth: 160 }}
      >
        <MenuItem value="">Усі класи</MenuItem>
        {(
          [...new Map(
            assignments.map((a: { classGroup: { id: string; name: string } }) => [
              a.classGroup.id,
              a.classGroup.name,
            ])
          ).entries()] as [string, string][]
        ).map(([id, name]) => (
          <MenuItem key={id} value={id}>
            {name}
          </MenuItem>
        ))}
      </TextField>

      {filtered.length === 0 && (
        <Typography color="text.secondary">Завдань не знайдено</Typography>
      )}

      {filtered.map((h) => {
        const overdue = isPast(new Date(h.dueDate));
        return (
          <Card key={h.id} sx={{ mb: 2, borderLeft: overdue ? 4 : 0, borderColor: 'error.main' }}>
            <CardContent>
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" mb={1}>
                <Typography variant="h6">{h.title}</Typography>
                {overdue && <Chip label="Дедлайн минув" size="small" color="error" />}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {h.subject.name} · {h.classGroup.name} · до{' '}
                {format(new Date(h.dueDate), 'd MMM yyyy, HH:mm', { locale: uk })}
              </Typography>
              {h.description && <Typography mt={1}>{h.description}</Typography>}
              <Stack direction="row" alignItems="center" gap={1} mt={1}>
                <Button size="small" variant="outlined" onClick={() => setSubsOpen(h.id)}>
                  Перевірити здачі
                </Button>
                {(h.pendingReview ?? 0) > 0 && (
                  <Chip label={`${h.pendingReview} на перевірці`} size="small" color="warning" />
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!subsOpen} onClose={() => setSubsOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Здачі
          {subsPending > 0 && (
            <Chip label={`${subsPending} на перевірці`} size="small" color="warning" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Учень</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Відповідь</TableCell>
                  <TableCell>Оцінка</TableCell>
                  <TableCell>Дії</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subs.map(
                  (s: {
                    id: string;
                    student: { lastName: string; firstName: string };
                    status: string;
                    content?: string;
                    grade?: number;
                  }) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.student.lastName} {s.student.firstName}
                      </TableCell>
                      <TableCell>
                        <Chip label={STATUS_UK[s.status] ?? s.status} size="small" />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>{s.content ?? '—'}</TableCell>
                      <TableCell>
                        {s.status === 'SUBMITTED' ? (
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 1, max: 12 }}
                            value={reviewGrade[s.id] ?? '10'}
                            onChange={(e) =>
                              setReviewGrade({ ...reviewGrade, [s.id]: e.target.value })
                            }
                            sx={{ width: 72 }}
                          />
                        ) : (
                          (s.grade ?? '—')
                        )}
                      </TableCell>
                      <TableCell>
                        {s.status === 'SUBMITTED' && (
                          <Stack direction="row" spacing={0.5}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() =>
                                review.mutate({
                                  id: s.id,
                                  status: 'GRADED',
                                  grade: Number(reviewGrade[s.id] ?? 10),
                                })
                              }
                            >
                              Оцінити
                            </Button>
                            <Button
                              size="small"
                              onClick={() =>
                                review.mutate({
                                  id: s.id,
                                  status: 'RETURNED',
                                  feedback: 'Допрацювати',
                                })
                              }
                            >
                              Повернути
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubsOpen(null)}>Закрити</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Нове завдання</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Опис"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            type="datetime-local"
            label="Дедлайн"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            fullWidth
            label="Клас"
            value={classGroupId}
            onChange={(e) => {
              setClassGroupId(e.target.value);
              setSubjectId('');
            }}
            margin="normal"
          >
            {(
              [...new Map(
                assignments.map((a: { classGroup: { id: string; name: string } }) => [
                  a.classGroup.id,
                  a.classGroup.name,
                ])
              ).entries()] as [string, string][]
            ).map(([id, name]) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Предмет"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            margin="normal"
            disabled={!classGroupId}
          >
            {assignments
              .filter((a: { classGroup: { id: string } }) => a.classGroup.id === classGroupId)
              .map((a: { subject: { id: string; name: string } }) => (
                <MenuItem key={a.subject.id} value={a.subject.id}>
                  {a.subject.name}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={() => create.mutate()}
            disabled={!title || !dueDate || !classGroupId || !subjectId}
          >
            Створити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
