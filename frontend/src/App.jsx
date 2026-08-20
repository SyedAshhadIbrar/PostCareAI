import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import ClinicianLayout from "./components/ClinicianLayout";
import Dashboard from "./components/Dashboard";
import PatientManagement from "./components/PatientManagement";
import AddUser from "./components/AddUser";
import PatientLayout from "./components/PatientLayout";
import PatientDashboard from "./components/PatientDashboard";
import PatientCheckIn from "./components/PatientCheckIn";
import RecoveryDashboard from "./components/RecoveryDashboard";
import PatientAssistant from "./components/PatientAssistant";
import PatientSettings from "./components/PatientSettings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Clinician Flow with Sidebar Layout */}
        <Route path="/clinician" element={<ClinicianLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="queue" element={<PatientManagement />} />
          <Route path="add-user" element={<AddUser />} />
        </Route>

        {/* Patient Flow with Sidebar Layout */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientDashboard />} />
          <Route path="log" element={<PatientCheckIn />} />
          <Route path="recovery" element={<RecoveryDashboard />} />
          <Route path="assistant" element={<PatientAssistant />} />
          <Route path="settings" element={<PatientSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
