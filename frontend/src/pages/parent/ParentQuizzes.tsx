import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, Chip, Alert } from '@mui/material';
import api from '../../api/client';
import { useParentChild } from '../../context/ParentChildContext';
import { ChildSelectorField } from '../../components/ChildSelector';

export default function ParentQuizzes() {
  const { childId, childParams } = useParentChild();

  const { data: list = [] } = useQuery({
    queryKey: ['parent-quizzes', childId],
    queryFn: async () => (await api.get('/student/quizzes', childParams)).data,
    enabled: !!childId,
  });

  if (!childId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Тести
        </Typography>
        <Alert severity="info">Оберіть дитину на головній сторінці</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Результати тестів
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Перегляд результатів онлайн-тестів (проходить учень)
      </Typography>
      <ChildSelectorField />

      {list.length === 0 && <Alert severity="info">Тестів для класу поки немає</Alert>}

      {list.map(
        (q: {
          id: string;
          title: string;
          subject: { name: string };
          attempts: { score?: number }[];
          _count: { questions: number };
        }) => (
          <Card key={q.id} sx={{ mb: 1 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography fontWeight={600}>{q.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {q.subject.name} · {q._count.questions} питань
                </Typography>
              </Box>
              {q.attempts[0]?.score != null ? (
                <Chip label={`${q.attempts[0].score}%`} color="primary" />
              ) : (
                <Chip label="Не проходив" variant="outlined" />
              )}
            </CardContent>
          </Card>
        )
      )}
    </Box>
  );
}
