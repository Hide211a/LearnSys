import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, MenuItem, TextField, DialogActions, IconButton, Alert,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function AdminAssignments() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classGroupId, setClassGroupId] = useState('');

  useEffect(() => {
    const c = searchParams.get('classGroupId');
    const s = searchParams.get('subjectId');
    if (c) setClassGroupId(c);
    if (s) setSubjectId(s);
    if (c || s) setOpen(true);
  }, [searchParams]);

  const { data: assignments = [] } = useQuery({ queryKey: ['assignments'], queryFn: async () => (await api.get('/admin/assignments')).data });
  const { data: teachers = [] } = useQuery({ queryKey: ['users-teachers'], queryFn: async () => (await api.get('/admin/users', { params: { role: 'TEACHER' } })).data });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: async () => (await api.get('/admin/subjects')).data });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/admin/classes')).data });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (a: { teacher: { lastName: string; firstName: string }; subject: { name: string }; classGroup: { name: string } }) =>
        `${a.teacher.lastName} ${a.teacher.firstName} ${a.subject.name} ${a.classGroup.name}`.toLowerCase().includes(q)
    );
  }, [assignments, filter]);

  const create = useMutation({
    mutationFn: () => api.post('/admin/assignments', { teacherId, subjectId, classGroupId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setOpen(false);
      showToast('Призначення додано', 'success');
    },
    onError: () => showToast('Помилка (можливо, таке призначення вже є)', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/assignments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      showToast('Призначення видалено', 'success');
    },
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Призначення вчителів</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Додати</Button>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Саме тут прив’язується вчитель до класу. Без призначення новий клас (наприклад, 7-й) не видно вчителю в системі.
      </Alert>
      <TextField
        size="small"
        placeholder="Пошук..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2, maxWidth: 320 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Paper>
        <Table>
          <TableHead><TableRow><TableCell>Вчитель</TableCell><TableCell>Предмет</TableCell><TableCell>Клас</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {filtered.map((a: { id: string; teacher: { lastName: string; firstName: string }; subject: { name: string }; classGroup: { name: string } }) => (
              <TableRow key={a.id}>
                <TableCell>{a.teacher.lastName} {a.teacher.firstName}</TableCell>
                <TableCell>{a.subject.name}</TableCell>
                <TableCell>{a.classGroup.name}</TableCell>
                <TableCell><IconButton size="small" onClick={() => remove.mutate(a.id)}><DeleteIcon /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Призначення</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Вчитель" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} margin="normal">
            {teachers.map((t: { id: string; lastName: string; firstName: string }) => <MenuItem key={t.id} value={t.id}>{t.lastName} {t.firstName}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Предмет" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} margin="normal">
            {subjects.map((s: { id: string; name: string }) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Клас" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} margin="normal">
            {classes.map((c: { id: string; name: string }) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
