import React from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ loading }) => {
  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex-shrink-0">
      <h1 className="text-xl font-bold mb-6">Code Scanner</h1>
      <nav className="space-y-2">
        <Link
          to="/"
          className={`block py-2 px-4 rounded transition-colors ${
            loading ? "bg-gray-600 cursor-not-allowed" : "hover:bg-gray-700"
          }`}
          onClick={(e) => loading && e.preventDefault()}
        >
          Scan
        </Link>
        <Link
          to="/results"
          className={`block py-2 px-4 rounded transition-colors ${
            loading ? "bg-gray-600 cursor-not-allowed" : "hover:bg-gray-700"
          }`}
          onClick={(e) => loading && e.preventDefault()}
        >
          Results
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;