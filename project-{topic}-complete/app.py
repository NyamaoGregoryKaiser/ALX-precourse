import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Model
class Sentiment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(10), nullable=False)  # Positive, Negative, Neutral

    def __repr__(self):
        return f'<Sentiment {self.text}>'


# Machine Learning Pipeline
model = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('clf', LogisticRegression())
])


# Load data and train (replace with more robust training process)
def train_model():
    try:
        df = pd.read_csv('data/sentiment_data.csv') # Assume CSV with 'text' and 'sentiment' columns
        model.fit(df['text'], df['sentiment'])
        print("Model trained successfully")
        return True
    except FileNotFoundError:
        print("Sentiment data not found. Ensure data/sentiment_data.csv exists")
        return False
    except Exception as e:
        print(f"Error during model training: {e}")
        return False


# API Endpoints

@app.route('/api/sentiment', methods=['POST'])
def predict_sentiment():
    try:
        data = request.get_json()
        text = data.get('text')
        if not text:
            return jsonify({'error': 'Text is required'}), 400

        prediction = model.predict([text])[0]
        return jsonify({'sentiment': prediction}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment', methods=['GET']) #Example GET endpoint for all sentiment data (consider pagination)
def get_sentiments():
    sentiments = Sentiment.query.all()
    results = [{'id': s.id, 'text': s.text, 'sentiment': s.sentiment} for s in sentiments]
    return jsonify(results)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create database tables
        if train_model():
            app.run(debug=True, host='0.0.0.0', port=5000)
        else:
            print("Application failed to initialize. Check model training.")