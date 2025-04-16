import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ScanPage = ({ setDirectory, handleScan, loading, recentScans, setRecentScans }) => {
  const [localDirectory, setLocalDirectory] = useState("");
  const [projectName, setProjectName] = useState(""); // State for project name input
  const navigate = useNavigate();

  const handleStartScan = async () => {
    if (!localDirectory) {
      alert("Please select a folder first");
      return;
    }

    setDirectory(localDirectory);
    const projectName = await handleScan(localDirectory); // Get project name from scan
    if (projectName) {
      // Add the project name to the recent scans list
      setRecentScans((prev) => [projectName, ...prev.filter((name) => name !== projectName)]);
      navigate(`/results?projectName=${encodeURIComponent(projectName)}`);
    }
  };

  const handleRetrieveData = () => {
    if (!projectName) {
      alert("Please enter a project name");
      return;
    }

    navigate(`/results?projectName=${encodeURIComponent(projectName)}`);
  };

  const handleSelectFolder = async () => {
    const selectedFolder = await window.electron.ipcRenderer.invoke("select-folder");
    if (selectedFolder) {
      setLocalDirectory(selectedFolder);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Start New Scan</h1>
      
      <div className="space-y-4">
        {/* Select Folder Button */}
        <button
          onClick={handleSelectFolder}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          {localDirectory ? "✓ Folder Selected" : "Select Folder"}
        </button>

        {localDirectory && (
          <div className="text-sm text-gray-600 mb-4">
            Selected: {localDirectory}
          </div>
        )}

        {/* Start Scan Button */}
        <button
          onClick={handleStartScan}
          disabled={loading || !localDirectory}
          className={`w-full py-2 px-4 rounded text-white ${
            loading || !localDirectory
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Scanning..." : "Start Scan"}
        </button>

        {/* Retrieve Data Section */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Retrieve Scan</h2>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
            className="w-full border rounded px-4 py-2 mb-4"
          />
          <button
            onClick={handleRetrieveData}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Retrieve Data
          </button>
        </div>

        {/* Recently Scanned Section */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Recently Scanned</h2>
          {recentScans.length > 0 ? (
            <ul className="list-disc list-inside space-y-2">
              {recentScans.map((name, index) => (
                <li key={index}>
                  <button
                    onClick={() => navigate(`/results?projectName=${encodeURIComponent(name)}`)}
                    className="text-blue-600 hover:underline"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No recent scans available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanPage;