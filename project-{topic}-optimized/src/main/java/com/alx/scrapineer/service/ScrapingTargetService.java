```java
package com.alx.scrapineer.service;

import com.alx.scrapineer.api.dto.scraping.CssSelectorDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetMapping;
import com.alx.scrapineer.common.exception.BadRequestException;
import com.alx.scrapineer.common.exception.ResourceNotFoundException;
import com.alx.scrapineer.data.entity.CssSelector;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.ScrapingTargetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing ScrapingTarget entities.
 */
@Service
@RequiredArgsConstructor
public class ScrapingTargetService {

    private final ScrapingTargetRepository targetRepository;
    private final ScrapingTargetMapping targetMapping;

    /**
     * Retrieves all scraping targets owned by a specific user.
     * @param user The authenticated user.
     * @return A list of ScrapingTargetDto.
     */
    @Cacheable(value = "targets", key = "#user.id")
    public List<ScrapingTargetDto> getAllTargets(User user) {
        List<ScrapingTarget> targets = targetRepository.findByUser(user);
        return targets.stream()
                .map(targetMapping::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single scraping target by its ID, ensuring it belongs to the specified user.
     * @param id The ID of the target.
     * @param user The authenticated user.
     * @return The ScrapingTargetDto.
     * @throws ResourceNotFoundException if the target is not found or does not belong to the user.
     */
    @Cacheable(value = "targetById", key = "{#id, #user.id}")
    public ScrapingTargetDto getTargetById(Long id, User user) {
        ScrapingTarget target = targetRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping target not found with id " + id));
        return targetMapping.toDto(target);
    }

    /**
     * Creates a new scraping target.
     * @param targetDto The DTO containing the target details.
     * @param user The authenticated user.
     * @return The created ScrapingTargetDto.
     * @throws BadRequestException if a target with the same name already exists for the user.
     */
    @Transactional
    @CacheEvict(value = {"targets", "targetById"}, allEntries = true)
    public ScrapingTargetDto createTarget(ScrapingTargetDto targetDto, User user) {
        if (targetRepository.existsByNameAndUser(targetDto.getName(), user)) {
            throw new BadRequestException("Scraping target with name '" + targetDto.getName() + "' already exists for this user.");
        }

        ScrapingTarget target = targetMapping.toEntity(targetDto);
        target.setUser(user);
        target.setId(null); // Ensure ID is null for new entity

        // Link selectors to the target
        if (targetDto.getSelectors() != null) {
            List<CssSelector> selectors = targetDto.getSelectors().stream()
                    .map(selectorDto -> {
                        CssSelector selector = targetMapping.toEntity(selectorDto);
                        selector.setTarget(target);
                        selector.setId(null); // Ensure ID is null for new entity
                        return selector;
                    })
                    .collect(Collectors.toList());
            target.setSelectors(selectors);
        }

        ScrapingTarget savedTarget = targetRepository.save(target);
        return targetMapping.toDto(savedTarget);
    }

    /**
     * Updates an existing scraping target.
     * @param id The ID of the target to update.
     * @param targetDto The DTO containing updated target details.
     * @param user The authenticated user.
     * @return The updated ScrapingTargetDto.
     * @throws ResourceNotFoundException if the target is not found or does not belong to the user.
     * @throws BadRequestException if the updated name conflicts with another target for the user.
     */
    @Transactional
    @CacheEvict(value = {"targets", "targetById"}, allEntries = true)
    public ScrapingTargetDto updateTarget(Long id, ScrapingTargetDto targetDto, User user) {
        ScrapingTarget existingTarget = targetRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping target not found with id " + id));

        // Check for name conflict if name is changed
        if (!existingTarget.getName().equals(targetDto.getName()) && targetRepository.existsByNameAndUser(targetDto.getName(), user)) {
            throw new BadRequestException("Scraping target with name '" + targetDto.getName() + "' already exists for this user.");
        }

        existingTarget.setName(targetDto.getName());
        existingTarget.setUrl(targetDto.getUrl());
        existingTarget.setDescription(targetDto.getDescription());
        existingTarget.setActive(targetDto.isActive());

        // Update selectors
        if (targetDto.getSelectors() != null) {
            existingTarget.getSelectors().clear(); // Remove old selectors
            List<CssSelector> updatedSelectors = targetDto.getSelectors().stream()
                    .map(selectorDto -> {
                        CssSelector selector = targetMapping.toEntity(selectorDto);
                        selector.setTarget(existingTarget);
                        selector.setId(null); // Ensure new IDs are generated for new/updated selectors
                        return selector;
                    })
                    .collect(Collectors.toList());
            existingTarget.getSelectors().addAll(updatedSelectors); // Add new/updated selectors
        }

        ScrapingTarget updatedTarget = targetRepository.save(existingTarget);
        return targetMapping.toDto(updatedTarget);
    }

    /**
     * Deletes a scraping target by its ID.
     * @param id The ID of the target to delete.
     * @param user The authenticated user.
     * @throws ResourceNotFoundException if the target is not found or does not belong to the user.
     */
    @Transactional
    @CacheEvict(value = {"targets", "targetById"}, allEntries = true)
    public void deleteTarget(Long id, User user) {
        ScrapingTarget target = targetRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping target not found with id " + id));
        targetRepository.delete(target);
    }
}
```