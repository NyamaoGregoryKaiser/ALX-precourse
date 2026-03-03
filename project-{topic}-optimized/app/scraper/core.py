import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time
from app import current_app

class ScraperCore:
    def __init__(self, config_name, start_url, css_selectors, user_agent=None, delay=1):
        self.config_name = config_name
        self.start_url = start_url
        self.css_selectors = css_selectors
        self.user_agent = user_agent or "Mozilla/5.0 (compatible; ScraperBot/1.0; +http://example.com/bot)"
        self.delay = delay # Delay between requests in seconds
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': self.user_agent})
        current_app.logger.info(f"Scraper initialized for config '{config_name}' with start URL: {start_url}")

    def _fetch_page(self, url):
        """Fetches the content of a given URL with error handling and delay."""
        try:
            time.sleep(self.delay) # Respect rate limits
            response = self.session.get(url, timeout=10)
            response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
            current_app.logger.debug(f"Successfully fetched {url}")
            return response.text
        except requests.exceptions.HTTPError as e:
            current_app.logger.error(f"HTTP error fetching {url}: {e.response.status_code} - {e.response.text}")
            raise
        except requests.exceptions.ConnectionError as e:
            current_app.logger.error(f"Connection error fetching {url}: {e}")
            raise
        except requests.exceptions.Timeout as e:
            current_app.logger.error(f"Timeout error fetching {url}: {e}")
            raise
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Request error fetching {url}: {e}")
            raise

    def _parse_html(self, html_content):
        """Parses HTML content using BeautifulSoup."""
        return BeautifulSoup(html_content, 'html.parser')

    def _extract_data(self, soup):
        """Extracts data from the parsed HTML using configured CSS selectors."""
        extracted_data = {}
        for field, selector in self.css_selectors.items():
            element = soup.select_one(selector)
            if element:
                extracted_data[field] = element.get_text(strip=True)
            else:
                extracted_data[field] = None
                current_app.logger.warning(f"Selector '{selector}' for field '{field}' not found.")
        return extracted_data

    def scrape(self):
        """Executes the scraping process for the configured start URL."""
        current_app.logger.info(f"Starting scraping for {self.config_name} at {self.start_url}")
        try:
            html_content = self._fetch_page(self.start_url)
            soup = self._parse_html(html_content)
            data = self._extract_data(soup)
            current_app.logger.info(f"Scraping completed for {self.config_name}. Data extracted: {data}")
            return {'url': self.start_url, 'data': data}
        except Exception as e:
            current_app.logger.error(f"Error during scraping for {self.config_name} at {self.start_url}: {e}")
            raise

    # Example of a more advanced method to find all links matching a pattern
    def _find_links(self, soup, selector=None, base_url=None):
        """Finds all links in the soup, optionally filtered by a CSS selector."""
        links = []
        elements = soup.select(selector or 'a[href]')
        for element in elements:
            href = element.get('href')
            if href:
                full_url = urljoin(base_url or self.start_url, href)
                links.append(full_url)
        return links

    # A conceptual method for crawling if needed in future enhancements
    def crawl(self, max_depth=1, max_pages=10):
        """
        Conceptual method for crawling.
        For a production system, this would be a separate, more complex component
        using a dedicated crawling library or a more robust state management.
        """
        current_app.logger.warning("Crawl method is conceptual and not fully implemented for robust crawling.")
        visited_urls = set()
        urls_to_visit = [(self.start_url, 0)]
        results = []

        while urls_to_visit and len(results) < max_pages:
            current_url, depth = urls_to_visit.pop(0)

            if current_url in visited_urls or depth > max_depth:
                continue

            current_app.logger.info(f"Crawling: {current_url} (Depth: {depth})")
            visited_urls.add(current_url)

            try:
                html_content = self._fetch_page(current_url)
                soup = self._parse_html(html_content)
                extracted_data = self._extract_data(soup)
                results.append({'url': current_url, 'data': extracted_data})

                if depth < max_depth:
                    new_links = self._find_links(soup, base_url=current_url)
                    for link in new_links:
                        # Only follow links within the same domain
                        if urlparse(link).netloc == urlparse(self.start_url).netloc:
                            urls_to_visit.append((link, depth + 1))
            except Exception as e:
                current_app.logger.error(f"Error crawling {current_url}: {e}")
                continue
        return results
```