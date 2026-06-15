import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export const SCHEDULE_DAYS = ['', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця"] as const;

const MAX_LESSONS = 8;

export type ScheduleSlotView = {
  id: string;
  dayOfWeek: number;
  lessonNumber: number;
  room?: string;
  isSubstitution?: boolean;
  note?: string;
  subject: { name: string };
  teacher?: { firstName: string; lastName: string };
  classGroup?: { name: string };
};

export function ScheduleGrid({
  slots,
  showClass,
  onSlotClick,
  onEmptyCellClick,
  maxLessons = MAX_LESSONS,
}: {
  slots: ScheduleSlotView[];
  showClass?: boolean;
  onSlotClick?: (slot: ScheduleSlotView) => void;
  onEmptyCellClick?: (day: number, lesson: number) => void;
  maxLessons?: number;
}) {
  const grid: Record<string, ScheduleSlotView> = {};
  for (const s of slots) {
    grid[`${s.dayOfWeek}-${s.lessonNumber}`] = s;
  }

  const lessonRows = Array.from({ length: maxLessons }, (_, i) => i + 1);

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.100', minWidth: 48 }}>№</TableCell>
            {SCHEDULE_DAYS.slice(1).map((d) => (
              <TableCell key={d} sx={{ fontWeight: 700, bgcolor: 'grey.100', minWidth: 130 }}>
                {d}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {lessonRows.map((lesson) => (
            <TableRow key={lesson}>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>{lesson}</TableCell>
              {[1, 2, 3, 4, 5].map((day) => {
                const slot = grid[`${day}-${lesson}`];
                const clickableEmpty = !slot && onEmptyCellClick;
                const clickableFilled = slot && onSlotClick;

                return (
                  <TableCell
                    key={day}
                    sx={{
                      minWidth: 130,
                      verticalAlign: 'top',
                      p: 1,
                      cursor: clickableEmpty || clickableFilled ? 'pointer' : 'default',
                      bgcolor: slot
                        ? slot.isSubstitution
                          ? 'warning.50'
                          : 'background.paper'
                        : clickableEmpty
                          ? 'action.hover'
                          : undefined,
                      border: clickableEmpty ? '1px dashed' : undefined,
                      borderColor: clickableEmpty ? 'divider' : undefined,
                      '&:hover':
                        clickableEmpty || clickableFilled
                          ? { bgcolor: slot ? 'primary.50' : 'primary.100' }
                          : undefined,
                    }}
                    onClick={() => {
                      if (slot && onSlotClick) onSlotClick(slot);
                      else if (!slot && onEmptyCellClick) onEmptyCellClick(day, lesson);
                    }}
                  >
                    {slot ? (
                      <Tooltip
                        title={
                          [
                            slot.note,
                            slot.isSubstitution ? 'Заміна' : null,
                            onSlotClick ? 'Клік — редагувати' : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'Урок'
                        }
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
                            {slot.subject.name}
                          </Typography>
                          {slot.teacher && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {slot.teacher.lastName} {slot.teacher.firstName[0]}.
                            </Typography>
                          )}
                          {showClass && slot.classGroup && (
                            <Typography variant="caption" display="block" color="primary.main">
                              {slot.classGroup.name}
                            </Typography>
                          )}
                          {slot.room && (
                            <Typography variant="caption" display="block">
                              каб. {slot.room}
                            </Typography>
                          )}
                          {slot.isSubstitution && (
                            <Chip label="Заміна" size="small" color="warning" sx={{ mt: 0.5, height: 20 }} />
                          )}
                        </Box>
                      </Tooltip>
                    ) : clickableEmpty ? (
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        minHeight={56}
                        color="text.disabled"
                      >
                        <AddIcon fontSize="small" />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled" textAlign="center">
                        —
                      </Typography>
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
