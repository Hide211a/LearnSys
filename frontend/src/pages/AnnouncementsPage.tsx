import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from '@mui/material';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useParentChild } from '../context/ParentChildContext';
import { ChildSelectorField } from '../components/ChildSelector';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { isParent, childId, childParams } = useParentChild();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [classGroupId, setClassGroupId] = useState('');

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', isParent ? childId || 'all' : 'me'],
    queryFn: async () =>
      (await api.get('/announcements', isParent && childId ? childParams : undefined)).data,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-announce'],
    queryFn: async () => {
      if (user?.role === 'ADMIN') return (await api.get('/admin/classes')).data;
      const assignments = (await api.get('/teacher/my-classes')).data;
      return [...new Map(assignments.map((a: { classGroup: { id: string; name: string } }) => [a.classGroup.id, a.classGroup])).values()];
    },
    enabled: user?.role === 'ADMIN' || user?.role === 'TEACHER',
  });

  const create = useMutation({
    mutationFn: () => api.post('/announcements', { title, content, isGlobal, classGroupId: isGlobal ? null : classGroupId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setOpen(false);
      setTitle('');
      setContent('');
    },
  });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Оголошення
      </Typography>
      {isParent && (
        <Typography color="text.secondary" mb={1}>
          Шкільні та класові новини для ваших дітей
        </Typography>
      )}
      {isParent && <ChildSelectorField />}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box />
        {canCreate && (
          <Button variant="contained" onClick={() => setOpen(true)}>
            Створити
          </Button>
        )}
      </Box>
      {announcements.map((a: {
        id: string;
        title: string;
        content: string;
        createdAt: string;
        isGlobal: boolean;
        classGroup?: { name: string };
        author: { firstName: string; lastName: string };
      }) => (
        <Card key={a.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{a.title}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {format(new Date(a.createdAt), 'd MMMM yyyy, HH:mm', { locale: uk })}
              {' · '}
              {a.author.lastName} {a.author.firstName}
              {a.isGlobal ? ' · Вся школа' : a.classGroup ? ` · ${a.classGroup.name}` : ''}
            </Typography>
            <Typography>{a.content}</Typography>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Нове оголошення</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} margin="normal" />
          <TextField fullWidth multiline rows={4} label="Текст" value={content} onChange={(e) => setContent(e.target.value)} margin="normal" />
          <FormControlLabel control={<Checkbox checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />} label="Для всієї школи" />
          {!isGlobal && (
            <TextField select fullWidth label="Клас" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} margin="normal">
              {classes.map((c: { id: string; name: string }) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()}>Опублікувати</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
