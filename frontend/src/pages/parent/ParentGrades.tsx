import { useState, useMemo, useRef } from 'react';
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
  Button,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';
import { useParentChild } from '../../context/ParentChildContext';
import { ChildSelectorField } from '../../components/ChildSelector';

const ATTENDANCE_UK: Record<string, string> = {
  PRESENT: 'Присутній',
  ABSENT: 'Відсутній',
  LATE: 'Запізнення',
  EXCUSED: 'Поважна причина',
};

export default function ParentGrades() {
  const { childId, childParams, children } = useParentChild();
  const [subjectFilter, setSubjectFilter] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const child = children.find((c) => c.id === childId);

  const { data } = useQuery({
    queryKey: ['parent-grades', childId],
    queryFn: async () => (await api.get('/student/grades', childParams)).data,
    enabled: !!childId,
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

  const handlePrint = () => {
    window.print();
  };

  if (!childId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Оцінки дитини
        </Typography>
        <Alert severity="info">Оберіть дитину на головній сторінці</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={1}>
        <Typography variant="h4">Оцінки та відвідуваність</Typography>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
          Друк звіту
        </Button>
      </Box>
      <Typography color="text.secondary" mb={2}>
        {child ? `${child.lastName} ${child.firstName}` : ''}
        {child?.classGroup ? ` · клас ${child.classGroup.name}` : ''}
      </Typography>
      <ChildSelectorField />

      <Box ref={printRef} className="print-area">
        {overallAvg != null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Загальний середній бал: <strong>{overallAvg}</strong>
          </Alert>
        )}

        <TextField
          select
          size="small"
          label="Предмет"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          sx={{ mb: 2, minWidth: { xs: '100%', sm: 200 }, maxWidth: 400 }}
        >
          <MenuItem value="">Усі предмети</MenuItem>
          {subjects.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>

        <Grid container spacing={2} mb={3}>
          {(data?.summary ?? []).map((s: { subject: string; avg: number }) => (
            <Grid key={s.subject} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {s.subject}
                  </Typography>
                  <Typography variant="h5">{s.avg}</Typography>
                  <Typography variant="caption">середній бал</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {chartData.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, height: 280 }}>
            <Typography variant="h6" gutterBottom>
              Динаміка оцінок
            </Typography>
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
        )}

        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Предмет</TableCell>
                <TableCell>Тема</TableCell>
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
                    <TableCell>{r.topic ?? '—'}</TableCell>
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
    </Box>
  );
}
