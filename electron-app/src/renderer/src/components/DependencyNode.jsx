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

export default DependencyNode;