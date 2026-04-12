#pragma once

#include <string>
#include <vector>
#include <map>
#include <optional>
#include <gumbo.h>

// Represents a node in the HTML DOM tree
struct HTMLNode {
    GumboTag tag = GUMBO_TAG_UNKNOWN;
    std::string text_content;
    std::map<std::string, std::string> attributes;
    std::vector<HTMLNode> children;
    std::string class_list_str; // Combined class string for easy searching

    // Helper for CSS-like selection (simplified)
    bool matches_tag(const std::string& tag_name) const;
    bool has_class(const std::string& class_name) const;
    bool has_id(const std::string& id_name) const;
    std::optional<std::string> get_attribute(const std::string& attr_name) const;

    // Recursive search by tag and/or class. This is a very basic selector.
    // For full CSS selector support, a dedicated library (e.g., building on top of libxml2 with libgumbo-query) would be needed.
    void find_elements(const std::string& tag_name, const std::string& class_name, std::vector<HTMLNode>& results) const;
    std::vector<HTMLNode> find_elements(const std::string& tag_name, const std::string& class_name = "") const;
};

// Main HTML Parser class
class HTMLParser {
public:
    // Parses an HTML string and returns the root HTMLNode
    std::optional<HTMLNode> parse(const std::string& html_content);

private:
    // Recursive function to convert GumboNode to HTMLNode
    HTMLNode convert_gumbo_node(GumboNode* node);
};