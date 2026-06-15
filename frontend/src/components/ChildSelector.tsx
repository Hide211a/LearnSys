import { FormControl, InputLabel, MenuItem, Select, Typography, Box } from '@mui/material';
import { useParentChild } from '../context/ParentChildContext';

export function ChildSelector({ compact }: { compact?: boolean }) {
  const { isParent, children, childId, setChildId } = useParentChild();

  if (!isParent || children.length === 0) return null;

  if (children.length === 1) {
    const c = children[0];
    return (
      <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
        {c.lastName} {c.firstName}
        {c.classGroup ? ` · ${c.classGroup.name}` : ''}
      </Typography>
    );
  }

  return (
    <Box sx={{ mr: { xs: 0.5, sm: 2 }, minWidth: 0, maxWidth: compact ? { xs: 130, sm: 200 } : { xs: 150, sm: 220 } }}>
      <FormControl size="small" fullWidth hiddenLabel={compact} sx={{ minWidth: compact ? { xs: 120, sm: 160 } : { xs: 140, sm: 180 } }}>
        {!compact && <InputLabel id="child-select-label">Дитина</InputLabel>}
        <Select
          labelId="child-select-label"
          label={compact ? undefined : 'Дитина'}
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          sx={{
            bgcolor: 'rgba(255,255,255,0.12)',
            color: 'white',
            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            '.MuiSvgIcon-root': { color: 'white' },
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
          }}
        >
          {children.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.lastName} {c.firstName}
              {c.classGroup ? ` (${c.classGroup.name})` : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

export function ChildSelectorField({ sx }: { sx?: object }) {
  const { isParent, children, childId, setChildId } = useParentChild();

  if (!isParent || children.length <= 1) return null;

  return (
    <FormControl size="small" fullWidth sx={{ mb: 2, maxWidth: 400, ...sx }}>
      <InputLabel>Дитина</InputLabel>
      <Select label="Дитина" value={childId} onChange={(e) => setChildId(e.target.value)}>
        {children.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.lastName} {c.firstName}
            {c.classGroup ? ` · клас ${c.classGroup.name}` : ''}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
