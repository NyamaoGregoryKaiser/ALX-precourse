package com.alx.scraper.service;

import com.alx.scraper.entity.ScrapedData;
import com.alx.scraper.entity.ScrapingJob;
import com.alx.scraper.entity.ScrapingStatus;
import com.alx.scraper.repository.ScrapedDataRepository;
import com.alx.scraper.util.JsoupUtil;
import org.jsoup.Connection;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.Proxy;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScraperServiceTest {

    @Mock
    private DataExtractionService dataExtractionService;
    @Mock
    private ProxyService proxyService;
    @Mock
    private ScrapedDataRepository scrapedDataRepository;
    @Mock
    private Connection connection;
    @Mock
    private Document mockDocument;

    @InjectMocks
    private ScraperService scraperService;

    private ScrapingJob testJob;
    private String testUrl = "http://example.com/page1";
    private String nextUrl = "http://example.com/page2";

    @BeforeEach
    void setUp() {
        testJob = new ScrapingJob();
        testJob.setId(1L);
        testJob.setJobName("Test Job");
        testJob.setTargetUrl(testUrl);
        testJob.setSelectors(Map.of("title", "h1", "description", "p"));
        testJob.setStatus(ScrapingStatus.CREATED);
        testJob.setMaxPagesToScrape(1); // Set to 1 page for most tests
        testJob.setNextPageSelector(null); // No next page by default
        testJob.setPagesScrapedCount(0);
    }

    @Test
    @DisplayName("Should successfully fetch document when proxy is not used")
    void fetchDocument_Success_NoProxy() throws IOException {
        try (MockedStatic<JsoupUtil> mockedJsoupUtil = mockStatic(JsoupUtil.class)) {
            when(proxyService.getNextProxy()).thenReturn(Proxy.NO_PROXY);
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY)).thenReturn(connection);
            when(connection.get()).thenReturn(mockDocument);

            Document result = scraperService.fetchDocument(testUrl);

            assertNotNull(result);
            assertEquals(mockDocument, result);
            verify(proxyService, times(1)).getNextProxy();
            mockedJsoupUtil.verify(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY), times(1));
            verify(connection, times(1)).get();
        }
    }

    @Test
    @DisplayName("Should successfully fetch document when proxy is used")
    void fetchDocument_Success_WithProxy() throws IOException {
        Proxy mockProxy = new Proxy(Proxy.Type.HTTP, new java.net.InetSocketAddress("127.0.0.1", 8080));
        try (MockedStatic<JsoupUtil> mockedJsoupUtil = mockStatic(JsoupUtil.class)) {
            when(proxyService.getNextProxy()).thenReturn(mockProxy);
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(testUrl, mockProxy)).thenReturn(connection);
            when(connection.get()).thenReturn(mockDocument);

            Document result = scraperService.fetchDocument(testUrl);

            assertNotNull(result);
            assertEquals(mockDocument, result);
            verify(proxyService, times(1)).getNextProxy();
            mockedJsoupUtil.verify(() -> JsoupUtil.getConnection(testUrl, mockProxy), times(1));
            verify(connection, times(1)).get();
        }
    }

    @Test
    @DisplayName("Should throw IOException when document fetching fails")
    void fetchDocument_Failure() throws IOException {
        try (MockedStatic<JsoupUtil> mockedJsoupUtil = mockStatic(JsoupUtil.class)) {
            when(proxyService.getNextProxy()).thenReturn(Proxy.NO_PROXY);
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY)).thenReturn(connection);
            when(connection.get()).thenThrow(new IOException("Network error"));

            assertThrows(IOException.class, () -> scraperService.fetchDocument(testUrl));
            verify(proxyService, times(1)).getNextProxy();
            mockedJsoupUtil.verify(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY), times(1));
            verify(connection, times(1)).get();
        }
    }

    @Test
    @DisplayName("Should perform single-page scraping and save data")
    void performScraping_SinglePage_Success() throws IOException, InterruptedException {
        when(dataExtractionService.extractData(any(Document.class), anyMap()))
                .thenReturn(Map.of("title", "Test Title", "description", "Test Description"));

        try (MockedStatic<JsoupUtil> mockedJsoupUtil = mockStatic(JsoupUtil.class)) {
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY)).thenReturn(connection);
            when(connection.get()).thenReturn(mockDocument);
            when(proxyService.getNextProxy()).thenReturn(Proxy.NO_PROXY);
            when(scrapedDataRepository.save(any(ScrapedData.class))).thenAnswer(invocation -> invocation.getArgument(0));

            List<ScrapedData> result = scraperService.performScraping(testJob);

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals(1, testJob.getPagesScrapedCount());
            assertEquals(ScrapingStatus.CREATED, testJob.getStatus()); // Status isn't updated by scraperService for success
            verify(scrapedDataRepository, times(1)).save(any(ScrapedData.class));
            verify(dataExtractionService, times(1)).extractData(mockDocument, testJob.getSelectors());
            verify(dataExtractionService, times(1)).findNextPageUrl(mockDocument, null); // because nextPageSelector is null
        }
    }

    @Test
    @DisplayName("Should perform multi-page scraping if next page selector is present")
    void performScraping_MultiPage_Success() throws IOException, InterruptedException {
        testJob.setMaxPagesToScrape(2);
        testJob.setNextPageSelector("a.next");

        when(dataExtractionService.extractData(any(Document.class), anyMap()))
                .thenReturn(Map.of("title", "Page Title", "description", "Page Description"));
        when(proxyService.getNextProxy()).thenReturn(Proxy.NO_PROXY);
        when(scrapedDataRepository.save(any(ScrapedData.class))).thenAnswer(invocation -> invocation.getArgument(0));

        try (MockedStatic<JsoupUtil> mockedJsoupUtil = mockStatic(JsoupUtil.class)) {
            // First page
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY)).thenReturn(connection);
            when(connection.get()).thenReturn(mockDocument);
            when(dataExtractionService.findNextPageUrl(mockDocument, "a.next")).thenReturn(Optional.of(nextUrl));

            // Second page
            Connection secondPageConnection = mock(Connection.class);
            Document secondMockDocument = mock(Document.class);
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(nextUrl, Proxy.NO_PROXY)).thenReturn(secondPageConnection);
            when(secondPageConnection.get()).thenReturn(secondMockDocument);
            when(dataExtractionService.findNextPageUrl(secondMockDocument, "a.next")).thenReturn(Optional.empty()); // No more pages

            List<ScrapedData> result = scraperService.performScraping(testJob);

            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals(2, testJob.getPagesScrapedCount());
            verify(scrapedDataRepository, times(2)).save(any(ScrapedData.class));
            verify(dataExtractionService, times(2)).extractData(any(Document.class), anyMap());
            verify(dataExtractionService, times(1)).findNextPageUrl(mockDocument, "a.next");
            verify(dataExtractionService, times(1)).findNextPageUrl(secondMockDocument, "a.next");
        }
    }

    @Test
    @DisplayName("Should set job status to FAILED if fetching document throws IOException")
    void performScraping_FetchDocumentFails_JobFailed() throws IOException {
        when(proxyService.getNextProxy()).thenReturn(Proxy.NO_PROXY);

        try (MockedStatic<JsoupUtil> mockedJsoupUtil = mockStatic(JsoupUtil.class)) {
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY)).thenReturn(connection);
            when(connection.get()).thenThrow(new IOException("Simulated network error"));

            List<ScrapedData> result = scraperService.performScraping(testJob);

            assertNotNull(result);
            assertTrue(result.isEmpty());
            assertEquals(ScrapingStatus.FAILED, testJob.getStatus());
            assertEquals(0, testJob.getPagesScrapedCount());
            verify(scrapedDataRepository, never()).save(any(ScrapedData.class));
        }
    }

    @Test
    @DisplayName("Should stop scraping if job status is STOPPED during execution")
    void performScraping_JobStoppedDuringExecution() throws IOException, InterruptedException {
        testJob.setStatus(ScrapingStatus.STOPPED); // Pre-set status to stopped

        List<ScrapedData> result = scraperService.performScraping(testJob);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        assertEquals(ScrapingStatus.STOPPED, testJob.getStatus());
        assertEquals(0, testJob.getPagesScrapedCount());
        verify(scrapedDataRepository, never()).save(any(ScrapedData.class));
        verify(proxyService, never()).getNextProxy(); // Should not even attempt to fetch
    }

    @Test
    @DisplayName("Should handle empty extracted data for a page gracefully")
    void performScraping_EmptyExtractedData() throws IOException, InterruptedException {
        when(dataExtractionService.extractData(any(Document.class), anyMap()))
                .thenReturn(Map.of()); // No data extracted
        when(proxyService.getNextProxy()).thenReturn(Proxy.NO_PROXY);

        try (MockedStatic<JsoupUtil> mockedJsoupUtil = mockStatic(JsoupUtil.class)) {
            mockedJsoupUtil.when(() -> JsoupUtil.getConnection(testUrl, Proxy.NO_PROXY)).thenReturn(connection);
            when(connection.get()).thenReturn(mockDocument);

            List<ScrapedData> result = scraperService.performScraping(testJob);

            assertNotNull(result);
            assertTrue(result.isEmpty());
            assertEquals(1, testJob.getPagesScrapedCount()); // Page was visited
            verify(scrapedDataRepository, never()).save(any(ScrapedData.class)); // No data to save
        }
    }
}