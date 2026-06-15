import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Chip,
  Alert,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';

const ATTENDANCE_UK: Record<string, string> = {
  PRESENT: 'Присутній',
  ABSENT: 'Відсутній',
  LATE: 'Запізнення',
  EXCUSED: 'Поважна причина',
};

export default function StudentGrades() {
  const [subjectFilter, setSubjectFilter] = useState('');

  const { data } = useQuery({
    queryKey: ['student-grades'],
    queryFn: async () => (await api.get('/student/grades')).data,
  });

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const r of data?.records ?? []) {
      set.add(r.subject.name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [data?.records]);

  const filteredRecords = useMemo(() => {
    const records = data?.records ?? [];
    if (!subjectFilter) return records;
    return records.filter((r: { subject: { name: string } }) => r.subject.name === subjectFilter);
  }, [data?.records, subjectFilter]);

  const chartData = (data?.records ?? [])
    .filter((r: { grade: number | null }) => r.grade)
    .slice(0, 15)
    .reverse()
    .map((r: { date: string; grade: number; subject: { name: string } }) => ({
      name: format(new Date(r.date), 'd/M'),
      grade: r.grade,
      subject: r.subject.name,
    }));

  const overallAvg =
    (data?.summary ?? []).length > 0
      ? Math.round(
          ((data?.summary ?? []).reduce((s: number, x: { avg: number }) => s + x.avg, 0) /
            (data?.summary ?? []).length) *
            10
        ) / 10
      : null;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Мої оцінки
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Середні бали по предметах, динаміка та журнал відвідуваності
      </Typography>

      {overallAvg != null && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Загальний середній бал по предметах: <strong>{overallAvg}</strong>
        </Alert>
      )}

      <TextField
        select
        size="small"
        label="Предмет"
        value={subjectFilter}
        onChange={(e) => setSubjectFilter(e.target.value)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">Усі предмети</MenuItem>
        {subjects.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>

      <Grid container spacing={2} mb={3}>
        {(data?.summary ?? []).map((s: { subject: string; avg: number; grades: number[] }) => (
          <Grid key={s.subject} size={{ xs: 6, sm: 4, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">{s.subject}</Typography>
                <Typography variant="h5">{s.avg}</Typography>
                <Typography variant="caption">середній бал</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ p: 2, mb: 3, height: 280 }}>
        <Typography variant="h6" gutterBottom>Динаміка оцінок</Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[1, 12]} />
            <Tooltip />
            <Line type="monotone" dataKey="grade" stroke="#1565c0" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Предмет</TableCell>
              <TableCell>Оцінка</TableCell>
              <TableCell>Відвідуваність</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecords.map(
              (r: {
                id: string;
                date: string;
                subject: { name: string };
                grade?: number;
                attendance: string;
                topic?: string;
              }) => (
                <TableRow key={r.id} hover>
                  <TableCell>{format(new Date(r.date), 'd MMM yyyy', { locale: uk })}</TableCell>
                  <TableCell>{r.subject.name}</TableCell>
                  <TableCell>
                    {r.grade != null ? (
                      <Chip label={r.grade} size="small" color="primary" />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ATTENDANCE_UK[r.attendance] ?? r.attendance}
                      size="small"
                      color={r.attendance === 'ABSENT' ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
