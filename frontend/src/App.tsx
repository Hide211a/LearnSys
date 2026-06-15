import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import EventsPage from './pages/EventsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClasses from './pages/admin/AdminClasses';
import AdminSubjects from './pages/admin/AdminSubjects';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminSchedule from './pages/admin/AdminSchedule';
import AdminEvents from './pages/admin/AdminEvents';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSchoolYears from './pages/admin/AdminSchoolYears';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherJournal from './pages/teacher/TeacherJournal';
import TeacherHomework from './pages/teacher/TeacherHomework';
import TeacherMaterials from './pages/teacher/TeacherMaterials';
import TeacherQuizzes from './pages/teacher/TeacherQuizzes';
import TeacherPolls from './pages/teacher/TeacherPolls';
import TeacherAnalytics from './pages/teacher/TeacherAnalytics';
import TeacherSchedule from './pages/teacher/TeacherSchedule';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentSchedule from './pages/student/StudentSchedule';
import StudentHomework from './pages/student/StudentHomework';
import StudentGrades from './pages/student/StudentGrades';
import StudentMaterials from './pages/student/StudentMaterials';
import StudentQuizzes from './pages/student/StudentQuizzes';
import StudentPolls from './pages/student/StudentPolls';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentGrades from './pages/parent/ParentGrades';
import ParentHomework from './pages/parent/ParentHomework';
import ParentSchedule from './pages/parent/ParentSchedule';
import ParentMaterials from './pages/parent/ParentMaterials';
import ParentQuizzes from './pages/parent/ParentQuizzes';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map: Record<string, string> = {
    ADMIN: '/admin',
    TEACHER: '/teacher',
    STUDENT: '/student',
    PARENT: '/parent',
  };
  return <Navigate to={map[user.role] ?? '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/cabinet" element={<HomeRedirect />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/events" element={<EventsPage />} />

        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/classes" element={<ProtectedRoute roles={['ADMIN']}><AdminClasses /></ProtectedRoute>} />
        <Route path="/admin/subjects" element={<ProtectedRoute roles={['ADMIN']}><AdminSubjects /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/assignments" element={<ProtectedRoute roles={['ADMIN']}><AdminAssignments /></ProtectedRoute>} />
        <Route path="/admin/schedule" element={<ProtectedRoute roles={['ADMIN']}><AdminSchedule /></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute roles={['ADMIN']}><AdminEvents /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute roles={['ADMIN']}><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/school-years" element={<ProtectedRoute roles={['ADMIN']}><AdminSchoolYears /></ProtectedRoute>} />

        <Route path="/teacher" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/classes" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherClasses /></ProtectedRoute>} />
        <Route path="/teacher/schedule" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherSchedule /></ProtectedRoute>} />
        <Route path="/teacher/journal" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherJournal /></ProtectedRoute>} />
        <Route path="/teacher/homework" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherHomework /></ProtectedRoute>} />
        <Route path="/teacher/materials" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherMaterials /></ProtectedRoute>} />
        <Route path="/teacher/quizzes" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherQuizzes /></ProtectedRoute>} />
        <Route path="/teacher/polls" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherPolls /></ProtectedRoute>} />
        <Route path="/teacher/analytics" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherAnalytics /></ProtectedRoute>} />

        <Route path="/student" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/schedule" element={<ProtectedRoute roles={['STUDENT']}><StudentSchedule /></ProtectedRoute>} />
        <Route path="/student/homework" element={<ProtectedRoute roles={['STUDENT']}><StudentHomework /></ProtectedRoute>} />
        <Route path="/student/grades" element={<ProtectedRoute roles={['STUDENT']}><StudentGrades /></ProtectedRoute>} />
        <Route path="/student/materials" element={<ProtectedRoute roles={['STUDENT']}><StudentMaterials /></ProtectedRoute>} />
        <Route path="/student/quizzes" element={<ProtectedRoute roles={['STUDENT']}><StudentQuizzes /></ProtectedRoute>} />
        <Route path="/student/polls" element={<ProtectedRoute roles={['STUDENT']}><StudentPolls /></ProtectedRoute>} />

        <Route path="/parent" element={<ProtectedRoute roles={['PARENT']}><ParentDashboard /></ProtectedRoute>} />
        <Route path="/parent/homework" element={<ProtectedRoute roles={['PARENT']}><ParentHomework /></ProtectedRoute>} />
        <Route path="/parent/grades" element={<ProtectedRoute roles={['PARENT']}><ParentGrades /></ProtectedRoute>} />
        <Route path="/parent/schedule" element={<ProtectedRoute roles={['PARENT']}><ParentSchedule /></ProtectedRoute>} />
        <Route path="/parent/materials" element={<ProtectedRoute roles={['PARENT']}><ParentMaterials /></ProtectedRoute>} />
        <Route path="/parent/quizzes" element={<ProtectedRoute roles={['PARENT']}><ParentQuizzes /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
