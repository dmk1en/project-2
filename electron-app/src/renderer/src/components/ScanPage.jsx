import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ScanPage = ({ setProjectName, setDirectory, handleScan }) => {
  const [localProjectName, setLocalProjectName] = useState("");
  const [localDirectory, setLocalDirectory] = useState("");
  const navigate = useNavigate();

  const handleStartScan = () => {
    if (!localProjectName || !localDirectory) {
      alert("Please select a folder and enter a project name.");
      return;
    }

    // Update the App state via props
    setProjectName(localProjectName);
    setDirectory(localDirectory);

    // Trigger the scan
    handleScan();

    // Navigate to the results page
    navigate("/results");
  };

  const handleSelectFolder = async () => {
    const selectedFolder = await window.electron.ipcRenderer.invoke("select-folder");
    if (selectedFolder) {
      setLocalDirectory(selectedFolder);
    } else {
      alert("No folder selected.");
    }
  };

  return (
    <div className="flex h-screen w-screen text-black">
      <div className="w-1/4 bg-gray-800 text-white flex flex-col p-4">
        <h1 className="text-2xl font-bold mb-6">Scan Folder</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          onClick={handleSelectFolder}
        >
          Select Folder
        </button>
        <input
          type="text"
          className="border p-2 rounded w-full mb-4"
          placeholder="Enter project name"
          value={localProjectName}
          onChange={(e) => setLocalProjectName(e.target.value)}
        />
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={handleStartScan}
        >
          Start Scan
        </button>
      </div>
    </div>
  );
};

export default ScanPage;