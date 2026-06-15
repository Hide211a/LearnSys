import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import InsightsIcon from '@mui/icons-material/Insights';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LoginIcon from '@mui/icons-material/Login';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: <MenuBookIcon fontSize="large" color="primary" />,
    title: 'Електронний журнал',
    text: 'Оцінки, відвідуваність і теми уроків у єдиній системі для вчителів та учнів.',
  },
  {
    icon: <CalendarMonthIcon fontSize="large" color="primary" />,
    title: 'Розклад і календар',
    text: 'Актуальний розклад занять, шкільні події та канікули в зручному вигляді.',
  },
  {
    icon: <InsightsIcon fontSize="large" color="primary" />,
    title: 'Аналітика успішності',
    text: 'Звіти для адміністрації та вчителів: динаміка оцінок, прострочені завдання.',
  },
  {
    icon: <FamilyRestroomIcon fontSize="large" color="primary" />,
    title: 'Кабінет батьків',
    text: 'Батьки бачать успішність, домашні завдання та розклад кожної дитини онлайн.',
  },
];

const ROLES = [
  { title: 'Адміністратор', desc: 'Класи, користувачі, розклад, події, аналітика школи' },
  { title: 'Вчитель', desc: 'Журнал, ДЗ, матеріали, тести, опитування' },
  { title: 'Учень', desc: 'Розклад, оцінки, здача завдань, навчальні матеріали' },
  { title: 'Батько', desc: 'Контроль навчального процесу дитини в реальному часі' },
];

const STATS = [
  { value: '5–11', label: 'класи навчання' },
  { value: '14', label: 'навчальних класів' },
  { value: '4', label: 'ролі користувачів' },
  { value: '24/7', label: 'доступ до платформи' },
];

const CABINET: Record<string, string> = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
  PARENT: '/parent',
};

export default function HomePage() {
  const { user } = useAuth();
  const theme = useTheme();

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar sx={{ gap: 1 }}>
          <SchoolIcon sx={{ mr: { xs: 0, sm: 1 }, flexShrink: 0 }} />
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ flexGrow: 1, minWidth: 0, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}
            noWrap
          >
            Кузьмівська гімназія
          </Typography>
          {user ? (
            <Button
              color="secondary"
              variant="contained"
              component={RouterLink}
              to={CABINET[user.role] ?? '/login'}
              startIcon={<DashboardIcon sx={{ display: { xs: 'none', sm: 'block' } }} />}
              size="small"
              sx={{ flexShrink: 0, px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Мій кабінет
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                Кабінет
              </Box>
            </Button>
          ) : (
            <Button
              color="secondary"
              variant="contained"
              component={RouterLink}
              to="/login"
              startIcon={<LoginIcon sx={{ display: { xs: 'none', sm: 'block' } }} />}
              size="small"
              sx={{ flexShrink: 0, px: { xs: 1.5, sm: 2 } }}
            >
              Увійти
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.main} 100%)`,
          color: '#fff',
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 2 }}>
                ЗЗСО «Кузьмівська гімназія»
              </Typography>
              <Typography
                variant="h3"
                fontWeight={800}
                mt={1}
                lineHeight={1.2}
                sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.75rem' } }}
              >
                Освіта, що поєднує традиції та сучасні технології
              </Typography>
              <Typography
                variant="h6"
                mt={2}
                sx={{ opacity: 0.92, fontWeight: 400, maxWidth: 560, fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}
              >
                Заклад загальної середньої освіти I–III ступенів у Степанській територіальній громаді.
                Інтерактивна платформа для організації навчального процесу — дипломний проєкт.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={4}>
                <Button
                  size="large"
                  variant="contained"
                  color="secondary"
                  component={RouterLink}
                  to={user ? (CABINET[user.role] ?? '/login') : '/login'}
                  startIcon={user ? <DashboardIcon /> : <LoginIcon />}
                >
                  {user ? 'Перейти в кабінет' : 'Увійти в систему'}
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
                  href="#about"
                >
                  Дізнатися більше
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card elevation={8} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <GroupsIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Про заклад
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Кузьмівка, Рівненська область
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Гімназія забезпечує якісну освіту учнів 5–11 класів, розвиває критичне мислення,
                    цифрову грамотність та відповідальне ставлення до навчання.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Платформа об’єднує вчителів, учнів, батьків та адміністрацію в єдиному
                    цифровому просторі школи.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats */}
      <Container maxWidth="lg" sx={{ mt: { xs: -2, sm: -3, md: -4 }, position: 'relative', zIndex: 1, px: { xs: 2, sm: 3 } }}>
        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ py: 3 }}>
            <Grid container spacing={2}>
              {STATS.map((s) => (
                <Grid key={s.label} size={{ xs: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h4" fontWeight={800} color="primary.main">
                      {s.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Container>

      {/* About */}
      <Container id="about" maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Наша місія
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              ЗЗСО «Кузьмівська гімназія» — це простір, де кожен учень отримує підтримку,
              а кожен вчитель має зручні інструменти для роботи. Ми прагнемо зробити освіту
              прозорою, доступною та орієнтованою на результат.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Ця веб-платформа — практичне втілення ідеї цифровізації школи: від електронного
              журналу до кабінету батьків із сповіщеннями про домашні завдання та оцінки.
            </Typography>
            <Stack spacing={1} mt={2}>
              {['Повна середня освіта (5–11 класи)', 'Профільні та базові предмети', 'Сучасний підхід до дистанційної взаємодії'].map((item) => (
                <Typography key={item} variant="body2">
                  ✓ {item}
                </Typography>
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Можливості платформи
            </Typography>
            <Grid container spacing={2}>
              {FEATURES.map((f) => (
                <Grid key={f.title} size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                    <CardContent>
                      <Box mb={1}>{f.icon}</Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {f.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {f.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>

      {/* Roles */}
      <Box sx={{ bgcolor: 'grey.100', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
            Для кого створена система
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={4} maxWidth={640} mx="auto">
            Єдиний портал з окремими кабінетами для всіх учасників освітнього процесу
          </Typography>
          <Grid container spacing={3}>
            {ROLES.map((r) => (
              <Grid key={r.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom>
                      {r.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {r.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Box
        sx={{
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: '#fff',
          py: 6,
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center', px: { xs: 2, sm: 3 } }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Готові переглянути систему в дії?
          </Typography>
          <Typography sx={{ opacity: 0.9, mb: 3 }}>
            Увійдіть за демо-обліковим записом на сторінці входу — пароль для всіх: password123
          </Typography>
          <Button
            size="large"
            variant="contained"
            color="secondary"
            component={RouterLink}
            to="/login"
            startIcon={<LoginIcon />}
          >
            Сторінка входу
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'grey.300', py: 4 }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" color="#fff" fontWeight={700} gutterBottom>
                ЗЗСО «Кузьмівська гімназія»
              </Typography>
              <Typography variant="body2">
                Степанська територіальна громада, Рівненська область
              </Typography>
              <Typography variant="body2" mt={1}>
                Інтерактивна платформа освітнього процесу — дипломний проєкт
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="#fff" gutterBottom>
                Технології проєкту
              </Typography>
              <Typography variant="body2">
                React · TypeScript · Node.js · Express · Prisma · SQLite
              </Typography>
            </Grid>
          </Grid>
          <Typography variant="caption" display="block" mt={3} sx={{ opacity: 0.6 }}>
            © {new Date().getFullYear()} ЗЗСО «Кузьмівська гімназія». Демонстраційна версія для навчальних цілей.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
