# SBOM Desktop Scanner

A desktop application for generating and analyzing Software Bill of Materials (SBOM) and vulnerabilities for Node.js and Java projects.  
Frontend: Electron + React  
Backend: Go (runs in a **Linux environment**)

---

## Features

- Scan local Node.js (`package.json`) and Java/Maven (`pom.xml`) projects for SBOM and vulnerabilities
- Scan GitHub repositories by URL
- View and export SBOM and vulnerability reports

---

## Project Structure

```
back_end/         # Go backend (API, scanning logic)
electron-app/     # Electron + React frontend
```

---

## Prerequisites

**The backend must run in a Linux environment.**  
You must install the following tools in the Linux environment and ensure they are available in the system PATH:

- [Node.js & npm](https://nodejs.org/) (for Node.js projects)
- [Maven](https://maven.apache.org/download.cgi) (for Java projects)
- [Git](https://git-scm.com/) (for cloning repositories)
- [grype](https://github.com/anchore/grype) (vulnerability scanner)
- [cyclonedx-npm](https://github.com/CycloneDX/cyclonedx-npm) (SBOM for Node.js)

### Install cyclonedx-npm globally:
```sh
npm install -g @cyclonedx/cyclonedx-npm
```

### Install grype:
See [Grype releases](https://github.com/anchore/grype/releases) for your OS.

---

## Getting Started

### 1. Install Frontend Dependencies

```sh
cd electron-app
npm install
```

### 2. Build the Backend Binary (in Linux)

```sh
cd back_end
go build -o sbom-backend
```

### 3. Run in Development

- Start the backend (in Linux):
  ```sh
  ./sbom-backend
  ```
- Start the frontend (in a separate terminal, can be on Windows/macOS/Linux):
  ```sh
  cd electron-app
  npm run dev
  ```

### 4. Build Desktop App

```sh
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

The packaged app will be in the `dist/` or `out/` directory.

---

## Usage

1. **Open the app** and select a local project folder or enter a GitHub repository URL.
2. **Start the scan** to generate SBOM and vulnerability reports.
3. **View results** in the app and export SBOM as JSON if needed.

---

## Notes

- **All required tools must be installed and available in the Linux environment's PATH.**  
  The backend will fail to scan if any tool is missing.
- For best results, use the latest versions of all tools.
- If running the frontend on Windows/macOS and the backend in Linux (e.g., WSL or Docker), ensure the backend can access the files you want to scan (use volume mounts or shared folders).

---
