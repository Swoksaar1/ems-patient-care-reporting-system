import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("ems_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("ems_sidebar_collapsed", collapsed ? "true" : "false");
  }, [collapsed]);

  const navClass = ({ isActive }) => `nav-item ${isActive ? "active" : ""}`;

  const toggleSidebar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsed((prev) => !prev);
  };

  const stopOnly = (e) => {
    e.stopPropagation();
  };

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();

    localStorage.removeItem("token");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("isLoggedIn");

    navigate("/", { replace: true });
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-bg-glow sidebar-glow-1" aria-hidden="true" />
      <div className="sidebar-bg-glow sidebar-glow-2" aria-hidden="true" />

      <div className="sidebar-container">
        <div className="sidebar-top">
          <div className="sidebar-brand-wrap">
            <div className="logo-box">
              <img
                src={`${process.env.PUBLIC_URL}/img_ems.png`}
                alt="EMS Logo"
                className="sidebar-logo"
                draggable="false"
              />
            </div>

            {!collapsed && (
              <div className="brand">
                <h2>EMS</h2>
                <span>CDRRMO</span>
              </div>
            )}
          </div>

          <button
            className="hamburger-btn"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            ☰
          </button>
        </div>

        <nav className="nav">
          <NavLink
            to="/dashboard"
            className={navClass}
            title="Dashboard"
            onClick={stopOnly}
          >
            <span className="icon">🏠</span>
            {!collapsed && <span className="label">Dashboard</span>}
          </NavLink>

          <NavLink
            to="/new-report"
            className={navClass}
            title="New Report"
            onClick={stopOnly}
          >
            <span className="icon">📝</span>
            {!collapsed && <span className="label">New Report</span>}
          </NavLink>

          <NavLink
            to="/patients"
            className={navClass}
            title="Patients"
            onClick={stopOnly}
          >
            <span className="icon">👥</span>
            {!collapsed && <span className="label">Patients</span>}
          </NavLink>

          <NavLink
            to="/reports"
            className={navClass}
            title="Reports"
            onClick={stopOnly}
          >
            <span className="icon">📄</span>
            {!collapsed && <span className="label">Reports</span>}
          </NavLink>

          <NavLink
            to="/settings"
            className={navClass}
            title="Settings"
            onClick={stopOnly}
          >
            <span className="icon">⚙️</span>
            {!collapsed && <span className="label">Settings</span>}
          </NavLink>
        </nav>

        <button
          className="logout-btn"
          onClick={handleLogout}
          type="button"
          title="Logout"
        >
          <span className="icon">🚪</span>
          {!collapsed && <span className="label">Logout</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-footer">
          <small>EMS System © 2026</small>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;