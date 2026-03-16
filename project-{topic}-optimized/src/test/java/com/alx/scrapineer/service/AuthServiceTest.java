```java
package com.alx.scrapineer.service;

import com.alx.scrapineer.api.dto.auth.AuthRequest;
import com.alx.scrapineer.api.dto.auth.AuthResponse;
import com.alx.scrapineer.api.dto.auth.RegisterRequest;
import com.alx.scrapineer.common.exception.BadRequestException;
import com.alx.scrapineer.common.security.UserPrincipal;
import com.alx.scrapineer.common.util.JwtUtil;
import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

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
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private RegisterRequest registerRequest;
    private AuthRequest authRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .password("encodedpassword")
                .roles(Set.of(Role.USER))
                .build();

        registerRequest = RegisterRequest.builder()
                .username("newuser")
                .password("rawpassword")
                .roles(Set.of(Role.USER))
                .build();

        authRequest = AuthRequest.builder()
                .username("testuser")
                .password("rawpassword")
                .build();
    }

    @Test
    void testRegister_Success() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedpassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtUtil.generateToken(any(UserPrincipal.class))).thenReturn("jwttoken");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwttoken");
        assertThat(response.getUsername()).isEqualTo("testuser");
        verify(userRepository, times(1)).save(any(User.class));
        verify(passwordEncoder, times(1)).encode("rawpassword");
        verify(jwtUtil, times(1)).generateToken(any(UserPrincipal.class));
    }

    @Test
    void testRegister_UsernameAlreadyExists() {
        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(registerRequest));
        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(anyString());
        verify(jwtUtil, never()).generateToken(any(UserPrincipal.class));
    }

    @Test
    void testRegister_DefaultUserRole() {
        registerRequest.setRoles(null); // No roles provided
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedpassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            savedUser.setId(1L); // Simulate ID being set by DB
            assertThat(savedUser.getRoles()).containsExactly(Role.USER); // Assert default role
            return savedUser;
        });
        when(jwtUtil.generateToken(any(UserPrincipal.class))).thenReturn("jwttoken");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwttoken");
        verify(userRepository, times(1)).save(any(User.class));
    }


    @Test
    void testAuthenticate_Success() {
        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(testUser.getId())
                .username(testUser.getUsername())
                .password(testUser.getPassword())
                .authorities(Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")))
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);
        when(jwtUtil.generateToken(any(UserPrincipal.class))).thenReturn("jwttoken");

        AuthResponse response = authService.authenticate(authRequest);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwttoken");
        assertThat(response.getUsername()).isEqualTo("testuser");
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtil, times(1)).generateToken(any(UserPrincipal.class));
    }

    @Test
    void testAuthenticate_InvalidCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Bad credentials"));

        assertThrows(org.springframework.security.authentication.BadCredentialsException.class,
                () -> authService.authenticate(authRequest));
        verify(jwtUtil, never()).generateToken(any(UserPrincipal.class));
    }
}
```