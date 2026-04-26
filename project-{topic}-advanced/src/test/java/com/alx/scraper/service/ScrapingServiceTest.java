package com.alx.scraper.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ScrapingService}.
 * Focuses on testing the core scraping logic in isolation using Mockito.
 * Jsoup's static methods (like `Jsoup.connect`) are mocked to control external dependencies.
 *
 * ALX Focus: Demonstrates robust unit testing principles:
 * - Isolation of the unit under test (`ScrapingService`).
 * - Mocking external dependencies (`Jsoup.connect`, `ObjectMapper`).
 * - Testing success paths, edge cases (no elements found), and error conditions.
 * - High test coverage for critical business logic.
 */
@ExtendWith(MockitoExtension.class) // Enables Mockito annotations
@DisplayName("ScrapingService Unit Tests")
class ScrapingServiceTest {

    @Mock
    private ObjectMapper objectMapper; // Mock ObjectMapper to control JSON serialization

    @InjectMocks
    private ScrapingService scrapingService; // Inject mocks into ScrapingService

    @Mock
    private Connection connection; // Mock Jsoup Connection
    @Mock
    private Document document;     // Mock Jsoup Document
    @Mock
    private Elements elements;     // Mock Jsoup Elements (result of select)
    @Mock
    private Element element1;      // Mock individual Element
    @Mock
    private Element element2;

    private static final String TEST_URL = "http://example.com";
    private static final String TEST_SELECTOR = "div.item";

    @BeforeEach
    void setUp() {
        // Reset mocks before each test
        reset(objectMapper, connection, document, elements, element1, element2);
    }

    @Test
    @DisplayName("Should successfully scrape data from a simple HTML structure")
    void whenScrape_thenExtractDataSuccessfully() throws IOException {
        // Given
        // Mock Jsoup.connect().get() chain
        try (MockedStatic<Jsoup> mockedJsoup = mockStatic(Jsoup.class)) {
            mockedJsoup.when(() -> Jsoup.connect(anyString())).thenReturn(connection);
            when(connection.userAgent(anyString())).thenReturn(connection);
            when(connection.timeout(anyInt())).thenReturn(connection);
            when(connection.get()).thenReturn(document);
            when(document.select(TEST_SELECTOR)).thenReturn(elements);

            // Mock elements behavior
            when(elements.isEmpty()).thenReturn(false);
            when(elements.iterator()).thenReturn(List.of(element1, element2).iterator());
            when(elements.size()).thenReturn(2);

            when(element1.text()).thenReturn("Item 1 Title");
            when(element1.ownText()).thenReturn("Item 1 Title");
            when(element1.hasAttr("href")).thenReturn(true);
            when(element1.attr("abs:href")).thenReturn("http://example.com/item1");
            when(element1.attributes()).thenReturn(new org.jsoup.nodes.Attributes()); // Empty attributes for simplicity

            when(element2.text()).thenReturn("Item 2 Title");
            when(element2.ownText()).thenReturn("Item 2 Title");
            when(element2.hasAttr("src")).thenReturn(true);
            when(element2.attr("abs:src")).thenReturn("http://example.com/image2.png");
            when(element2.attributes()).thenReturn(new org.jsoup.nodes.Attributes());

            // When
            List<Map<String, String>> result = scrapingService.scrape(TEST_URL, TEST_SELECTOR);

            // Then
            assertThat(result).isNotNull().hasSize(2);
            assertThat(result.get(0)).containsEntry("text", "Item 1 Title").containsEntry("href", "http://example.com/item1");
            assertThat(result.get(1)).containsEntry("text", "Item 2 Title").containsEntry("src", "http://example.com/image2.png");

            // Verify interactions
            mockedJsoup.verify(() -> Jsoup.connect(TEST_URL), times(1));
            verify(connection, times(1)).get();
            verify(document, times(1)).select(TEST_SELECTOR);
        }
    }

    @Test
    @DisplayName("Should return empty list when no elements are found by selector")
    void whenScrape_withNoElementsFound_thenReturnEmptyList() throws IOException {
        // Given
        try (MockedStatic<Jsoup> mockedJsoup = mockStatic(Jsoup.class)) {
            mockedJsoup.when(() -> Jsoup.connect(anyString())).thenReturn(connection);
            when(connection.userAgent(anyString())).thenReturn(connection);
            when(connection.timeout(anyInt())).thenReturn(connection);
            when(connection.get()).thenReturn(document);
            when(document.select(TEST_SELECTOR)).thenReturn(elements);

            when(elements.isEmpty()).thenReturn(true); // No elements found

            // When
            List<Map<String, String>> result = scrapingService.scrape(TEST_URL, TEST_SELECTOR);

            // Then
            assertThat(result).isNotNull().isEmpty();
            verify(elements, times(1)).isEmpty();
            verify(elements, never()).iterator(); // Ensure iterator is not called if empty
        }
    }

    @Test
    @DisplayName("Should throw IOException when Jsoup connection fails")
    void whenScrape_withConnectionFailure_thenThrowIOException() throws IOException {
        // Given
        try (MockedStatic<Jsoup> mockedJsoup = mockStatic(Jsoup.class)) {
            mockedJsoup.when(() -> Jsoup.connect(anyString())).thenReturn(connection);
            when(connection.userAgent(anyString())).thenReturn(connection);
            when(connection.timeout(anyInt())).thenReturn(connection);
            when(connection.get()).thenThrow(new IOException("Network error")); // Simulate network failure

            // When/Then
            IOException thrown = assertThrows(IOException.class, () ->
                    scrapingService.scrape(TEST_URL, TEST_SELECTOR)
            );
            assertThat(thrown.getMessage()).contains("Failed to connect or read from URL");
        }
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for null URL")
    void whenScrape_withNullUrl_thenThrowIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () ->
                scrapingService.scrape(null, TEST_SELECTOR)
        );
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for empty URL")
    void whenScrape_withEmptyUrl_thenThrowIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () ->
                scrapingService.scrape("", TEST_SELECTOR)
        );
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for null CSS selector")
    void whenScrape_withNullCssSelector_thenThrowIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () ->
                scrapingService.scrape(TEST_URL, null)
        );
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for empty CSS selector")
    void whenScrape_withEmptyCssSelector_thenThrowIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () ->
                scrapingService.scrape(TEST_URL, "")
        );
    }

    @Test
    @DisplayName("Should convert list of maps to JSON string successfully")
    void whenConvertToJson_thenReturnsJsonString() throws JsonProcessingException {
        // Given
        List<Map<String, String>> data = List.of(
                Map.of("name", "Product 1", "price", "10.00"),
                Map.of("name", "Product 2", "price", "20.00")
        );
        String expectedJson = "[{\"name\":\"Product 1\",\"price\":\"10.00\"},{\"name\":\"Product 2\",\"price\":\"20.00\"}]";
        when(objectMapper.writeValueAsString(data)).thenReturn(expectedJson);

        // When
        String result = scrapingService.convertToJson(data);

        // Then
        assertThat(result).isEqualTo(expectedJson);
        verify(objectMapper, times(1)).writeValueAsString(data);
    }

    @Test
    @DisplayName("Should throw JsonProcessingException when JSON conversion fails")
    void whenConvertToJson_withConversionFailure_thenThrowJsonProcessingException() throws JsonProcessingException {
        // Given
        List<Map<String, String>> data = Collections.singletonList(Map.of("key", "value"));
        when(objectMapper.writeValueAsString(data)).thenThrow(new JsonProcessingException("Serialization error") {});

        // When / Then
        assertThrows(JsonProcessingException.class, () ->
                scrapingService.convertToJson(data)
        );
        verify(objectMapper, times(1)).writeValueAsString(data);
    }
}
```