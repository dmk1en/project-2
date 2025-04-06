import React, { useState } from "react";
import DependencyNode from "./DependencyNode";
import { preprocessDependencies } from "./utils"; // Adjust the path if necessary

const ResultPage = ({ data, loading, error, message }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true); // State to control sidebar width

  return (
    <div className="flex h-screen w-screen text-black">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarExpanded ? "w-1/4" : "w-1/12"
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
            <h1 className="text-2xl font-bold mb-6">Results</h1>
            <p className="text-sm text-gray-300">
              View the results of your scan, including components and dependencies.
            </p>
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
                <div key={index} className="mb-6 border-b pb-4">
                  <p>
                    <strong>Project Name:</strong> {record.project_name}
                  </p>
                  <p>
                    <strong>Scan ID:</strong> {record.scan_id}
                  </p>
                  <p>
                    <strong>Time:</strong> {new Date(record.timestamp).toLocaleString()}
                  </p>

                  {/* Components Table */}
                  {components.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 border border-gray-300 mt-4">
                      <h3 className="text-xl font-bold mb-2">Components</h3>
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
                    <p className="text-gray-500">No components data available</p>
                  )}

                  {/* Dependencies Table */}
                  {dependencies.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 border border-gray-300 mt-4">
                      <h3 className="text-xl font-bold mb-2">Dependencies</h3>
                      <table className="w-full table-auto border-collapse">
                        <thead>
                          <tr className="bg-green-500 text-white">
                            <th className="border px-4 py-2 w-1/3">Name</th>
                            <th className="border px-4 py-2 w-1/3">Version</th>
                            <th className="border px-4 py-2 w-1/3">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dependencies.map((item, i) => (
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
                    <p className="text-gray-500">No dependencies tree available</p>
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

export default ResultPage;