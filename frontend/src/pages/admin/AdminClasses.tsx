import { useState } from 'react';
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
  Alert,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LinkIcon from '@mui/icons-material/Link';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

type ClassAssignment = {
  id: string;
  teacher: { id: string; firstName: string; lastName: string };
  subject: { id: string; name: string };
};

type ClassRow = {
  id: string;
  name: string;
  grade: number;
  schoolYear: { name: string };
  _count: { students: number };
  assignments?: ClassAssignment[];
};

export default function AdminClasses() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(5);
  const [schoolYearId, setSchoolYearId] = useState('');

  const [manageClass, setManageClass] = useState<ClassRow | null>(null);
  const [studentTab, setStudentTab] = useState(0);
  const [newStudent, setNewStudent] = useState({
    email: '',
    password: 'password123',
    firstName: '',
    lastName: '',
    patronymic: '',
  });
  const [assignUserId, setAssignUserId] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignClass, setAssignClass] = useState<ClassRow | null>(null);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await api.get('/admin/classes')).data,
  });
  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: async () => (await api.get('/admin/school-years')).data,
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ['users-teachers'],
    queryFn: async () => (await api.get('/admin/users', { params: { role: 'TEACHER' } })).data,
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await api.get('/admin/subjects')).data,
  });

  const createAssignment = useMutation({
    mutationFn: () =>
      api.post('/admin/assignments', {
        teacherId: assignTeacherId,
        subjectId: assignSubjectId,
        classGroupId: assignClass!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
      setAssignOpen(false);
      showToast('Вчителя призначено — клас з’явиться у вчителя після оновлення сторінки', 'success');
    },
    onError: () => showToast('Не вдалося призначити (можливо, таке призначення вже є)', 'error'),
  });

  const { data: classStudents = [], refetch: refetchStudents } = useQuery({
    queryKey: ['class-students', manageClass?.id],
    queryFn: async () => (await api.get(`/admin/classes/${manageClass!.id}/students`)).data,
    enabled: !!manageClass?.id,
  });

  const { data: unassigned = [] } = useQuery({
    queryKey: ['unassigned-students'],
    queryFn: async () => (await api.get('/admin/students/unassigned')).data,
    enabled: !!manageClass,
  });

  const create = useMutation({
    mutationFn: () => api.post('/admin/classes', { name, grade, schoolYearId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      setOpen(false);
      setName('');
      showToast('Клас створено. Додайте учнів.', 'success');
      const created = res.data as ClassRow;
      setManageClass({ ...created, _count: { students: 0 }, schoolYear: years.find((y: { id: string }) => y.id === schoolYearId) ?? { name: '' } });
      setStudentTab(0);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  const addStudent = useMutation({
    mutationFn: () => api.post(`/admin/classes/${manageClass!.id}/students`, newStudent),
    onSuccess: () => {
      refetchStudents();
      qc.invalidateQueries({ queryKey: ['classes'] });
      setNewStudent({ email: '', password: 'password123', firstName: '', lastName: '', patronymic: '' });
      showToast('Учня додано до класу', 'success');
    },
    onError: () => showToast('Не вдалося створити учня (перевірте email)', 'error'),
  });

  const assignStudent = useMutation({
    mutationFn: () => api.post(`/admin/classes/${manageClass!.id}/students/assign`, { userId: assignUserId }),
    onSuccess: () => {
      refetchStudents();
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['unassigned-students'] });
      setAssignUserId('');
      showToast('Учня зараховано до класу', 'success');
    },
  });

  const removeFromClass = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/classes/${manageClass!.id}/students/${userId}`),
    onSuccess: () => {
      refetchStudents();
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['unassigned-students'] });
      showToast('Учня відкріплено від класу', 'info');
    },
  });

  const openCreate = () => {
    setSchoolYearId(years.find((y: { isCurrent: boolean }) => y.isCurrent)?.id ?? '');
    setOpen(true);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4">Класи</Typography>
          <Typography variant="body2" color="text.secondary">
            Спочатку створіть клас, потім натисніть іконку групи, щоб додати учнів
          </Typography>
        </Box>
        <Button variant="contained" onClick={openCreate}>
          Додати клас
        </Button>
      </Box>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Щоб клас з’явився у вчителя</strong> (журнал, ДЗ, «Мої класи»), натисніть іконку{' '}
        <strong>посилання</strong> у таблиці та призначте вчителя + предмет. Лише створення класу цього не робить.
      </Alert>
      <Alert severity="info" sx={{ mb: 2 }}>
        Учнів додають через іконку <strong>групи</strong> або в розділі <strong>Користувачі → Учні</strong>.
      </Alert>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Назва</TableCell>
              <TableCell>Паралель</TableCell>
              <TableCell>Навч. рік</TableCell>
              <TableCell>Учнів</TableCell>
              <TableCell>Вчителі / предмети</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((c: ClassRow) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.grade}</TableCell>
                <TableCell>{c.schoolYear?.name}</TableCell>
                <TableCell>{c._count?.students ?? 0}</TableCell>
                <TableCell>
                  {(c.assignments?.length ?? 0) === 0 ? (
                    <Chip label="Немає вчителя" color="warning" size="small" />
                  ) : (
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {c.assignments!.map((a) => (
                        <Chip
                          key={a.id}
                          size="small"
                          variant="outlined"
                          label={`${a.subject.name}: ${a.teacher.lastName}`}
                        />
                      ))}
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton
                    size="small"
                    color="secondary"
                    title="Призначити вчителя (щоб клас був у вчителя)"
                    onClick={() => {
                      setAssignClass(c);
                      setAssignTeacherId('');
                      setAssignSubjectId('');
                      setAssignOpen(true);
                    }}
                  >
                    <LinkIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="primary"
                    title="Учні класу"
                    onClick={() => {
                      setManageClass(c);
                      setStudentTab(0);
                    }}
                  >
                    <GroupIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => remove.mutate(c.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Створення класу */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новий клас</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Назва (напр. 5-А)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            type="number"
            label="Паралель"
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            margin="normal"
          />
          <TextField
            select
            fullWidth
            label="Навчальний рік"
            value={schoolYearId}
            onChange={(e) => setSchoolYearId(e.target.value)}
            margin="normal"
          >
            {years.map((y: { id: string; name: string }) => (
              <MenuItem key={y.id} value={y.id}>
                {y.name}
              </MenuItem>
            ))}
          </TextField>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Після створення додайте учнів і обов&apos;язково <strong>призначте вчителя</strong> (іконка посилання в таблиці).
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()} disabled={!name || !schoolYearId}>
            Створити клас
          </Button>
        </DialogActions>
      </Dialog>

      {/* Призначити вчителя */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Призначити вчителя — {assignClass?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Після збереження клас «{assignClass?.name}» з’явиться у обраного вчителя в меню «Мої класи», журналі та ДЗ.
          </Typography>
          <TextField
            select
            fullWidth
            label="Вчитель"
            value={assignTeacherId}
            onChange={(e) => setAssignTeacherId(e.target.value)}
            margin="normal"
          >
            {teachers.map((t: { id: string; lastName: string; firstName: string }) => (
              <MenuItem key={t.id} value={t.id}>
                {t.lastName} {t.firstName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Предмет"
            value={assignSubjectId}
            onChange={(e) => setAssignSubjectId(e.target.value)}
            margin="normal"
          >
            {subjects.map((s: { id: string; name: string }) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={() => createAssignment.mutate()}
            disabled={!assignTeacherId || !assignSubjectId}
          >
            Призначити
          </Button>
        </DialogActions>
      </Dialog>

      {/* Учні класу */}
      <Dialog open={!!manageClass} onClose={() => setManageClass(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Учні класу {manageClass?.name}
          <Typography variant="body2" color="text.secondary">
            Всього: {classStudents.length}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Tabs value={studentTab} onChange={(_, v) => setStudentTab(v)} sx={{ mb: 2 }}>
            <Tab icon={<PersonAddIcon />} iconPosition="start" label="Новий учень" />
            <Tab label="Зачислити існуючого" disabled={unassigned.length === 0} />
            <Tab label={`Список (${classStudents.length})`} />
          </Tabs>

          {studentTab === 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Створюється обліковий запис учня одразу в цьому класі.
              </Typography>
              <TextField
                fullWidth
                label="Email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Пароль"
                value={newStudent.password}
                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Прізвище"
                value={newStudent.lastName}
                onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Ім'я"
                value={newStudent.firstName}
                onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="По батькові"
                value={newStudent.patronymic}
                onChange={(e) => setNewStudent({ ...newStudent, patronymic: e.target.value })}
                margin="normal"
              />
              <Button
                variant="contained"
                sx={{ mt: 1 }}
                onClick={() => addStudent.mutate()}
                disabled={!newStudent.email || !newStudent.firstName || !newStudent.lastName}
              >
                Додати учня
              </Button>
            </Box>
          )}

          {studentTab === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Учні без класу (раніше створені без прив&apos;язки).
              </Typography>
              <TextField
                select
                fullWidth
                label="Оберіть учня"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              >
                {unassigned.map((u: { id: string; lastName: string; firstName: string; email: string }) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.lastName} {u.firstName} ({u.email})
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => assignStudent.mutate()}
                disabled={!assignUserId}
              >
                Зачислити в клас
              </Button>
            </Box>
          )}

          {studentTab === 2 && (
            <Paper variant="outlined">
              {classStudents.length === 0 ? (
                <Typography p={2} color="text.secondary">
                  У класі ще немає учнів. Додайте на вкладці «Новий учень».
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ПІБ</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classStudents.map((s: { id: string; lastName: string; firstName: string; email: string }) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {s.lastName} {s.firstName}
                        </TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            title="Відкріпити від класу"
                            onClick={() => removeFromClass.mutate(s.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageClass(null)}>Закрити</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
