```java
package com.alx.scrapineer.service;

import com.alx.scrapineer.api.dto.scraping.CssSelectorDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetMapping;
import com.alx.scrapineer.common.exception.BadRequestException;
import com.alx.scrapineer.common.exception.ResourceNotFoundException;
import com.alx.scrapineer.data.entity.CssSelector;
import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.SelectorType;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.ScrapingTargetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScrapingTargetServiceTest {

    @Mock
    private ScrapingTargetRepository targetRepository;

    @InjectMocks
    private ScrapingTargetService targetService;

    private User testUser;
    private ScrapingTarget testTarget;
    private ScrapingTargetDto testTargetDto;
    private CssSelector testSelector;
    private CssSelectorDto testSelectorDto;

    @BeforeEach
    void setUp() {
        // Manually inject the mapper
        ScrapingTargetMapping mapper = new ScrapingTargetMapping();
        ReflectionTestUtils.setField(targetService, "targetMapping", mapper);

        testUser = User.builder().id(1L).username("testuser").password("pass").roles(Set.of(Role.USER)).build();

        testSelector = CssSelector.builder()
                .id(101L)
                .name("title")
                .selectorValue("h1.product-title")
                .type(SelectorType.TEXT)
                .build();

        testTarget = ScrapingTarget.builder()
                .id(1L)
                .user(testUser)
                .name("Test Target")
                .url("http://example.com")
                .description("A test scraping target")
                .active(true)
                .selectors(List.of(testSelector))
                .build();
        testSelector.setTarget(testTarget);

        testSelectorDto = CssSelectorDto.builder()
                .id(101L)
                .name("title")
                .selectorValue("h1.product-title")
                .type(SelectorType.TEXT)
                .build();

        testTargetDto = ScrapingTargetDto.builder()
                .id(1L)
                .userId(testUser.getId())
                .name("Test Target")
                .url("http://example.com")
                .description("A test scraping target")
                .active(true)
                .selectors(List.of(testSelectorDto))
                .build();
    }

    @Test
    void testGetAllTargets_Success() {
        when(targetRepository.findByUser(testUser)).thenReturn(List.of(testTarget));

        List<ScrapingTargetDto> result = targetService.getAllTargets(testUser);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo(testTargetDto.getName());
        assertThat(result.get(0).getSelectors()).hasSize(1);
        assertThat(result.get(0).getSelectors().get(0).getName()).isEqualTo(testSelectorDto.getName());
        verify(targetRepository, times(1)).findByUser(testUser);
    }

    @Test
    void testGetTargetById_Success() {
        when(targetRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testTarget));

        ScrapingTargetDto result = targetService.getTargetById(1L, testUser);

        assertThat(result).isEqualTo(testTargetDto);
        verify(targetRepository, times(1)).findByIdAndUser(1L, testUser);
    }

    @Test
    void testGetTargetById_NotFound() {
        when(targetRepository.findByIdAndUser(2L, testUser)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> targetService.getTargetById(2L, testUser));
        verify(targetRepository, times(1)).findByIdAndUser(2L, testUser);
    }

    @Test
    void testCreateTarget_Success() {
        ScrapingTargetDto newTargetDto = ScrapingTargetDto.builder()
                .name("New Target")
                .url("http://new.com")
                .description("New description")
                .active(true)
                .selectors(List.of(
                        CssSelectorDto.builder().name("new-sel").selectorValue("div").type(SelectorType.TEXT).build()
                ))
                .build();

        // Simulate save behavior
        when(targetRepository.existsByNameAndUser(anyString(), any(User.class))).thenReturn(false);
        when(targetRepository.save(any(ScrapingTarget.class))).thenAnswer(invocation -> {
            ScrapingTarget savedTarget = invocation.getArgument(0);
            savedTarget.setId(2L);
            savedTarget.getSelectors().forEach(s -> s.setId(201L)); // Simulate selector ID generation
            return savedTarget;
        });

        ScrapingTargetDto createdTarget = targetService.createTarget(newTargetDto, testUser);

        assertThat(createdTarget).isNotNull();
        assertThat(createdTarget.getId()).isEqualTo(2L);
        assertThat(createdTarget.getName()).isEqualTo("New Target");
        assertThat(createdTarget.getSelectors()).hasSize(1);
        assertThat(createdTarget.getSelectors().get(0).getId()).isNotNull();
        verify(targetRepository, times(1)).save(any(ScrapingTarget.class));
    }

    @Test
    void testCreateTarget_NameConflict() {
        ScrapingTargetDto newTargetDto = ScrapingTargetDto.builder()
                .name("Test Target") // Conflicts with existing
                .url("http://new.com")
                .active(true)
                .selectors(Collections.emptyList())
                .build();

        when(targetRepository.existsByNameAndUser("Test Target", testUser)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> targetService.createTarget(newTargetDto, testUser));
        verify(targetRepository, never()).save(any(ScrapingTarget.class));
    }

    @Test
    void testUpdateTarget_Success() {
        ScrapingTargetDto updatedTargetDto = ScrapingTargetDto.builder()
                .id(1L)
                .userId(testUser.getId())
                .name("Updated Target Name")
                .url("http://updated.com")
                .description("Updated description")
                .active(false)
                .selectors(List.of(
                        CssSelectorDto.builder().name("new-sel").selectorValue("div.new").type(SelectorType.TEXT).build()
                ))
                .build();

        when(targetRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testTarget));
        when(targetRepository.existsByNameAndUser(anyString(), any(User.class))).thenReturn(false); // No name conflict
        when(targetRepository.save(any(ScrapingTarget.class))).thenAnswer(invocation -> {
            ScrapingTarget savedTarget = invocation.getArgument(0);
            // Simulate selector IDs being generated
            savedTarget.getSelectors().forEach(s -> s.setId(s.getId() == null ? 300L : s.getId()));
            return savedTarget;
        });

        ScrapingTargetDto result = targetService.updateTarget(1L, updatedTargetDto, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Updated Target Name");
        assertThat(result.getUrl()).isEqualTo("http://updated.com");
        assertThat(result.isActive()).isFalse();
        assertThat(result.getSelectors()).hasSize(1);
        assertThat(result.getSelectors().get(0).getName()).isEqualTo("new-sel");
        verify(targetRepository, times(1)).save(any(ScrapingTarget.class));
    }

    @Test
    void testUpdateTarget_NotFound() {
        ScrapingTargetDto updatedTargetDto = ScrapingTargetDto.builder()
                .id(99L)
                .name("NonExistent")
                .url("http://non.exist")
                .active(true)
                .selectors(Collections.emptyList())
                .build();

        when(targetRepository.findByIdAndUser(99L, testUser)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> targetService.updateTarget(99L, updatedTargetDto, testUser));
        verify(targetRepository, never()).save(any(ScrapingTarget.class));
    }

    @Test
    void testUpdateTarget_NameConflictOnUpdate() {
        ScrapingTarget otherTarget = ScrapingTarget.builder().id(2L).user(testUser).name("Other Target").url("http://other.com").build();
        when(targetRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testTarget));
        when(targetRepository.existsByNameAndUser("Other Target", testUser)).thenReturn(true);

        ScrapingTargetDto updatedTargetDto = ScrapingTargetDto.builder()
                .id(1L)
                .name("Other Target") // Attempt to change name to an existing one
                .url("http://example.com")
                .active(true)
                .selectors(Collections.emptyList())
                .build();

        assertThrows(BadRequestException.class, () -> targetService.updateTarget(1L, updatedTargetDto, testUser));
        verify(targetRepository, never()).save(any(ScrapingTarget.class));
    }

    @Test
    void testDeleteTarget_Success() {
        when(targetRepository.findByIdAndUser(1L, testUser)).thenReturn(Optional.of(testTarget));
        doNothing().when(targetRepository).delete(testTarget);

        targetService.deleteTarget(1L, testUser);

        verify(targetRepository, times(1)).delete(testTarget);
    }

    @Test
    void testDeleteTarget_NotFound() {
        when(targetRepository.findByIdAndUser(99L, testUser)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> targetService.deleteTarget(99L, testUser));
        verify(targetRepository, never()).delete(any(ScrapingTarget.class));
    }
}
```