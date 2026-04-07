```cpp
#ifndef WEBSCRAPER_HTML_PARSER_H
#define WEBSCRAPER_HTML_PARSER_H

#include <string>
#include <map>
#include <vector>
#include <nlohmann/json.hpp>
#include <gumbo.h> // libgumbo
#include "../common/logger.h"

// For simplicity, we'll use CSS selector syntax and implement basic traversal.
// A full-fledged solution might use a dedicated library like `htmlcxx` or a wrapper for `libxml2`/`libgumbo`.
// Here, we'll build a basic CSS selector interpretation on top of libgumbo.

class HTMLParser {
public:
    static nlohmann::json parseAndExtract(const std::string& html, const std::map<std::string, std::string>& selectors);

private:
    HTMLParser() = delete; // Static class

    // Recursive helper for traversing Gumbo nodes with a selector
    static void findElementsBySelector(GumboNode* node, const std::string& selector, std::vector<GumboNode*>& results);
    static bool matchesSelector(GumboNode* node, const std::string& selector);
    static std::string getTextContent(GumboNode* node);
    static std::string getAttributeValue(GumboNode* node, const std::string& attributeName);
};

#endif // WEBSCRAPER_HTML_PARSER_H
```