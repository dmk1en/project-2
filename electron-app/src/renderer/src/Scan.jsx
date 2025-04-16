import React, { useState } from "react";

const DependencyNode = ({ dependency }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative pl-6">
      {/* Dependency Name */}
      <div
        className={`flex items-center cursor-pointer ${
          dependency.children.length > 0 ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (dependency.children.length > 0) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Only show the expand/collapse icon if there are children */}
        {dependency.children.length > 0 && (
          <span className="font-bold mr-2">{isExpanded ? "▼" : "▶"}</span>
        )}
        <span className="font-bold">{dependency.ref || "N/A"}</span>
      </div>

      {/* Connecting Line and Child Dependencies */}
      <div className={`pl-4 border-l-2 border-gray-400 ml-2`}>
        {isExpanded &&
          dependency.children.map((child, i) => (
            <DependencyNode key={i} dependency={child} />
          ))}
      </div>
    </div>
  );
};

const preprocessDependencies = (dependencies) => {
  const dependencyMap = new Map();

  // Create a map of dependencies for quick lookup
  dependencies.forEach((dep) => {
    dependencyMap.set(dep.ref, { ...dep, children: [] });
  });

  // Build the tree structure
  const rootDependencies = [];
  dependencies.forEach((dep) => {
    if (dep.dependsOn && dep.dependsOn.length > 0) {
      dep.dependsOn.forEach((childRef) => {
        const child = dependencyMap.get(childRef);
        if (child) {
          dependencyMap.get(dep.ref).children.push(child);
        }
      });
    } else {
      // If no parent, consider it a root dependency
      rootDependencies.push(dependencyMap.get(dep.ref));
    }
  });

  return Array.from(dependencyMap.values()).filter(
    (dep) => !dependencies.some((d) => d.dependsOn?.includes(dep.ref))
  );
};


const Scan = () => {
  const [directory, setDirectory] = useState("");
  const [projectName, setProjectName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true); // State to control sidebar width

  const handleSelectFolder = async () => {
    const selectedFolder = await window.electron.ipcRenderer.invoke("select-folder");
    if (selectedFolder) {
      setDirectory(selectedFolder);
      setError("");
    } else {
      setError("No folder selected.");
    }
  };

  const handleScan = async () => {
    setMessage("");
    setError("");

    if (!directory ) {
      setError("Both directory and project name are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ directory }),
      });

      if (response.ok) {
        const data = await response.json();
        handleRetrieve(data.message); // Automatically retrieve results after scanning
      } else {
        setError("Unexpected response from the server.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetrieve = async (a) => {
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:8080/scans/${a}`, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setData(data);
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
    <div className="flex h-screen w-screen text-black">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarExpanded ? "w-1/9" : "w-1/20"
        } bg-gray-800 text-white flex flex-col p-4 transition-all duration-300`}
      >
        <button
          className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 mb-4"
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        >
          {isSidebarExpanded ? "<<" : ">>"}
        </button>
        {isSidebarExpanded && (
          <>
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
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
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
              onClick={handleScan}
            >
              Start Scan
            </button>
            <button
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-700"
              onClick={handleRetrieve}
            >
              Retrieve Scan
            </button>
          </>
        )}
      </div>
  
      {/* Main Content */}
      <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Scan Results</h2>
  
        {loading && <p className="text-blue-600 mb-4">Loading...</p>}
        {message && <p className="text-green-600 mb-4">{message}</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}
  
        {data && data.length > 0 ? (
          <div>
            {data.map((record, index) => {
              const components = Array.isArray(record.sbom.components) ? record.sbom.components : [];
              const dependencies = Array.isArray(record.sbom.dependencies) ? record.sbom.dependencies : [];
              return (
                <div key={index} className="mb-6">
                  <p>
                    <strong>Project Name:</strong> {record.project_name}
                  </p>
                  <p>
                    <strong>Scan ID:</strong> {record.scan_id}
                  </p>
                  <p>
                    <strong>Time:</strong> {new Date(record.timestamp).toLocaleString()}
                  </p>
                  
                  {/* SBOM Data Table */}
                  {components.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 border border-gray-300 mt-4">
                      <table className="w-full table-auto border-collapse">
                        <thead>
                          <tr className="bg-blue-500 text-white">
                            <th className="border px-4 py-2 w-1/3">Name</th>
                            <th className="border px-4 py-2 w-1/3">Version</th>
                            <th className="border px-4 py-2 w-1/3">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {components.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="border px-4 py-2">{item.name || "N/A"}</td>
                              <td className="border px-4 py-2">{item.version || "N/A"}</td>
                              <td className="border px-4 py-2">{item.type || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No SBOM data available</p>
                  )}

                  {/* Dependencies Data Table */}
                  {dependencies.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 border border-gray-300 mt-4">
                      <table className="w-full table-auto border-collapse">
                        <thead>
                          <tr className="bg-green-500 text-white">
                            <th className="border px-4 py-2 w-1/3">Dependency</th>
                            <th className="border px-4 py-2 w-1/3">dependsOn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dependencies.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="border px-4 py-2">{item.ref || "N/A"}</td>
                              <td className="border px-4 py-2">
                                {item.dependsOn && item.dependsOn.length > 0 ? (
                                  <ul className="list-disc pl-4">
                                    {item.dependsOn.map((dep, j) => (
                                      <li key={j}>{dep}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  "None"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No dependencies data available</p>
                  )}

                  {/* Dependencies Tree */}
                  {dependencies.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 border border-gray-300 mt-4">
                      <h3 className="text-xl font-bold mb-2">Dependencies Tree</h3>
                      <div className="pl-4">
                        {preprocessDependencies(dependencies).map((dependency, i) => (
                          <DependencyNode key={i} dependency={dependency} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No dependencies data available</p>
                  )}



                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No scan results available</p>
        )}
      </div>
    </div>
  );
};

export default Scan;