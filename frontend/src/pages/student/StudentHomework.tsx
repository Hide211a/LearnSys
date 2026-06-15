import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  Stack,
} from '@mui/material';
import { format, isPast } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

const STATUS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  NOT_SUBMITTED: 'warning',
  SUBMITTED: 'default',
  RETURNED: 'error',
  GRADED: 'success',
};

const STATUS_UK: Record<string, string> = {
  NOT_SUBMITTED: 'Не здано',
  SUBMITTED: 'На перевірці',
  RETURNED: 'Повернуто',
  GRADED: 'Оцінено',
};

type HwRow = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  subject: { name: string };
  isOverdue?: boolean;
  mySubmission?: { status: string; feedback?: string; grade?: number };
};

export default function StudentHomework() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState(0);
  const [submitId, setSubmitId] = useState<string | null>(null);
  const [content, setContent] = useState('');

  const { data: list = [] } = useQuery({
    queryKey: ['student-hw'],
    queryFn: async () => (await api.get('/student/homework')).data as HwRow[],
  });

  const filtered = useMemo(() => {
    if (tab === 0) {
      return list.filter(
        (h) =>
          !['GRADED', 'SUBMITTED'].includes(h.mySubmission?.status ?? 'NOT_SUBMITTED') ||
          h.mySubmission?.status === 'RETURNED'
      );
    }
    if (tab === 1) {
      return list.filter((h) =>
        ['GRADED', 'SUBMITTED'].includes(h.mySubmission?.status ?? '')
      );
    }
    return list.filter((h) => h.isOverdue);
  }, [list, tab]);

  const submit = useMutation({
    mutationFn: () => api.post(`/student/homework/${submitId}/submit`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-hw'] });
      qc.invalidateQueries({ queryKey: ['student-dashboard'] });
      setSubmitId(null);
      setContent('');
      showToast('Роботу надіслано на перевірку', 'success');
    },
    onError: () => showToast('Не вдалося надіслати', 'error'),
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Домашні завдання
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Переглядайте завдання, здавайте відповіді та слідкуйте за оцінками
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Активні" />
        <Tab label="Здані / оцінені" />
        <Tab label="Прострочені" />
      </Tabs>

      {filtered.length === 0 && (
        <Alert severity="info">
          {tab === 0 ? 'Немає активних завдань — молодець!' : 'Нічого у цій вкладці'}
        </Alert>
      )}

      {filtered.map((h) => {
        const status = h.mySubmission?.status ?? 'NOT_SUBMITTED';
        const canSubmit = status === 'NOT_SUBMITTED' || status === 'RETURNED';
        const overdue = h.isOverdue || (isPast(new Date(h.dueDate)) && status === 'NOT_SUBMITTED');

        return (
          <Card
            key={h.id}
            sx={{ mb: 2, borderLeft: overdue ? 4 : 0, borderColor: 'error.main' }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Typography variant="h6">{h.title}</Typography>
                <Stack direction="row" gap={0.5} flexShrink={0}>
                  {overdue && <Chip label="Прострочено" size="small" color="error" />}
                  <Chip label={STATUS_UK[status]} color={STATUS[status]} size="small" />
                  {status === 'GRADED' && h.mySubmission?.grade != null && (
                    <Chip label={`${h.mySubmission.grade} б.`} size="small" color="success" />
                  )}
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {h.subject.name} · дедлайн:{' '}
                {format(new Date(h.dueDate), 'd MMMM yyyy, HH:mm', { locale: uk })}
              </Typography>
              {h.description && <Typography mt={1}>{h.description}</Typography>}
              {h.mySubmission?.feedback && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Коментар вчителя: {h.mySubmission.feedback}
                </Alert>
              )}
              {canSubmit && (
                <Button size="small" variant="contained" sx={{ mt: 1 }} onClick={() => setSubmitId(h.id)}>
                  {status === 'RETURNED' ? 'Надіслати знову' : 'Здати роботу'}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!submitId} onClose={() => setSubmitId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Здати завдання</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Ваша відповідь"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Опишіть виконання або вставте текст роботи..."
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitId(null)}>Скасувати</Button>
          <Button variant="contained" onClick={() => submit.mutate()} disabled={!content.trim()}>
            Надіслати
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
