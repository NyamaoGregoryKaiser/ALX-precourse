```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.task.TaskRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.entity.Category;
import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.Task;
import com.alx.taskmgr.entity.TaskStatus;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.exception.BadRequestException;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.exception.UnauthorizedException;
import com.alx.taskmgr.repository.CategoryRepository;
import com.alx.taskmgr.repository.TaskRepository;
import com.alx.taskmgr.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link TaskService} using Mockito.
 * Tests business logic for CRUD operations on tasks, including authorization and exception handling.
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private TaskService taskService;

    private User testUser;
    private User adminUser;
    private Category testCategory;
    private Task testTask;
    private TaskRequest taskRequest;
    private Collection<SimpleGrantedAuthority> userAuthorities;
    private Collection<SimpleGrantedAuthority> adminAuthorities;

    @BeforeEach
    void setUp() {
        // Initialize common test data
        testUser = User.builder()
                .id(1L)
                .fullName("Test User")
                .email("user@example.com")
                .password("hashed_password")
                .roles(Set.of(Role.ROLE_USER))
                .build();

        adminUser = User.builder()
                .id(2L)
                .fullName("Admin User")
                .email("admin@example.com")
                .password("hashed_admin_password")
                .roles(Set.of(Role.ROLE_ADMIN, Role.ROLE_USER))
                .build();

        testCategory = Category.builder()
                .id(10L)
                .name("Work")
                .build();

        testTask = Task.builder()
                .id(100L)
                .title("Complete Report")
                .description("Finish the quarterly report")
                .dueDate(LocalDateTime.now().plusDays(5))
                .status(TaskStatus.PENDING)
                .owner(testUser)
                .category(testCategory)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        taskRequest = TaskRequest.builder()
                .title("New Task")
                .description("New task description")
                .dueDate(LocalDateTime.now().plusDays(10))
                .status(TaskStatus.PENDING)
                .categoryId(testCategory.getId())
                .build();

        userAuthorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        adminAuthorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Test
    @DisplayName("Should successfully create a new task")
    void createTask_Success() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(categoryRepository.findById(testCategory.getId())).thenReturn(Optional.of(testCategory));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);

        // When
        TaskResponse response = taskService.createTask(taskRequest, testUser.getEmail());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo(taskRequest.getTitle());
        assertThat(response.getOwner().getEmail()).isEqualTo(testUser.getEmail());
        assertThat(response.getCategory().getName()).isEqualTo(testCategory.getName());
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(categoryRepository, times(1)).findById(testCategory.getId());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when creating task with non-existent user")
    void createTask_UserNotFound_ThrowsException() {
        // Given
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> taskService.createTask(taskRequest, "nonexistent@example.com"));
        verify(userRepository, times(1)).findByEmail(anyString());
        verify(categoryRepository, never()).findById(anyLong());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when creating task with non-existent category")
    void createTask_CategoryNotFound_ThrowsException() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> taskService.createTask(taskRequest, testUser.getEmail()));
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(categoryRepository, times(1)).findById(testCategory.getId());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw BadRequestException when creating task with past due date")
    void createTask_PastDueDate_ThrowsException() {
        // Given
        taskRequest.setDueDate(LocalDateTime.now().minusDays(1)); // Set due date in the past
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(categoryRepository.findById(testCategory.getId())).thenReturn(Optional.of(testCategory));

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> taskService.createTask(taskRequest, testUser.getEmail()));
        assertThat(exception.getMessage()).contains("Due date cannot be in the past.");
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(categoryRepository, times(1)).findById(testCategory.getId());
        verify(taskRepository, never()).save(any(Task.class));
    }


    @Test
    @DisplayName("Should retrieve all tasks for a specific user")
    void getAllTasksForUser_Success() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(taskRepository.findByOwnerId(testUser.getId())).thenReturn(List.of(testTask));

        // When
        List<TaskResponse> responses = taskService.getAllTasksForUser(testUser.getEmail());

        // Then
        assertThat(responses).isNotNull();
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getTitle()).isEqualTo(testTask.getTitle());
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(taskRepository, times(1)).findByOwnerId(testUser.getId());
    }

    @Test
    @DisplayName("Should retrieve a task by ID for owner")
    void getTaskById_Owner_Success() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));

        // When
        TaskResponse response = taskService.getTaskById(testTask.getId(), testUser.getEmail(), userAuthorities);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(testTask.getId());
        assertThat(response.getTitle()).isEqualTo(testTask.getTitle());
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
    }

    @Test
    @DisplayName("Should retrieve a task by ID for admin")
    void getTaskById_Admin_Success() {
        // Given
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));

        // When
        TaskResponse response = taskService.getTaskById(testTask.getId(), adminUser.getEmail(), adminAuthorities);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(testTask.getId());
        assertThat(response.getTitle()).isEqualTo(testTask.getTitle());
        verify(userRepository, times(1)).findByEmail(adminUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
    }

    @Test
    @DisplayName("Should throw UnauthorizedException when non-owner/non-admin tries to get task")
    void getTaskById_Unauthorized_ThrowsException() {
        // Given
        User anotherUser = User.builder().id(99L).email("another@example.com").build();
        when(userRepository.findByEmail(anotherUser.getEmail())).thenReturn(Optional.of(anotherUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));

        // When & Then
        assertThrows(UnauthorizedException.class,
                () -> taskService.getTaskById(testTask.getId(), anotherUser.getEmail(), userAuthorities));
        verify(userRepository, times(1)).findByEmail(anotherUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when getting non-existent task by ID")
    void getTaskById_NotFound_ThrowsException() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class,
                () -> taskService.getTaskById(999L, testUser.getEmail(), userAuthorities));
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(taskRepository, times(1)).findById(999L);
    }

    @Test
    @DisplayName("Should successfully update a task by owner")
    void updateTask_Owner_Success() {
        // Given
        TaskRequest updateRequest = TaskRequest.builder()
                .title("Updated Title")
                .description("Updated Description")
                .dueDate(LocalDateTime.now().plusDays(15))
                .status(TaskStatus.COMPLETED)
                .categoryId(testCategory.getId())
                .build();
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));
        when(categoryRepository.findById(testCategory.getId())).thenReturn(Optional.of(testCategory));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask.toBuilder()
                .title(updateRequest.getTitle())
                .description(updateRequest.getDescription())
                .dueDate(updateRequest.getDueDate())
                .status(updateRequest.getStatus())
                .build());

        // When
        TaskResponse response = taskService.updateTask(testTask.getId(), updateRequest, testUser.getEmail(), userAuthorities);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Updated Title");
        assertThat(response.getDescription()).isEqualTo("Updated Description");
        assertThat(response.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
        verify(categoryRepository, times(1)).findById(testCategory.getId());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("Should successfully update a task by admin")
    void updateTask_Admin_Success() {
        // Given
        TaskRequest updateRequest = TaskRequest.builder()
                .title("Admin Updated Title")
                .description("Admin Updated Description")
                .dueDate(LocalDateTime.now().plusDays(20))
                .status(TaskStatus.IN_PROGRESS)
                .categoryId(testCategory.getId())
                .build();
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));
        when(categoryRepository.findById(testCategory.getId())).thenReturn(Optional.of(testCategory));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask.toBuilder()
                .title(updateRequest.getTitle())
                .description(updateRequest.getDescription())
                .dueDate(updateRequest.getDueDate())
                .status(updateRequest.getStatus())
                .build());

        // When
        TaskResponse response = taskService.updateTask(testTask.getId(), updateRequest, adminUser.getEmail(), adminAuthorities);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Admin Updated Title");
        assertThat(response.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        verify(userRepository, times(1)).findByEmail(adminUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
        verify(categoryRepository, times(1)).findById(testCategory.getId());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw UnauthorizedException when non-owner/non-admin tries to update task")
    void updateTask_Unauthorized_ThrowsException() {
        // Given
        User anotherUser = User.builder().id(99L).email("another@example.com").build();
        when(userRepository.findByEmail(anotherUser.getEmail())).thenReturn(Optional.of(anotherUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));

        // When & Then
        assertThrows(UnauthorizedException.class,
                () -> taskService.updateTask(testTask.getId(), taskRequest, anotherUser.getEmail(), userAuthorities));
        verify(userRepository, times(1)).findByEmail(anotherUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
        verify(categoryRepository, never()).findById(anyLong());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent task")
    void updateTask_TaskNotFound_ThrowsException() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class,
                () -> taskService.updateTask(999L, taskRequest, testUser.getEmail(), userAuthorities));
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(taskRepository, times(1)).findById(999L);
        verify(categoryRepository, never()).findById(anyLong());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should successfully delete a task by owner")
    void deleteTask_Owner_Success() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));
        doNothing().when(taskRepository).delete(any(Task.class));

        // When
        taskService.deleteTask(testTask.getId(), testUser.getEmail(), userAuthorities);

        // Then
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
        verify(taskRepository, times(1)).delete(any(Task.class));
    }

    @Test
    @DisplayName("Should successfully delete a task by admin")
    void deleteTask_Admin_Success() {
        // Given
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));
        doNothing().when(taskRepository).delete(any(Task.class));

        // When
        taskService.deleteTask(testTask.getId(), adminUser.getEmail(), adminAuthorities);

        // Then
        verify(userRepository, times(1)).findByEmail(adminUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
        verify(taskRepository, times(1)).delete(any(Task.class));
    }

    @Test
    @DisplayName("Should throw UnauthorizedException when non-owner/non-admin tries to delete task")
    void deleteTask_Unauthorized_ThrowsException() {
        // Given
        User anotherUser = User.builder().id(99L).email("another@example.com").build();
        when(userRepository.findByEmail(anotherUser.getEmail())).thenReturn(Optional.of(anotherUser));
        when(taskRepository.findById(testTask.getId())).thenReturn(Optional.of(testTask));

        // When & Then
        assertThrows(UnauthorizedException.class,
                () -> taskService.deleteTask(testTask.getId(), anotherUser.getEmail(), userAuthorities));
        verify(userRepository, times(1)).findByEmail(anotherUser.getEmail());
        verify(taskRepository, times(1)).findById(testTask.getId());
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent task")
    void deleteTask_TaskNotFound_ThrowsException() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class,
                () -> taskService.deleteTask(999L, testUser.getEmail(), userAuthorities));
        verify(userRepository, times(1)).findByEmail(testUser.getEmail());
        verify(taskRepository, times(1)).findById(999L);
        verify(taskRepository, never()).delete(any(Task.class));
    }
}
```