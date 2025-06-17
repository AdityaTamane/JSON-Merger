import React, { useState, useEffect } from "react";
import JSONUploader from "./components/JSONUploader";
import "./App.css";

function App() {
  const userPlanLimitMB = 50;
  const userUsedMB = 8.3;
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode-active");
    } else {
      document.body.classList.remove("dark-mode-active");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`app-container ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="app-header">
        <h1 className="app-title">JSON Merge Tool</h1>
        <div className="theme-toggle-container">
          <label className="switch">
            <input type="checkbox" checked={isDarkMode} onChange={toggleDarkMode} />
            <span className="slider round"></span>
          </label>
          <span className="theme-text">{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
        </div>
      </header>
      <JSONUploader limitMB={userPlanLimitMB} usedMB={userUsedMB} isDarkMode={isDarkMode} />
    </div>
  );
}

export default App;