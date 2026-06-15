import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, TextField, DialogActions, MenuItem,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/client';

export default function TeacherPolls() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [options, setOptions] = useState(['', '']);

  const { data: assignments = [] } = useQuery({ queryKey: ['my-classes'], queryFn: async () => (await api.get('/teacher/my-classes')).data });
  const classId = assignments[0]?.classGroup?.id ?? '';
  const { data: polls = [] } = useQuery({
    queryKey: ['polls', classId],
    queryFn: async () => (await api.get('/polls', { params: { classGroupId: classId } })).data,
    enabled: !!classId,
  });

  const create = useMutation({
    mutationFn: () => api.post('/polls', { question, classGroupId, options: options.filter(Boolean) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['polls'] }); setOpen(false); },
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Опитування</Typography>
        <Button variant="contained" onClick={() => { setClassGroupId(classId); setOpen(true); }}>Створити</Button>
      </Box>
      {polls.map((p: { id: string; question: string; options: { text: string; _count: { votes: number } }[] }) => (
        <Card key={p.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{p.question}</Typography>
            <Box height={200} mt={2}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p.options.map((o) => ({ name: o.text, votes: o._count.votes }))}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="votes" fill="#1565c0" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Опитування</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Питання" value={question} onChange={(e) => setQuestion(e.target.value)} margin="normal" />
          <TextField select fullWidth label="Клас" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} margin="normal">
            {(
              [...new Map(
                assignments.map((a: { classGroup: { id: string; name: string } }) => [a.classGroup.id, a.classGroup.name] as [string, string])
              ).entries()] as [string, string][]
            ).map(([id, name]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>
            ))}
          </TextField>
          {options.map((o, i) => (
            <TextField key={i} fullWidth label={`Варіант ${i + 1}`} value={o} onChange={(e) => {
              const n = [...options]; n[i] = e.target.value; setOptions(n);
            }} margin="normal" />
          ))}
          <Button onClick={() => setOptions([...options, ''])}>+ Варіант</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()}>Опублікувати</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
