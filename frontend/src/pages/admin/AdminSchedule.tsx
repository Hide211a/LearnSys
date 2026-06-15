import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Alert,
  Tabs,
  Tab,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import api from '../../api/client';
import { ScheduleGrid, SCHEDULE_DAYS, type ScheduleSlotView } from '../../components/ScheduleGrid';
import { ScheduleCombinedGrid } from '../../components/ScheduleCombinedGrid';
import { useToast } from '../../context/ToastContext';

type Slot = ScheduleSlotView & {
  subjectId: string;
  teacherId: string;
  classGroupId: string;
  classGroup: { id: string; name: string };
};

type Assignment = {
  id: string;
  teacherId: string;
  subjectId: string;
  classGroupId: string;
  teacher: { id: string; firstName: string; lastName: string };
  subject: { id: string; name: string; code?: string };
  classGroup: { id: string; name: string };
};

type ScheduleForm = {
  classGroupId: string;
  dayOfWeek: number;
  lessonNumber: number;
  subjectId: string;
  teacherId: string;
  room: string;
  isSubstitution: boolean;
  note: string;
};

const emptyForm = (): ScheduleForm => ({
  classGroupId: '',
  dayOfWeek: 1,
  lessonNumber: 1,
  subjectId: '',
  teacherId: '',
  room: '',
  isSubstitution: false,
  note: '',
});

function apiError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return String(err.response.data.error);
  }
  return fallback;
}

export default function AdminSchedule() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [viewTab, setViewTab] = useState(0);
  const [classGroupId, setClassGroupId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [allDayFilter, setAllDayFilter] = useState(0);
  const [allClassFilter, setAllClassFilter] = useState('');
  const [allViewMode, setAllViewMode] = useState<'combined' | 'grids'>('combined');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm());

  const byClass = viewTab === 0;
  const byTeacher = viewTab === 1;
  const allClasses = viewTab === 2;

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await api.get('/admin/classes')).data,
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ['users-teachers'],
    queryFn: async () => (await api.get('/admin/users', { params: { role: 'TEACHER' } })).data,
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => (await api.get('/admin/assignments')).data as Assignment[],
  });

  const filterId = byClass ? classGroupId : byTeacher ? teacherId : 'all';
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['schedule', byClass ? 'class' : byTeacher ? 'teacher' : 'all', filterId],
    queryFn: async () => {
      if (allClasses) return (await api.get('/admin/schedule')).data as Slot[];
      const params = byClass ? { classGroupId } : { teacherId };
      return (await api.get('/admin/schedule', { params })).data as Slot[];
    },
    enabled: allClasses || !!filterId,
  });

  const filteredAllSlots = useMemo(() => {
    if (!allClasses) return slots;
    return slots.filter((s) => {
      if (allDayFilter && s.dayOfWeek !== allDayFilter) return false;
      if (allClassFilter && s.classGroupId !== allClassFilter && s.classGroup?.id !== allClassFilter) {
        return false;
      }
      return true;
    });
  }, [slots, allClasses, allDayFilter, allClassFilter]);

  const displaySlots = allClasses ? filteredAllSlots : slots;

  const slotsByClass = useMemo(() => {
    if (!allClasses) return [];
    const map = new Map<string, { id: string; name: string; slots: Slot[] }>();
    for (const s of filteredAllSlots) {
      const id = s.classGroup?.id ?? s.classGroupId;
      const name = s.classGroup?.name ?? '—';
      if (!map.has(id)) map.set(id, { id, name, slots: [] });
      map.get(id)!.slots.push(s);
    }
    const order = new Map<string, number>(
      classes.map((c: { id: string }, i: number) => [c.id, i] as [string, number])
    );
    return Array.from(map.values()).sort((a, b) => {
      const diff = (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'uk');
    });
  }, [filteredAllSlots, allClasses, classes]);

  const classAssignments = useMemo(
    () => assignments.filter((a) => a.classGroupId === (form.classGroupId || classGroupId)),
    [assignments, form.classGroupId, classGroupId]
  );

  const classSubjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const a of classAssignments) {
      map.set(a.subject.id, { id: a.subject.id, name: a.subject.name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  }, [classAssignments]);

  const teachersForSubject = useMemo(() => {
    const map = new Map<string, { id: string; firstName: string; lastName: string }>();
    for (const a of classAssignments.filter((x) => x.subjectId === form.subjectId)) {
      map.set(a.teacher.id, a.teacher);
    }
    return Array.from(map.values());
  }, [classAssignments, form.subjectId]);

  const teacherClasses = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const a of assignments.filter((x) => x.teacherId === teacherId)) {
      map.set(a.classGroup.id, a.classGroup);
    }
    return Array.from(map.values());
  }, [assignments, teacherId]);

  const sortedSlots = useMemo(
    () =>
      [...displaySlots].sort(
        (a, b) =>
          a.dayOfWeek - b.dayOfWeek ||
          a.lessonNumber - b.lessonNumber ||
          (a.classGroup?.name ?? '').localeCompare(b.classGroup?.name ?? '', 'uk')
      ),
    [displaySlots]
  );

  const stats = useMemo(() => {
    const subs = displaySlots.filter((s) => s.isSubstitution).length;
    const rooms = new Set(displaySlots.map((s) => s.room).filter(Boolean));
    const classCount = allClasses
      ? new Set(displaySlots.map((s) => s.classGroup?.id ?? s.classGroupId)).size
      : 0;
    return { total: displaySlots.length, substitutions: subs, rooms: rooms.size, classCount };
  }, [displaySlots, allClasses]);

  useEffect(() => {
    if (!open || !form.subjectId || teachersForSubject.length !== 1) return;
    const only = teachersForSubject[0];
    if (form.teacherId !== only.id) {
      setForm((f) => ({ ...f, teacherId: only.id }));
    }
  }, [form.subjectId, teachersForSubject, open, form.teacherId]);

  const openCreate = (day?: number, lesson?: number, presetClassId?: string) => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      classGroupId: byClass ? classGroupId : presetClassId ?? allClassFilter ?? '',
      dayOfWeek: day ?? 1,
      lessonNumber: lesson ?? 1,
    });
    setOpen(true);
  };

  const openEdit = (gridSlot: ScheduleSlotView) => {
    const slot = (displaySlots as Slot[]).find((s) => s.id === gridSlot.id);
    if (!slot) return;
    setEditingId(slot.id);
    setForm({
      classGroupId: slot.classGroupId ?? slot.classGroup?.id ?? classGroupId,
      dayOfWeek: slot.dayOfWeek,
      lessonNumber: slot.lessonNumber,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      room: slot.room ?? '',
      isSubstitution: !!slot.isSubstitution,
      note: slot.note ?? '',
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        classGroupId: form.classGroupId || classGroupId,
        dayOfWeek: form.dayOfWeek,
        lessonNumber: form.lessonNumber,
        subjectId: form.subjectId,
        teacherId: form.teacherId,
        room: form.room,
        isSubstitution: form.isSubstitution,
        note: form.note,
      };
      return editingId
        ? api.patch(`/admin/schedule/${editingId}`, payload)
        : api.post('/admin/schedule', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setOpen(false);
      showToast(editingId ? 'Урок оновлено' : 'Урок додано', 'success');
    },
    onError: (err) => showToast(apiError(err, 'Помилка збереження'), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/schedule/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setOpen(false);
      showToast('Урок видалено', 'success');
    },
    onError: () => showToast('Не вдалося видалити', 'error'),
  });

  const selectedClassName = classes.find((c: { id: string }) => c.id === classGroupId)?.name;
  const selectedTeacher = teachers.find((t: { id: string }) => t.id === teacherId);

  const dialogClassId = form.classGroupId || (byClass ? classGroupId : '');
  const hasAssignmentsForClass = classAssignments.length > 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Розклад занять
      </Typography>

      <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)} sx={{ mb: 2 }}>
        <Tab label="За класом" />
        <Tab label="За вчителем" />
        <Tab label="Усі класи" />
      </Tabs>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center">
          {byClass && (
            <TextField
              select
              label="Клас"
              value={classGroupId}
              onChange={(e) => setClassGroupId(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
              size="small"
            >
              {classes.map((c: { id: string; name: string; grade: number }) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} ({c.grade} клас)
                </MenuItem>
              ))}
            </TextField>
          )}
          {byTeacher && (
            <TextField
              select
              label="Вчитель"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 260 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
              size="small"
            >
              {teachers.map((t: { id: string; lastName: string; firstName: string }) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.lastName} {t.firstName}
                </MenuItem>
              ))}
            </TextField>
          )}
          {allClasses && (
            <>
              <TextField
                select
                label="День"
                value={allDayFilter}
                onChange={(e) => setAllDayFilter(Number(e.target.value))}
                sx={{ minWidth: { xs: '100%', sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
                size="small"
              >
                <MenuItem value={0}>Усі дні</MenuItem>
                {SCHEDULE_DAYS.slice(1).map((label, i) => (
                  <MenuItem key={label} value={i + 1}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Клас"
                value={allClassFilter}
                onChange={(e) => setAllClassFilter(e.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
                size="small"
              >
                <MenuItem value="">Усі класи</MenuItem>
                {classes.map((c: { id: string; name: string }) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <ToggleButtonGroup
                size="small"
                value={allViewMode}
                exclusive
                onChange={(_, v) => v && setAllViewMode(v)}
              >
                <ToggleButton value="combined">
                  <ViewModuleIcon sx={{ mr: 0.5 }} fontSize="small" />
                  Зведена сітка
                </ToggleButton>
                <ToggleButton value="grids">
                  <TableRowsIcon sx={{ mr: 0.5 }} fontSize="small" />
                  По класах
                </ToggleButton>
              </ToggleButtonGroup>
            </>
          )}

          {(allClasses || filterId) && (
            <>
              <Chip label={`${stats.total} уроків`} color="primary" variant="outlined" />
              {allClasses && stats.classCount > 0 && (
                <Chip label={`${stats.classCount} класів`} variant="outlined" />
              )}
              {stats.substitutions > 0 && (
                <Chip label={`${stats.substitutions} замін`} color="warning" size="small" />
              )}
              <Button variant="contained" onClick={() => openCreate()} disabled={byClass && !hasAssignmentsForClass}>
                Додати урок
              </Button>
            </>
          )}
        </Stack>

        {byClass && classGroupId && !hasAssignmentsForClass && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            У класі {selectedClassName} немає призначень вчитель–предмет.{' '}
            <Button component={RouterLink} to="/admin/assignments" size="small">
              Додати призначення
            </Button>
          </Alert>
        )}

        {(allClasses || filterId) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {byClass &&
              'Клік по уроку — редагування. Клік по «+» у порожній клітинці — новий урок.'}
            {byTeacher &&
              `Розклад вчителя ${selectedTeacher?.lastName ?? ''} ${selectedTeacher?.firstName ?? ''}. Клік по уроку — редагування.`}
            {allClasses &&
              (allViewMode === 'combined'
                ? 'У кожній клітинці — уроки всіх класів на цей час. Клік по блоку — редагування.'
                : 'Окремі сітки для кожного класу. Клік по уроку — редагування.')}
          </Typography>
        )}
      </Paper>

      {!allClasses && !filterId && (
        <Alert severity="info">Оберіть {byClass ? 'клас' : 'вчителя'}, щоб переглянути та редагувати розклад.</Alert>
      )}

      {allClasses && !isLoading && displaySlots.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Розклад порожній або немає уроків за обраними фільтрами.
        </Alert>
      )}

      {(allClasses || filterId) && !isLoading && (
        <>
          {allClasses && allViewMode === 'combined' && (
            <ScheduleCombinedGrid slots={filteredAllSlots} onSlotClick={openEdit} />
          )}

          {allClasses && allViewMode === 'grids' && (
            <Stack spacing={3}>
              {slotsByClass.length === 0 ? (
                <Typography color="text.secondary">Немає даних для відображення</Typography>
              ) : (
                slotsByClass.map((group) => (
                  <Box key={group.id}>
                    <Typography variant="h6" gutterBottom>
                      {group.name}
                      <Chip label={`${group.slots.length} уроків`} size="small" sx={{ ml: 1 }} />
                    </Typography>
                    <ScheduleGrid slots={group.slots} onSlotClick={openEdit} />
                  </Box>
                ))
              )}
            </Stack>
          )}

          {!allClasses && (
            <ScheduleGrid
              slots={slots}
              showClass={byTeacher}
              onSlotClick={openEdit}
              onEmptyCellClick={byClass && hasAssignmentsForClass ? (d, l) => openCreate(d, l) : undefined}
            />
          )}

          {sortedSlots.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                {allClasses ? 'Повний список уроків' : 'Список уроків'}
              </Typography>
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>День</TableCell>
                      <TableCell>Урок</TableCell>
                      {(allClasses || byTeacher) && <TableCell>Клас</TableCell>}
                      <TableCell>Предмет</TableCell>
                      <TableCell>Вчитель</TableCell>
                      <TableCell>Кабінет</TableCell>
                      <TableCell width={88} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedSlots.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell>{SCHEDULE_DAYS[s.dayOfWeek]}</TableCell>
                        <TableCell>{s.lessonNumber}</TableCell>
                        {(allClasses || byTeacher) && (
                          <TableCell>{(s as Slot).classGroup?.name ?? '—'}</TableCell>
                        )}
                        <TableCell>{s.subject.name}</TableCell>
                        <TableCell>
                          {s.teacher
                            ? `${s.teacher.lastName} ${s.teacher.firstName}`
                            : '—'}
                        </TableCell>
                        <TableCell>{s.room ?? '—'}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => openEdit(s)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (window.confirm('Видалити цей урок з розкладу?')) {
                                remove.mutate(s.id);
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Редагувати урок' : 'Новий урок'}</DialogTitle>
        <DialogContent>
          {(allClasses || byTeacher) && !editingId && (
            <TextField
              select
              fullWidth
              label="Клас"
              value={form.classGroupId}
              onChange={(e) =>
                setForm({
                  ...emptyForm(),
                  classGroupId: e.target.value,
                  dayOfWeek: form.dayOfWeek,
                  lessonNumber: form.lessonNumber,
                })
              }
              margin="normal"
              required
            >
              {(allClasses ? classes : teacherClasses).map((c: { id: string; name: string }) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            fullWidth
            label="День тижня"
            value={form.dayOfWeek}
            onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
            margin="normal"
          >
            {SCHEDULE_DAYS.slice(1).map((label, i) => (
              <MenuItem key={label} value={i + 1}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            type="number"
            label="Номер уроку"
            value={form.lessonNumber}
            onChange={(e) => setForm({ ...form, lessonNumber: Number(e.target.value) })}
            margin="normal"
            inputProps={{ min: 1, max: 8 }}
          />

          <TextField
            select
            fullWidth
            label="Предмет"
            value={form.subjectId}
            onChange={(e) => setForm({ ...form, subjectId: e.target.value, teacherId: '' })}
            margin="normal"
            disabled={!dialogClassId}
            helperText={
              dialogClassId && classSubjects.length === 0
                ? 'Спочатку додайте призначення вчителя на предмет'
                : undefined
            }
          >
            {classSubjects.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Вчитель"
            value={form.teacherId}
            onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            margin="normal"
            disabled={!form.subjectId}
          >
            {teachersForSubject.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.lastName} {t.firstName}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Кабінет"
            value={form.room}
            onChange={(e) => setForm({ ...form, room: e.target.value })}
            margin="normal"
            placeholder="напр. 12"
          />

          <TextField
            fullWidth
            label="Примітка"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            placeholder="Додаткова інформація (необов’язково)"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={form.isSubstitution}
                onChange={(e) => setForm({ ...form, isSubstitution: e.target.checked })}
              />
            }
            label="Заміна (тимчасово інший вчитель)"
          />
        </DialogContent>
        <DialogActions>
          {editingId && (
            <Button
              color="error"
              onClick={() => {
                if (window.confirm('Видалити урок?')) remove.mutate(editingId);
              }}
              sx={{ mr: 'auto' }}
            >
              Видалити
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={() => save.mutate()}
            disabled={
              !form.subjectId ||
              !form.teacherId ||
              !((byClass && (form.classGroupId || classGroupId)) || (!byClass && form.classGroupId))
            }
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
