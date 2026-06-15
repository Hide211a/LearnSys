import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
  Alert,
} from '@mui/material';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

type Poll = {
  id: string;
  question: string;
  allowMultiple?: boolean;
  options: { id: string; text: string; _count: { votes: number } }[];
};

export default function StudentPolls() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const { data: polls = [] } = useQuery({
    queryKey: ['student-polls'],
    queryFn: async () => (await api.get('/polls')).data as Poll[],
  });

  const vote = useMutation({
    mutationFn: ({ pollId, optionIds }: { pollId: string; optionIds: string[] }) =>
      api.post(`/polls/${pollId}/vote`, { optionIds }),
    onSuccess: () => {
      showToast('Голос зараховано', 'success');
      qc.invalidateQueries({ queryKey: ['student-polls'] });
      setAnswers({});
    },
    onError: () => showToast('Не вдалося проголосувати', 'error'),
  });

  const submitPoll = (poll: Poll) => {
    const ans = answers[poll.id];
    const optionIds = Array.isArray(ans) ? ans : ans ? [ans] : [];
    if (!optionIds.length) {
      showToast('Оберіть варіант', 'warning');
      return;
    }
    vote.mutate({ pollId: poll.id, optionIds });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Опитування класу
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Голосуйте за запропоновані варіанти (один голос на опитування)
      </Typography>

      {polls.length === 0 && <Alert severity="info">Активних опитувань немає</Alert>}

      {polls.map((poll) => (
        <Card key={poll.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {poll.question}
            </Typography>
            {poll.allowMultiple ? (
              <FormGroup>
                {poll.options.map((o) => (
                  <FormControlLabel
                    key={o.id}
                    control={
                      <Checkbox
                        checked={((answers[poll.id] as string[]) ?? []).includes(o.id)}
                        onChange={(e) => {
                          const prev = (answers[poll.id] as string[]) ?? [];
                          setAnswers({
                            ...answers,
                            [poll.id]: e.target.checked
                              ? [...prev, o.id]
                              : prev.filter((id) => id !== o.id),
                          });
                        }}
                      />
                    }
                    label={`${o.text} (${o._count.votes} голосів)`}
                  />
                ))}
              </FormGroup>
            ) : (
              <FormControl>
                <RadioGroup
                  value={(answers[poll.id] as string) ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [poll.id]: e.target.value })}
                >
                  {poll.options.map((o) => (
                    <FormControlLabel
                      key={o.id}
                      value={o.id}
                      control={<Radio />}
                      label={`${o.text} (${o._count.votes} голосів)`}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            )}
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => submitPoll(poll)}>
              Проголосувати
            </Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
