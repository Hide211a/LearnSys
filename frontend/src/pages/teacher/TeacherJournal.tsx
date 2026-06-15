import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  MenuItem,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { exportJournalPdf } from '../../utils/exportJournalPdf';

type RowDraft = { grade: string; attendance: string; topic: string };

type Student = { id: string; lastName: string; firstName: string };

type JournalSavePayload = {
  date: string;
  classGroupId: string;
  subjectId: string;
  studentId: string;
  studentName: string;
  grade: number | null;
  attendance: string;
  topic: string;
};

function buildPayload(
  student: Student,
  draft: RowDraft,
  lessonDate: string,
  classGroupId: string,
  subjectId: string
): JournalSavePayload {
  return {
    date: lessonDate,
    classGroupId,
    subjectId,
    studentId: student.id,
    studentName: `${student.lastName} ${student.firstName}`,
    grade: draft.grade ? Number(draft.grade) : null,
    attendance: draft.attendance,
    topic: draft.topic,
  };
}

function payloadToEntry(payload: JournalSavePayload) {
  const { studentName: _, ...entry } = payload;
  return entry;
}

export default function TeacherJournal() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [classGroupId, setClassGroupId] = useState(() => searchParams.get('classGroupId') ?? '');
  const [subjectId, setSubjectId] = useState(() => searchParams.get('subjectId') ?? '');
  const [lessonDate, setLessonDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-classes'],
    queryFn: async () => (await api.get('/teacher/my-classes')).data,
  });

  const from = format(startOfMonth(new Date(lessonDate)), 'yyyy-MM-dd');
  const to = format(endOfMonth(new Date(lessonDate)), 'yyyy-MM-dd');

  const { data: journal } = useQuery({
    queryKey: ['journal', classGroupId, subjectId, from, to],
    queryFn: async () =>
      (await api.get('/teacher/journal', { params: { classGroupId, subjectId, from, to } })).data,
    enabled: !!classGroupId && !!subjectId,
  });

  const getRecord = useCallback(
    (studentId: string) =>
      journal?.records?.find(
        (r: { studentId: string; date: string }) =>
          r.studentId === studentId && format(new Date(r.date), 'yyyy-MM-dd') === lessonDate
      ),
    [journal?.records, lessonDate]
  );

  useEffect(() => {
    if (!journal?.students) return;
    const next: Record<string, RowDraft> = {};
    for (const s of journal.students as Student[]) {
      const r = getRecord(s.id);
      next[s.id] = {
        grade: r?.grade?.toString() ?? '',
        attendance: r?.attendance ?? 'PRESENT',
        topic: r?.topic ?? '',
      };
    }
    setDrafts(next);
  }, [journal?.students, lessonDate, classGroupId, subjectId, getRecord]);

  const updateDraft = (studentId: string, field: keyof RowDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const save = useMutation({
    mutationFn: (body: JournalSavePayload) =>
      api.post('/teacher/journal', payloadToEntry(body)).then(() => body),
    onMutate: (body) => setSavingStudentId(body.studentId),
    onSuccess: (body) => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      showToast(`Запис збережено: ${body.studentName}`, 'success');
    },
    onError: () => showToast('Не вдалося зберегти запис. Спробуйте ще раз.', 'error'),
    onSettled: () => setSavingStudentId(null),
  });

  const saveAll = useMutation({
    mutationFn: async (entries: ReturnType<typeof payloadToEntry>[]) => {
      const { data } = await api.post('/teacher/journal/bulk', { entries });
      return data as { saved: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      showToast(`Збережено записів: ${data.saved}`, 'success');
    },
    onError: () => showToast('Не вдалося зберегти журнал. Спробуйте ще раз.', 'error'),
  });

  const isBusy = save.isPending || saveAll.isPending;

  const handleSaveAll = () => {
    if (!journal?.students?.length) return;
    const entries = (journal.students as Student[]).map((s) =>
      payloadToEntry(buildPayload(s, drafts[s.id] ?? { grade: '', attendance: 'PRESENT', topic: '' }, lessonDate, classGroupId, subjectId))
    );
    saveAll.mutate(entries);
  };

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a: { classGroup: { id: string; name: string } }) =>
      map.set(a.classGroup.id, a.classGroup.name)
    );
    return [...map.entries()];
  }, [assignments]);

  const subjectOptions = assignments
    .filter((a: { classGroup: { id: string } }) => a.classGroup.id === classGroupId)
    .map((a: { subject: { id: string; name: string } }) => a.subject);

  const selectedClass = classOptions.find(([id]) => id === classGroupId)?.[1] ?? '';
  const selectedSubject = subjectOptions.find((s: { id: string }) => s.id === subjectId)?.name ?? '';

  const exportPdf = () => {
    if (!journal?.students?.length) {
      showToast('Немає даних для експорту', 'warning');
      return;
    }
    const rows = (journal.students as Student[]).map((s) => {
      const d = drafts[s.id];
      return {
        lastName: s.lastName,
        firstName: s.firstName,
        grade: d?.grade || '—',
        attendance: d?.attendance ?? 'PRESENT',
        topic: d?.topic ?? '',
      };
    });
    exportJournalPdf({ lessonDate, className: selectedClass, subjectName: selectedSubject, rows });
    showToast('Журнал експортовано у PDF', 'info');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Електронний журнал
      </Typography>
      <Box display="flex" gap={2} flexWrap="wrap" mb={2} alignItems="center">
        <TextField
          select
          label="Клас"
          value={classGroupId}
          onChange={(e) => {
            setClassGroupId(e.target.value);
            setSubjectId('');
          }}
          sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
        >
          {classOptions.map(([id, name]) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Предмет"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
          disabled={!classGroupId}
        >
          {subjectOptions.map((s: { id: string; name: string }) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label="Дата уроку"
          value={lessonDate}
          onChange={(e) => setLessonDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: { xs: '100%', sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
        />
        {journal && (
          <>
            <Button
              variant="contained"
              color="primary"
              startIcon={saveAll.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveAll}
              disabled={isBusy}
            >
              {saveAll.isPending ? 'Збереження...' : 'Зберегти всіх'}
            </Button>
            <Button onClick={exportPdf} disabled={isBusy}>
              Експорт PDF
            </Button>
          </>
        )}
      </Box>
      {journal && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Учень</TableCell>
                <TableCell>Оцінка</TableCell>
                <TableCell>Відвідуваність</TableCell>
                <TableCell>Тема</TableCell>
                <TableCell width={120} />
              </TableRow>
            </TableHead>
            <TableBody>
              {(journal.students as Student[]).map((s) => (
                <JournalRow
                  key={s.id}
                  student={s}
                  draft={drafts[s.id] ?? { grade: '', attendance: 'PRESENT', topic: '' }}
                  onDraftChange={(field, value) => updateDraft(s.id, field, value)}
                  isSaving={savingStudentId === s.id}
                  isDisabled={isBusy}
                  onSave={() =>
                    save.mutate(
                      buildPayload(
                        s,
                        drafts[s.id] ?? { grade: '', attendance: 'PRESENT', topic: '' },
                        lessonDate,
                        classGroupId,
                        subjectId
                      )
                    )
                  }
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function JournalRow({
  student,
  draft,
  onDraftChange,
  isSaving,
  isDisabled,
  onSave,
}: {
  student: Student;
  draft: RowDraft;
  onDraftChange: (field: keyof RowDraft, value: string) => void;
  isSaving: boolean;
  isDisabled: boolean;
  onSave: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        {student.lastName} {student.firstName}
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={draft.grade}
          onChange={(e) => onDraftChange('grade', e.target.value)}
          sx={{ width: 70 }}
          disabled={isDisabled}
        />
      </TableCell>
      <TableCell>
        <TextField
          select
          size="small"
          value={draft.attendance}
          onChange={(e) => onDraftChange('attendance', e.target.value)}
          sx={{ width: 130 }}
          disabled={isDisabled}
        >
          <MenuItem value="PRESENT">Присутній</MenuItem>
          <MenuItem value="ABSENT">Відсутній</MenuItem>
          <MenuItem value="LATE">Запізнення</MenuItem>
          <MenuItem value="EXCUSED">Поважна</MenuItem>
        </TextField>
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={draft.topic}
          onChange={(e) => onDraftChange('topic', e.target.value)}
          fullWidth
          disabled={isDisabled}
        />
      </TableCell>
      <TableCell>
        <Button
          size="small"
          variant="outlined"
          onClick={onSave}
          disabled={isDisabled || isSaving}
          startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {isSaving ? '...' : 'Зберегти'}
        </Button>
      </TableCell>
    </TableRow>
  );
}
