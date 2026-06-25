import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TripProvider } from '@/contexts/TripContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import MainLayout from '@/layouts/MainLayout'
import Dashboard from '@/pages/Dashboard'
import Flights from '@/pages/Flights'
import Hotels from '@/pages/Hotels'
import Timeline from '@/pages/Timeline'
import Checklist from '@/pages/Checklist'
import Expenses from '@/pages/Expenses'
import Emergency from '@/pages/Emergency'
import Notes from '@/pages/Notes'
import QuickLinks from '@/pages/QuickLinks'
import Documents from '@/pages/Documents'
import Passport from '@/pages/Passport'
import Currency from '@/pages/Currency'
import Settings from '@/pages/Settings'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TripProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/flights" element={<Flights />} />
                <Route path="/hotels" element={<Hotels />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/checklist" element={<Checklist />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/passport" element={<Passport />} />
                <Route path="/currency" element={<Currency />} />
                <Route path="/emergency" element={<Emergency />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/links" element={<QuickLinks />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TripProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
