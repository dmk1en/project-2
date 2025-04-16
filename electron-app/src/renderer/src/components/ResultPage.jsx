import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DependencyNode from "./DependencyNode";
import { preprocessDependencies } from "./utils";

const ResultPage = ({ handleRetrieve, loading, error, message }) => {
  const [record, setRecord] = useState(null);
  const location = useLocation();

  // Extract projectName from query parameters
  const queryParams = new URLSearchParams(location.search);
  const projectName = queryParams.get("projectName");

  useEffect(() => {
    const fetchData = async () => {
      if (!projectName) return;

      const data = await handleRetrieve(projectName);

      if (data) {
        const record =
          data && data.length > 0
            ? data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
            : null;
        setRecord(record);
      }
    };

    fetchData();
  }, [projectName, handleRetrieve]);

  // Function to export SBOM as JSON
  const handleExportSBOM = async () => {
    if (!record || !record.sbom) {
      alert("No SBOM data available to export.");
      return;
    }

    const sbomData = record.sbom;

    // Use Electron's dialog API to show a save dialog
    const { filePath } = await window.electron.ipcRenderer.invoke("show-save-dialog", {
      title: "Save SBOM as JSON",
      defaultPath: `${record.project_name || "sbom"}.json`,
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (filePath) {
      // Write the SBOM data to the selected file
      await window.electron.ipcRenderer.invoke("write-file", filePath, JSON.stringify(sbomData, null, 2));
      alert("SBOM exported successfully!");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Scan Results</h2>

      {loading && <p className="text-blue-600 mb-4">Loading...</p>}
      {message && <p className="text-green-600 mb-4">{message}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {record ? (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <h3 className="font-semibold">Project Name</h3>
              <p>{record.project_name || "N/A"}</p>
            </div>
            <div>
              <h3 className="font-semibold">Scan ID</h3>
              <p>{record.scan_id || "N/A"}</p>
            </div>
            <div>
              <h3 className="font-semibold">Time</h3>
              <p>{new Date(record.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {/* Export SBOM Button */}
          <div className="mb-6">
            <button
              onClick={handleExportSBOM}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Export SBOM as JSON
            </button>
          </div>

        {/* Components Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3">Components</h3>
          {Array.isArray(record.sbom.components) && record.sbom.components.length > 0 ? (
            <div className="overflow-x-auto max-h-64 border rounded-lg">
              <table className="min-w-full border">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="border px-4 py-2 text-left">Name</th>
                    <th className="border px-4 py-2 text-left">Version</th>
                    <th className="border px-4 py-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {record.sbom.components.map((item, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="border px-4 py-2">{item.name || "N/A"}</td>
                      <td className="border px-4 py-2">{item.version || "N/A"}</td>
                      <td className="border px-4 py-2">{item.type || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No components data available</p>
          )}
        </div>

        {/* Dependencies Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3">Dependencies</h3>
          {Array.isArray(record.sbom.dependencies) && record.sbom.dependencies.length > 0 ? (
            <div className="overflow-x-auto max-h-64 border rounded-lg">
              <table className="min-w-full border">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="border px-4 py-2 text-left">Reference</th>
                    <th className="border px-4 py-2 text-left">Depends On</th>
                  </tr>
                </thead>
                <tbody>
                  {record.sbom.dependencies.map((item, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="border px-4 py-2">{item.ref || "N/A"}</td>
                      <td className="border px-4 py-2">
                        {Array.isArray(item.dependsOn) && item.dependsOn.length > 0 ? (
                          <ul className="list-disc list-inside">
                            {item.dependsOn.map((dependency, index) => (
                              <li key={index}>{dependency}</li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No dependencies data available</p>
          )}
        </div>
        

          {/* Dependencies Tree Section */}
          <div>
            <h3 className="text-xl font-bold mb-3">Dependencies Tree</h3>
            {Array.isArray(record.sbom.dependencies) && record.sbom.dependencies.length > 0 ? (
              <div className="border rounded p-4 bg-gray-50">
                {preprocessDependencies(record.sbom.dependencies).map((dependency, i) => (
                  <DependencyNode key={i} dependency={dependency} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No dependencies tree available</p>
            )}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center bg-white">
          <p className="text-gray-500">No scan results available</p>
        </div>
      )}
    </div>
  );
};

export default ResultPage;