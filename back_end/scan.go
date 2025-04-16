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

var (
	sbomTools = map[string]string{
		"pom.xml":      "mvn org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom -DoutputFormat=json -DoutputFile=sbom.json",
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
	files, err := os.ReadDir(directory)
	if err != nil {
		return "", err
	}

	scanID := time.Now().Format("20060102T150405")

	for _, file := range files {
		if command, exists := sbomTools[file.Name()]; exists {
			if err := runCommand(directory, command); err != nil {
				return "", fmt.Errorf("error running command for %s: %v", file.Name(), err)
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

	// Extract projectName from metadata.component.name
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

	return storeToMongo(projectName, scanID, sbomData)
}

// func analyzeVulnerabilities(directory string) []byte {
// 	ch := make(chan []byte, 1)
// 	go func() {
// 		cmd := exec.Command("grype", directory+"/sbom.json", "-o", "json")
// 		cmd.Dir = directory
// 		output, err := cmd.Output()
// 		if err != nil {
// 			log.Printf("Error running grype: %v", err)
// 			ch <- nil
// 		} else {
// 			ch <- output
// 		}
// 	}()
// 	return <-ch
// }

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

func storeToMongo(projectName, scanID string, sbomData map[string]interface{}) (string, error) {
	collection := getMongoCollection()
	_, err := collection.InsertOne(context.TODO(), bson.M{
		"project_name": projectName,
		"scan_id":      scanID,
		"timestamp":    time.Now(),
		"sbom":         sbomData,
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

func main() {
	initMongo()
	defer mongoClient.Disconnect(context.TODO())

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"}, // Update based on your frontend URL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.POST("/scan", scanHandler)
	r.GET("/scans/:project", retrieveScans)

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
