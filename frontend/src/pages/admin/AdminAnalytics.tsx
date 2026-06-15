import { useState } from 'react';
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
  Tabs,
  Tab,
  TextField,
  MenuItem,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../api/client';

type AnalyticsData = {
  overview: {
    students: number;
    teachers: number;
    classes: number;
    parents: number;
    homework: number;
    averageGrade: number | null;
    gradedRecords: number;
  };
  gradeDistribution: { label: string; count: number; color: string }[];
  enrollmentByGrade: { grade: number; students: number; classes: number }[];
  teacherLoad: {
    teacher: { id: string; firstName: string; lastName: string };
    lessonsPerWeek: number;
    assignmentsCount: number;
  }[];
  classStats: {
    classId: string;
    className: string;
    grade: number;
    studentCount: number;
    assignmentsCount: number;
    averageGrade: number | null;
    gradedRecords: number;
    absentCount: number;
    presentCount: number;
    lateCount: number;
    attendanceRate: number | null;
    homeworkCount: number;
    homeworkSubmitted: number;
    overdueHomework: number;
  }[];
  subjectStats: {
    subjectId: string;
    subjectName: string;
    averageGrade: number | null;
    recordsCount: number;
  }[];
  studentsAtRisk: {
    id: string;
    name: string;
    className: string;
    averageGrade: number | null;
    absences: number;
  }[];
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h4" color="primary.main">
          {value}
        </Typography>
        <Typography color="text.secondary">{label}</Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [tab, setTab] = useState(0);
  const [classFilter, setClassFilter] = useState('');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await api.get('/admin/classes')).data,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-analytics', classFilter],
    queryFn: async () => {
      const { data: res } = await api.get('/admin/analytics', {
        params: classFilter ? { classGroupId: classFilter } : undefined,
      });
      return res as AnalyticsData;
    },
  });

  const teacherChartData =
    data?.teacherLoad.map((t) => ({
      name: `${t.teacher.lastName} ${t.teacher.firstName[0]}.`,
      lessons: t.lessonsPerWeek,
      assignments: t.assignmentsCount,
    })) ?? [];

  const classGradeChart =
    data?.classStats
      .filter((c) => c.averageGrade != null)
      .map((c) => ({ name: c.className, avg: c.averageGrade })) ?? [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h4">Аналітика</Typography>
          <Typography variant="body2" color="text.secondary">
            Зведені показники успішності, відвідуваності та навантаження
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          label="Клас"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Уся школа</MenuItem>
          {classes.map((c: { id: string; name: string }) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {isError && <Alert severity="error">Не вдалося завантажити аналітику</Alert>}

      {isLoading && (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
      )}

      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Учнів" value={data.overview.students} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Вчителів" value={data.overview.teachers} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Класів" value={data.overview.classes} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard
                label="Середній бал"
                value={data.overview.averageGrade ?? '—'}
                sub={`${data.overview.gradedRecords} оцінок`}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Домашніх завдань" value={data.overview.homework} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <StatCard label="Батьків" value={data.overview.parents} />
            </Grid>
          </Grid>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Огляд" />
            <Tab label="Класи" />
            <Tab label="Вчителі" />
            <Tab label="Предмети" />
          </Tabs>

          {tab === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Учні по паралелях
                </Typography>
                <Paper sx={{ p: 2, height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.enrollmentByGrade}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" tickFormatter={(g) => `${g} кл.`} />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(v: number, name: string) => [v, name === 'students' ? 'Учнів' : 'Класів']} />
                      <Legend />
                      <Bar dataKey="students" fill="#1565c0" name="Учнів" />
                      <Bar dataKey="classes" fill="#90caf9" name="Класів" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Розподіл оцінок
                </Typography>
                <Paper sx={{ p: 2, height: 300 }}>
                  {data.gradeDistribution.every((d) => d.count === 0) ? (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                      <Typography color="text.secondary">Ще немає оцінок у журналі</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.gradeDistribution}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ label, count }) => `${label}: ${count}`}
                        >
                          {data.gradeDistribution.map((d) => (
                            <Cell key={d.label} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Paper>
              </Grid>
              {classGradeChart.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" gutterBottom>
                    Середній бал по класах
                  </Typography>
                  <Paper sx={{ p: 2, height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classGradeChart} layout="vertical" margin={{ left: 48 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 12]} />
                        <YAxis type="category" dataKey="name" width={56} />
                        <Tooltip />
                        <Bar dataKey="avg" fill="#2e7d32" name="Середній бал" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              )}
              {data.studentsAtRisk.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" gutterBottom>
                    Потребують уваги
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    Учні з середнім балом нижче 6 або з 3+ пропусками
                  </Alert>
                  <Paper>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Учень</TableCell>
                          <TableCell>Клас</TableCell>
                          <TableCell>Середній бал</TableCell>
                          <TableCell>Пропуски</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.studentsAtRisk.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.className}</TableCell>
                            <TableCell>{s.averageGrade ?? '—'}</TableCell>
                            <TableCell>{s.absences}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}

          {tab === 1 && (
            <Paper>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Клас</TableCell>
                    <TableCell align="right">Учнів</TableCell>
                    <TableCell align="right">Сер. бал</TableCell>
                    <TableCell align="right">Відвідуваність</TableCell>
                    <TableCell align="right">Пропуски</TableCell>
                    <TableCell align="right">ДЗ</TableCell>
                    <TableCell align="right">Прострочено</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.classStats.map((c) => (
                    <TableRow key={c.classId} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{c.className}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.assignmentsCount} призначень
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{c.studentCount}</TableCell>
                      <TableCell align="right">
                        {c.averageGrade != null ? (
                          <Chip
                            label={c.averageGrade}
                            size="small"
                            color={c.averageGrade >= 9 ? 'success' : c.averageGrade >= 6 ? 'default' : 'error'}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {c.attendanceRate != null ? `${c.attendanceRate}%` : '—'}
                      </TableCell>
                      <TableCell align="right">{c.absentCount}</TableCell>
                      <TableCell align="right">{c.homeworkCount}</TableCell>
                      <TableCell align="right">
                        {c.overdueHomework > 0 ? (
                          <Chip label={c.overdueHomework} size="small" color="warning" />
                        ) : (
                          0
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {tab === 2 && (
            <>
              <Typography variant="h6" gutterBottom>
                Навантаження вчителів (уроки / тиждень)
              </Typography>
              <Paper sx={{ p: 2, height: 360, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teacherChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="lessons" fill="#1565c0" name="Уроків у розкладі" />
                    <Bar dataKey="assignments" fill="#7b1fa2" name="Призначень" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Вчитель</TableCell>
                      <TableCell align="right">Уроків / тиждень</TableCell>
                      <TableCell align="right">Призначень</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.teacherLoad.map((t) => (
                      <TableRow key={t.teacher.id}>
                        <TableCell>
                          {t.teacher.lastName} {t.teacher.firstName}
                        </TableCell>
                        <TableCell align="right">{t.lessonsPerWeek}</TableCell>
                        <TableCell align="right">{t.assignmentsCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}

          {tab === 3 && (
            <>
              {data.subjectStats.length === 0 ? (
                <Alert severity="info">Немає оцінок у журналі для побудови статистики по предметах</Alert>
              ) : (
                <>
                  <Paper sx={{ p: 2, height: 360, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.subjectStats.map((s) => ({
                          name: s.subjectName,
                          avg: s.averageGrade,
                          count: s.recordsCount,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={80} />
                        <YAxis domain={[0, 12]} />
                        <Tooltip />
                        <Bar dataKey="avg" fill="#1565c0" name="Середній бал" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                  <Paper>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Предмет</TableCell>
                          <TableCell align="right">Оцінок у журналі</TableCell>
                          <TableCell align="right">Середній бал</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.subjectStats.map((s) => (
                          <TableRow key={s.subjectId}>
                            <TableCell>{s.subjectName}</TableCell>
                            <TableCell align="right">{s.recordsCount}</TableCell>
                            <TableCell align="right">{s.averageGrade ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
