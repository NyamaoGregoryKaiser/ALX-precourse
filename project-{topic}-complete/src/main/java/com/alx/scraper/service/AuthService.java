package com.alx.scraper.service;

import com.alx.scraper.dto.LoginRequest;
import com.alx.scraper.dto.RegisterRequest;
import com.alx.scraper.entity.Role;
import com.alx.scraper.entity.User;
import com.alx.scraper.exception.UnauthorizedException;
import com.alx.scraper.repository.RoleRepository;
import com.alx.scraper.repository.UserRepository;
import com.alx.scraper.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public String login(LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsernameOrEmail(),
                            loginRequest.getPassword()
                    )
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            return jwtTokenProvider.generateToken(authentication);
        } catch (Exception e) {
            log.warn("Failed login attempt for user/email: {}", loginRequest.getUsernameOrEmail(), e);
            throw new UnauthorizedException("Invalid username/email or password.");
        }
    }

    @Transactional
    public void register(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new UnauthorizedException("Username is already taken!");
        }
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new UnauthorizedException("Email is already registered!");
        }

        User user = new User();
        user.setName(registerRequest.getName());
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));

        Set<Role> roles = new HashSet<>();
        Optional<Role> userRole = roleRepository.findByName(Role.ERole.ROLE_USER);

        if (userRole.isEmpty()) {
            // If roles don't exist, create them. This is typically handled by migration scripts.
            Role newUserRole = new Role();
            newUserRole.setName(Role.ERole.ROLE_USER);
            roleRepository.save(newUserRole);
            roles.add(newUserRole);

            // Also ensure admin role exists
            if (roleRepository.findByName(Role.ERole.ROLE_ADMIN).isEmpty()) {
                Role newAdminRole = new Role();
                newAdminRole.setName(Role.ERole.ROLE_ADMIN);
                roleRepository.save(newAdminRole);
            }
        } else {
            roles.add(userRole.get());
        }

        user.setRoles(roles);
        userRepository.save(user);
        log.info("User registered successfully: {}", registerRequest.getUsername());
    }
}