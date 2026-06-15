import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Roboto з vfs_fonts підтримує кирилицю (українська)
const vfs =
  (pdfFonts as { pdfMake?: { vfs: Record<string, string> } }).pdfMake?.vfs ??
  (pdfFonts as { default?: { pdfMake?: { vfs: Record<string, string> } } }).default?.pdfMake?.vfs;

if (vfs) {
  (pdfMake as { vfs: Record<string, string> }).vfs = vfs;
}

const ATTENDANCE_UK: Record<string, string> = {
  PRESENT: 'Присутній',
  ABSENT: 'Відсутній',
  LATE: 'Запізнення',
  EXCUSED: 'Поважна причина',
};

export type JournalPdfRow = {
  lastName: string;
  firstName: string;
  grade: string | number;
  attendance: string;
  topic: string;
};

export function exportJournalPdf(options: {
  lessonDate: string;
  className: string;
  subjectName: string;
  rows: JournalPdfRow[];
  fileName?: string;
}) {
  const { lessonDate, className, subjectName, rows, fileName } = options;

  const headerRow = [
    { text: '№', style: 'tableHeader' },
    { text: 'Прізвище', style: 'tableHeader' },
    { text: "Ім'я", style: 'tableHeader' },
    { text: 'Оцінка', style: 'tableHeader' },
    { text: 'Відвідуваність', style: 'tableHeader' },
    { text: 'Тема уроку', style: 'tableHeader' },
  ];

  const tableBody = [
    headerRow,
    ...rows.map((r, i) => [
      i + 1,
      r.lastName,
      r.firstName,
      r.grade ?? '—',
      ATTENDANCE_UK[r.attendance] ?? r.attendance,
      r.topic || '—',
    ]),
  ];

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [40, 50, 40, 40],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
      subtitle: { fontSize: 11, color: '#444444', margin: [0, 0, 0, 16] },
      tableHeader: { bold: true, fillColor: '#1565c0', color: '#ffffff', alignment: 'center' },
    },
    content: [
      { text: 'ЗЗСО «Кузьмівська гімназія»', style: 'title' },
      { text: 'Електронний журнал', style: 'title', fontSize: 14 },
      {
        text: `Клас: ${className}  |  Предмет: ${subjectName}  |  Дата уроку: ${lessonDate}`,
        style: 'subtitle',
      },
      {
        table: {
          headerRows: 1,
          widths: [25, '*', '*', 45, 80, '*'],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#1565c0' : rowIndex % 2 === 1 ? '#f5f7fa' : null),
          hLineColor: () => '#cccccc',
          vLineColor: () => '#cccccc',
        },
      },
      {
        text: `Сформовано: ${new Date().toLocaleString('uk-UA')}`,
        fontSize: 8,
        color: '#888888',
        margin: [0, 12, 0, 0],
      },
    ],
  };

  pdfMake.createPdf(docDefinition).download(fileName ?? `journal-${lessonDate}.pdf`);
}
