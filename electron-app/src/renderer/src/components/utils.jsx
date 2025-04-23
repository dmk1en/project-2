export const preprocessDependencies = (dependencies) => {
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

export const preprocessVuln = (record) => {
  if (!record || !record.sbom || !record.vulnerabilities) {
    return [];
  }

  return record.vulnerabilities.map(vuln => {
    // Use the related CVE if available, otherwise use the GHSA ID
    const id = vuln.relatedVulnerabilities?.[0]?.id || vuln.vulnerability.id;
    
    // Extract the package name and version from the artifact
    const packageName = vuln.artifact.name;
    const version = vuln.artifact.version;
    
    // Get severity from the vulnerability data
    const severity = vuln.vulnerability.severity.toLowerCase();
    
    // Use the description from either the main vulnerability or the first related one
    const description = vuln.vulnerability.description || 
                       vuln.relatedVulnerabilities?.[0]?.description || 
                       "No description available";

    return {
      id,
      package: packageName,
      version,
      severity,
      description,
      // You can add more fields here if needed, like CVSS score
      cvssScore: vuln.vulnerability.cvss?.[0]?.metrics?.baseScore || null
    };
  });
};