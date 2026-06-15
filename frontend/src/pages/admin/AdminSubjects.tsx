import { Fragment, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  InputAdornment,
  Collapse,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LinkIcon from '@mui/icons-material/Link';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

type SubjectAssignment = {
  id: string;
  teacher: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string; grade: number };
};

type SubjectRow = {
  id: string;
  name: string;
  code: string;
  assignments: SubjectAssignment[];
  _count: {
    assignments: number;
    homework: number;
    scheduleSlots: number;
    quizzes: number;
    lessonRecords: number;
  };
};

const PRESET_SUBJECTS = [
  { name: 'Українська мова', code: 'UKR' },
  { name: 'Математика', code: 'MATH' },
  { name: 'Англійська мова', code: 'ENG' },
  { name: 'Історія України', code: 'HIST' },
  { name: 'Географія', code: 'GEO' },
  { name: 'Біологія', code: 'BIO' },
  { name: 'Фізика', code: 'PHYS' },
  { name: 'Хімія', code: 'CHEM' },
  { name: 'Інформатика', code: 'INFO' },
  { name: 'Фізична культура', code: 'PE' },
];

export default function AdminSubjects() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<SubjectRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await api.get('/admin/subjects')).data as SubjectRow[],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [subjects, search]);

  const summary = useMemo(() => {
    const withTeachers = subjects.filter((s) => s._count.assignments > 0).length;
    const totalAssignments = subjects.reduce((n, s) => n + s._count.assignments, 0);
    return { total: subjects.length, withTeachers, totalAssignments };
  }, [subjects]);

  const create = useMutation({
    mutationFn: (payload: { name: string; code: string }) => api.post('/admin/subjects', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      setOpen(false);
      setName('');
      setCode('');
      showToast('Предмет додано', 'success');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      showToast(err.response?.data?.error ?? 'Не вдалося створити предмет', 'error');
    },
  });

  const update = useMutation({
    mutationFn: ({ id, name, code }: { id: string; name: string; code: string }) =>
      api.patch(`/admin/subjects/${id}`, { name, code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      setEditSubject(null);
      showToast('Предмет оновлено', 'success');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      showToast(err.response?.data?.error ?? 'Не вдалося оновити', 'error');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/subjects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      showToast('Предмет видалено', 'info');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      showToast(err.response?.data?.error ?? 'Не вдалося видалити', 'error');
    },
  });

  const openEdit = (s: SubjectRow) => {
    setEditSubject(s);
    setName(s.name);
    setCode(s.code);
  };

  const saveEdit = () => {
    if (!editSubject) return;
    update.mutate({ id: editSubject.id, name: name.trim(), code: code.trim().toUpperCase() });
  };

  const addPreset = (preset: { name: string; code: string }) => {
    if (subjects.some((s) => s.code === preset.code)) {
      showToast(`Предмет ${preset.code} вже є в довіднику`, 'warning');
      return;
    }
    create.mutate(preset);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4">Предмети</Typography>
          <Typography variant="body2" color="text.secondary">
            Довідник предметів школи та зв&apos;язок з вчителями й класами
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<MenuBookIcon />} onClick={() => { setName(''); setCode(''); setOpen(true); }}>
          Додати предмет
        </Button>
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{summary.total}</Typography>
              <Typography variant="body2" color="text.secondary">Усього предметів</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{summary.withTeachers}</Typography>
              <Typography variant="body2" color="text.secondary">З призначеними вчителями</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{summary.totalAssignments}</Typography>
              <Typography variant="body2" color="text.secondary">Призначень (клас+вчитель)</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TextField
        fullWidth
        size="small"
        placeholder="Пошук за назвою або кодом..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Швидко додати типові предмети:{' '}
        {PRESET_SUBJECTS.map((p) => (
          <Chip
            key={p.code}
            label={p.code}
            size="small"
            sx={{ mx: 0.25, my: 0.25 }}
            onClick={() => addPreset(p)}
            disabled={subjects.some((s) => s.code === p.code)}
          />
        ))}
      </Alert>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>Назва</TableCell>
              <TableCell width={100}>Код</TableCell>
              <TableCell>Хто веде (клас · вчитель)</TableCell>
              <TableCell>Активність</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>Завантаження...</TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" py={2}>
                    Предметів не знайдено
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => (
              <Fragment key={s.id}>
                <TableRow hover>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      disabled={s.assignments.length === 0}
                    >
                      {expandedId === s.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{s.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={s.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {s.assignments.length === 0 ? (
                      <Chip label="Немає вчителів" size="small" color="warning" variant="outlined" />
                    ) : (
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {s.assignments.slice(0, 4).map((a) => (
                          <Chip
                            key={a.id}
                            size="small"
                            label={`${a.classGroup.name} · ${a.teacher.lastName}`}
                            title={`${a.classGroup.name} — ${a.teacher.lastName} ${a.teacher.firstName}`}
                          />
                        ))}
                        {s.assignments.length > 4 && (
                          <Chip size="small" label={`+${s.assignments.length - 4}`} />
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      Призначень: {s._count.assignments}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      ДЗ: {s._count.homework} · Уроки в розкладі: {s._count.scheduleSlots}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Призначити вчителя">
                      <IconButton
                        size="small"
                        color="primary"
                        component={RouterLink}
                        to={`/admin/assignments?subjectId=${s.id}`}
                      >
                        <LinkIcon />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => openEdit(s)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => remove.mutate(s.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                    <Collapse in={expandedId === s.id}>
                      <Box py={2} px={2} bgcolor="action.hover" borderRadius={1} mb={1}>
                        <Typography variant="subtitle2" gutterBottom>
                          Деталі предмета «{s.name}»
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" fontWeight={600}>
                              Вчителі та класи
                            </Typography>
                            {s.assignments.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                Немає призначень.{' '}
                                <Button
                                  component={RouterLink}
                                  to={`/admin/assignments?subjectId=${s.id}`}
                                  size="small"
                                >
                                  Призначити вчителя
                                </Button>
                              </Typography>
                            ) : (
                              <Table size="small" sx={{ mt: 1 }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Клас</TableCell>
                                    <TableCell>Вчитель</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {s.assignments.map((a) => (
                                    <TableRow key={a.id}>
                                      <TableCell>{a.classGroup.name}</TableCell>
                                      <TableCell>
                                        {a.teacher.lastName} {a.teacher.firstName}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" fontWeight={600}>
                              Статистика використання
                            </Typography>
                            <Typography variant="body2" mt={1}>
                              Записів у журналі: {s._count.lessonRecords}
                            </Typography>
                            <Typography variant="body2">Домашніх завдань: {s._count.homework}</Typography>
                            <Typography variant="body2">Тестів: {s._count.quizzes}</Typography>
                            <Typography variant="body2">Уроків у розкладі: {s._count.scheduleSlots}</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Створення */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новий предмет</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Назва предмета"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            placeholder="Наприклад, Математика"
          />
          <TextField
            fullWidth
            label="Код (латиницею)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            margin="normal"
            placeholder="MATH"
            helperText="Унікальний короткий код, наприклад UKR, MATH"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={() => create.mutate({ name: name.trim(), code: code.trim().toUpperCase() })}
            disabled={!name.trim() || !code.trim()}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      {/* Редагування */}
      <Dialog open={!!editSubject} onClose={() => setEditSubject(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Редагувати предмет</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Назва" value={name} onChange={(e) => setName(e.target.value)} margin="normal" />
          <TextField
            fullWidth
            label="Код"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSubject(null)}>Скасувати</Button>
          <Button variant="contained" onClick={saveEdit} disabled={!name.trim() || !code.trim()}>
            Зберегти зміни
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
