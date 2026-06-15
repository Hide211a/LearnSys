import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { email: 'admin@kuzgym.local', role: 'Адміністратор' },
  { email: 'teacher@kuzgym.local', role: 'Вчитель (математика)' },
  { email: 'teacher6@kuzgym.local', role: 'Вчитель (українська)' },
  { email: 'teacher2@kuzgym.local', role: 'Вчитель (англ., іст.)' },
  { email: 'teacher3@kuzgym.local', role: 'Вчитель (гео., біо.)' },
  { email: 'student1@kuzgym.local', role: 'Учень 5-А' },
  { email: 's6a3@kuzgym.local', role: 'Учень 6-А' },
  { email: 's11b5@kuzgym.local', role: 'Учень 11-Б' },
  { email: 'parent@kuzgym.local', role: 'Батько (діти 5-А, 6-А)' },
  { email: 'parent2@kuzgym.local', role: 'Батько (дитина 7-А)' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('teacher@kuzgym.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/cabinet', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/cabinet');
    } catch {
      setError('Невірний email або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      py={{ xs: 2, sm: 4 }}
      sx={{
        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #f9a825 100%)',
      }}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Box textAlign="center" mb={2}>
          <Button component={RouterLink} to="/" variant="text" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            ← На головну
          </Button>
        </Box>
        <Card elevation={8}>
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Box textAlign="center" mb={3}>
              <SchoolIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight={700} mt={1} sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
                ЗЗСО «Кузьмівська гімназія»
              </Typography>
              <Typography color="text.secondary">
                Інтерактивна платформа освітнього процесу
              </Typography>
              <Typography variant="caption" display="block" mt={0.5}>
                Степанська територіальна громада
              </Typography>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
              />
              <Button fullWidth type="submit" variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
                Увійти
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" mt={3} mb={1}>
              Демо-облікові записи (пароль: password123):
            </Typography>
            <Stack spacing={1}>
              {DEMO.map((d) => (
                <Button
                  key={d.email}
                  size="small"
                  variant="outlined"
                  className="btn-wrap-text"
                  sx={{ py: 1 }}
                  onClick={() => {
                    setEmail(d.email);
                    setPassword('password123');
                  }}
                >
                  {d.role}: {d.email}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
