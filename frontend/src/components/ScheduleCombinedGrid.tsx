import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import { SCHEDULE_DAYS, type ScheduleSlotView } from './ScheduleGrid';

const MAX_LESSONS = 8;

type Slot = ScheduleSlotView & {
  classGroup?: { id: string; name: string };
};

export function ScheduleCombinedGrid({
  slots,
  onSlotClick,
}: {
  slots: Slot[];
  onSlotClick?: (slot: Slot) => void;
}) {
  const grid: Record<string, Slot[]> = {};
  for (const s of slots) {
    const key = `${s.dayOfWeek}-${s.lessonNumber}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(s);
  }

  for (const key of Object.keys(grid)) {
    grid[key].sort((a, b) =>
      (a.classGroup?.name ?? '').localeCompare(b.classGroup?.name ?? '', 'uk')
    );
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.100', minWidth: 48 }}>№</TableCell>
            {SCHEDULE_DAYS.slice(1).map((d) => (
              <TableCell key={d} sx={{ fontWeight: 700, bgcolor: 'grey.100', minWidth: 160 }}>
                {d}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: MAX_LESSONS }, (_, i) => i + 1).map((lesson) => (
            <TableRow key={lesson}>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>{lesson}</TableCell>
              {[1, 2, 3, 4, 5].map((day) => {
                const cellSlots = grid[`${day}-${lesson}`] ?? [];
                return (
                  <TableCell
                    key={day}
                    sx={{ verticalAlign: 'top', p: 0.75, minWidth: 160 }}
                  >
                    {cellSlots.length === 0 ? (
                      <Typography variant="body2" color="text.disabled" textAlign="center">
                        —
                      </Typography>
                    ) : (
                      <Box display="flex" flexDirection="column" gap={0.75}>
                        {cellSlots.map((slot) => (
                          <Tooltip
                            key={slot.id}
                            title={
                              [
                                slot.teacher
                                  ? `${slot.teacher.lastName} ${slot.teacher.firstName}`
                                  : null,
                                slot.room ? `каб. ${slot.room}` : null,
                                slot.note,
                                onSlotClick ? 'Клік — редагувати' : null,
                              ]
                                .filter(Boolean)
                                .join(' · ') || slot.subject.name
                            }
                          >
                            <Box
                              onClick={() => onSlotClick?.(slot)}
                              sx={{
                                p: 0.75,
                                borderRadius: 1,
                                border: 1,
                                borderColor: 'divider',
                                bgcolor: slot.isSubstitution ? 'warning.50' : 'grey.50',
                                cursor: onSlotClick ? 'pointer' : 'default',
                                '&:hover': onSlotClick ? { bgcolor: 'primary.50', borderColor: 'primary.light' } : undefined,
                              }}
                            >
                              <Chip
                                label={slot.classGroup?.name ?? '—'}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mb: 0.25, height: 20, fontSize: '0.7rem' }}
                              />
                              <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                                {slot.subject.name}
                              </Typography>
                              {slot.teacher && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {slot.teacher.lastName} {slot.teacher.firstName[0]}.
                                </Typography>
                              )}
                              {slot.isSubstitution && (
                                <Chip label="заміна" size="small" color="warning" sx={{ mt: 0.25, height: 18 }} />
                              )}
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
