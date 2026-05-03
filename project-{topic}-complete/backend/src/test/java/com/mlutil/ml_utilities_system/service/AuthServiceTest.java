package com.mlutil.ml_utilities_system.service;

import com.mlutil.ml_utilities_system.dto.auth.RegisterRequest;
import com.mlutil.ml_utilities_system.exception.UserAlreadyExistsException;
import com.mlutil.ml_utilities_system.model.Role;
import com.mlutil.ml_utilities_system.model.User;
import com.mlutil.ml_utilities_system.repository.RoleRepository;
import com.mlutil.ml_utilities_system.repository.UserRepository;
import com.mlutil.ml_utilities_system.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private User user;
    private Role userRole;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .username("newUser")
                .email("new@example.com")
                .password("password123")
                .build();

        userRole = Role.builder().id(UUID.randomUUID()).name("ROLE_USER").build();
        Set<Role> roles = new HashSet<>(Collections.singletonList(userRole));

        user = User.builder()
                .id(UUID.randomUUID())
                .username("newUser")
                .email("new@example.com")
                .password("encodedPassword123")
                .roles(roles)
                .build();
    }

    @Test
    @DisplayName("Should register a new user successfully")
    void shouldRegisterNewUserSuccessfully() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(roleRepository.findByName("ROLE_USER")).thenReturn(Optional.of(userRole));
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword123");
        when(userRepository.save(any(User.class))).thenReturn(user);

        User registeredUser = authService.registerNewUser(registerRequest);

        assertThat(registeredUser).isNotNull();
        assertThat(registeredUser.getUsername()).isEqualTo(registerRequest.getUsername());
        assertThat(registeredUser.getEmail()).isEqualTo(registerRequest.getEmail());
        assertThat(registeredUser.getPassword()).isEqualTo("encodedPassword123");
        assertThat(registeredUser.getRoles()).containsExactly(userRole);

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(roleRepository, times(1)).findByName("ROLE_USER");
        verify(passwordEncoder, times(1)).encode(registerRequest.getPassword());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw UserAlreadyExistsException if username exists during registration")
    void shouldThrowUserAlreadyExistsExceptionWhenUsernameExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        assertThrows(UserAlreadyExistsException.class, () -> authService.registerNewUser(registerRequest));

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, never()).existsByEmail(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw UserAlreadyExistsException if email exists during registration")
    void shouldThrowUserAlreadyExistsExceptionWhenEmailExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(UserAlreadyExistsException.class, () -> authService.registerNewUser(registerRequest));

        verify(userRepository, times(1)).existsByUsername(registerRequest.getUsername());
        verify(userRepository, times(1)).existsByEmail(registerRequest.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should authenticate and return JWT token successfully")
    void shouldAuthenticateAndGetTokenSuccessfully() {
        String username = "testuser";
        String password = "testpassword";
        String jwtToken = "mocked.jwt.token";

        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                username, password, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));

        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(jwtUtil.generateToken(userDetails)).thenReturn(jwtToken);

        String resultToken = authService.authenticateAndGetToken(username, password);

        assertThat(resultToken).isEqualTo(jwtToken);
        verify(authenticationManager, times(1)).authenticate(new UsernamePasswordAuthenticationToken(username, password));
        verify(jwtUtil, times(1)).generateToken(userDetails);
    }

    @Test
    @DisplayName("Should throw BadCredentialsException if authentication fails")
    void shouldThrowBadCredentialsExceptionWhenAuthenticationFails() {
        String username = "wronguser";
        String password = "wrongpassword";

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.authenticateAndGetToken(username, password));

        verify(authenticationManager, times(1)).authenticate(new UsernamePasswordAuthenticationToken(username, password));
        verify(jwtUtil, never()).generateToken(any(UserDetails.class));
    }
}