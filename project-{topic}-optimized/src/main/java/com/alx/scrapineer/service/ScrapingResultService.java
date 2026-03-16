```java
package com.alx.scrapineer.service;

import com.alx.scrapineer.api.dto.scraping.ScrapingResultDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetMapping;
import com.alx.scrapineer.common.exception.ResourceNotFoundException;
import com.alx.scrapineer.data.entity.ScrapingResult;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.ScrapingResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Service for retrieving scraping results.
 */
@Service
@RequiredArgsConstructor
public class ScrapingResultService {

    private final ScrapingResultRepository resultRepository;
    private final ScrapingTargetMapping targetMapping;

    /**
     * Retrieves a paginated list of scraping results for a specific job, owned by the user.
     * @param jobId The ID of the job.
     * @param user The authenticated user.
     * @param pageable Pagination information.
     * @return A Page of ScrapingResultDto.
     */
    @Cacheable(value = "jobResults", key = "{#jobId, #user.id, #pageable.pageNumber, #pageable.pageSize}")
    public Page<ScrapingResultDto> getResultsForJob(Long jobId, User user, Pageable pageable) {
        Page<ScrapingResult> results = resultRepository.findByJobIdAndTargetUser(jobId, user, pageable);
        return results.map(targetMapping::toDto);
    }

    /**
     * Retrieves a paginated list of scraping results for a specific target, owned by the user.
     * @param targetId The ID of the target.
     * @param user The authenticated user.
     * @param pageable Pagination information.
     * @return A Page of ScrapingResultDto.
     */
    @Cacheable(value = "targetResults", key = "{#targetId, #user.id, #pageable.pageNumber, #pageable.pageSize}")
    public Page<ScrapingResultDto> getResultsForTarget(Long targetId, User user, Pageable pageable) {
        Page<ScrapingResult> results = resultRepository.findByTargetIdAndTargetUser(targetId, user, pageable);
        return results.map(targetMapping::toDto);
    }

    /**
     * Retrieves a single scraping result by its ID, ensuring it belongs to the specified user.
     * @param resultId The ID of the result.
     * @param user The authenticated user.
     * @return The ScrapingResultDto.
     * @throws ResourceNotFoundException if the result is not found or does not belong to the user.
     */
    @Cacheable(value = "resultById", key = "{#resultId, #user.id}")
    public ScrapingResultDto getResultById(Long resultId, User user) {
        ScrapingResult result = resultRepository.findById(resultId)
                .filter(r -> r.getTarget().getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Scraping result not found with id " + resultId));
        return targetMapping.toDto(result);
    }
}
```