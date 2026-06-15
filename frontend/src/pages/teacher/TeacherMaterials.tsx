import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, TextField, DialogActions, MenuItem,
} from '@mui/material';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';

export default function TeacherMaterials() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', linkUrl: '', subjectId: '', classGroupId: '', lessonDate: '' });

  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await api.get('/teacher/materials')).data });
  const { data: assignments = [] } = useQuery({ queryKey: ['my-classes'], queryFn: async () => (await api.get('/teacher/my-classes')).data });

  const create = useMutation({
    mutationFn: () => api.post('/teacher/materials', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setOpen(false); },
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Матеріали уроків</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Додати</Button>
      </Box>
      {materials.map((m: { id: string; title: string; linkUrl?: string; subject: { name: string }; lessonDate: string }) => (
        <Card key={m.id} sx={{ mb: 1 }}>
          <CardContent>
            <Typography fontWeight={600}>{m.title}</Typography>
            <Typography variant="body2">{m.subject.name} · {format(new Date(m.lessonDate), 'd MMM yyyy', { locale: uk })}</Typography>
            {m.linkUrl && <Typography component="a" href={m.linkUrl} target="_blank" rel="noreferrer">{m.linkUrl}</Typography>}
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Матеріал</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Назва" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} margin="normal" />
          <TextField fullWidth label="Посилання" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} margin="normal" />
          <TextField
            select
            fullWidth
            label="Клас / предмет"
            value={form.subjectId && form.classGroupId ? `${form.subjectId}|${form.classGroupId}` : ''}
            onChange={(e) => {
              const [subjectId, classGroupId] = e.target.value.split('|');
              setForm((f) => ({ ...f, subjectId, classGroupId }));
            }}
            margin="normal"
          >
            {assignments.map((a: { subject: { id: string; name: string }; classGroup: { id: string; name: string } }) => (
              <MenuItem key={a.subject.id + a.classGroup.id} value={`${a.subject.id}|${a.classGroup.id}`}>
                {a.classGroup.name} — {a.subject.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField fullWidth type="date" label="Дата уроку" value={form.lessonDate} onChange={(e) => setForm({ ...form, lessonDate: e.target.value })} margin="normal" InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
