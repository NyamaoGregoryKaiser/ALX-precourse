package com.alx.scrapingtools.scraper.mapper;

import com.alx.scrapingtools.scraper.dto.ScrapedDataItemDTO;
import com.alx.scrapingtools.scraper.dto.ScraperConfigDTO;
import com.alx.scrapingtools.scraper.dto.ScrapingJobDTO;
import com.alx.scrapingtools.scraper.model.ScrapedDataItem;
import com.alx.scrapingtools.scraper.model.ScraperConfig;
import com.alx.scrapingtools.scraper.model.ScrapingJob;
import com.alx.scrapingtools.user.model.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ScraperMapper {

    public ScraperConfigDTO toDto(ScraperConfig config) {
        if (config == null) return null;
        return ScraperConfigDTO.builder()
                .id(config.getId())
                .name(config.getName())
                .startUrl(config.getStartUrl())
                .cssSelectorTarget(config.getCssSelectorTarget())
                .cssSelectorTitle(config.getCssSelectorTitle())
                .cssSelectorDescription(config.getCssSelectorDescription())
                .cssSelectorLink(config.getCssSelectorLink())
                .scrapeIntervalMinutes(config.getScrapeIntervalMinutes())
                .lastRunTime(config.getLastRunTime())
                .isActive(config.getIsActive())
                .createdByUserId(config.getCreatedBy() != null ? config.getCreatedBy().getId() : null)
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    public ScraperConfig toEntity(ScraperConfigDTO dto, User createdBy) {
        if (dto == null) return null;
        return ScraperConfig.builder()
                .id(dto.getId()) // ID might be null for new entities
                .name(dto.getName())
                .startUrl(dto.getStartUrl())
                .cssSelectorTarget(dto.getCssSelectorTarget())
                .cssSelectorTitle(dto.getCssSelectorTitle())
                .cssSelectorDescription(dto.getCssSelectorDescription())
                .cssSelectorLink(dto.getCssSelectorLink())
                .scrapeIntervalMinutes(dto.getScrapeIntervalMinutes())
                .isActive(dto.getIsActive())
                .createdBy(createdBy)
                .build();
    }

    public ScrapingJobDTO toDto(ScrapingJob job) {
        if (job == null) return null;
        return ScrapingJobDTO.builder()
                .id(job.getId())
                .scraperConfigId(job.getScraperConfig() != null ? job.getScraperConfig().getId() : null)
                .scraperConfigName(job.getScraperConfig() != null ? job.getScraperConfig().getName() : "N/A")
                .startTime(job.getStartTime())
                .endTime(job.getEndTime())
                .status(job.getStatus())
                .errorMessage(job.getErrorMessage())
                .itemsScraped(job.getItemsScraped())
                .build();
    }

    public List<ScrapingJobDTO> toJobDtoList(List<ScrapingJob> jobs) {
        return jobs.stream().map(this::toDto).collect(Collectors.toList());
    }

    public ScrapedDataItemDTO toDto(ScrapedDataItem item) {
        if (item == null) return null;
        return ScrapedDataItemDTO.builder()
                .id(item.getId())
                .scrapingJobId(item.getScrapingJob() != null ? item.getScrapingJob().getId() : null)
                .scraperConfigId(item.getScraperConfig() != null ? item.getScraperConfig().getId() : null)
                .title(item.getTitle())
                .description(item.getDescription())
                .url(item.getUrl())
                .content(item.getContent())
                .scrapedAt(item.getScrapedAt())
                .build();
    }

    public List<ScrapedDataItemDTO> toDataItemDtoList(List<ScrapedDataItem> items) {
        return items.stream().map(this::toDto).collect(Collectors.toList());
    }
}