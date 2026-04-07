```cpp
// This file is a placeholder. In a real project, you would usually
// download the single_include/nlohmann/json.hpp file from the official
// nlohmann/json GitHub repository and place its content here.
// For brevity, I'm just including the required copyright/license info
// and noting its purpose.

/*
    ____   ____      ____   __  __ _____ _____ ____  _   _
   / ___| / ___|    |  _ \ |  \/  | ____|_   _/ ___|| | | |
  | |  _ | |   _____| |_) || |\/| |  _|   | || |  _ | |_| |
  | |_| || |__|_____|  _ < | |  | | |___  | || |_| ||  _  |
   \____| \____|    |_| \_\|_|  |_|_____| |_| \____||_| |_|

  A JSON (de)serialization library for C++ written by Niels Lohmann.
  https://github.com/nlohmann/json

  Copyright (c) 2013-2024 Niels Lohmann

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

// Full content of nlohmann/json.hpp would go here.
// Due to extreme length, I'm omitting the full content, but this is where it belongs.
// You can download it from: https://github.com/nlohmann/json/releases
// For example, for v3.11.2, it's `json.hpp` from the "single_include" directory.
#pragma once
#ifndef NLOHMANN_JSON_HPP
#define NLOHMANN_JSON_HPP

// Minimal mock-up to allow compilation for this example if the real file is missing.
// In a real setup, replace this with the actual content of the nlohmann/json.hpp file.
#include <map>
#include <string>
#include <vector>
#include <optional>
#include <sstream>
#include <iostream> // For error messages during parse

namespace nlohmann {
    class json {
    public:
        enum value_t {
            null, boolean, number_integer, number_unsigned, number_float, string, array, object, binary, discarded
        };

        value_t m_type = null;
        std::map<std::string, json> m_object;
        std::vector<json> m_array;
        std::string m_string;
        bool m_boolean = false;
        long long m_number_integer = 0;
        double m_number_float = 0.0;

        json() = default;
        json(value_t t) : m_type(t) {}
        json(const std::string& s) : m_type(string), m_string(s) {}
        json(const char* s) : m_type(string), m_string(s) {}
        json(bool b) : m_type(boolean), m_boolean(b) {}
        json(int i) : m_type(number_integer), m_number_integer(i) {}
        json(long long i) : m_type(number_integer), m_number_integer(i) {}
        json(double f) : m_type(number_float), m_number_float(f) {}
        json(const std::map<std::string, std::string>& m) : m_type(object) {
            for (const auto& p : m) m_object[p.first] = json(p.second);
        }
        json(const std::map<std::string, json>& m) : m_type(object), m_object(m) {}
        json(const std::vector<json>& v) : m_type(array), m_array(v) {}

        static json parse(const std::string& s) {
            // Simplified parsing for compilation. Real library has full parser.
            std::cerr << "Warning: Using mock nlohmann::json::parse. Actual parsing not implemented." << std::endl;
            if (s.empty() || s == "null") return json();
            if (s == "true") return json(true);
            if (s == "false") return json(false);
            if (s.front() == '{' && s.back() == '}') {
                json obj(object);
                // Very crude mock for object parsing (only top level)
                size_t start = s.find('{');
                size_t end = s.find('}');
                if (start != std::string::npos && end != std::string::npos && end > start) {
                    std::string content = s.substr(start + 1, end - start - 1);
                    size_t colon = content.find(':');
                    if (colon != std::string::npos) {
                        std::string key_str = content.substr(0, colon);
                        std::string val_str = content.substr(colon + 1);
                        if (key_str.length() > 1 && key_str.front() == '"' && key_str.back() == '"') {
                            key_str = key_str.substr(1, key_str.length() - 2);
                        }
                        if (val_str.length() > 1 && val_str.front() == '"' && val_str.back() == '"') {
                            val_str = val_str.substr(1, val_str.length() - 2);
                        }
                        obj.m_object[key_str] = json(val_str);
                    }
                }
                return obj;
            }
             if (s.front() == '[' && s.back() == ']') {
                json arr(array);
                // Very crude mock for array parsing
                size_t start = s.find('[');
                size_t end = s.find(']');
                if (start != std::string::npos && end != std::string::npos && end > start) {
                    std::string content = s.substr(start + 1, end - start - 1);
                    std::istringstream iss(content);
                    std::string segment;
                    while(std::getline(iss, segment, ',')) {
                        segment = trim(segment);
                         if (segment.length() > 1 && segment.front() == '"' && segment.back() == '"') {
                            segment = segment.substr(1, segment.length() - 2);
                        }
                        arr.m_array.push_back(json(segment));
                    }
                }
                return arr;
            }
            // Assume string if not null/bool/object/array
            if (s.length() > 1 && s.front() == '"' && s.back() == '"') {
                return json(s.substr(1, s.length() - 2));
            }
            try {
                size_t pos;
                long long val_i = std::stoll(s, &pos);
                if (pos == s.length()) return json(val_i);
                double val_f = std::stod(s, &pos);
                if (pos == s.length()) return json(val_f);
            } catch(...) {}
            return json(s); // Fallback to string
        }

        std::string dump(int indent = -1) const {
            std::ostringstream ss;
            if (m_type == null) ss << "null";
            else if (m_type == boolean) ss << (m_boolean ? "true" : "false");
            else if (m_type == number_integer) ss << m_number_integer;
            else if (m_type == number_float) ss << m_number_float;
            else if (m_type == string) ss << "\"" << m_string << "\"";
            else if (m_type == array) {
                ss << "[";
                bool first = true;
                for (const auto& item : m_array) {
                    if (!first) ss << ",";
                    ss << item.dump(indent);
                    first = false;
                }
                ss << "]";
            }
            else if (m_type == object) {
                ss << "{";
                bool first = true;
                for (const auto& pair : m_object) {
                    if (!first) ss << ",";
                    ss << "\"" << pair.first << "\":" << pair.second.dump(indent);
                    first = false;
                }
                ss << "}";
            }
            else ss << "\"__unsupported_mock_type__\"";
            return ss.str();
        }

        json& operator[](const std::string& key) {
            m_type = object;
            return m_object[key];
        }

        json& operator[](size_t index) {
            m_type = array;
            if (index >= m_array.size()) m_array.resize(index + 1);
            return m_array[index];
        }
        
        const json& at(const std::string& key) const {
            if (m_type != object || m_object.find(key) == m_object.end()) throw json_exception("key not found in object");
            return m_object.at(key);
        }
         const json& at(size_t index) const {
            if (m_type != array || index >= m_array.size()) throw json_exception("index out of range in array");
            return m_array.at(index);
        }


        bool contains(const std::string& key) const {
            return m_type == object && m_object.count(key);
        }

        bool is_string() const { return m_type == string; }
        bool is_number_integer() const { return m_type == number_integer; }
        bool is_boolean() const { return m_type == boolean; }
        bool is_array() const { return m_type == array; }
        bool is_object() const { return m_type == object; }
        bool empty() const {
            if (m_type == object) return m_object.empty();
            if (m_type == array) return m_array.empty();
            if (m_type == string) return m_string.empty();
            return m_type == null; // Treat null as empty
        }

        template <typename T>
        T get() const {
            if constexpr (std::is_same_v<T, std::string>) return m_string;
            if constexpr (std::is_same_v<T, int>) return static_cast<int>(m_number_integer);
            if constexpr (std::is_same_v<T, long>) return static_cast<long>(m_number_integer);
            if constexpr (std::is_same_v<T, long long>) return m_number_integer;
            if constexpr (std::is_same_v<T, bool>) return m_boolean;
            if constexpr (std::is_same_v<T, double>) return m_number_float;
            if constexpr (std::is_same_v<T, std::map<std::string, std::string>>) {
                std::map<std::string, std::string> result;
                if (m_type == object) {
                    for (const auto& p : m_object) {
                        if (p.second.is_string()) result[p.first] = p.second.m_string;
                    }
                }
                return result;
            }
            // More type conversions needed for a complete mock
            return T(); // Default-construct for unsupported types
        }

        template <typename T>
        T value(const std::string& key, const T& default_value) const {
            if (m_type == object && m_object.count(key)) {
                return m_object.at(key).get<T>();
            }
            return default_value;
        }

        auto begin() { return m_object.begin(); }
        auto end() { return m_object.end(); }
        auto begin() const { return m_object.begin(); }
        auto end() const { return m_object.end(); }

        static json array() { return json(json::array); }
        static json object() { return json(json::object); }


        class json_exception : public std::runtime_error {
        public:
            json_exception(const std::string& msg) : std::runtime_error(msg) {}
        };
        class parse_error : public json_exception {
        public:
            parse_error(const std::string& msg) : json_exception(msg) {}
        };

        // Helper to trim for mock parser
        static std::string trim(const std::string& str) {
            size_t first = str.find_first_not_of(" \t\n\r");
            if (std::string::npos == first) { return str; }
            size_t last = str.find_last_not_of(" \t\n\r");
            return str.substr(first, (last - first + 1));
        }

    };
} // namespace nlohmann

#endif // NLOHMANN_JSON_HPP

```