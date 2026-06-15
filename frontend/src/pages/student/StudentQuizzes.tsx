import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, RadioGroup, FormControlLabel, Radio, Checkbox, FormGroup,
} from '@mui/material';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function StudentQuizzes() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const { data: list = [] } = useQuery({
    queryKey: ['student-quizzes'],
    queryFn: async () => (await api.get('/student/quizzes')).data,
  });

  const { data: quiz } = useQuery({
    queryKey: ['quiz', activeId],
    queryFn: async () => (await api.get(`/student/quizzes/${activeId}`)).data,
    enabled: !!activeId,
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/student/quizzes/${activeId}/attempt`, { answers }),
    onSuccess: (res) => {
      showToast(`Тест завершено! Результат: ${res.data.score}%`, 'success');
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ['student-quizzes'] });
      qc.invalidateQueries({ queryKey: ['student-dashboard'] });
    },
    onError: () => showToast('Помилка відправки відповідей', 'error'),
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Тести</Typography>
      {list.map((q: { id: string; title: string; subject: { name: string }; attempts: { score?: number }[]; _count: { questions: number } }) => (
        <Card key={q.id} sx={{ mb: 1 }}>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography fontWeight={600}>{q.title}</Typography>
              <Typography variant="body2">{q.subject.name} · {q._count.questions} питань</Typography>
              {q.attempts[0]?.score != null && <Typography color="primary">Результат: {q.attempts[0].score}%</Typography>}
            </Box>
            <Button variant="contained" onClick={() => { setActiveId(q.id); setAnswers({}); }}>
              {q.attempts.length ? 'Пройти знову' : 'Почати'}
            </Button>
          </CardContent>
        </Card>
      ))}
      <Dialog open={!!activeId} onClose={() => setActiveId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{quiz?.title}</DialogTitle>
        <DialogContent>
          {quiz?.questions?.map((qu: { id: string; text: string; type: string; options: { id: string; text: string }[] }) => (
            <Box key={qu.id} mb={3}>
              <Typography fontWeight={600} mb={1}>{qu.text}</Typography>
              {qu.type === 'SINGLE' && (
                <RadioGroup value={answers[qu.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [qu.id]: e.target.value })}>
                  {qu.options.map((o) => <FormControlLabel key={o.id} value={o.id} control={<Radio />} label={o.text} />)}
                </RadioGroup>
              )}
              {qu.type === 'MULTIPLE' && (
                <FormGroup>
                  {qu.options.map((o) => (
                    <FormControlLabel
                      key={o.id}
                      control={
                        <Checkbox
                          checked={((answers[qu.id] as string[]) ?? []).includes(o.id)}
                          onChange={(e) => {
                            const cur = (answers[qu.id] as string[]) ?? [];
                            setAnswers({
                              ...answers,
                              [qu.id]: e.target.checked ? [...cur, o.id] : cur.filter((x) => x !== o.id),
                            });
                          }}
                        />
                      }
                      label={o.text}
                    />
                  ))}
                </FormGroup>
              )}
            </Box>
          ))}
        </DialogContent>
        <Box p={2} display="flex" gap={1} justifyContent="flex-end">
          <Button onClick={() => setActiveId(null)}>Скасувати</Button>
          <Button variant="contained" onClick={() => submit.mutate()}>Завершити</Button>
        </Box>
      </Dialog>
    </Box>
  );
}
