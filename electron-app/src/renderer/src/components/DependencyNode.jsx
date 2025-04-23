import React, { useState, useEffect } from "react";

const DependencyNode = ({ dependency, vulnerabilities = [], depth = 0, onVulnClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Automatically expand if the dependency has vulnerabilities
    const vulns = getComponentVulnerabilities(dependency.ref);
    if (vulns.length > 0) {
      setIsExpanded(true);
    }
  }, [dependency]);

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-red-700 font-bold";
      case "high":
        return "text-red-500 font-bold";
      case "medium":
        return "text-yellow-500 font-bold";
      case "low":
        return "text-blue-500 font-bold";
      default:
        return "text-gray-800";
    }
  };

  const getComponentVulnerabilities = (ref) => {
    const match = ref.match(/^(.+?)@(.+)$/);
    if (!match) return [];

    const packageName = match[1];
    const packageVersion = match[2];

    return vulnerabilities.filter(
      (vuln) =>
        vuln.package === packageName && vuln.version === packageVersion
    );
  };

  const vulns = getComponentVulnerabilities(dependency.ref);
  const hasChildren = dependency.children && dependency.children.length > 0;

  // Determine the severity color based on the highest severity of the vulnerabilities
  const severityColor =
    vulns.length > 0
      ? getSeverityColor(
          vulns.reduce((highest, vuln) => {
            const severities = ["critical", "high", "medium", "low"];
            return severities.indexOf(vuln.severity) < severities.indexOf(highest)
              ? vuln.severity
              : highest;
          }, "low")
        )
      : "text-gray-800";

  return (
    <div className="relative pl-6">
      <div
        className={`flex items-center ${
          hasChildren ? "cursor-pointer hover:bg-gray-50" : ""
        } rounded p-1`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren && (
          <span className="font-bold mr-2 text-gray-500 w-4 flex-shrink-0">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}

        <span
          className={`font-medium cursor-pointer ${severityColor}`}
          onClick={() => vulns.length > 0 && onVulnClick(vulns[0].id)} // Map to the first vulnerability
        >
          {dependency.ref}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="pl-4 border-l-2 border-gray-200 ml-2">
          {dependency.children.map((child, i) => (
            <DependencyNode
              key={i}
              dependency={child}
              vulnerabilities={vulnerabilities}
              depth={depth + 1}
              onVulnClick={onVulnClick} // Pass click handler to child nodes
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DependencyNode;