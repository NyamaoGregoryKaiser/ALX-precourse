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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContentServiceTest {

    @Mock
    private ContentRepository contentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private TagRepository tagRepository;
    @Spy // Use @Spy for ModelMapper to call real methods
    private ModelMapper modelMapper;

    @InjectMocks
    private ContentService contentService;

    private User author;
    private Category category;
    private Tag tag1;
    private Tag tag2;
    private Content content;
    private ContentDTO contentDTO;

    @BeforeEach
    void setUp() {
        author = new User(1L, "testuser", "test@example.com", "password", LocalDateTime.now(), LocalDateTime.now(), new HashSet<>());
        category = new Category(10L, "Technology", "Tech content", LocalDateTime.now(), LocalDateTime.now(), new HashSet<>());
        tag1 = new Tag(100L, "Java", LocalDateTime.now(), LocalDateTime.now(), new HashSet<>());
        tag2 = new Tag(101L, "Spring", LocalDateTime.now(), LocalDateTime.now(), new HashSet<>());

        content = new Content(1L, "Test Title", "test-title", "Test Body", null, false, LocalDateTime.now(), LocalDateTime.now(), author, category, new HashSet<>());
        content.getTags().add(tag1);

        contentDTO = new ContentDTO(null, "Test Title", null, "Test Body", null, false, null, null, author.getId(), category.getId(), Set.of(tag1.getId(), tag2.getId()));

        // Configure ModelMapper mappings (minimal for this test)
        when(modelMapper.map(any(ContentDTO.class), eq(Content.class)))
                .thenAnswer(invocation -> {
                    ContentDTO dto = invocation.getArgument(0);
                    Content c = new Content();
                    c.setTitle(dto.getTitle());
                    c.setBody(dto.getBody());
                    c.setPublished(dto.isPublished());
                    c.setSlug(SlugUtil.toSlug(dto.getTitle())); // Simulate slug generation
                    return c;
                });
        when(modelMapper.map(any(Content.class), eq(ContentDTO.class)))
                .thenAnswer(invocation -> {
                    Content c = invocation.getArgument(0);
                    ContentDTO dto = new ContentDTO();
                    dto.setId(c.getId());
                    dto.setTitle(c.getTitle());
                    dto.setSlug(c.getSlug());
                    dto.setBody(c.getBody());
                    dto.setPublished(c.isPublished());
                    dto.setPublishedAt(c.getPublishedAt());
                    dto.setCreatedAt(c.getCreatedAt());
                    dto.setUpdatedAt(c.getUpdatedAt());
                    dto.setAuthorId(c.getAuthor() != null ? c.getAuthor().getId() : null);
                    dto.setCategoryId(c.getCategory() != null ? c.getCategory().getId() : null);
                    dto.setTagIds(c.getTags() != null ? c.getTags().stream().map(Tag::getId).collect(java.util.stream.Collectors.toSet()) : new HashSet<>());
                    return dto;
                });
    }

    @Test
    void createContent_shouldCreateAndReturnContentDTO() {
        when(userRepository.findById(author.getId())).thenReturn(Optional.of(author));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findById(tag1.getId())).thenReturn(Optional.of(tag1));
        when(tagRepository.findById(tag2.getId())).thenReturn(Optional.of(tag2));
        when(contentRepository.findBySlug(anyString())).thenReturn(Optional.empty()); // No slug conflict
        when(contentRepository.save(any(Content.class))).thenReturn(content); // Return the dummy content

        ContentDTO result = contentService.createContent(contentDTO);

        assertNotNull(result);
        assertEquals(contentDTO.getTitle(), result.getTitle());
        assertEquals(author.getId(), result.getAuthorId());
        assertEquals(category.getId(), result.getCategoryId());
        assertTrue(result.getTagIds().contains(tag1.getId()));
        assertTrue(result.getTagIds().contains(tag2.getId()));
        verify(contentRepository, times(1)).save(any(Content.class));
    }

    @Test
    void createContent_shouldThrowResourceNotFoundException_whenAuthorNotFound() {
        when(userRepository.findById(author.getId())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> contentService.createContent(contentDTO));

        assertEquals("Author not found with id: " + author.getId(), exception.getMessage());
        verify(contentRepository, never()).save(any(Content.class));
    }

    @Test
    void getContentById_shouldReturnContentDTO_whenContentExists() {
        when(contentRepository.findById(content.getId())).thenReturn(Optional.of(content));

        ContentDTO result = contentService.getContentById(content.getId());

        assertNotNull(result);
        assertEquals(content.getId(), result.getId());
        assertEquals(content.getTitle(), result.getTitle());
    }

    @Test
    void getContentById_shouldThrowResourceNotFoundException_whenContentNotFound() {
        when(contentRepository.findById(anyLong())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> contentService.getContentById(99L));

        assertEquals("Content not found with id: 99", exception.getMessage());
    }

    @Test
    void getAllContents_shouldReturnPageOfContentDTOs() {
        Pageable pageable = PageRequest.of(0, 10);
        List<Content> contentList = Collections.singletonList(content);
        Page<Content> contentPage = new PageImpl<>(contentList, pageable, 1);

        when(contentRepository.findAll(pageable)).thenReturn(contentPage);

        Page<ContentDTO> result = contentService.getAllContents(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(content.getTitle(), result.getContent().get(0).getTitle());
    }

    @Test
    void updateContent_shouldUpdateAndReturnContentDTO() {
        ContentDTO updateDTO = new ContentDTO(content.getId(), "Updated Title", "updated-title", "Updated Body", null, true, null, null, author.getId(), category.getId(), Set.of(tag1.getId()));

        when(contentRepository.findById(content.getId())).thenReturn(Optional.of(content));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findById(tag1.getId())).thenReturn(Optional.of(tag1));
        when(contentRepository.findBySlug(anyString())).thenReturn(Optional.empty());
        when(contentRepository.save(any(Content.class))).thenReturn(content); // Mock save returns the original content, which is updated by map

        ContentDTO result = contentService.updateContent(content.getId(), updateDTO);

        assertNotNull(result);
        assertEquals("Updated Title", result.getTitle());
        assertTrue(result.isPublished());
        assertNotNull(result.getPublishedAt());
        verify(contentRepository, times(1)).save(any(Content.class));
    }

    @Test
    void deleteContent_shouldDeleteContent_whenContentExists() {
        when(contentRepository.existsById(content.getId())).thenReturn(true);
        doNothing().when(contentRepository).deleteById(content.getId());

        contentService.deleteContent(content.getId());

        verify(contentRepository, times(1)).deleteById(content.getId());
    }

    @Test
    void deleteContent_shouldThrowResourceNotFoundException_whenContentNotFound() {
        when(contentRepository.existsById(anyLong())).thenReturn(false);

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> contentService.deleteContent(99L));

        assertEquals("Content not found with id: 99", exception.getMessage());
        verify(contentRepository, never()).delete(any(Content.class));
    }
}
```