```java
package com.alx.devops.productmanagement.service;

import com.alx.devops.productmanagement.dto.AuthRequest;
import com.alx.devops.productmanagement.dto.AuthResponse;
import com.alx.devops.productmanagement.dto.UserDTO;
import com.alx.devops.productmanagement.exception.ValidationException;
import com.alx.devops.productmanagement.model.Role;
import com.alx.devops.productmanagement.model.User;
import com.alx.devops.productmanagement.repository.UserRepository;
import com.alx.devops.productmanagement.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private UserDetailsServiceImpl userDetailsService;
    @Mock
    private Authentication authentication; // Mock for successful authentication result

    @InjectMocks
    private AuthService authService;

    private UserDTO userDTO;
    private User user;
    private AuthRequest authRequest;

    @BeforeEach
    void setUp() {
        userDTO = new UserDTO();
        userDTO.setUsername("testuser");
        userDTO.setPassword("rawPassword");

        user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setPassword("encodedPassword");
        user.setRole(Role.ROLE_USER);

        authRequest = new AuthRequest();
        authRequest.setUsername("testuser");
        authRequest.setPassword("rawPassword");
    }

    @Test
    void registerUser_Success() {
        when(userRepository.existsByUsername(userDTO.getUsername())).thenReturn(false);
        when(passwordEncoder.encode(userDTO.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserDTO result = authService.registerUser(userDTO);

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo(user.getUsername());
        assertThat(result.getRole()).isEqualTo(Role.ROLE_USER);
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void registerUser_UsernameAlreadyExists_ThrowsValidationException() {
        when(userRepository.existsByUsername(userDTO.getUsername())).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.registerUser(userDTO));

        assertThat(exception.getMessage()).isEqualTo("Username testuser already exists.");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_Success() {
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getUsername(), user.getPassword(), Collections.singleton(new SimpleGrantedAuthority(user.getRole().name()))
        );

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(userDetailsService.loadUserByUsername(authRequest.getUsername())).thenReturn(userDetails);
        when(jwtUtil.generateToken(userDetails)).thenReturn("mock_jwt_token");
        when(userRepository.findByUsername(authRequest.getUsername())).thenReturn(Optional.of(user));

        AuthResponse result = authService.login(authRequest);

        assertThat(result).isNotNull();
        assertThat(result.getJwtToken()).isEqualTo("mock_jwt_token");
        assertThat(result.getUsername()).isEqualTo(user.getUsername());
        assertThat(result.getRole()).isEqualTo(user.getRole().name());
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userDetailsService, times(1)).loadUserByUsername(authRequest.getUsername());
        verify(jwtUtil, times(1)).generateToken(userDetails);
    }

    @Test
    void login_InvalidCredentials_ThrowsValidationException() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        ValidationException exception = assertThrows(ValidationException.class, () -> authService.login(authRequest));

        assertThat(exception.getMessage()).isEqualTo("Invalid username or password");
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userDetailsService, never()).loadUserByUsername(anyString());
        verify(jwtUtil, never()).generateToken(any(UserDetails.class));
    }
}
```