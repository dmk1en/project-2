package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

type Report struct {
	ProjectName     string                  `json:"project_name"`
	ScanID          string                  `json:"scan_id"`
	Timestamp       time.Time               `json:"timestamp"`
	Vulnerabilities []DetailedVulnerability `json:"vulnerabilities"`
}

type DetailedVulnerability struct {
	ID               string   `json:"id"`
	PackageName      string   `json:"package_name"`
	Version          string   `json:"version"`
	Severity         string   `json:"severity"`
	FixVersion       string   `json:"fix_version"`
	Description      string   `json:"description"`
	CVE              string   `json:"cve"`
	CVSS             float64  `json:"cvss"`
	References       []string `json:"references"`
	AffectedVersions []string `json:"affected_versions"`
}

func generateDetailedReport(projectName, scanID string, vulns []map[string]interface{}) (*Report, error) {
	var detailedVulns []DetailedVulnerability

	for _, vuln := range vulns {
		var dv DetailedVulnerability

		// Extract vulnerability details
		if vulnData, ok := vuln["vulnerability"].(map[string]interface{}); ok {
			dv.ID = getString(vulnData["id"])
			dv.Severity = getString(vulnData["severity"])
			dv.Description = getString(vulnData["description"])

			// Extract FixVersion
			if fix, ok := vulnData["fix"].(map[string]interface{}); ok {
				if versions, ok := fix["versions"].([]interface{}); ok && len(versions) > 0 {
					dv.FixVersion = getString(versions[0])
				}
			}

			// Extract CVE
			if epssArr, ok := vulnData["epss"].([]interface{}); ok && len(epssArr) > 0 {
				if epss, ok := epssArr[0].(map[string]interface{}); ok {
					dv.CVE = getString(epss["cve"])
				}
			}

			// Extract CVSS
			if cvssArr, ok := vulnData["cvss"].([]interface{}); ok && len(cvssArr) > 0 {
				if cvss, ok := cvssArr[0].(map[string]interface{}); ok {
					if metrics, ok := cvss["metrics"].(map[string]interface{}); ok {
						dv.CVSS = getFloat64(metrics["baseScore"])
					}
				}
			}

			// Extract References
			if urls, ok := vulnData["urls"].([]interface{}); ok {
				dv.References = getStringArray(urls)
			}
		}

		// Extract artifact details
		if artifact, ok := vuln["artifact"].(map[string]interface{}); ok {
			dv.PackageName = getString(artifact["name"])
			dv.Version = getString(artifact["version"])
		}

		// Extract AffectedVersions
		if matchDetails, ok := vuln["matchDetails"].([]interface{}); ok {
			for _, match := range matchDetails {
				if matchMap, ok := match.(map[string]interface{}); ok {
					if found, ok := matchMap["found"].(map[string]interface{}); ok {
						if versionConstraint, ok := found["versionConstraint"].(string); ok {
							dv.AffectedVersions = append(dv.AffectedVersions, versionConstraint)
						}
					}
				}
			}
		}

		// Extract References from relatedVulnerabilities
		if relatedVulnerabilities, ok := vuln["relatedVulnerabilities"].([]interface{}); ok {
			for _, related := range relatedVulnerabilities {
				if relatedMap, ok := related.(map[string]interface{}); ok {
					if urls, ok := relatedMap["urls"].([]interface{}); ok {
						dv.References = append(dv.References, getStringArray(urls)...)
					}
				}
			}
		}

		detailedVulns = append(detailedVulns, dv)
	}

	// Create the report
	report := &Report{
		ProjectName:     projectName,
		ScanID:          scanID,
		Timestamp:       time.Now(),
		Vulnerabilities: detailedVulns,
	}

	return report, nil
}

func saveReportToFile(report *Report, filename string) error {
	reportDir := "./report"
	if _, err := os.Stat(reportDir); os.IsNotExist(err) {
		if err := os.Mkdir(reportDir, 0755); err != nil {
			return fmt.Errorf("failed to create report directory: %v", err)
		}
	}

	filePath := fmt.Sprintf("%s/%s", reportDir, filename)

	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal report: %v", err)
	}
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write report to file: %v", err)
	}

	fmt.Println("Report saved to:", filePath)
	return nil
}

func getString(value interface{}) string {
	if s, ok := value.(string); ok {
		return s
	}
	return ""
}

func getFloat64(value interface{}) float64 {
	if f, ok := value.(float64); ok {
		return f
	}
	return 0
}

func getStringArray(value interface{}) []string {
	if arr, ok := value.([]interface{}); ok {
		var result []string
		for _, item := range arr {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
		return result
	}
	return nil
}
