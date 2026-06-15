import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Alert,
  Stack,
} from '@mui/material';
import { format, isPast } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';
import { useParentChild } from '../../context/ParentChildContext';
import { ChildSelectorField } from '../../components/ChildSelector';

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
  teacher?: { firstName: string; lastName: string };
  isOverdue?: boolean;
  mySubmission?: { status: string; feedback?: string; grade?: number; content?: string };
};

export default function ParentHomework() {
  const { childId, childParams } = useParentChild();
  const [tab, setTab] = useState(0);

  const { data: list = [] } = useQuery({
    queryKey: ['parent-hw', childId],
    queryFn: async () => (await api.get('/student/homework', childParams)).data as HwRow[],
    enabled: !!childId,
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

  if (!childId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Домашні завдання
        </Typography>
        <Alert severity="info">Оберіть дитину на головній сторінці</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Домашні завдання дитини
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Перегляд завдань і статусу виконання (без здачі — це робить учень)
      </Typography>
      <ChildSelectorField />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Активні" />
        <Tab label="Здані / оцінені" />
        <Tab label="Прострочені" />
      </Tabs>

      {filtered.length === 0 && (
        <Alert severity="info">Нічого у цій вкладці</Alert>
      )}

      {filtered.map((h) => {
        const status = h.mySubmission?.status ?? 'NOT_SUBMITTED';
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
                {h.subject.name}
                {h.teacher ? ` · ${h.teacher.lastName} ${h.teacher.firstName}` : ''}
                {' · дедлайн: '}
                {format(new Date(h.dueDate), 'd MMMM yyyy', { locale: uk })}
              </Typography>
              {h.description && <Typography mt={1}>{h.description}</Typography>}
              {h.mySubmission?.content && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Відповідь учня: {h.mySubmission.content}
                </Alert>
              )}
              {h.mySubmission?.feedback && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Коментар вчителя: {h.mySubmission.feedback}
                </Alert>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
