import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  const navClass = ({ isActive }) => `nav-item ${isActive ? "active" : ""}`;

  const handleLogout = () => {
    localStorage.removeItem("token"); // remove token if you use auth
    navigate("/"); // redirect to login or landing page
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-bg-glow sidebar-glow-1" aria-hidden="true" />
      <div className="sidebar-bg-glow sidebar-glow-2" aria-hidden="true" />

      <div className="sidebar-container">
        <div className="sidebar-top">
          <div className="logo-box">
            <img
              src={`${process.env.PUBLIC_URL}/img_ems.png`}
              alt="EMS Logo"
              className="sidebar-logo"
            />
          </div>

          <div className="brand">
            <h2>EMS</h2>
            <span>CDRRMO Reporting</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={navClass}>
            <span className="icon">🏠</span>
            <span className="label">Dashboard</span>
          </NavLink>

          <NavLink to="/new-report" className={navClass}>
            <span className="icon">📝</span>
            <span className="label">New Report</span>
          </NavLink>

          <NavLink to="/reports" className={navClass}>
            <span className="icon">📄</span>
            <span className="label">Reports</span>
          </NavLink>

          <NavLink to="/settings" className={navClass}>
            <span className="icon">⚙️</span>
            <span className="label">Settings</span>
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="icon">🚪</span>
          <span className="label">Logout</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <small>EMS System © 2026</small>
      </div>
    </aside>
  );
}

export default Sidebar;