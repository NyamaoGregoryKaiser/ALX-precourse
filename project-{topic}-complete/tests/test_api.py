import pytest
import requests

def test_predict_sentiment():
    url = "http://localhost:5000/api/sentiment"
    data = {'text': 'This is a great day!'}
    response = requests.post(url, json=data)
    assert response.status_code == 200
    assert 'sentiment' in response.json()

    data = {'text': 'I hate this!'}
    response = requests.post(url, json=data)
    assert response.status_code == 200
    assert 'sentiment' in response.json()

    #Add more test cases for edge conditions and error handling.
    data = {}
    response = requests.post(url, json=data)
    assert response.status_code == 400