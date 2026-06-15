import { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [patronymic, setPatronymic] = useState(user?.patronymic ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  const save = async () => {
    await api.patch('/auth/profile', { firstName, lastName, patronymic, currentPassword, newPassword });
    await refreshUser();
    setMsg('Профіль збережено');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Профіль</Typography>
      <Paper sx={{ p: 3, maxWidth: 480 }}>
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
        <Typography variant="body2" color="text.secondary" mb={2}>
          {user?.email} · {user?.role}
          {user?.classGroup && ` · ${user.classGroup.name}`}
        </Typography>
        <TextField fullWidth label="Прізвище" value={lastName} onChange={(e) => setLastName(e.target.value)} margin="normal" />
        <TextField fullWidth label="Ім'я" value={firstName} onChange={(e) => setFirstName(e.target.value)} margin="normal" />
        <TextField fullWidth label="По батькові" value={patronymic} onChange={(e) => setPatronymic(e.target.value)} margin="normal" />
        <Typography variant="subtitle2" mt={2}>Зміна пароля</Typography>
        <TextField fullWidth type="password" label="Поточний пароль" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} margin="normal" />
        <TextField fullWidth type="password" label="Новий пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} margin="normal" />
        <Button variant="contained" onClick={save} sx={{ mt: 2 }}>Зберегти</Button>
      </Paper>
    </Box>
  );
}
