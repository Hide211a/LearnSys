import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../../api/client';

type StatItem = {
  assignment: { subject?: { name: string }; classGroup?: { name: string } };
  averageGrade: number;
  overdueCount: number;
  recordsCount?: number;
  submittedCount?: number;
};

export default function TeacherAnalytics() {
  const { data: stats = [], isLoading, isError } = useQuery({
    queryKey: ['teacher-analytics'],
    queryFn: async () => (await api.get('/teacher/analytics')).data as StatItem[],
  });

  const chartData = stats.map((s) => ({
    name: `${s.assignment?.subject?.name ?? '?'} · ${s.assignment?.classGroup?.name ?? '?'}`,
    avg: s.averageGrade || 0,
    overdue: s.overdueCount,
  }));

  const totalOverdue = stats.reduce((sum, s) => sum + s.overdueCount, 0);
  const withGrades = stats.filter((s) => s.averageGrade > 0);
  const overallAvg =
    withGrades.length > 0
      ? Math.round((withGrades.reduce((s, x) => s + x.averageGrade, 0) / withGrades.length) * 10) / 10
      : null;

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Аналітика
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Аналітика
        </Typography>
        <Alert severity="error">Не вдалося завантажити аналітику</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Аналітика
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Показники за вашими класами та предметами
      </Typography>

      {stats.length === 0 && (
        <Alert severity="info">Немає призначених класів для відображення статистики.</Alert>
      )}

      {stats.length > 0 && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary.main">
                    {stats.length}
                  </Typography>
                  <Typography color="text.secondary">Пар клас–предмет</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">
                    {overallAvg ?? '—'}
                  </Typography>
                  <Typography color="text.secondary">Середній бал (загалом)</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color={totalOverdue > 0 ? 'error.main' : 'text.primary'}>
                    {totalOverdue}
                  </Typography>
                  <Typography color="text.secondary">Прострочених ДЗ</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {chartData.some((d) => d.avg > 0) && (
            <Paper sx={{ p: 2, height: 320, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Середній бал по класах
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={72} />
                  <YAxis domain={[0, 12]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg" fill="#1565c0" name="Середній бал" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          )}

          <Grid container spacing={2}>
            {stats.map((s) => {
              const subjectName = s.assignment?.subject?.name ?? 'Предмет';
              const className = s.assignment?.classGroup?.name ?? 'Клас';
              return (
                <Grid key={`${subjectName}-${className}`} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {subjectName}
                      </Typography>
                      <Chip label={className} size="small" sx={{ mb: 1 }} />
                      <Typography>
                        Середній бал:{' '}
                        <strong>{s.averageGrade > 0 ? s.averageGrade : '—'}</strong>
                      </Typography>
                      <Typography color={s.overdueCount > 0 ? 'error.main' : 'text.secondary'}>
                        Прострочених ДЗ: {s.overdueCount}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
}
