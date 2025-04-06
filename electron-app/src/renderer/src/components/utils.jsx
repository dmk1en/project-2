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