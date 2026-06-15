import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  FormControlLabel,
  Checkbox,
  MenuItem,
  IconButton,
  Chip,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventIcon from '@mui/icons-material/Event';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  isHoliday: boolean;
  classGroupId?: string | null;
  classGroup?: { id: string; name: string; grade: number } | null;
};

type EventForm = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isHoliday: boolean;
  classGroupId: string;
};

const emptyForm = (): EventForm => ({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  isHoliday: false,
  classGroupId: '',
});

function toLocalInput(iso: string, dateOnly = false) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (dateOnly) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatEventRange(e: EventRow) {
  const start = new Date(e.startDate);
  const end = e.endDate ? new Date(e.endDate) : null;
  if (end && end.toDateString() !== start.toDateString()) {
    return `${format(start, 'd MMM yyyy', { locale: uk })} — ${format(end, 'd MMM yyyy', { locale: uk })}`;
  }
  if (e.isHoliday && !e.endDate) {
    return format(start, 'd MMMM yyyy', { locale: uk });
  }
  return format(start, e.isHoliday ? 'd MMMM yyyy' : 'd MMMM yyyy, HH:mm', { locale: uk });
}

function eventStatus(e: EventRow): 'past' | 'current' | 'upcoming' {
  const start = new Date(e.startDate);
  const end = e.endDate ? new Date(e.endDate) : start;
  const now = new Date();
  if (isPast(end) && !isWithinInterval(now, { start, end })) return 'past';
  if (isFuture(start)) return 'upcoming';
  if (isWithinInterval(now, { start, end: end > start ? end : start })) return 'current';
  return 'past';
}

function apiError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return String(err.response.data.error);
  }
  return fallback;
}

export default function AdminEvents() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm());

  const typeParam = tab === 1 ? 'holiday' : tab === 2 ? 'event' : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', typeParam, classFilter, search],
    queryFn: async () => {
      const { data: res } = await api.get('/admin/events', {
        params: {
          type: typeParam,
          classGroupId: classFilter,
          q: search.trim() || undefined,
        },
      });
      return res as {
        events: EventRow[];
        stats: { total: number; upcoming: number; holidays: number; past: number };
      };
    },
  });

  const events = data?.events ?? [];
  const stats = data?.stats;

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await api.get('/admin/classes')).data,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      const key = format(new Date(e.startDate), 'LLLL yyyy', { locale: uk });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  const openCreate = (presetHoliday = false) => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      isHoliday: presetHoliday,
      startDate: toLocalInput(new Date().toISOString(), presetHoliday),
    });
    setOpen(true);
  };

  const openEdit = (e: EventRow) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description ?? '',
      startDate: toLocalInput(e.startDate, e.isHoliday),
      endDate: e.endDate ? toLocalInput(e.endDate, e.isHoliday) : '',
      isHoliday: e.isHoliday,
      classGroupId: e.classGroupId ?? '',
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description,
        startDate: form.isHoliday
          ? new Date(form.startDate + 'T00:00:00').toISOString()
          : new Date(form.startDate).toISOString(),
        endDate: form.endDate
          ? new Date(
              form.isHoliday ? form.endDate + 'T23:59:59' : form.endDate
            ).toISOString()
          : null,
        isHoliday: form.isHoliday,
        classGroupId: form.classGroupId || null,
      };
      return editing
        ? api.patch(`/admin/events/${editing.id}`, payload)
        : api.post('/admin/events', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      qc.invalidateQueries({ queryKey: ['events-public'] });
      closeDialog();
      showToast(editing ? 'Подію оновлено' : 'Подію додано', 'success');
    },
    onError: (err) => showToast(apiError(err, 'Помилка збереження'), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      qc.invalidateQueries({ queryKey: ['events-public'] });
      showToast('Подію видалено', 'success');
    },
  });

  const statusChip = (e: EventRow) => {
    const s = eventStatus(e);
    if (s === 'current') return <Chip label="Зараз" size="small" color="success" />;
    if (s === 'upcoming') return <Chip label="Майбутня" size="small" color="primary" variant="outlined" />;
    return <Chip label="Минула" size="small" variant="outlined" />;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h4">Події та канікули</Typography>
          <Typography variant="body2" color="text.secondary">
            Календар школи: канікули, збори, олімпіади та інші події
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<BeachAccessIcon />} onClick={() => openCreate(true)}>
            Канікули
          </Button>
          <Button variant="contained" startIcon={<EventIcon />} onClick={() => openCreate(false)}>
            Подія
          </Button>
        </Stack>
      </Box>

      {stats && (
        <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
          <Chip label={`Усього: ${stats.total}`} />
          <Chip label={`Майбутніх: ${stats.upcoming}`} color="primary" variant="outlined" />
          <Chip label={`Канікули: ${stats.holidays}`} color="secondary" variant="outlined" />
          <Chip label={`Минулих: ${stats.past}`} variant="outlined" />
        </Stack>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Усі" />
        <Tab label="Канікули" />
        <Tab label="Події (не канікули)" />
      </Tabs>

      <Stack direction="row" flexWrap="wrap" gap={2} mb={2}>
        <TextField
          size="small"
          placeholder="Пошук за назвою..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="Аудиторія"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 180 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
        >
          <MenuItem value="all">Усі</MenuItem>
          <MenuItem value="school">Вся школа</MenuItem>
          {classes.map((c: { id: string; name: string }) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading && <Typography color="text.secondary">Завантаження...</Typography>}

      {!isLoading && events.length === 0 && (
        <Alert severity="info">
          Подій не знайдено. Додайте канікули або подію за допомогою кнопок вище.
        </Alert>
      )}

      {grouped.map(([month, monthEvents]) => (
        <Box key={month} mb={3}>
          <Typography variant="h6" sx={{ mb: 1, textTransform: 'capitalize' }}>
            {month}
          </Typography>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Назва</TableCell>
                  <TableCell>Дата</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Для кого</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell width={96} />
                </TableRow>
              </TableHead>
              <TableBody>
                {monthEvents.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{e.title}</Typography>
                      {e.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {e.description.length > 80
                            ? `${e.description.slice(0, 80)}…`
                            : e.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatEventRange(e)}</TableCell>
                    <TableCell>
                      {e.isHoliday ? (
                        <Chip icon={<BeachAccessIcon />} label="Канікули" size="small" color="secondary" />
                      ) : (
                        <Chip icon={<EventIcon />} label="Подія" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {e.classGroup ? (
                        <Chip label={e.classGroup.name} size="small" />
                      ) : (
                        <Chip label="Вся школа" size="small" color="primary" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{statusChip(e)}</TableCell>
                    <TableCell>
                      <Tooltip title="Редагувати">
                        <IconButton size="small" onClick={() => openEdit(e)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Видалити">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (window.confirm(`Видалити «${e.title}»?`)) remove.mutate(e.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      ))}

      <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing ? 'Редагувати' : form.isHoliday ? 'Нові канікули' : 'Нова подія'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Назва"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            margin="normal"
            required
            placeholder={form.isHoliday ? 'Зимові канікули' : 'Батьківські збори'}
          />
          <TextField
            fullWidth
            label="Опис"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            placeholder="Додаткова інформація (необов’язково)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isHoliday}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isHoliday: e.target.checked,
                    startDate: form.startDate
                      ? toLocalInput(
                          new Date(form.startDate).toISOString(),
                          e.target.checked
                        )
                      : '',
                  })
                }
              />
            }
            label="Канікули (період без занять)"
          />
          <TextField
            fullWidth
            type={form.isHoliday ? 'date' : 'datetime-local'}
            label={form.isHoliday ? 'Початок канікул' : 'Дата та час початку'}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            fullWidth
            type={form.isHoliday ? 'date' : 'datetime-local'}
            label={form.isHoliday ? 'Кінець канікул' : 'Кінець (опційно)'}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText={
              form.isHoliday
                ? 'Для канікул вкажіть період (наприклад, 27.10 — 02.11)'
                : 'Залиште порожнім для одноденної події'
            }
          />
          {!form.isHoliday && (
            <TextField
              select
              fullWidth
              label="Для кого"
              value={form.classGroupId}
              onChange={(e) => setForm({ ...form, classGroupId: e.target.value })}
              margin="normal"
            >
              <MenuItem value="">Вся школа</MenuItem>
              {classes.map((c: { id: string; name: string }) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          {form.isHoliday && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Канікули завжди стосуються всієї школи.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={() => save.mutate()}
            disabled={!form.title.trim() || !form.startDate}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
