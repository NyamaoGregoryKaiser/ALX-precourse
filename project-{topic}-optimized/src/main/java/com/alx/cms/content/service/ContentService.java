```java
package com.alx.cms.content.service;

import com.alx.cms.common.exception.ResourceNotFoundException;
import com.alx.cms.content.dto.ContentDTO;
import com.alx.cms.content.model.Category;
import com.alx.cms.content.model.Content;
import com.alx.cms.content.model.Tag;
import com.alx.cms.content.repository.CategoryRepository;
import com.alx.cms.content.repository.ContentRepository;
import com.alx.cms.content.repository.TagRepository;
import com.alx.cms.user.model.User;
import com.alx.cms.user.repository.UserRepository;
import com.alx.cms.common.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ContentService {

    private final ContentRepository contentRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final ModelMapper modelMapper;

    // Cache names for content-related operations
    public static final String CACHE_CONTENTS = "contents";
    public static final String CACHE_CONTENT_BY_ID = "contentById";
    public static final String CACHE_CONTENT_BY_SLUG = "contentBySlug";

    /**
     * Creates new content.
     * @param contentDTO DTO containing content data.
     * @return ContentDTO of the created content.
     */
    @CacheEvict(value = CACHE_CONTENTS, allEntries = true) // Evict all entries from 'contents' cache when new content is added
    public ContentDTO createContent(ContentDTO contentDTO) {
        // Validate and fetch Author
        User author = userRepository.findById(contentDTO.getAuthorId())
                .orElseThrow(() -> new ResourceNotFoundException("Author not found with id: " + contentDTO.getAuthorId()));

        // Convert DTO to Entity
        Content content = modelMapper.map(contentDTO, Content.class);
        content.setAuthor(author);

        // Handle Category
        if (contentDTO.getCategoryId() != null) {
            Category category = categoryRepository.findById(contentDTO.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + contentDTO.getCategoryId()));
            content.setCategory(category);
        }

        // Handle Tags
        if (contentDTO.getTagIds() != null && !contentDTO.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>();
            for (Long tagId : contentDTO.getTagIds()) {
                Tag tag = tagRepository.findById(tagId)
                        .orElseThrow(() -> new ResourceNotFoundException("Tag not found with id: " + tagId));
                tags.add(tag);
            }
            content.setTags(tags);
        }

        // Generate slug if not provided or ensure uniqueness
        if (contentDTO.getSlug() == null || contentDTO.getSlug().trim().isEmpty()) {
            content.setSlug(SlugUtil.toSlug(content.getTitle()));
        } else {
            content.setSlug(SlugUtil.toSlug(contentDTO.getSlug()));
        }
        // Basic slug uniqueness check (more robust logic might involve appending numbers)
        if (contentRepository.findBySlug(content.getSlug()).isPresent()) {
            content.setSlug(content.getSlug() + "-" + System.currentTimeMillis()); // Simple append
        }

        // Set published status and date
        if (contentDTO.isPublished()) {
            content.setPublished(true);
            content.setPublishedAt(LocalDateTime.now());
        } else {
            content.setPublished(false);
            content.setPublishedAt(null);
        }

        Content savedContent = contentRepository.save(content);
        return modelMapper.map(savedContent, ContentDTO.class);
    }

    /**
     * Retrieves content by its ID.
     * @param id The ID of the content.
     * @return ContentDTO if found.
     * @throws ResourceNotFoundException if content is not found.
     */
    @Cacheable(value = CACHE_CONTENT_BY_ID, key = "#id")
    @Transactional(readOnly = true)
    public ContentDTO getContentById(Long id) {
        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with id: " + id));
        return modelMapper.map(content, ContentDTO.class);
    }

    /**
     * Retrieves content by its slug.
     * @param slug The slug of the content.
     * @return ContentDTO if found.
     * @throws ResourceNotFoundException if content is not found.
     */
    @Cacheable(value = CACHE_CONTENT_BY_SLUG, key = "#slug")
    @Transactional(readOnly = true)
    public ContentDTO getContentBySlug(String slug) {
        Content content = contentRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with slug: " + slug));
        return modelMapper.map(content, ContentDTO.class);
    }

    /**
     * Retrieves all content, with pagination.
     * @param pageable Pagination information.
     * @return Page of ContentDTOs.
     */
    @Cacheable(value = CACHE_CONTENTS, key = "{#pageable.pageNumber, #pageable.pageSize, #pageable.sort}")
    @Transactional(readOnly = true)
    public Page<ContentDTO> getAllContents(Pageable pageable) {
        return contentRepository.findAll(pageable)
                .map(content -> modelMapper.map(content, ContentDTO.class));
    }

    /**
     * Updates existing content.
     * @param id The ID of the content to update.
     * @param contentDTO DTO containing updated content data.
     * @return ContentDTO of the updated content.
     * @throws ResourceNotFoundException if content is not found.
     */
    @CachePut(value = CACHE_CONTENT_BY_ID, key = "#id") // Update cache entry after modification
    @CacheEvict(value = {CACHE_CONTENTS, CACHE_CONTENT_BY_SLUG}, allEntries = true) // Clear all other related caches
    public ContentDTO updateContent(Long id, ContentDTO contentDTO) {
        Content existingContent = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with id: " + id));

        // Update basic fields
        modelMapper.map(contentDTO, existingContent); // Maps non-null fields from DTO to entity

        // Author cannot be changed directly via content update, assumed to be fixed or separate operation
        // if (contentDTO.getAuthorId() != null && !existingContent.getAuthor().getId().equals(contentDTO.getAuthorId())) {
        //    User newAuthor = userRepository.findById(contentDTO.getAuthorId())
        //            .orElseThrow(() -> new ResourceNotFoundException("New author not found with id: " + contentDTO.getAuthorId()));
        //    existingContent.setAuthor(newAuthor);
        // }

        // Handle Category update
        if (contentDTO.getCategoryId() != null) {
            Category category = categoryRepository.findById(contentDTO.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + contentDTO.getCategoryId()));
            existingContent.setCategory(category);
        } else {
            existingContent.setCategory(null); // Allow removing category
        }

        // Handle Tags update (replace all existing tags)
        if (contentDTO.getTagIds() != null) {
            Set<Tag> newTags = contentDTO.getTagIds().stream()
                    .map(tagId -> tagRepository.findById(tagId)
                            .orElseThrow(() -> new ResourceNotFoundException("Tag not found with id: " + tagId)))
                    .collect(Collectors.toSet());
            existingContent.setTags(newTags);
        } else {
            existingContent.setTags(new HashSet<>()); // Allow removing all tags
        }

        // Update slug if changed or regenerate if needed
        String newSlug = SlugUtil.toSlug(contentDTO.getSlug() != null && !contentDTO.getSlug().trim().isEmpty() ? contentDTO.getSlug() : contentDTO.getTitle());
        if (!newSlug.equals(existingContent.getSlug())) {
            if (contentRepository.findBySlug(newSlug).isPresent()) {
                newSlug = newSlug + "-" + System.currentTimeMillis(); // Simple append
            }
            existingContent.setSlug(newSlug);
        }

        // Handle published status and date
        if (contentDTO.isPublished() && !existingContent.isPublished()) {
            existingContent.setPublished(true);
            existingContent.setPublishedAt(LocalDateTime.now());
        } else if (!contentDTO.isPublished() && existingContent.isPublished()) {
            existingContent.setPublished(false);
            existingContent.setPublishedAt(null);
        }


        Content updatedContent = contentRepository.save(existingContent);
        return modelMapper.map(updatedContent, ContentDTO.class);
    }

    /**
     * Deletes content by its ID.
     * @param id The ID of the content to delete.
     * @throws ResourceNotFoundException if content is not found.
     */
    @CacheEvict(value = {CACHE_CONTENTS, CACHE_CONTENT_BY_ID, CACHE_CONTENT_BY_SLUG}, allEntries = true) // Clear all content related caches
    public void deleteContent(Long id) {
        if (!contentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Content not found with id: " + id);
        }
        contentRepository.deleteById(id);
    }

    /**
     * Publishes content if not already published.
     * @param id Content ID.
     * @return Updated ContentDTO.
     */
    @CachePut(value = CACHE_CONTENT_BY_ID, key = "#id")
    @CacheEvict(value = {CACHE_CONTENTS, CACHE_CONTENT_BY_SLUG}, allEntries = true)
    public ContentDTO publishContent(Long id) {
        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with id: " + id));
        if (!content.isPublished()) {
            content.setPublished(true);
            content.setPublishedAt(LocalDateTime.now());
            contentRepository.save(content);
        }
        return modelMapper.map(content, ContentDTO.class);
    }

    /**
     * Unpublishes content if currently published.
     * @param id Content ID.
     * @return Updated ContentDTO.
     */
    @CachePut(value = CACHE_CONTENT_BY_ID, key = "#id")
    @CacheEvict(value = {CACHE_CONTENTS, CACHE_CONTENT_BY_SLUG}, allEntries = true)
    public ContentDTO unpublishContent(Long id) {
        Content content = contentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found with id: " + id));
        if (content.isPublished()) {
            content.setPublished(false);
            content.setPublishedAt(null);
            contentRepository.save(content);
        }
        return modelMapper.map(content, ContentDTO.class);
    }
}
```