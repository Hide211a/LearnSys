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
import { useParentChild } from '../../context/ParentChildContext';
import { ChildSelectorField } from '../../components/ChildSelector';

type Material = {
  id: string;
  title: string;
  linkUrl?: string | null;
  subject: { name: string };
  lessonDate: string;
};

export default function ParentMaterials() {
  const { childId, childParams } = useParentChild();
  const [subjectFilter, setSubjectFilter] = useState('');

  const { data: materials = [] } = useQuery({
    queryKey: ['parent-materials', childId],
    queryFn: async () => (await api.get('/student/materials', childParams)).data as Material[],
    enabled: !!childId,
  });

  const subjects = useMemo(() => {
    const set = new Set(materials.map((m) => m.subject.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [materials]);

  const filtered = useMemo(() => {
    if (!subjectFilter) return materials;
    return materials.filter((m) => m.subject.name === subjectFilter);
  }, [materials, subjectFilter]);

  if (!childId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Матеріали
        </Typography>
        <Alert severity="info">Оберіть дитину на головній сторінці</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Навчальні матеріали
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Презентації та матеріали з уроків класу дитини
      </Typography>
      <ChildSelectorField />

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

      {filtered.length === 0 && <Alert severity="info">Матеріалів поки немає</Alert>}

      <Stack spacing={2}>
        {filtered.map((m) => (
          <Card key={m.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6">{m.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.subject.name} · {format(new Date(m.lessonDate), 'd MMMM yyyy', { locale: uk })}
                  </Typography>
                  {m.linkUrl && (
                    <Link href={m.linkUrl} target="_blank" rel="noopener noreferrer" sx={{ mt: 1, display: 'block' }}>
                      Відкрити матеріал
                    </Link>
                  )}
                </Box>
                <Chip label={m.subject.name} size="small" variant="outlined" />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
