import { Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Facilities from './pages/Facilities.jsx'
import FacilityDetail from './pages/FacilityDetail.jsx'
import SubmitReport from './pages/SubmitReport.jsx'
import SubmitReservation from './pages/SubmitReservation.jsx'
import FacilityReferences from './pages/FacilityReferences.jsx'
import CreateFacility from './pages/CreateFacility.jsx'
import UpdateFacility from './pages/UpdateFacility.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import FacilityRecap from './pages/FacilityRecap.jsx'
import EmployeeDashboard from './pages/EmployeeDashboard.jsx'
import EmployeeFacilities from './pages/EmployeeFacilities.jsx'
import EmployeeReports from './pages/EmployeeReports.jsx'
import ResolveReport from './pages/ResolveReport.jsx'
import EmployeeReservations from './pages/EmployeeReservations.jsx'
import ResolveReservation from './pages/ResolveReservation.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import UserReports from './pages/UserReports.jsx'
import UserReservations from './pages/UserReservations.jsx'
import Users from './pages/Users.jsx'
import CreateUser from './pages/CreateUser.jsx'
import UpdateUser from './pages/UpdateUser.jsx'
import ApproveUsers from './pages/ApproveUsers.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'

import Reports from './pages/Reports.jsx'
import CreateReport from './pages/CreateReport.jsx'
import UpdateReport from './pages/UpdateReport.jsx'
import ReportDetail from './pages/ReportDetail.jsx'

import Reservations from './pages/Reservations.jsx'
import CreateReservation from './pages/CreateReservation.jsx'
import UpdateReservation from './pages/UpdateReservation.jsx'
import ReservationDetail from './pages/ReservationDetail.jsx'

function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200 text-base-content">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:p-4">
        Skip to content
      </a>
      <Header />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6"
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/facilities/:id" element={<FacilityDetail />} />
          <Route path="/facilities/:id/report" element={<SubmitReport />} />
          <Route path="/facilities/:id/reserve" element={<SubmitReservation />} />
          <Route path="/login" element={<Login key="user" role="user" />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/employee/login"
            element={<Login key="employee" role="employee" />}
          />
          <Route
            path="/admin/login"
            element={<Login key="admin" role="admin" />}
          />
          <Route element={<ProtectedRoute role="user" />}>
            <Route path="/user" element={<UserDashboard />} />
            <Route path="/user/reports" element={<UserReports />} />
            <Route path="/user/reports/:id" element={<ReportDetail readOnly />} />
            <Route path="/user/reservations" element={<UserReservations />} />
            <Route path="/user/reservations/:id" element={<ReservationDetail readOnly />} />
          </Route>
          <Route element={<ProtectedRoute role="employee" />}>
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/employee/facilities" element={<EmployeeFacilities />} />
            <Route path="/employee/reservations" element={<EmployeeReservations />} />
            <Route path="/employee/reservations/:id/resolve" element={<ResolveReservation />} />
            <Route path="/employee/reports" element={<EmployeeReports />} />
            <Route path="/employee/reports/:id/resolve" element={<ResolveReport />} />
          </Route>
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/facility-recap" element={<FacilityRecap />} />
            <Route path="/admin/reservations" element={<Reservations />} />
            <Route path="/admin/createReservation" element={<CreateReservation />} />
            <Route path="/admin/updateReservation/:id" element={<UpdateReservation />} />
            <Route path="/admin/reservations/:id" element={<ReservationDetail />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/createReport" element={<CreateReport />} />
            <Route path="/admin/updateReport/:id" element={<UpdateReport />} />
            <Route path="/admin/reports/:id" element={<ReportDetail />} />
            <Route path="/admin/report-categories" element={<FacilityReferences key="categories" kind="categories" />} />
            <Route path="/admin/facility-types" element={<FacilityReferences key="types" kind="types" />} />
            <Route path="/admin/facility-locations" element={<FacilityReferences key="locations" kind="locations" />} />
            <Route path="/admin/facilities" element={<Facilities manage />} />
            <Route path="/admin/facilities/:id" element={<FacilityDetail manage />} />
            <Route path="/admin/createFacility" element={<CreateFacility />} />
            <Route path="/admin/updateFacility/:id" element={<UpdateFacility />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/approve-users" element={<ApproveUsers />} />
            <Route path="/admin/createUser" element={<CreateUser />} />
            <Route path="/admin/updateUser/:id" element={<UpdateUser />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App
