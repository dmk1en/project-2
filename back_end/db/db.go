package db

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	mongoURI       = "mongodb://localhost:27017"
	databaseName   = "sbom_db"
	collectionName = "sbom_data"
)

func RetrieveScans(projectName string) {
	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("❌ MongoDB connection error: %v", err)
	}
	defer client.Disconnect(context.TODO())

	collection := client.Database(databaseName).Collection(collectionName)
	filter := bson.M{"project_name": projectName}
	projection := bson.M{"scan_id": 1, "_id": 0}
	cursor, err := collection.Find(context.TODO(), filter, options.Find().SetProjection(projection))
	if err != nil {
		log.Fatalf("❌ Error retrieving data: %v", err)
	}
	defer cursor.Close(context.TODO())

	var results []bson.M
	if err = cursor.All(context.TODO(), &results); err != nil {
		log.Fatalf("❌ Error decoding results: %v", err)
	}

	if len(results) == 0 {
		fmt.Println("⚠️ No data found for project:", projectName)
		return
	}

	// Pretty-print retrieved results
	for _, scan := range results {
		jsonData, _ := json.MarshalIndent(scan, "", "  ")
		fmt.Println(string(jsonData))
	}
}
