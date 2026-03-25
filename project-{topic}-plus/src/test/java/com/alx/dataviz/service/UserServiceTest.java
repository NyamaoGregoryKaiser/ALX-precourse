```java
package com.alx.dataviz.service;

import com.alx.dataviz.dto.UserDto;
import com.alx.dataviz.exception.ResourceNotFoundException;
import com.alx.dataviz.exception.UnauthorizedException;
import com.alx.dataviz.model.Role;
import com.alx.dataviz.model.User;
import com.alx.dataviz.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ModelMapper modelMapper;
    @Mock
    private SecurityContext securityContext;
    @Mock
    private Authentication authentication;
    @Mock
    private UserDetails userDetails;

    @InjectMocks
    private UserService userService;

    private User adminUser;
    private User regularUser;
    private UserDto regularUserDto;
    private UserDto adminUserDto;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(1L)
                .username("admin")
                .email("admin@example.com")
                .password("encodedPassword")
                .roles(Set.of(Role.ADMIN, Role.USER))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        regularUser = User.builder()
                .id(2L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .roles(Collections.singleton(Role.USER))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        regularUserDto = new UserDto();
        regularUserDto.setUsername("testuser");
        regularUserDto.setEmail("test@example.com");
        regularUserDto.setPassword("password");
        regularUserDto.setRoles(Collections.singleton(Role.USER));

        adminUserDto = new UserDto();
        adminUserDto.setUsername("admin");
        adminUserDto.setEmail("admin@example.com");
        adminUserDto.setPassword("password");
        adminUserDto.setRoles(Set.of(Role.ADMIN, Role.USER));

        // Mock SecurityContext for authorization checks
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getUsername()).thenReturn("admin"); // Default to admin for most tests
        when(userDetails.getAuthorities()).thenReturn(Set.of(new SimpleGrantedAuthority(Role.ADMIN.getAuthority())));

        // Mock ModelMapper behavior
        when(modelMapper.map(any(UserDto.class), any(Class.class))).thenAnswer(invocation -> {
            if (invocation.getArgument(0) instanceof UserDto && invocation.getArgument(1).equals(User.class)) {
                User user = new User();
                UserDto dto = invocation.getArgument(0);
                user.setUsername(dto.getUsername());
                user.setEmail(dto.getEmail());
                user.setRoles(dto.getRoles());
                return user;
            } else if (invocation.getArgument(0) instanceof User && invocation.getArgument(1).equals(UserDto.class)) {
                User user = invocation.getArgument(0);
                UserDto dto = new UserDto();
                dto.setId(user.getId());
                dto.setUsername(user.getUsername());
                dto.setEmail(user.getEmail());
                dto.setRoles(user.getRoles());
                dto.setCreatedAt(user.getCreatedAt());
                dto.setUpdatedAt(user.getUpdatedAt());
                return dto;
            }
            return null; // Should not happen with correct mapping setup
        });
    }

    private void mockUserAuthentication(String username, Set<Role> roles) {
        when(userDetails.getUsername()).thenReturn(username);
        when(userDetails.getAuthorities()).thenReturn(roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.getAuthority()))
                .collect(Collectors.toSet()));
    }

    @Test
    @DisplayName("Should register a new user successfully")
    void registerNewUser_Success() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(regularUser);

        UserDto result = userService.registerNewUser(regularUserDto);

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo(regularUserDto.getUsername());
        assertThat(result.getEmail()).isEqualTo(regularUserDto.getEmail());
        assertThat(result.getRoles()).containsExactly(Role.USER); // Default role
        verify(userRepository, times(1)).save(any(User.class));
        verify(passwordEncoder, times(1)).encode(regularUserDto.getPassword());
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException if username already exists during registration")
    void registerNewUser_UsernameExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.registerNewUser(regularUserDto));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException if email already exists during registration")
    void registerNewUser_EmailExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.registerNewUser(regularUserDto));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should retrieve user by ID successfully")
    void getUserById_Success() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(regularUser));
        mockUserAuthentication("admin", Set.of(Role.ADMIN)); // Admin can view any user

        UserDto result = userService.getUserById(regularUser.getId());

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(regularUser.getId());
        assertThat(result.getUsername()).isEqualTo(regularUser.getUsername());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if user not found by ID")
    void getUserById_NotFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(99L));
    }

    @Test
    @DisplayName("Should retrieve all users successfully for an admin")
    void getAllUsers_AdminSuccess() {
        Pageable pageable = PageRequest.of(0, 10);
        List<User> users = List.of(adminUser, regularUser);
        Page<User> userPage = new PageImpl<>(users, pageable, users.size());

        when(userRepository.findAll(pageable)).thenReturn(userPage);
        mockUserAuthentication("admin", Set.of(Role.ADMIN));

        Page<UserDto> resultPage = userService.getAllUsers(pageable);

        assertThat(resultPage).isNotNull();
        assertThat(resultPage.getTotalElements()).isEqualTo(2);
        assertThat(resultPage.getContent()).hasSize(2);
        verify(userRepository, times(1)).findAll(pageable);
    }

    @Test
    @DisplayName("Should update user successfully by owner")
    void updateUser_OwnerSuccess() {
        mockUserAuthentication(regularUser.getUsername(), Set.of(Role.USER));
        when(userRepository.findById(regularUser.getId())).thenReturn(Optional.of(regularUser));
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(regularUser);

        UserDto updateDto = new UserDto();
        updateDto.setUsername("updateduser");
        updateDto.setEmail("updated@example.com");
        updateDto.setPassword("newpassword"); // New password provided
        updateDto.setRoles(Collections.singleton(Role.USER)); // Attempting to change role but not allowed for non-admin

        UserDto result = userService.updateUser(regularUser.getId(), updateDto);

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("updateduser");
        assertThat(result.getEmail()).isEqualTo("updated@example.com");
        // Role change should be ignored because current user is not ADMIN
        assertThat(result.getRoles()).containsExactly(Role.USER);
        verify(passwordEncoder, times(1)).encode("newpassword");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should update user successfully by admin")
    void updateUser_AdminSuccess() {
        mockUserAuthentication(adminUser.getUsername(), Set.of(Role.ADMIN));
        when(userRepository.findById(regularUser.getId())).thenReturn(Optional.of(regularUser));
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(regularUser);

        UserDto updateDto = new UserDto();
        updateDto.setUsername("updateduser");
        updateDto.setEmail("updated@example.com");
        updateDto.setRoles(Set.of(Role.ADMIN, Role.USER)); // Admin can change roles

        UserDto result = userService.updateUser(regularUser.getId(), updateDto);

        assertThat(result).isNotNull();
        assertThat(result.getRoles()).contains(Role.ADMIN, Role.USER);
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw UnauthorizedException if non-admin tries to update another user")
    void updateUser_Unauthorized() {
        mockUserAuthentication("anotherUser", Collections.singleton(Role.USER)); // Not owner, not admin
        when(userRepository.findById(regularUser.getId())).thenReturn(Optional.of(regularUser));

        assertThrows(UnauthorizedException.class, () -> userService.updateUser(regularUser.getId(), regularUserDto));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should delete user successfully by owner")
    void deleteUser_OwnerSuccess() {
        mockUserAuthentication(regularUser.getUsername(), Collections.singleton(Role.USER));
        when(userRepository.findById(regularUser.getId())).thenReturn(Optional.of(regularUser));

        userService.deleteUser(regularUser.getId());

        verify(userRepository, times(1)).delete(regularUser);
    }

    @Test
    @DisplayName("Should delete user successfully by admin")
    void deleteUser_AdminSuccess() {
        mockUserAuthentication(adminUser.getUsername(), Set.of(Role.ADMIN));
        when(userRepository.findById(regularUser.getId())).thenReturn(Optional.of(regularUser));

        userService.deleteUser(regularUser.getId());

        verify(userRepository, times(1)).delete(regularUser);
    }

    @Test
    @DisplayName("Should throw UnauthorizedException if non-admin tries to delete another user")
    void deleteUser_Unauthorized() {
        mockUserAuthentication("anotherUser", Collections.singleton(Role.USER)); // Not owner, not admin
        when(userRepository.findById(regularUser.getId())).thenReturn(Optional.of(regularUser));

        assertThrows(UnauthorizedException.class, () -> userService.deleteUser(regularUser.getId()));
        verify(userRepository, never()).delete(any(User.class));
    }
}
```