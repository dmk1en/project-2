import React, { useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ScanPage from "./components/ScanPage";
import ResultPage from "./components/ResultPage";
import Sidebar from "./components/Sidebar";

const App = () => {
  const [directory, setDirectory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recentScans, setRecentScans] = useState([]); // State for recently scanned projects

  const handleScan = async (directory) => {
    if (!directory) {
      setError("Directory is required.");
      return null;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("http://localhost:8080/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ directory }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage("Scan initiated successfully.");
        return result.message; // Return the project name from the response
      } else {
        setError("Unexpected response from the server.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }

    return null;
  };

  const handleRetrieve = useCallback(async (projectName) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`http://localhost:8080/scans/${projectName}`, {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        setMessage("Data retrieved successfully.");
        return result;
      } else {
        setError("Unexpected response from the server.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }

    return null;
  }, []);

  return (
    <Router>
      <div className="flex h-screen w-screen">
        <Sidebar loading={loading} />
        <div className="flex-1 overflow-auto p-8 bg-white">
          <Routes>
            <Route
              path="/"
              element={
                <ScanPage
                  setDirectory={setDirectory}
                  handleScan={handleScan}
                  loading={loading}
                  recentScans={recentScans}
                  setRecentScans={setRecentScans} // Pass recentScans and its setter
                />
              }
            />
            <Route
              path="/results"
              element={
                <ResultPage
                  handleRetrieve={handleRetrieve}
                  loading={loading}
                  error={error}
                  message={message}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;