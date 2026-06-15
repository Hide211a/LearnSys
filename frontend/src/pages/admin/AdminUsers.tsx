import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Alert,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

const ROLES = ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'] as const;
const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Учні',
  TEACHER: 'Вчителі',
  PARENT: 'Батьки',
  ADMIN: 'Адміністратори',
};

type TeacherAssignment = {
  id: string;
  subject: { id: string; name: string; code: string };
  classGroup: { id: string; name: string; grade: number };
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  email: string;
  classGroupId?: string;
  classGroup?: { name: string; grade?: number };
  taughtAssignments?: TeacherAssignment[];
};

function sortStudentsByClass(a: UserRow, b: UserRow) {
  const gradeA = a.classGroup?.grade ?? 999;
  const gradeB = b.classGroup?.grade ?? 999;
  if (gradeA !== gradeB) return gradeA - gradeB;
  const byClass = (a.classGroup?.name ?? 'яяя').localeCompare(b.classGroup?.name ?? 'яяя', 'uk');
  if (byClass !== 0) return byClass;
  const byLast = a.lastName.localeCompare(b.lastName, 'uk');
  if (byLast !== 0) return byLast;
  return a.firstName.localeCompare(b.firstName, 'uk');
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: 'password123',
    firstName: '',
    lastName: '',
    patronymic: '',
    role: 'STUDENT',
    classGroupId: '',
  });

  const role = ROLES[tab];
  const isTeacherTab = tab === 1;
  const isStudentTab = tab === 0;
  const isParentTab = tab === 2;
  const [linkParent, setLinkParent] = useState<UserRow | null>(null);
  const [linkChildId, setLinkChildId] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users', role],
    queryFn: async () => (await api.get('/admin/users', { params: { role } })).data as UserRow[],
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await api.get('/admin/classes')).data,
  });
  const { data: allStudents = [] } = useQuery({
    queryKey: ['users', 'STUDENT'],
    queryFn: async () => (await api.get('/admin/users', { params: { role: 'STUDENT' } })).data as UserRow[],
    enabled: isParentTab,
  });
  const { data: parentChildren = [], refetch: refetchChildren } = useQuery({
    queryKey: ['parent-children', linkParent?.id],
    queryFn: async () =>
      (await api.get(`/admin/users/${linkParent!.id}/children`)).data as {
        id: string;
        firstName: string;
        lastName: string;
        classGroup?: { name: string };
      }[],
    enabled: !!linkParent,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            u.firstName.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q) ||
            (u.classGroup?.name?.toLowerCase().includes(q) ?? false) ||
            (u.patronymic?.toLowerCase().includes(q) ?? false)
        )
      : users;
    if (isStudentTab) list = [...list].sort(sortStudentsByClass);
    return list;
  }, [users, search, isStudentTab]);

  const create = useMutation({
    mutationFn: () => api.post('/admin/users', { ...form, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setOpen(false);
      showToast('Користувача створено', 'success');
    },
    onError: () => showToast('Не вдалося створити (перевірте email)', 'error'),
  });

  const update = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {
        firstName: form.firstName,
        lastName: form.lastName,
        patronymic: form.patronymic,
        email: form.email,
      };
      if (form.password) payload.password = form.password;
      if (isStudentTab) payload.classGroupId = form.classGroupId || '';
      return api.patch(`/admin/users/${editUser!.id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
      showToast('Збережено', 'success');
    },
    onError: () => showToast('Помилка збереження', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      showToast('Користувача видалено', 'success');
    },
    onError: () => showToast('Не вдалося видалити', 'error'),
  });

  const linkChild = useMutation({
    mutationFn: () =>
      api.post(`/admin/users/${linkParent!.id}/children`, { childId: linkChildId }),
    onSuccess: () => {
      refetchChildren();
      setLinkChildId('');
      showToast('Дитину прив’язано', 'success');
    },
    onError: () => showToast('Не вдалося прив’язати', 'error'),
  });

  const unlinkChild = useMutation({
    mutationFn: (childId: string) =>
      api.delete(`/admin/users/${linkParent!.id}/children/${childId}`),
    onSuccess: () => {
      refetchChildren();
      showToast('Прив’язку знято', 'success');
    },
  });

  const openCreate = () => {
    setEditUser(null);
    setForm({
      email: '',
      password: 'password123',
      firstName: '',
      lastName: '',
      patronymic: '',
      role,
      classGroupId: '',
    });
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setForm({
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      patronymic: u.patronymic ?? '',
      role,
      classGroupId: u.classGroupId ?? '',
    });
  };

  const handleDelete = (u: UserRow) => {
    if (!window.confirm(`Видалити ${u.lastName} ${u.firstName}?`)) return;
    remove.mutate(u.id);
  };

  const thirdColumnLabel = isTeacherTab
    ? 'Предмети та класи'
    : isStudentTab
      ? 'Клас'
      : isParentTab
        ? 'Діти'
        : '—';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Typography variant="h4">Користувачі</Typography>
        <Button variant="contained" onClick={openCreate}>
          Додати
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); }} sx={{ mb: 2 }}>
        {ROLES.map((r) => (
          <Tab key={r} label={ROLE_LABELS[r]} />
        ))}
      </Tabs>

      <TextField
        fullWidth
        size="small"
        placeholder="Пошук за ПІБ або email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {isTeacherTab && (
        <Alert severity="info" sx={{ mb: 2 }}>
          У колонці «Предмети та класи» показано, що веде кожен вчитель. Щоб змінити — розділ{' '}
          <Button component={RouterLink} to="/admin/assignments" size="small">
            Призначення
          </Button>
        </Alert>
      )}
      {isParentTab && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Прив’яжіть учнів до облікового запису батька — тоді він бачитиме оцінки, ДЗ і розклад дитини.
        </Alert>
      )}

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ПІБ</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>{thirdColumnLabel}</TableCell>
              <TableCell width={96} />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {search ? 'Нічого не знайдено' : 'Немає користувачів'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    {u.lastName} {u.firstName}
                    {u.patronymic ? ` ${u.patronymic}` : ''}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {isTeacherTab ? (
                      <TeacherSubjectsCell assignments={u.taughtAssignments ?? []} />
                    ) : isStudentTab ? (
                      u.classGroup?.name ?? (
                        <Chip label="Без класу" size="small" color="warning" variant="outlined" />
                      )
                    ) : isParentTab ? (
                      <Button size="small" variant="outlined" onClick={() => setLinkParent(u)}>
                        Керувати дітьми
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(u)} aria-label="редагувати">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(u)} aria-label="видалити">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новий користувач — {ROLE_LABELS[role]}</DialogTitle>
        <DialogContent>
          <UserFormFields form={form} setForm={setForm} showClass={isStudentTab} classes={classes} />
          {role === 'TEACHER' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Після створення призначте предмети в розділі «Призначення».
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()}>
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!linkParent} onClose={() => setLinkParent(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Діти: {linkParent?.lastName} {linkParent?.firstName}
        </DialogTitle>
        <DialogContent>
          {parentChildren.length === 0 ? (
            <Typography color="text.secondary" mb={2}>
              Ще не прив’язано жодного учня
            </Typography>
          ) : (
            <Box mb={2}>
              {parentChildren.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.lastName} ${c.firstName}${c.classGroup ? ` (${c.classGroup.name})` : ''}`}
                  onDelete={() => unlinkChild.mutate(c.id)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          )}
          <TextField
            select
            fullWidth
            label="Додати учня"
            value={linkChildId}
            onChange={(e) => setLinkChildId(e.target.value)}
            margin="normal"
          >
            <MenuItem value="">Оберіть...</MenuItem>
            {allStudents
              .filter((s) => !parentChildren.some((c) => c.id === s.id))
              .map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.lastName} {s.firstName}
                  {s.classGroup ? ` · ${s.classGroup.name}` : ''}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkParent(null)}>Закрити</Button>
          <Button
            variant="contained"
            disabled={!linkChildId}
            onClick={() => linkChild.mutate()}
          >
            Прив’язати
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Редагування</DialogTitle>
        <DialogContent>
          <UserFormFields
            form={form}
            setForm={setForm}
            showClass={isStudentTab}
            classes={classes}
            editMode
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Скасувати</Button>
          <Button variant="contained" onClick={() => update.mutate()}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

type UserForm = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  role: string;
  classGroupId: string;
};

function UserFormFields({
  form,
  setForm,
  showClass,
  classes,
  editMode,
}: {
  form: UserForm;
  setForm: Dispatch<SetStateAction<UserForm>>;
  showClass: boolean;
  classes: { id: string; name: string }[];
  editMode?: boolean;
}) {
  return (
    <>
      <TextField
        fullWidth
        label="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        margin="normal"
      />
      <TextField
        fullWidth
        label={editMode ? 'Новий пароль (залиште порожнім)' : 'Пароль'}
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Прізвище"
        value={form.lastName}
        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Ім'я"
        value={form.firstName}
        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        margin="normal"
      />
      <TextField
        fullWidth
        label="По батькові"
        value={form.patronymic}
        onChange={(e) => setForm({ ...form, patronymic: e.target.value })}
        margin="normal"
      />
      {showClass && (
        <TextField
          select
          fullWidth
          label="Клас"
          value={form.classGroupId}
          onChange={(e) => setForm({ ...form, classGroupId: e.target.value })}
          margin="normal"
        >
          <MenuItem value="">Без класу</MenuItem>
          {classes.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </>
  );
}

function TeacherSubjectsCell({ assignments }: { assignments: TeacherAssignment[] }) {
  if (assignments.length === 0) {
    return <Chip label="Немає призначень" size="small" color="warning" variant="outlined" />;
  }

  return (
    <Box display="flex" flexWrap="wrap" gap={0.5}>
      {assignments.map((a) => (
        <Chip
          key={a.id}
          size="small"
          variant="outlined"
          color="primary"
          label={`${a.subject.name} · ${a.classGroup.name}`}
        />
      ))}
    </Box>
  );
}
