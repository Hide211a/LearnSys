import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  ListItemText,
  Divider,
  Button,
  Box,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export function NotificationBell() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 30000,
  });

  const unread = notifications.filter((n: { isRead: boolean }) => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)}>
        <Badge badgeContent={unread} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: {
            width: { xs: 'min(100vw - 24px, 360px)', sm: 360 },
            maxHeight: { xs: '70vh', sm: 400 },
          },
        }}
      >
        <Box px={2} py={1} display="flex" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={600}>Сповіщення</Typography>
          {unread > 0 && (
            <Button size="small" onClick={() => markAll.mutate()}>
              Прочитати всі
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 && (
          <MenuItem disabled>Немає сповіщень</MenuItem>
        )}
        {notifications.map((n: { id: string; title: string; message: string; link?: string; isRead: boolean; createdAt: string }) => (
          <MenuItem
            key={n.id}
            onClick={() => {
              markRead.mutate(n.id);
              setAnchor(null);
              if (n.link) navigate(n.link);
            }}
            sx={{ bgcolor: n.isRead ? undefined : 'action.hover', whiteSpace: 'normal' }}
          >
            <ListItemText
              primary={n.title}
              secondary={
                <>
                  {n.message}
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(n.createdAt), 'd MMM, HH:mm', { locale: uk })}
                  </Typography>
                </>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
