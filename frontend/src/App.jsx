import { Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Facilities from './pages/Facilities.jsx'
import CreateFacility from './pages/CreateFacility.jsx'
import UpdateFacility from './pages/UpdateFacility.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Users from './pages/Users.jsx'
import CreateUser from './pages/CreateUser.jsx'
import UpdateUser from './pages/UpdateUser.jsx'
import ApproveUsers from './pages/ApproveUsers.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'

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
          <Route path="/login" element={<Login key="user" role="user" />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/staff/login"
            element={<Login key="employee" role="employee" />}
          />
          <Route
            path="/admin/login"
            element={<Login key="admin" role="admin" />}
          />
          <Route element={<ProtectedRoute role="user" />}>
            
          </Route>
          <Route element={<ProtectedRoute role="employee" />}>
            
          </Route>
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/facilities" element={<Facilities manage />} />
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
