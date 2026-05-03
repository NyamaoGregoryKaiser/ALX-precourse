package com.alx.scraper.util;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.Proxy;
import java.net.InetSocketAddress;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JsoupUtilTest {

    @Mock
    private Connection mockConnection;
    @Mock
    private Connection.Request mockRequest; // Mock Connection.Request

    private Document document;

    @BeforeEach
    void setUp() {
        // Create a mock HTML document for testing selectors
        String html = "<html><head><title>Test Title</title></head><body>" +
                      "<h1 id='main-title'>Main Heading</h1>" +
                      "<p class='content'>First paragraph.</p>" +
                      "<p class='content'>Second paragraph with <a href='/link2'>link</a>.</p>" +
                      "<div class='product-info'>" +
                      "  <span class='price'>$19.99</span>" +
                      "  <img src='img.jpg' alt='Product Image'>" +
                      "</div>" +
                      "<a href='/next-page' class='next-page'>Next Page &raquo;</a>" +
                      "<a href='#' class='invalid-link'>Invalid</a>" +
                      "</body></html>";
        document = Jsoup.parse(html);
    }

    @Test
    @DisplayName("Should create connection with default settings and no proxy")
    void getConnection_NoProxy() {
        try (MockedStatic<Jsoup> mockedJsoup = mockStatic(Jsoup.class)) {
            mockedJsoup.when(() -> Jsoup.connect(anyString())).thenReturn(mockConnection);
            when(mockConnection.userAgent(anyString())).thenReturn(mockConnection);
            when(mockConnection.timeout(anyInt())).thenReturn(mockConnection);
            when(mockConnection.ignoreHttpErrors(anyBoolean())).thenReturn(mockConnection);
            when(mockConnection.followRedirects(anyBoolean())).thenReturn(mockConnection);

            Connection connection = JsoupUtil.getConnection("http://example.com", Proxy.NO_PROXY);

            assertNotNull(connection);
            verify(mockConnection, times(1)).userAgent(anyString());
            verify(mockConnection, times(1)).timeout(anyInt());
            verify(mockConnection, times(1)).ignoreHttpErrors(true);
            verify(mockConnection, times(1)).followRedirects(true);
            verify(mockConnection, never()).proxy(any(Proxy.class)); // Ensure proxy is not set
        }
    }

    @Test
    @DisplayName("Should create connection with default settings and a specified proxy")
    void getConnection_WithProxy() {
        Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress("127.0.0.1", 8080));
        try (MockedStatic<Jsoup> mockedJsoup = mockStatic(Jsoup.class)) {
            mockedJsoup.when(() -> Jsoup.connect(anyString())).thenReturn(mockConnection);
            when(mockConnection.userAgent(anyString())).thenReturn(mockConnection);
            when(mockConnection.timeout(anyInt())).thenReturn(mockConnection);
            when(mockConnection.ignoreHttpErrors(anyBoolean())).thenReturn(mockConnection);
            when(mockConnection.followRedirects(anyBoolean())).thenReturn(mockConnection);
            when(mockConnection.proxy(any(Proxy.class))).thenReturn(mockConnection);

            Connection connection = JsoupUtil.getConnection("http://example.com", proxy);

            assertNotNull(connection);
            verify(mockConnection, times(1)).proxy(proxy); // Ensure proxy is set
        }
    }

    @Test
    @DisplayName("Should select first element's text successfully")
    void selectFirstText_Success() {
        Optional<String> title = JsoupUtil.selectFirstText(document, "h1#main-title");
        assertTrue(title.isPresent());
        assertEquals("Main Heading", title.get());

        Optional<String> paragraph = JsoupUtil.selectFirstText(document, "p.content");
        assertTrue(paragraph.isPresent());
        assertEquals("First paragraph.", paragraph.get()); // Only gets the first
    }

    @Test
    @DisplayName("Should return empty optional if no element matches selector for text")
    void selectFirstText_NoMatch() {
        Optional<String> noMatch = JsoupUtil.selectFirstText(document, "div.non-existent");
        assertTrue(noMatch.isEmpty());
    }

    @Test
    @DisplayName("Should return empty optional if element found but has no text")
    void selectFirstText_EmptyText() {
        // This selector matches an empty text element if one existed
        // For existing elements, it trims, so if it's just spaces, it becomes empty
        String htmlWithEmptyElement = "<html><body><span class='empty'> </span><span class='empty-text'></span></body></html>";
        Document docWithEmpty = Jsoup.parse(htmlWithEmptyElement);
        Optional<String> emptyText = JsoupUtil.selectFirstText(docWithEmpty, "span.empty");
        assertTrue(emptyText.isEmpty());
        Optional<String> trulyEmptyText = JsoupUtil.selectFirstText(docWithEmpty, "span.empty-text");
        assertTrue(trulyEmptyText.isEmpty());
    }

    @Test
    @DisplayName("Should select first element's attribute successfully")
    void selectFirstAttribute_Success() {
        Optional<String> imgSrc = JsoupUtil.selectFirstAttribute(document, ".product-info img", "src");
        assertTrue(imgSrc.isPresent());
        assertEquals("img.jpg", imgSrc.get());

        Optional<String> nextHref = JsoupUtil.selectFirstAttribute(document, "a.next-page", "href");
        assertTrue(nextHref.isPresent());
        assertEquals("/next-page", nextHref.get());
    }

    @Test
    @DisplayName("Should return empty optional if no element matches selector for attribute")
    void selectFirstAttribute_NoMatch() {
        Optional<String> noMatch = JsoupUtil.selectFirstAttribute(document, "div.non-existent", "src");
        assertTrue(noMatch.isEmpty());
    }

    @Test
    @DisplayName("Should return empty optional if element matches but attribute not found")
    void selectFirstAttribute_AttributeNotFound() {
        Optional<String> nonExistentAttr = JsoupUtil.selectFirstAttribute(document, "h1#main-title", "data-id");
        assertTrue(nonExistentAttr.isEmpty());
    }

    @Test
    @DisplayName("Should return empty optional if attribute value is empty or whitespace")
    void selectFirstAttribute_EmptyAttribute() {
        Optional<String> emptyLink = JsoupUtil.selectFirstAttribute(document, "a.invalid-link", "href");
        assertTrue(emptyLink.isPresent()); // Jsoup returns "#" for empty href. Filter below handles empty strings, not "#".

        // Test with explicitly empty attribute value
        String htmlWithEmptyAttr = "<html><body><a href='' class='empty-href'>Empty</a></body></html>";
        Document docWithEmptyAttr = Jsoup.parse(htmlWithEmptyAttr);
        Optional<String> emptyHref = JsoupUtil.selectFirstAttribute(docWithEmptyAttr, "a.empty-href", "href");
        assertTrue(emptyHref.isEmpty());
    }


    @Test
    @DisplayName("Should select all matching elements")
    void selectAll_Success() {
        Elements paragraphs = JsoupUtil.selectAll(document, "p.content");
        assertNotNull(paragraphs);
        assertEquals(2, paragraphs.size());
        assertEquals("First paragraph.", paragraphs.get(0).text());
        assertEquals("Second paragraph with link.", paragraphs.get(1).text());
    }

    @Test
    @DisplayName("Should return empty Elements collection if no elements match")
    void selectAll_NoMatch() {
        Elements noMatch = JsoupUtil.selectAll(document, "span.non-existent");
        assertNotNull(noMatch);
        assertTrue(noMatch.isEmpty());
    }
}