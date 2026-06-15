import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, TextField, DialogActions, MenuItem, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../../api/client';

type Q = { text: string; type: string; points: number; options: { text: string; isCorrect: boolean }[] };

export default function TeacherQuizzes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [questions, setQuestions] = useState<Q[]>([
    { text: '', type: 'SINGLE', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] },
  ]);

  const { data: quizzes = [] } = useQuery({ queryKey: ['quizzes'], queryFn: async () => (await api.get('/teacher/quizzes')).data });
  const { data: assignments = [] } = useQuery({ queryKey: ['my-classes'], queryFn: async () => (await api.get('/teacher/my-classes')).data });

  const create = useMutation({
    mutationFn: () => api.post('/teacher/quizzes', { title, subjectId, classGroupId, questions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quizzes'] }); setOpen(false); },
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Тести</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Створити тест</Button>
      </Box>
      {quizzes.map((q: { id: string; title: string; subject: { name: string }; _count: { questions: number; attempts: number } }) => (
        <Card key={q.id} sx={{ mb: 1 }}>
          <CardContent>
            <Typography fontWeight={600}>{q.title}</Typography>
            <Typography variant="body2">{q.subject.name} · {q._count.questions} питань · {q._count.attempts} спроб</Typography>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Новий тест</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Назва" value={title} onChange={(e) => setTitle(e.target.value)} margin="normal" />
          <TextField
            select
            fullWidth
            label="Клас / предмет"
            value={subjectId && classGroupId ? `${subjectId}|${classGroupId}` : ''}
            onChange={(e) => {
              const [sid, cid] = e.target.value.split('|');
              setSubjectId(sid);
              setClassGroupId(cid);
            }}
            margin="normal"
          >
            {assignments.map((a: { subject: { id: string; name: string }; classGroup: { id: string; name: string } }) => (
              <MenuItem key={a.subject.id + a.classGroup.id} value={`${a.subject.id}|${a.classGroup.id}`}>
                {a.classGroup.name} — {a.subject.name}
              </MenuItem>
            ))}
          </TextField>
          {questions.map((qu, qi) => (
            <Box key={qi} border={1} borderColor="divider" borderRadius={1} p={2} mt={2}>
              <TextField fullWidth label="Питання" value={qu.text} onChange={(e) => {
                const n = [...questions]; n[qi].text = e.target.value; setQuestions(n);
              }} />
              {qu.options.map((o, oi) => (
                <Box key={oi} display="flex" gap={1} mt={1}>
                  <TextField fullWidth size="small" value={o.text} onChange={(e) => {
                    const n = [...questions]; n[qi].options[oi].text = e.target.value; setQuestions(n);
                  }} />
                  <Button size="small" variant={o.isCorrect ? 'contained' : 'outlined'} onClick={() => {
                    const n = [...questions];
                    n[qi].options.forEach((opt, j) => { opt.isCorrect = j === oi; });
                    setQuestions(n);
                  }}>✓</Button>
                </Box>
              ))}
            </Box>
          ))}
          <IconButton onClick={() => setQuestions([...questions, { text: '', type: 'SINGLE', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }])}>
            <AddIcon /> Додати питання
          </IconButton>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
