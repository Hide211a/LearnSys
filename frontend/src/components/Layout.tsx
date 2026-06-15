import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NotificationBell } from './NotificationBell';
import { ChildSelector } from './ChildSelector';
import { ParentChildProvider } from '../context/ParentChildContext';
import api from '../api/client';

const NAV: Record<string, { label: string; path: string; icon: string }[]> = {
  ADMIN: [
    { label: 'Панель', path: '/admin', icon: '📊' },
    { label: 'Навч. рік', path: '/admin/school-years', icon: '📆' },
    { label: 'Класи', path: '/admin/classes', icon: '🏫' },
    { label: 'Предмети', path: '/admin/subjects', icon: '📚' },
    { label: 'Користувачі', path: '/admin/users', icon: '👥' },
    { label: 'Призначення', path: '/admin/assignments', icon: '🔗' },
    { label: 'Розклад', path: '/admin/schedule', icon: '📅' },
    { label: 'Події', path: '/admin/events', icon: '🎉' },
    { label: 'Аналітика', path: '/admin/analytics', icon: '📈' },
    { label: 'Оголошення', path: '/announcements', icon: '📢' },
  ],
  TEACHER: [
    { label: 'Панель', path: '/teacher', icon: '📊' },
    { label: 'Мої класи', path: '/teacher/classes', icon: '🏫' },
    { label: 'Розклад', path: '/teacher/schedule', icon: '📅' },
    { label: 'Журнал', path: '/teacher/journal', icon: '📝' },
    { label: 'Домашні завдання', path: '/teacher/homework', icon: '✏️' },
    { label: 'Матеріали', path: '/teacher/materials', icon: '📎' },
    { label: 'Тести', path: '/teacher/quizzes', icon: '❓' },
    { label: 'Опитування', path: '/teacher/polls', icon: '📊' },
    { label: 'Аналітика', path: '/teacher/analytics', icon: '📈' },
    { label: 'Оголошення', path: '/announcements', icon: '📢' },
  ],
  STUDENT: [
    { label: 'Панель', path: '/student', icon: '📊' },
    { label: 'Розклад', path: '/student/schedule', icon: '📅' },
    { label: 'Домашні завдання', path: '/student/homework', icon: '✏️' },
    { label: 'Оцінки', path: '/student/grades', icon: '⭐' },
    { label: 'Матеріали', path: '/student/materials', icon: '📎' },
    { label: 'Тести', path: '/student/quizzes', icon: '❓' },
    { label: 'Опитування', path: '/student/polls', icon: '📊' },
    { label: 'Оголошення', path: '/announcements', icon: '📢' },
    { label: 'Календар', path: '/events', icon: '🎉' },
  ],
  PARENT: [
    { label: 'Зведення', path: '/parent', icon: '📊' },
    { label: 'Домашні завдання', path: '/parent/homework', icon: '✏️' },
    { label: 'Оцінки', path: '/parent/grades', icon: '⭐' },
    { label: 'Розклад', path: '/parent/schedule', icon: '📅' },
    { label: 'Матеріали', path: '/parent/materials', icon: '📎' },
    { label: 'Тести', path: '/parent/quizzes', icon: '❓' },
    { label: 'Оголошення', path: '/announcements', icon: '📢' },
    { label: 'Календар', path: '/events', icon: '🎉' },
  ],
};

const DRAWER_WIDTH = 260;

export function Layout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setOpen(!mobile);
  }, [mobile]);

  const items = user ? NAV[user.role] ?? [] : [];
  const canSearch = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    try {
      const { data } = await api.get('/search', { params: { q: search } });
      const total = (data.users?.length ?? 0) + (data.subjects?.length ?? 0) + (data.homework?.length ?? 0);
      showToast(
        total
          ? `Знайдено: ${data.users?.length ?? 0} користувачів, ${data.subjects?.length ?? 0} предметів, ${data.homework?.length ?? 0} завдань`
          : 'Нічого не знайдено',
        total ? 'info' : 'warning'
      );
    } catch {
      showToast('Помилка пошуку', 'error');
    }
  };

  const searchField = (
    <TextField
      size="small"
      placeholder="Пошук..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      fullWidth={mobile}
      sx={{
        bgcolor: mobile ? undefined : 'rgba(255,255,255,0.15)',
        borderRadius: 1,
        input: mobile ? undefined : { color: 'white' },
        minWidth: mobile ? undefined : 180,
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: mobile ? 'action.active' : 'rgba(255,255,255,0.7)' }} />
          </InputAdornment>
        ),
      }}
    />
  );

  const drawer = (
    <Box>
      <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <SchoolIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            Кузьмівська гімназія
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Степанська громада
        </Typography>
      </Toolbar>
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={
              item.path === '/parent'
                ? location.pathname === '/parent'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            }
            onClick={() => mobile && setOpen(false)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <ListItemButton component={RouterLink} to="/profile" onClick={() => mobile && setOpen(false)}>
          <ListItemIcon sx={{ minWidth: 36 }}>👤</ListItemIcon>
          <ListItemText primary="Профіль" />
        </ListItemButton>
      </List>
      {canSearch && mobile && (
        <Box component="form" onSubmit={handleSearch} sx={{ px: 2, pb: 2 }}>
          {searchField}
        </Box>
      )}
    </Box>
  );

  const toggleDrawer = () => {
    setOpen((prev) => !prev);
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const willOpen = !open;
    toggleDrawer();
    // На мобільному Drawer ставить aria-hidden на #root, але фокус лишається на кнопці меню — Chrome попереджає
    if (mobile && willOpen) {
      e.currentTarget.blur();
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ flexWrap: { xs: 'nowrap', sm: 'wrap' }, gap: 0.5 }}>
          <IconButton color="inherit" edge="start" onClick={handleMenuClick} sx={{ mr: { xs: 0, sm: 1 } }} aria-label="меню">
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' }, minWidth: 0 }}
          >
            Освітня платформа
          </Typography>
          {canSearch && (
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{ mr: { xs: 0, md: 2 }, display: { xs: 'none', md: 'block' }, flexShrink: 0 }}
            >
              {searchField}
            </Box>
          )}
          <ChildSelector compact={mobile} />
          <Typography variant="body2" sx={{ mr: { xs: 0.5, sm: 2 }, display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
            {user?.lastName} {user?.firstName}
          </Typography>
          <NotificationBell />
          <IconButton color="inherit" onClick={() => { logout(); navigate('/'); }} aria-label="вийти">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={mobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{
          keepMounted: true,
          disableRestoreFocus: mobile,
        }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: {
            md: open ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        <ParentChildProvider>
          <Outlet />
        </ParentChildProvider>
      </Box>
    </Box>
  );
}
