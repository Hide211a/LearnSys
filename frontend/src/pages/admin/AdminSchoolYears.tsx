import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Chip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

type SchoolYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  _count: { classes: number };
};

export default function AdminSchoolYears() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: true,
  });

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: async () => (await api.get('/admin/school-years')).data as SchoolYear[],
  });

  const create = useMutation({
    mutationFn: () => api.post('/admin/school-years', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['years'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setOpen(false);
      showToast('Навчальний рік створено', 'success');
    },
    onError: () => showToast('Не вдалося створити рік', 'error'),
  });

  const setCurrent = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/school-years/${id}`, { isCurrent: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['years'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      showToast('Поточний рік оновлено', 'success');
    },
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h4">Навчальні роки</Typography>
          <Typography color="text.secondary" variant="body2">
            Поточний рік використовується при створенні нових класів
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Додати рік
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Назва</TableCell>
              <TableCell>Період</TableCell>
              <TableCell>Класів</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {years.map((y) => (
              <TableRow key={y.id}>
                <TableCell>{y.name}</TableCell>
                <TableCell>
                  {format(new Date(y.startDate), 'd MMM yyyy', { locale: uk })} —{' '}
                  {format(new Date(y.endDate), 'd MMM yyyy', { locale: uk })}
                </TableCell>
                <TableCell>{y._count.classes}</TableCell>
                <TableCell>
                  {y.isCurrent ? (
                    <Chip label="Поточний" color="primary" size="small" />
                  ) : (
                    <Chip label="Архів" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  {!y.isCurrent && (
                    <Button size="small" onClick={() => setCurrent.mutate(y.id)}>
                      Зробити поточним
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новий навчальний рік</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Назва (напр. 2026–2027)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="date"
            label="Початок"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="date"
            label="Кінець"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isCurrent}
                onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
              />
            }
            label="Зробити поточним"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => create.mutate()} disabled={!form.name || !form.startDate || !form.endDate}>
            Створити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
