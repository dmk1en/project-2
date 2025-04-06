import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScanPage from "./components/ScanPage";
import ResultPage from "./components/ResultPage";

const App = () => {
  const [directory, setDirectory] = useState("");
  const [projectName, setProjectName] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] =useState("");
  const [message, setMessage] = useState("");

  const handleScan = async () => {
    if (!directory || !projectName) {
      setError("Directory and project name are required.");
      return;
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
        body: JSON.stringify({ directory, projectName }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        handleRetrieve();
      } else {
        setError("Unexpected response from the server.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetrieve = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`http://localhost:8080/scans/${projectName}`, {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setMessage("Data retrieved successfully.");
      } else {
        setError("Unexpected response from the server.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <ScanPage
              setProjectName={setProjectName}
              setDirectory={setDirectory}
              handleScan={handleScan}
            />
          }
        />
        <Route
          path="/results"
          element={
            <ResultPage
              data={data}
              loading={loading}
              error={error}
              message={message}
            />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;