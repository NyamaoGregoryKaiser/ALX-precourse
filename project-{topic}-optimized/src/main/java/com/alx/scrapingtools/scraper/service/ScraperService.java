package com.alx.scrapingtools.scraper.service;

import com.alx.scrapingtools.common.exceptions.ResourceNotFoundException;
import com.alx.scrapingtools.scraper.dto.ScrapedDataItemDTO;
import com.alx.scrapingtools.scraper.dto.ScraperConfigDTO;
import com.alx.scrapingtools.scraper.dto.ScrapingJobDTO;
import com.alx.scrapingtools.scraper.mapper.ScraperMapper;
import com.alx.scrapingtools.scraper.model.ScrapedDataItem;
import com.alx.scrapingtools.scraper.model.ScraperConfig;
import com.alx.scrapingtools.scraper.model.ScrapingJob;
import com.alx.scrapingtools.scraper.repository.ScrapedDataItemRepository;
import com.alx.scrapingtools.scraper.repository.ScraperConfigRepository;
import com.alx.scrapingtools.scraper.repository.ScrapingJobRepository;
import com.alx.scrapingtools.user.model.User;
import com.alx.scrapingtools.user.repository.UserRepository;
import com.alx.scrapingtools.util.WebScraper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScraperService {

    private final ScraperConfigRepository scraperConfigRepository;
    private final ScrapingJobRepository scrapingJobRepository;
    private final ScrapedDataItemRepository scrapedDataItemRepository;
    public final UserRepository userRepository; // To fetch User by ID for ScraperConfig (public for integration test)
    private final WebScraper webScraper;
    private final ScraperMapper mapper;

    // --- ScraperConfig CRUD Operations ---

    @Transactional
    @CacheEvict(value = {"scraperConfigs", "scrapingJobs", "scrapedData"}, allEntries = true)
    public ScraperConfigDTO createScraperConfig(ScraperConfigDTO configDTO, UUID createdByUserId) {
        User creator = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + createdByUserId));

        ScraperConfig config = mapper.toEntity(configDTO, creator);
        config.setId(null); // Ensure new entity
        config.setCreatedBy(creator);
        config.setIsActive(true); // Default to active
        config.setScrapeIntervalMinutes(configDTO.getScrapeIntervalMinutes() != null ? configDTO.getScrapeIntervalMinutes() : 60);

        ScraperConfig savedConfig = scraperConfigRepository.save(config);
        log.info("Created new scraper config: {}", savedConfig.getName());
        return mapper.toDto(savedConfig);
    }

    @Cacheable(value = "scraperConfigs", key = "#id")
    public ScraperConfigDTO getScraperConfigById(UUID id) {
        return scraperConfigRepository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("ScraperConfig not found with ID: " + id));
    }

    @Cacheable(value = "scraperConfigs")
    public List<ScraperConfigDTO> getAllScraperConfigs() {
        return scraperConfigRepository.findAll().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "scraperConfigs", key = "'user:' + #userId")
    public List<ScraperConfigDTO> getScraperConfigsByUserId(UUID userId) {
        return scraperConfigRepository.findByCreatedById(userId).stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    @CachePut(value = "scraperConfigs", key = "#id")
    @CacheEvict(value = {"scrapingJobs", "scrapedData"}, allEntries = true) // Potential impact on these related caches
    @PreAuthorize("@securityService.isScraperConfigOwner(#id, authentication.principal.id) or hasRole('ADMIN')")
    public ScraperConfigDTO updateScraperConfig(UUID id, ScraperConfigDTO configDTO) {
        ScraperConfig existingConfig = scraperConfigRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ScraperConfig not found with ID: " + id));

        // Update fields that are allowed to change
        Optional.ofNullable(configDTO.getName()).ifPresent(existingConfig::setName);
        Optional.ofNullable(configDTO.getStartUrl()).ifPresent(existingConfig::setStartUrl);
        Optional.ofNullable(configDTO.getCssSelectorTarget()).ifPresent(existingConfig::setCssSelectorTarget);
        Optional.ofNullable(configDTO.getCssSelectorTitle()).ifPresent(existingConfig::setCssSelectorTitle);
        Optional.ofNullable(configDTO.getCssSelectorDescription()).ifPresent(existingConfig::setCssSelectorDescription);
        Optional.ofNullable(configDTO.getCssSelectorLink()).ifPresent(existingConfig::setCssSelectorLink);
        Optional.ofNullable(configDTO.getScrapeIntervalMinutes()).ifPresent(existingConfig::setScrapeIntervalMinutes);
        Optional.ofNullable(configDTO.getIsActive()).ifPresent(existingConfig::setIsActive);

        ScraperConfig updatedConfig = scraperConfigRepository.save(existingConfig);
        log.info("Updated scraper config: {}", updatedConfig.getName());
        return mapper.toDto(updatedConfig);
    }

    @Transactional
    @CacheEvict(value = {"scraperConfigs", "scrapingJobs", "scrapedData"}, allEntries = true)
    @PreAuthorize("@securityService.isScraperConfigOwner(#id, authentication.principal.id) or hasRole('ADMIN')")
    public void deleteScraperConfig(UUID id) {
        if (!scraperConfigRepository.existsById(id)) {
            throw new ResourceNotFoundException("ScraperConfig not found with ID: " + id);
        }
        // Cascade delete will handle jobs and data items due to FOREIGN KEY ON DELETE CASCADE
        scraperConfigRepository.deleteById(id);
        log.info("Deleted scraper config with ID: {}", id);
    }

    // --- Scraping Job Operations ---

    @Transactional
    @CacheEvict(value = "scrapingJobs", allEntries = true)
    public ScrapingJob startScrapingJob(UUID configId) {
        ScraperConfig config = scraperConfigRepository.findById(configId)
                .orElseThrow(() -> new ResourceNotFoundException("ScraperConfig not found with ID: " + configId));

        if (!config.getIsActive()) {
            throw new IllegalStateException("ScraperConfig with ID " + configId + " is not active.");
        }

        ScrapingJob job = ScrapingJob.builder()
                .scraperConfig(config)
                .status("RUNNING")
                .startTime(OffsetDateTime.now())
                .itemsScraped(0)
                .build();
        job = scrapingJobRepository.save(job);
        log.info("Started scraping job {} for config {}", job.getId(), config.getName());

        try {
            Document document = webScraper.fetchDocument(config.getStartUrl());
            List<ScrapedDataItem> items = webScraper.scrape(document, config, job);
            scrapedDataItemRepository.saveAll(items);

            job.setItemsScraped(items.size());
            job.setStatus("COMPLETED");
            log.info("Scraping job {} completed successfully, {} items scraped.", job.getId(), items.size());
        } catch (IOException e) {
            job.setStatus("FAILED");
            job.setErrorMessage("Error during scraping: " + e.getMessage());
            log.error("Scraping job {} failed for config {}: {}", job.getId(), config.getName(), e.getMessage());
        } finally {
            job.setEndTime(OffsetDateTime.now());
            scrapingJobRepository.save(job);
            config.setLastRunTime(OffsetDateTime.now());
            scraperConfigRepository.save(config); // Update last run time
        }
        return job;
    }

    @Cacheable(value = "scrapingJobs", key = "#id")
    public ScrapingJobDTO getScrapingJobById(UUID id) {
        return scrapingJobRepository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("ScrapingJob not found with ID: " + id));
    }

    @Cacheable(value = "scrapingJobs", key = "'config:' + #scraperConfigId")
    public List<ScrapingJobDTO> getScrapingJobsByConfigId(UUID scraperConfigId) {
        return scraperConfigRepository.findById(scraperConfigId)
                .map(config -> scrapingJobRepository.findByScraperConfig(config).stream()
                        .map(mapper::toDto)
                        .collect(Collectors.toList()))
                .orElseThrow(() -> new ResourceNotFoundException("ScraperConfig not found with ID: " + scraperConfigId));
    }

    @Cacheable(value = "scrapingJobs")
    public Page<ScrapingJobDTO> getAllScrapingJobs(Pageable pageable) {
        Page<ScrapingJob> jobsPage = scrapingJobRepository.findAll(pageable);
        List<ScrapingJobDTO> dtos = jobsPage.getContent().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new PageImpl<>(dtos, pageable, jobsPage.getTotalElements());
    }

    // --- Scraped Data Item Operations ---

    @Cacheable(value = "scrapedData", key = "#id")
    public ScrapedDataItemDTO getScrapedDataItemById(UUID id) {
        return scrapedDataItemRepository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("ScrapedDataItem not found with ID: " + id));
    }

    @Cacheable(value = "scrapedData", key = "'job:' + #scrapingJobId")
    public List<ScrapedDataItemDTO> getScrapedDataItemsByJobId(UUID scrapingJobId) {
        return scrapedDataItemRepository.findByScrapingJobId(scrapingJobId).stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "scrapedData", key = "'config:' + #scraperConfigId")
    public List<ScrapedDataItemDTO> getScrapedDataItemsByConfigId(UUID scraperConfigId) {
        return scrapedDataItemRepository.findByScraperConfigId(scraperConfigId).stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "scrapedData")
    public Page<ScrapedDataItemDTO> getAllScrapedDataItems(Pageable pageable) {
        Page<ScrapedDataItem> itemsPage = scrapedDataItemRepository.findAll(pageable);
        List<ScrapedDataItemDTO> dtos = itemsPage.getContent().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
        return new PageImpl<>(dtos, pageable, itemsPage.getTotalElements());
    }

    // Nested class for Spring Security @PreAuthorize SpEL evaluation
    @Component("securityService")
    @RequiredArgsConstructor
    public static class SecurityService {
        private final ScraperConfigRepository scraperConfigRepository;

        public boolean isScraperConfigOwner(UUID scraperConfigId, UUID userId) {
            return scraperConfigRepository.findById(scraperConfigId)
                    .map(config -> config.getCreatedBy().getId().equals(userId))
                    .orElse(false);
        }
    }
}