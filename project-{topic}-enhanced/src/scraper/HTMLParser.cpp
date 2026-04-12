#include "HTMLParser.h"
#include "utils/Logger.h"
#include <algorithm> // For std::transform
#include <sstream>

// --- HTMLNode methods ---

bool HTMLNode::matches_tag(const std::string& tag_name) const {
    std::string lower_tag_name = tag_name;
    std::transform(lower_tag_name.begin(), lower_tag_name.end(), lower_tag_name.begin(), ::tolower);
    return gumbo_tag_to_string(tag) == lower_tag_name;
}

bool HTMLNode::has_class(const std::string& class_name) const {
    if (class_list_str.empty()) return false;
    std::istringstream iss(class_list_str);
    std::string token;
    while (std::getline(iss, token, ' ')) {
        if (token == class_name) return true;
    }
    return false;
}

bool HTMLNode::has_id(const std::string& id_name) const {
    auto it = attributes.find("id");
    return it != attributes.end() && it->second == id_name;
}

std::optional<std::string> HTMLNode::get_attribute(const std::string& attr_name) const {
    auto it = attributes.find(attr_name);
    if (it != attributes.end()) {
        return it->second;
    }
    return std::nullopt;
}

void HTMLNode::find_elements(const std::string& tag_name, const std::string& class_name, std::vector<HTMLNode>& results) const {
    // Check if current node matches
    bool tag_match = tag_name.empty() || matches_tag(tag_name);
    bool class_match = class_name.empty() || has_class(class_name);

    if (tag_match && class_match) {
        results.push_back(*this);
    }

    // Recursively search children
    for (const auto& child : children) {
        child.find_elements(tag_name, class_name, results);
    }
}

std::vector<HTMLNode> HTMLNode::find_elements(const std::string& tag_name, const std::string& class_name) const {
    std::vector<HTMLNode> results;
    find_elements(tag_name, class_name, results);
    return results;
}


// --- HTMLParser methods ---

HTMLNode HTMLParser::convert_gumbo_node(GumboNode* node) {
    HTMLNode html_node;

    if (node->type == GUMBO_NODE_ELEMENT || node->type == GUMBO_NODE_DOCUMENT) {
        html_node.tag = node->v.element.tag;

        if (node->v.element.tag_type == GUMBO_TAG_UNKNOWN) {
            // Handle custom tags or errors, use original_tag for debugging
            // html_node.text_content = gumbo_normalize_tagname(html_node.tag_type);
        } else {
            // Attributes
            for (unsigned int i = 0; i < node->v.element.attributes.length; ++i) {
                GumboAttribute* attribute = static_cast<GumboAttribute*>(node->v.element.attributes.data[i]);
                html_node.attributes[attribute->name] = attribute->value;
                if (std::string(attribute->name) == "class") {
                    html_node.class_list_str = attribute->value;
                }
            }
        }

        // Children
        for (unsigned int i = 0; i < node->v.element.children.length; ++i) {
            GumboNode* child = static_cast<GumboNode*>(node->v.element.children.data[i]);
            html_node.children.push_back(convert_gumbo_node(child));
        }
    } else if (node->type == GUMBO_NODE_TEXT) {
        html_node.text_content = node->v.text.text;
    } else if (node->type == GUMBO_NODE_WHITESPACE) {
        html_node.text_content = node->v.text.text;
    }
    // Other types (COMMENT, CDATA, DOCTYPE) are ignored for simplicity in basic scraping
    return html_node;
}

std::optional<HTMLNode> HTMLParser::parse(const std::string& html_content) {
    GumboOutput* output = gumbo_parse(html_content.c_str());
    if (!output) {
        LOG_ERROR("Gumbo parsing failed for HTML content.");
        return std::nullopt;
    }

    HTMLNode root_node = convert_gumbo_node(output->root);
    gumbo_destroy_output(&kGumboDefaultOptions, output);

    return root_node;
}