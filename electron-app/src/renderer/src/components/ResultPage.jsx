import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import DependencyNode from "./DependencyNode";
import { preprocessDependencies, preprocessVuln } from "./utils";


const ResultPage = ({ handleRetrieve, loading, error, message }) => {
  const [record, setRecord] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [selectedVulnId, setSelectedVulnId] = useState(null);
  const [showNotFixedOnly, setShowNotFixedOnly] = useState(false);
  const location = useLocation();
  
  const vulnerabilityRefs = useRef({}); 

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
        
        // Process vulnerabilities from the SBOM data
        const vulnerabilities = record ? preprocessVuln(record) : [];
        setVulnerabilities(vulnerabilities);

        // Initialize refs for vulnerabilities
        const refs = {};
        vulnerabilities.forEach((vuln) => {
          refs[vuln.id] = React.createRef();
        });
        vulnerabilityRefs.current = refs;
      }
    };

    fetchData();
  }, [projectName, handleRetrieve]);

  // Function to get severity color
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-700 text-white';
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Function to handle vulnerability badge click
  const handleVulnClick = (vulnId) => {
    setSelectedVulnId(vulnId); // Set the selected vulnerability
    const ref = vulnerabilityRefs.current[vulnId];
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
  
      // Delay the "pop" effect to ensure it happens after scrolling
      setTimeout(() => {
        ref.current.classList.add("scale-105", "shadow-lg", "transition-transform", "duration-200");
        setTimeout(() => {
          ref.current.classList.remove("scale-105", "shadow-lg");
        }, 300); // Remove the effect after 300ms
      }, 800); // Delay the effect by 300ms to allow scrolling to complete
    }
  };

  // Function to check if a component has vulnerabilities
  const getComponentVulnerabilities = (component) => {
    return vulnerabilities.filter(vuln => 
      vuln.package === component.name && vuln.version === component.version
    );
  };

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

          {/* Vulnerability Summary */}
          {vulnerabilities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">Vulnerability Summary</h3>
              <div className="flex space-x-4 mb-4">
                <div
                  className={`px-3 py-1 rounded ${getSeverityColor("critical")}`}
                >
                  Critical:{" "}
                  {vulnerabilities.filter((v) => v.severity === "critical").length}
                </div>
                <div
                  className={`px-3 py-1 rounded ${getSeverityColor("high")}`}
                >
                  High: {vulnerabilities.filter((v) => v.severity === "high").length}
                </div>
                <div
                  className={`px-3 py-1 rounded ${getSeverityColor("medium")}`}
                >
                  Medium:{" "}
                  {vulnerabilities.filter((v) => v.severity === "medium").length}
                </div>
                <div
                  className={`px-3 py-1 rounded ${getSeverityColor("low")}`}
                >
                  Low: {vulnerabilities.filter((v) => v.severity === "low").length}
                </div>
              </div>
            </div>
          )}

          {/* Export SBOM Button */}
          <div className="mb-6">
            <button
              onClick={handleExportSBOM}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Export SBOM as JSON
            </button>
          </div>

          {/* Components Section with Vulnerabilities */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3">Components</h3>
            {/* Filter Checkbox */}
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={showNotFixedOnly}
                  onChange={(e) => setShowNotFixedOnly(e.target.checked)} // Toggle filter state
                />
                <span>Show only components with "Not Fixed" vulnerabilities</span>
              </label>
            </div>
            {Array.isArray(record.sbom.components) && record.sbom.components.length > 0 ? (
              <div className="overflow-x-auto max-h-96 border rounded-lg">
                <table className="min-w-full border">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="border px-4 py-2 text-left">Name</th>
                      <th className="border px-4 py-2 text-left">Version</th>
                      <th className="border px-4 py-2 text-left">Type</th>
                      <th className="border px-4 py-2 text-left">Vulnerabilities</th>
                      <th className="border px-4 py-2 text-left">Fix Version</th> {/* New Fix Version Column */}
                    </tr>
                  </thead>
                  <tbody>
                    {record.sbom.components
                    .filter((item) => {
                      if (!showNotFixedOnly) return true; // Show all if filter is off
                      const componentVulns = getComponentVulnerabilities(item);
                      return componentVulns.some(
                        (vuln) => vuln.fixVersion === "not-fixed"
                      ); // Show only components with "not-fixed" vulnerabilities
                    })
                    .map((item, i) => {
                      const componentVulns = getComponentVulnerabilities(item);
                      return (
                        <tr
                          key={i}
                          className={`border-t hover:bg-gray-50 ${
                            componentVulns.length > 0 ? "bg-red-50" : ""
                          }`}
                        >
                          <td className="border px-4 py-2">{item.name || "N/A"}</td>
                          <td className="border px-4 py-2">{item.version || "N/A"}</td>
                          <td className="border px-4 py-2">{item.type || "N/A"}</td>
                          <td className="border px-4 py-2">
                            {componentVulns.length > 0 ? (
                              <div className="space-y-2">
                                {componentVulns.map((vuln, idx) => (
                                  <div
                                    key={idx}
                                    className={`px-2 py-1 rounded text-sm ${getSeverityColor(
                                      vuln.severity
                                    )} cursor-pointer`}
                                    title={vuln.description}
                                    onClick={() => handleVulnClick(vuln.id)} // Scroll to vulnerability
                                  >
                                    {vuln.id} - {vuln.severity}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">None</span>
                            )}
                          </td>
                          <td className="border px-4 py-2">
                            {componentVulns.length > 0 ? (
                              <ul className="list-disc list-inside">
                                {componentVulns.map((vuln, idx) => (
                                  <li
                                    key={idx}
                                    className={vuln.fixVersion == "not-fixed" ? "text-red-600" : "text-green-600"} 
                                    title={
                                      vuln.fixVersion === "not-fixed"
                                        ? "Consider removing this library."
                                        : `Update to version ${vuln.fixVersion}.`
                                    } // Tooltip guidance
                                  >
                                    
                                    {vuln.fixVersion || "Not Fixed"}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-500">N/A</span> 
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No components data available</p>
            )}
          </div>

          {/* Vulnerabilities Details Section */}
          {vulnerabilities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">Vulnerability Details</h3>
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                {vulnerabilities.map((vuln, index) => (
                  <div
                  key={index}
                  ref={vulnerabilityRefs.current[vuln.id]} // Attach ref to each vulnerability
                  className={`p-4 border-b ${
                    getSeverityColor(vuln.severity)
                  } ${
                    selectedVulnId === vuln.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  } cursor-pointer`} // Add cursor-pointer for clickable styling
                  onClick={() => {
                    if (vuln.dataSource) {
                      window.open(vuln.dataSource, "_blank"); // Open dataSource in a new tab
                    } else {
                      alert("No data source available for this vulnerability.");
                    }
                  }}
                  title={vuln.dataSource || "No data source available"} // Tooltip with dataSource
                >
                    <div className="font-bold">
                      {vuln.id} - {vuln.package}@{vuln.version}
                    </div>
                    <div className="text-sm opacity-90">{vuln.description}</div>
                    <div className="text-xs mt-1">Severity: {vuln.severity}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            {Array.isArray(record.sbom.dependencies) &&
            record.sbom.dependencies.length > 0 ? (
              <div className="border rounded p-4 bg-gray-50">
                {preprocessDependencies(record.sbom.dependencies).map(
                  (dependency, i) => (
                    <DependencyNode
                      key={i}
                      dependency={dependency}
                      vulnerabilities={vulnerabilities}
                      onVulnClick={handleVulnClick} // Pass click handler to DependencyNode
                    />
                  )
                )}
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