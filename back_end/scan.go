package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"time"

	// Import CORS package
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	mongoURI       = "mongodb://localhost:27017"
	databaseName   = "sbom_db"
	collectionName = "sbom_data"
)

type GithubScanRequest struct {
	RepoURL string `json:"repo_url"`
}

var (
	sbomTools = map[string]string{
		"pom.xml":      "mvn org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom -DoutputFormat=json -DoutputDirectory=. -DoutputFile=sbom.json",
		"package.json": "cyclonedx-npm --output-format json --output-file sbom.json",
	}
	mongoClient *mongo.Client
)

func initMongo() {
	var err error
	mongoClient, err = mongo.Connect(context.TODO(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("❌ MongoDB connection error: %v", err)
	}
}

func getMongoCollection() *mongo.Collection {
	return mongoClient.Database(databaseName).Collection(collectionName)
}

type ScanRequest struct {
	Directory string `json:"directory"`
}

type ScanResponse struct {
	Message string `json:"message"`
}

func scanFolder(directory string) (string, error) {

	if runtime.GOOS == "linux" {
		// Only convert if the path looks like a Windows path (e.g. D:\ or C:\)
		if len(directory) > 2 && directory[1] == ':' && (directory[2] == '\\' || directory[2] == '/') {
			cmd := exec.Command("wslpath", directory)
			output, err := cmd.Output()
			if err != nil {
				return "", fmt.Errorf("failed to convert path: %v", err)
			}
			directory = strings.TrimSpace(string(output)) // Use the converted WSL path
		}
	} else {
		log.Printf("Using directory path as is for OS: %s", runtime.GOOS)
	}

	files, err := os.ReadDir(directory)
	if err != nil {
		log.Printf("Error reading directory: %v", err)
		return "", err
	}

	scanID := time.Now().Format("20060102T150405")

	for _, file := range files {
		if command, exists := sbomTools[file.Name()]; exists {
			switch file.Name() {
			case "package.json":
				log.Printf("Found package.json. Ensuring dependencies are installed in directory: %s", directory)
				npmInstallCmd := exec.Command("npm", "install")
				npmInstallCmd.Dir = directory
				npmInstallCmd.Stdout = os.Stdout
				npmInstallCmd.Stderr = os.Stderr
				if err := npmInstallCmd.Run(); err != nil {
					log.Printf("Error running npm install: %v", err)
					return "", fmt.Errorf("failed to install npm dependencies: %v", err)
				}
			case "pom.xml":
				log.Printf("Found pom.xml. Ensuring Maven dependencies are installed in directory: %s", directory)
				mvnInstallCmd := exec.Command("mvn", "install", "-DskipTests")
				mvnInstallCmd.Dir = directory
				mvnInstallCmd.Stdout = os.Stdout
				mvnInstallCmd.Stderr = os.Stderr
				if err := mvnInstallCmd.Run(); err != nil {
					log.Printf("Error running mvn install: %v", err)
					return "", fmt.Errorf("failed to install Maven dependencies: %v", err)
				}
			}

			if err := runCommand(directory, command); err != nil {
				log.Printf("Error running command: %v", err)
				return "", fmt.Errorf("error running command for %s: %v", file.Name(), err)
			}

			if file.Name() == "pom.xml" {
				oldPath := directory + "/bom.json"
				newPath := directory + "/sbom.json"
				if _, err := os.Stat(oldPath); err == nil {
					if err := os.Rename(oldPath, newPath); err != nil {
						log.Printf("Error renaming bom.json to sbom.json: %v", err)
						return "", fmt.Errorf("failed to rename bom.json to sbom.json: %v", err)
					}
				}
			}

			return processSBOM(directory, scanID)

		}
	}

	return "No supported dependency files found.", nil
}

func runCommand(directory, command string) error {
	var cmd *exec.Cmd

	// Check the operating system
	if os.PathSeparator == '\\' { // Windows
		cmd = exec.Command("cmd", "/C", command)
	} else { // Unix-like systems (Linux, macOS)
		cmd = exec.Command("sh", "-c", command)
	}

	cmd.Dir = directory
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	log.Printf("Running command: %s in directory: %s", command, directory)

	return cmd.Run()
}

func processSBOM(directory, scanID string) (string, error) {
	data, err := os.ReadFile(directory + "/sbom.json")
	if err != nil {
		log.Printf("Error reading SBOM file: %v", err)
		return "", err
	}

	var sbomData map[string]interface{}
	if err := json.Unmarshal(data, &sbomData); err != nil {
		log.Printf("Error parsing SBOM JSON: %v", err)
		return "", err
	}

	var projectName string
	if metadata, ok := sbomData["metadata"].(map[string]interface{}); ok {
		if component, ok := metadata["component"].(map[string]interface{}); ok {
			if name, ok := component["name"].(string); ok {
				projectName = name
			}
		}
	}

	if projectName == "" {
		log.Println("Project name not found in SBOM metadata.")
		return "", fmt.Errorf("project name not found in SBOM metadata")
	}

	vulns, err := analyzeVulnerabilities(directory)
	if err != nil {
		log.Printf("No vulnerabilities found or Grype error: %v", err)
		vulns = nil
	}

	// Generate the report
	report, err := generateDetailedReport(projectName, scanID, vulns)
	if err != nil {
		log.Printf("Error generating report: %v", err)
		return "", err
	}

	// Save the report to a file
	filename := fmt.Sprintf("%s_report.json", projectName)
	if err := saveReportToFile(report, filename); err != nil {
		log.Printf("Error saving report to file: %v", err)
		return "", err
	}

	log.Println("SBOM file processed successfully.")

	return storeToMongo(projectName, scanID, sbomData, vulns)
}

func analyzeVulnerabilities(directory string) ([]map[string]interface{}, error) {
	cmd := exec.Command("grype", directory+"/sbom.json", "-o", "json")
	cmd.Dir = directory
	cmd.Env = append(os.Environ(),
		"GRYPE_DB_AUTO_UPDATE=false",
	)
	output, err := cmd.Output()
	if err != nil {
		log.Printf("Error running grype: %v", err)
		return nil, err
	}

	var grypeResult map[string]interface{}
	if err := json.Unmarshal(output, &grypeResult); err != nil {
		log.Printf("Error parsing Grype JSON: %v", err)
		return nil, err
	}

	if matches, ok := grypeResult["matches"].([]interface{}); ok {
		var vulns []map[string]interface{}
		for _, item := range matches {
			if match, ok := item.(map[string]interface{}); ok {
				vulns = append(vulns, match)
			}
		}
		return vulns, nil
	}
	return nil, fmt.Errorf("no vulnerabilities found")
}

// func storeToMongo(projectName, scanID, sbomData, vulnData string) {
// 	collection := getMongoCollection()
// 	_, err := collection.InsertOne(context.TODO(), bson.M{
// 		"project_name":    projectName,
// 		"scan_id":         scanID,
// 		"timestamp":       time.Now(),
// 		"sbom":            sbomData,
// 		"vulnerabilities": vulnData,
// 	})
// 	if err != nil {
// 		log.Printf("Error storing to MongoDB: %v", err)
// 	}
// }

func storeToMongo(projectName, scanID string, sbomData map[string]interface{}, vulnerabilities []map[string]interface{}) (string, error) {
	collection := getMongoCollection()
	_, err := collection.InsertOne(context.TODO(), bson.M{
		"project_name":    projectName,
		"scan_id":         scanID,
		"timestamp":       time.Now(),
		"sbom":            sbomData,
		"vulnerabilities": vulnerabilities,
	})
	return projectName, err
}

func scanHandler(c *gin.Context) {
	var request ScanRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		log.Printf("Invalid request format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}
	if request.Directory == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Directory and Project Name are required"})
		return
	}

	message, err := scanFolder(request.Directory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ScanResponse{Message: message})
}

func retrieveScans(c *gin.Context) {
	projectName := c.Param("project")

	collection := getMongoCollection()
	filter := bson.M{"project_name": projectName}
	cursor, err := collection.Find(context.TODO(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error retrieving data"})
		return
	}
	defer cursor.Close(context.TODO())

	var results []bson.M
	if err = cursor.All(context.TODO(), &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error decoding results"})
		return
	}

	c.JSON(http.StatusOK, results)
}

func githubScanHandler(c *gin.Context) {
	var req GithubScanRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.RepoURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid repo URL"})
		return
	}

	backendDir, err := os.Getwd()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get backend directory"})
		return
	}
	tmpRoot := backendDir + "/tmp"
	if _, err := os.Stat(tmpRoot); os.IsNotExist(err) {
		if err := os.Mkdir(tmpRoot, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tmp folder"})
			return
		}
	}
	tmpDir, err := os.MkdirTemp(tmpRoot, "repo-")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp dir"})
		return
	}

	// Clone the repo
	cmd := exec.Command("git", "clone", "--depth=1", req.RepoURL, tmpDir)
	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clone repo"})
		return
	}

	// Run the scan as usual
	projectName, err := scanFolder(tmpDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ScanResponse{Message: projectName})
}

func testScanHandler(c *gin.Context) {
	projectName := "package-json"
	c.JSON(http.StatusOK, ScanResponse{Message: projectName})
}

func main() {
	initMongo()
	defer mongoClient.Disconnect(context.TODO())

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.POST("/scan", scanHandler)
	r.GET("/scans/:project", retrieveScans)
	r.POST("/scan-github", githubScanHandler)
	r.GET("/test-scan", testScanHandler)

	server := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
}
