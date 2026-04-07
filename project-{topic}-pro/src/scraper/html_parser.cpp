```cpp
#include "html_parser.h"
#include <iostream>
#include <algorithm>
#include <sstream>

// Helper to check if a string contains another string
bool contains(const std::string& text, const std::string& substring) {
    return text.find(substring) != std::string::npos;
}

// Helper to trim whitespace
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (std::string::npos == first) {
        return str;
    }
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

// Recursively get text content from a Gumbo node
std::string HTMLParser::getTextContent(GumboNode* node) {
    if (!node || node->type != GUMBO_NODE_ELEMENT) {
        if (node && node->type == GUMBO_NODE_TEXT || node->type == GUMBO_NODE_WHITESPACE) {
            return std::string(node->v.text.text);
        }
        return "";
    }

    std::string text;
    for (unsigned int i = 0; i < node->v.element.children.length; ++i) {
        GumboNode* child = (GumboNode*)node->v.element.children.data[i];
        text += getTextContent(child);
    }
    return trim(text);
}

// Get attribute value from a Gumbo node
std::string HTMLParser::getAttributeValue(GumboNode* node, const std::string& attributeName) {
    if (!node || node->type != GUMBO_NODE_ELEMENT) {
        return "";
    }
    GumboVector* attributes = &node->v.element.attributes;
    for (unsigned int i = 0; i < attributes->length; ++i) {
        GumboAttribute* attribute = (GumboAttribute*)attributes->data[i];
        if (attributeName == attribute->name) {
            return std::string(attribute->value);
        }
    }
    return "";
}

// Basic CSS selector matching (simplified for class/id/tag)
bool HTMLParser::matchesSelector(GumboNode* node, const std::string& selector) {
    if (node->type != GUMBO_NODE_ELEMENT) return false;

    // Remove leading/trailing whitespace from selector for robustness
    std::string trimmedSelector = trim(selector);

    // 1. ID selector (e.g., "#myid")
    if (!trimmedSelector.empty() && trimmedSelector[0] == '#') {
        std::string id = trimmedSelector.substr(1);
        return getAttributeValue(node, "id") == id;
    }
    // 2. Class selector (e.g., ".myclass")
    else if (!trimmedSelector.empty() && trimmedSelector[0] == '.') {
        std::string className = trimmedSelector.substr(1);
        std::string classAttr = getAttributeValue(node, "class");
        // Check if class attribute contains the class name (space-separated)
        std::stringstream ss(classAttr);
        std::string token;
        while (std::getline(ss, token, ' ')) {
            if (token == className) return true;
        }
        return false;
    }
    // 3. Tag selector (e.g., "div", "a")
    else if (!trimmedSelector.empty() && isalpha(trimmedSelector[0])) {
        return gumbo_tag_to_string(node->v.element.tag) == trimmedSelector;
    }
    // 4. Attribute selector (e.g., "[href]", "[data-item='value']") - very basic
    else if (!trimmedSelector.empty() && trimmedSelector[0] == '[' && trimmedSelector.back() == ']') {
        std::string attr_part = trimmedSelector.substr(1, trimmedSelector.length() - 2);
        size_t eq_pos = attr_part.find('=');
        if (eq_pos != std::string::npos) {
            std::string attr_name = trim(attr_part.substr(0, eq_pos));
            std::string attr_val_quoted = trim(attr_part.substr(eq_pos + 1));
            // Remove quotes from value
            if (attr_val_quoted.length() >= 2 && 
                ((attr_val_quoted.front() == '\'' && attr_val_quoted.back() == '\'') ||
                 (attr_val_quoted.front() == '"' && attr_val_quoted.back() == '"'))) {
                std::string attr_val = attr_val_quoted.substr(1, attr_val_quoted.length() - 2);
                return getAttributeValue(node, attr_name) == attr_val;
            } else {
                // No quotes, direct attribute value match
                return getAttributeValue(node, attr_name) == attr_val_quoted;
            }
        } else {
            // Attribute presence check e.g., "[href]"
            return !getAttributeValue(node, attr_part).empty();
        }
    }

    return false;
}

// Recursive function to find elements by a single CSS selector
void HTMLParser::findElementsBySelector(GumboNode* node, const std::string& selector, std::vector<GumboNode*>& results) {
    if (!node) return;

    // Handle compound selectors (e.g., "div.myclass", "a[href]")
    // This part is a simplification. A full CSS parser would be needed for complex selectors.
    std::string current_selector_part = selector;
    std::string next_selector_part;
    size_t space_pos = selector.find(' ');
    if (space_pos != std::string::npos) {
        current_selector_part = trim(selector.substr(0, space_pos));
        next_selector_part = trim(selector.substr(space_pos + 1));
    }

    if (matchesSelector(node, current_selector_part)) {
        if (next_selector_part.empty()) {
            results.push_back(node);
        } else {
            // If there's a next part, search within the children of the current matching node
            if (node->type == GUMBO_NODE_ELEMENT) {
                for (unsigned int i = 0; i < node->v.element.children.length; ++i) {
                    GumboNode* child = (GumboNode*)node->v.element.children.data[i];
                    findElementsBySelector(child, next_selector_part, results);
                }
            }
        }
    }

    // Continue searching in children if current node didn't match the *first* part of a compound selector
    // or if it matched but there's no next part (meaning we're searching for direct matches anywhere).
    if (node->type == GUMBO_NODE_ELEMENT && !next_selector_part.empty()) {
        // If current node didn't match, continue searching the same full selector in children
         for (unsigned int i = 0; i < node->v.element.children.length; ++i) {
            GumboNode* child = (GumboNode*)node->v.element.children.data[i];
            findElementsBySelector(child, selector, results); // Recursive call with full selector
        }
    } else if (node->type == GUMBO_NODE_ELEMENT && next_selector_part.empty()) {
         // If we're matching simple selectors, search all children as well
        for (unsigned int i = 0; i < node->v.element.children.length; ++i) {
            GumboNode* child = (GumboNode*)node->v.element.children.data[i];
            findElementsBySelector(child, selector, results);
        }
    }
}


nlohmann::json HTMLParser::parseAndExtract(const std::string& html, const std::map<std::string, std::string>& selectors) {
    GumboOutput* output = gumbo_parse(html.c_str());
    if (!output || !output->root) {
        Logger::error("HTMLParser", "Failed to parse HTML.");
        return nlohmann::json();
    }

    nlohmann::json extractedData;

    for (const auto& pair : selectors) {
        const std::string& dataKey = pair.first;
        const std::string& selector = pair.second;

        std::vector<GumboNode*> matchingNodes;
        findElementsBySelector(output->root, selector, matchingNodes);

        if (!matchingNodes.empty()) {
            if (matchingNodes.size() == 1) {
                // If only one match, extract its text content
                std::string text = getTextContent(matchingNodes[0]);
                // Check if it's an attribute selector, e.g., "a[href]"
                if (selector.find('[') != std::string::npos && selector.back() == ']') {
                    size_t attr_start = selector.find('[');
                    std::string attr_name = selector.substr(attr_start + 1, selector.length() - attr_start - 2);
                    size_t eq_pos = attr_name.find('='); // Check for attribute value, e.g., [data-item='value']
                    if (eq_pos != std::string::npos) {
                        attr_name = trim(attr_name.substr(0, eq_pos));
                    }
                    std::string attr_value = getAttributeValue(matchingNodes[0], attr_name);
                    if (!attr_value.empty()) {
                        extractedData[dataKey] = attr_value;
                    } else {
                        extractedData[dataKey] = text; // Fallback to text if attribute not found
                    }
                } else {
                    extractedData[dataKey] = text;
                }
            } else {
                // If multiple matches, extract text content of each into an array
                nlohmann::json items = nlohmann::json::array();
                for (GumboNode* node : matchingNodes) {
                    std::string text = getTextContent(node);
                     if (selector.find('[') != std::string::npos && selector.back() == ']') {
                        size_t attr_start = selector.find('[');
                        std::string attr_name = selector.substr(attr_start + 1, selector.length() - attr_start - 2);
                        size_t eq_pos = attr_name.find('=');
                        if (eq_pos != std::string::npos) {
                            attr_name = trim(attr_name.substr(0, eq_pos));
                        }
                        std::string attr_value = getAttributeValue(node, attr_name);
                        if (!attr_value.empty()) {
                            items.push_back(attr_value);
                        } else {
                            items.push_back(text);
                        }
                    } else {
                        items.push_back(text);
                    }
                }
                extractedData[dataKey] = items;
            }
        } else {
            Logger::debug("HTMLParser", "No nodes found for selector '{}'.", selector);
            extractedData[dataKey] = nullptr; // Or an empty string, depending on desired behavior
        }
    }

    gumbo_destroy_output(&gumbo_options, output);
    return extractedData;
}
```