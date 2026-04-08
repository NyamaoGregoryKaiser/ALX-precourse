```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_string.hpp>
#include "services/QueryAnalyzer.hpp"
#include "Poco/JSON/Parser.h"
#include "Poco/JSON/Object.h"
#include <iostream>

using Catch::Matchers::ContainsSubstring;

TEST_CASE("QueryAnalyzer extracts tables correctly", "[QueryAnalyzer][Unit]") {
    QueryAnalyzer analyzer;

    SECTION("Simple SELECT from one table") {
        std::string query = "SELECT * FROM users WHERE id = 1;";
        auto tables = analyzer.extractTables(query);
        REQUIRE(tables.size() == 1);
        REQUIRE(tables.count("users"));
    }

    SECTION("SELECT with alias") {
        std::string query = "SELECT u.name FROM users AS u WHERE u.id = 1;";
        auto tables = analyzer.extractTables(query);
        REQUIRE(tables.size() == 1);
        REQUIRE(tables.count("users"));
    }

    SECTION("JOINs with multiple tables") {
        std::string query = "SELECT p.name, c.name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.price > 100;";
        auto tables = analyzer.extractTables(query);
        REQUIRE(tables.size() == 2);
        REQUIRE(tables.count("products"));
        REQUIRE(tables.count("categories"));
    }

    SECTION("Multiple JOIN types") {
        std::string query = "SELECT o.id FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id RIGHT JOIN products p ON oi.product_id = p.id;";
        auto tables = analyzer.extractTables(query);
        REQUIRE(tables.size() == 3);
        REQUIRE(tables.count("orders"));
        REQUIRE(tables.count("order_items"));
        REQUIRE(tables.count("products"));
    }

    SECTION("Subquery (simplified handling)") {
        std::string query = "SELECT name FROM products WHERE category_id IN (SELECT id FROM categories WHERE name = 'Books');";
        auto tables = analyzer.extractTables(query);
        // Current simple regex might not fully capture subquery tables, focus on main query for now
        REQUIRE(tables.size() == 2);
        REQUIRE(tables.count("products"));
        REQUIRE(tables.count("categories"));
    }

    SECTION("Table with schema prefix and quotes") {
        std::string query = "SELECT * FROM \"my_schema\".\"my_table\";";
        auto tables = analyzer.extractTables(query);
        REQUIRE(tables.size() == 1);
        REQUIRE(tables.count("my_table"));
    }

    SECTION("FROM with multiple tables (comma separated)") {
        std::string query = "SELECT * FROM users, products WHERE users.id = products.id;";
        auto tables = analyzer.extractTables(query);
        REQUIRE(tables.size() == 2);
        REQUIRE(tables.count("users"));
        REQUIRE(tables.count("products"));
    }
}

TEST_CASE("QueryAnalyzer extracts filter, sort, group columns correctly", "[QueryAnalyzer][Unit]") {
    QueryAnalyzer analyzer;

    SECTION("WHERE clause") {
        std::string query = "SELECT * FROM users WHERE email = 'test@example.com' AND status = 'active';";
        auto columns = analyzer.extractFilterSortGroupColumns(query);
        REQUIRE(columns.size() == 2);
        REQUIRE(columns.count("email"));
        REQUIRE(columns.count("status"));
    }

    SECTION("ORDER BY clause") {
        std::string query = "SELECT * FROM products ORDER BY price DESC, name ASC;";
        auto columns = analyzer.extractFilterSortGroupColumns(query);
        REQUIRE(columns.size() == 2);
        REQUIRE(columns.count("price"));
        REQUIRE(columns.count("name"));
    }

    SECTION("GROUP BY clause") {
        std::string query = "SELECT category_id, COUNT(*) FROM products GROUP BY category_id HAVING COUNT(*) > 10;";
        auto columns = analyzer.extractFilterSortGroupColumns(query);
        REQUIRE(columns.size() == 1);
        REQUIRE(columns.count("category_id"));
    }

    SECTION("Combined clauses with table prefixes") {
        std::string query = "SELECT u.username FROM users u JOIN orders o ON u.id = o.user_id WHERE u.email LIKE '%@domain.com' ORDER BY o.order_date DESC;";
        auto columns = analyzer.extractFilterSortGroupColumns(query);
        REQUIRE(columns.size() == 2);
        REQUIRE(columns.count("email"));
        REQUIRE(columns.count("order_date"));
    }

    SECTION("Complex WHERE conditions") {
        std::string query = "SELECT * FROM products WHERE (price > 50 AND stock < 100) OR description IS NULL;";
        auto columns = analyzer.extractFilterSortGroupColumns(query);
        REQUIRE(columns.size() == 3);
        REQUIRE(columns.count("price"));
        REQUIRE(columns.count("stock"));
        REQUIRE(columns.count("description"));
    }
}

TEST_CASE("QueryAnalyzer extracts join conditions correctly", "[QueryAnalyzer][Unit]") {
    QueryAnalyzer analyzer;

    SECTION("Simple JOIN ON") {
        std::string query = "SELECT p.name, c.name FROM products p JOIN categories c ON p.category_id = c.id;";
        auto joins = analyzer.extractJoinConditions(query);
        REQUIRE(joins.size() == 1);
        REQUIRE(joins[0] == "p.category_id = c.id");
    }

    SECTION("Multiple JOINs") {
        std::string query = "SELECT o.id, p.name FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id;";
        auto joins = analyzer.extractJoinConditions(query);
        REQUIRE(joins.size() == 2);
        REQUIRE(joins[0] == "o.id = oi.order_id");
        REQUIRE(joins[1] == "oi.product_id = p.id");
    }

    SECTION("JOIN with AND conditions") {
        std::string query = "SELECT * FROM users u JOIN orders o ON u.id = o.user_id AND o.total_amount > 0;";
        auto joins = analyzer.extractJoinConditions(query);
        REQUIRE(joins.size() == 1);
        REQUIRE(joins[0] == "u.id = o.user_id AND o.total_amount > 0");
    }
}
```