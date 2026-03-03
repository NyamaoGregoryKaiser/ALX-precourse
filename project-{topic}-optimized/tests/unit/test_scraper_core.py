import pytest
from unittest.mock import patch, MagicMock
from app.scraper.core import ScraperCore
from app import create_app
import requests

@pytest.fixture
def app_with_context():
    app = create_app()
    with app.app_context():
        yield app

def test_scraper_core_init(app_with_context):
    scraper = ScraperCore('Test Scraper', 'http://example.com', {'title': 'h1'})
    assert scraper.config_name == 'Test Scraper'
    assert scraper.start_url == 'http://example.com'
    assert scraper.css_selectors == {'title': 'h1'}
    assert 'User-Agent' in scraper.session.headers

@patch('requests.Session.get')
def test_fetch_page_success(mock_get, app_with_context):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "<html><body><h1>Hello</h1></body></html>"
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    scraper = ScraperCore('Test Scraper', 'http://example.com', {})
    content = scraper._fetch_page('http://example.com')
    assert content == "<html><body><h1>Hello</h1></body></html>"
    mock_get.assert_called_once_with('http://example.com', timeout=10)

@patch('requests.Session.get')
def test_fetch_page_http_error(mock_get, app_with_context):
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.text = "Not Found"
    mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("404 Client Error", response=mock_response)
    mock_get.return_value = mock_response

    scraper = ScraperCore('Test Scraper', 'http://example.com', {})
    with pytest.raises(requests.exceptions.HTTPError):
        scraper._fetch_page('http://example.com')

@patch('requests.Session.get')
def test_fetch_page_connection_error(mock_get, app_with_context):
    mock_get.side_effect = requests.exceptions.ConnectionError("Connection Refused")
    scraper = ScraperCore('Test Scraper', 'http://example.com', {})
    with pytest.raises(requests.exceptions.ConnectionError):
        scraper._fetch_page('http://example.com')

def test_parse_html(app_with_context):
    html = "<html><body><h1>Title</h1><p>Paragraph</p></body></html>"
    scraper = ScraperCore('Test Scraper', 'http://example.com', {})
    soup = scraper._parse_html(html)
    assert soup.find('h1').get_text() == 'Title'

def test_extract_data_success(app_with_context):
    html = "<html><body><h1 id='title'>Product Title</h1><span class='price'>$19.99</span></body></html>"
    soup = ScraperCore('Test Scraper', '', {})._parse_html(html)
    selectors = {'product_title': '#title', 'product_price': '.price'}
    scraper = ScraperCore('Test Scraper', 'http://example.com', selectors)
    data = scraper._extract_data(soup)
    assert data == {'product_title': 'Product Title', 'product_price': '$19.99'}

def test_extract_data_missing_selector(app_with_context):
    html = "<html><body><h1>Product Title</h1></body></html>"
    soup = ScraperCore('Test Scraper', '', {})._parse_html(html)
    selectors = {'product_title': 'h1', 'non_existent': '.missing'}
    scraper = ScraperCore('Test Scraper', 'http://example.com', selectors)
    data = scraper._extract_data(soup)
    assert data == {'product_title': 'Product Title', 'non_existent': None}

@patch('app.scraper.core.ScraperCore._fetch_page')
@patch('app.scraper.core.ScraperCore._extract_data')
def test_scrape_success(mock_extract_data, mock_fetch_page, app_with_context):
    mock_fetch_page.return_value = "<html>...</html>"
    mock_extract_data.return_value = {'title': 'Scraped Title'}

    scraper = ScraperCore('Test Scraper', 'http://example.com', {'title': 'h1'})
    result = scraper.scrape()
    assert result == {'url': 'http://example.com', 'data': {'title': 'Scraped Title'}}
    mock_fetch_page.assert_called_once_with('http://example.com')
    mock_extract_data.assert_called_once() # Argument is BeautifulSoup object, harder to mock directly

@patch('app.scraper.core.ScraperCore._fetch_page', side_effect=requests.exceptions.RequestException("Network error"))
def test_scrape_failure(mock_fetch_page, app_with_context):
    scraper = ScraperCore('Test Scraper', 'http://example.com', {'title': 'h1'})
    with pytest.raises(requests.exceptions.RequestException):
        scraper.scrape()
```