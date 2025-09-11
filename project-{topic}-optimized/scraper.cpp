```cpp
#include "scraper.h"
#include <iostream>
#include <curl/curl.h> // Requires libcurl

size_t writeCallback(void *contents, size_t size, size_t nmemb, std::string *output) {
  size_t totalSize = size * nmemb;
  output->append((char*)contents, totalSize);
  return totalSize;
}


std::string Scraper::scrape(const std::string& url) {
  CURL* curl = curl_easy_init();
  std::string readBuffer;

  if(curl) {
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    if (res != CURLE_OK) {
        std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res) << std::endl;
        return "";
    }
    return readBuffer;

  } else {
      std::cerr << "curl_easy_init() failed" << std::endl;
      return "";
  }
}

```