package com.alx.scraper.util;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.io.IOException;
import java.net.Proxy;
import java.util.Optional;

@Slf4j
public class JsoupUtil {

    private JsoupUtil() {
        // Private constructor to prevent instantiation
    }

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    private static final int TIMEOUT_MILLIS = 10000; // 10 seconds

    /**
     * Creates a Jsoup Connection object with default settings and optional proxy.
     *
     * @param url The URL to connect to.
     * @param proxy An optional java.net.Proxy object. Use Proxy.NO_PROXY for direct connection.
     * @return A configured Jsoup Connection.
     */
    public static Connection getConnection(String url, Proxy proxy) {
        Connection connection = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(TIMEOUT_MILLIS)
                .ignoreHttpErrors(true) // Important for handling non-200 responses
                .followRedirects(true);

        if (proxy != null && proxy != Proxy.NO_PROXY) {
            connection.proxy(proxy);
        }
        return connection;
    }

    /**
     * Selects the first element matching a CSS selector and returns its text.
     *
     * @param document The Jsoup Document to search within.
     * @param cssSelector The CSS selector.
     * @return An Optional containing the text of the first matching element, or empty if not found.
     */
    public static Optional<String> selectFirstText(Document document, String cssSelector) {
        return Optional.ofNullable(document)
                .map(doc -> doc.selectFirst(cssSelector))
                .map(Element::text)
                .filter(text -> !text.trim().isEmpty()) // Filter out empty or whitespace-only text
                .map(String::trim);
    }

    /**
     * Selects the first element matching a CSS selector and returns a specific attribute's value.
     *
     * @param document The Jsoup Document to search within.
     * @param cssSelector The CSS selector.
     * @param attributeName The name of the attribute to retrieve (e.g., "href", "src", "abs:href").
     * @return An Optional containing the attribute's value, or empty if element or attribute not found.
     */
    public static Optional<String> selectFirstAttribute(Document document, String cssSelector, String attributeName) {
        return Optional.ofNullable(document)
                .map(doc -> doc.selectFirst(cssSelector))
                .map(element -> element.attr(attributeName))
                .filter(attr -> !attr.trim().isEmpty());
    }

    /**
     * Selects all elements matching a CSS selector.
     *
     * @param document The Jsoup Document to search within.
     * @param cssSelector The CSS selector.
     * @return Elements collection (never null, but may be empty).
     */
    public static Elements selectAll(Document document, String cssSelector) {
        return Optional.ofNullable(document)
                .map(doc -> doc.select(cssSelector))
                .orElseGet(Elements::new);
    }
}