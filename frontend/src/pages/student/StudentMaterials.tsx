import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Link,
  TextField,
  MenuItem,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';

type Material = {
  id: string;
  title: string;
  linkUrl?: string | null;
  subject: { name: string };
  lessonDate: string;
};

export default function StudentMaterials() {
  const [subjectFilter, setSubjectFilter] = useState('');

  const { data: materials = [] } = useQuery({
    queryKey: ['student-materials'],
    queryFn: async () => (await api.get('/student/materials')).data as Material[],
  });

  const subjects = useMemo(() => {
    const set = new Set(materials.map((m) => m.subject.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [materials]);

  const filtered = useMemo(() => {
    if (!subjectFilter) return materials;
    return materials.filter((m) => m.subject.name === subjectFilter);
  }, [materials, subjectFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of filtered) {
      if (!map.has(m.subject.name)) map.set(m.subject.name, []);
      map.get(m.subject.name)!.push(m);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Матеріали уроків
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Презентації, посилання та матеріали від вчителів
      </Typography>

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center">
        <Chip label={`${materials.length} матеріалів`} variant="outlined" />
        <TextField
          select
          size="small"
          label="Предмет"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Усі</MenuItem>
          {subjects.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {materials.length === 0 && (
        <Alert severity="info">Матеріалів поки немає</Alert>
      )}

      {grouped.map(([subject, items]) => (
        <Box key={subject} mb={3}>
          <Typography variant="h6" gutterBottom>
            {subject}
          </Typography>
          {items.map((m) => (
            <Card key={m.id} sx={{ mb: 1 }} variant="outlined">
              <CardContent>
                <Typography fontWeight={600}>{m.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(m.lessonDate), 'd MMMM yyyy', { locale: uk })}
                </Typography>
                {m.linkUrl && (
                  <Link href={m.linkUrl} target="_blank" rel="noreferrer" sx={{ mt: 1, display: 'inline-block' }}>
                    Відкрити матеріал
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ))}
    </Box>
  );
}
