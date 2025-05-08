import React, { useState } from "react";

const DependencyNode = ({
  dependency,
  vulnerabilities = [],
  depth = 0,
  onComponentClick
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-red-700 font-bold";
      case "high":
        return "text-red-500 font-bold";
      case "medium":
        return "text-yellow-500 font-bold";
      case "low":
        return "text-green-500 font-bold";
      default:
        return "text-green-500 font-bold";
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

  const calculateChildVulns = (children) => {
    let childVulnCount = 0;
    let totalVulnCount = 0;

    children.forEach((child) => {
      const childVulns = getComponentVulnerabilities(child.ref);
      if (childVulns.length > 0) {
        childVulnCount++;
        totalVulnCount += childVulns.length;
      }

      if (child.children && child.children.length > 0) {
        const childCounts = calculateChildVulns(child.children);
        childVulnCount += childCounts.childVulnCount;
        totalVulnCount += childCounts.totalVulnCount;
      }
    });

    return { childVulnCount, totalVulnCount };
  };

  const vulns = getComponentVulnerabilities(dependency.ref);
  const hasChildren = dependency.children && dependency.children.length > 0;

  // Calculate child vulnerabilities and total vulnerabilities
  const { childVulnCount, totalVulnCount } = calculateChildVulns(
    dependency.children || []
  );

  const allVulns = [...vulns];
  dependency.children?.forEach((child) => {
    const childVulns = getComponentVulnerabilities(child.ref);
    allVulns.push(...childVulns);
  });

  // Determine the severity color based on the highest severity of all vulnerabilities
  const severityColor =
    allVulns.length > 0
      ? getSeverityColor(
          allVulns.reduce((highest, vuln) => {
            const severities = ["critical", "high", "medium", "low"];
            return severities.indexOf(vuln.severity) < severities.indexOf(highest)
              ? vuln.severity
              : highest;
          }, "low")
        )
      : "text-gray-800";

  const handleRightClick = (e) => {
    e.preventDefault(); // Prevent the default context menu
    const componentName = dependency.name || dependency.ref.split("@")[0];
    onComponentClick(componentName); // Directly navigate to the component section
  };

  return (
    <div className="relative pl-6">
      <div
        className={`flex items-center ${
          hasChildren ? "cursor-pointer hover:bg-gray-50" : ""
        } rounded p-1`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)} // Expand/collapse on left-click
        onContextMenu={handleRightClick} // Show popup on right-click
        title={`Child Components with Vulnerabilities: ${childVulnCount}\nTotal Vulnerabilities: ${
          totalVulnCount + vulns.length
        }`}
      >
        {hasChildren && (
          <span className="font-bold mr-2 text-gray-500 w-4 flex-shrink-0">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}

          <span className={`font-medium ${severityColor}`}>
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
              onComponentClick={onComponentClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DependencyNode;