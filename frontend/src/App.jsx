import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { MainLayout } from './layouts/MainLayout'
import { Skeleton } from './components/ui/Skeleton'

// Lazy-load all pages for performance
const LoginPage          = lazy(() => import('./pages/LoginPage'))
const RegisterPage       = lazy(() => import('./pages/RegisterPage'))
const HomePage           = lazy(() => import('./pages/HomePage'))
const NewsDetailPage     = lazy(() => import('./pages/NewsDetailPage'))
const CreateNewsPage     = lazy(() => import('./pages/CreateNewsPage'))
const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const TrendingPage       = lazy(() => import('./pages/TrendingPage'))
const ContributorApplyPage = lazy(() => import('./pages/ContributorApplyPage'))
const AdminPage          = lazy(() => import('./pages/AdminPage'))

function PageLoader() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto pt-8">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes wrapped in MainLayout */}
        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="news/:id"  element={<NewsDetailPage />} />
          <Route path="trending"  element={<TrendingPage />} />
          <Route path="create"    element={<CreateNewsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="apply"     element={<ContributorApplyPage />} />
          <Route path="admin"     element={<AdminPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
