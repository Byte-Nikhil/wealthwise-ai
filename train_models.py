import sys
import os

# Add project root to path so we can import backend module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.services.ml_service import train_classifier

def main():
    print("Starting ML Model training process...")
    csv_path = "datasets/sample_transactions.csv"
    if not os.path.exists(csv_path):
        print(f"Error: Dataset {csv_path} does not exist. Please run sample data generator first.")
        sys.exit(1)
        
    try:
        results = train_classifier(csv_path)
        print("\n=========================================")
        print("MODEL TRAINING COMPLETED SUCCESSFULLY")
        print("=========================================")
        print(f"Best Model Selected: {results['best_model']}")
        print(f"Logistic Regression Accuracy: {results['logistic_regression_accuracy']:.4f}")
        print(f"Random Forest Accuracy:       {results['random_forest_accuracy']:.4f}")
        print(f"Overall Accuracy achieved:     {results['overall_accuracy']:.4f}")
        
        print("\n--- Classification Report Snippet ---")
        report = results['classification_report']
        for cat in results['unique_categories']:
            if cat in report:
                print(f"Category: {cat:<15} | Precision: {report[cat]['precision']:.2f} | Recall: {report[cat]['recall']:.2f} | F1-Score: {report[cat]['f1-score']:.2f}")
                
        print("=========================================\n")
        print("Trained model files saved in 'model/' directory:")
        print(" - model/classifier.pkl (Weights)")
        print(" - model/tfidf.pkl      (Text Vectorizer)")
    except Exception as e:
        print(f"Error training models: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
