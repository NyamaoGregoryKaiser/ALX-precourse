```java
package com.alx.eventmanagement.auth.service;

import com.alx.eventmanagement.auth.dto.AuthRequest;
import com.alx.eventmanagement.auth.dto.JwtResponse;
import com.alx.eventmanagement.auth.dto.RegisterRequest;
import com.alx.eventmanagement.common.exception.BadRequestException;
import com.alx.eventmanagement.config.JwtUtil;
import com.alx.eventmanagement.user.model.Role;
import com.alx.eventmanagement.user.model.User;
import com.alx.eventmanagement.user.repository.RoleRepository;
import com.alx.eventmanagement.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Override
    public UserDetails loadUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found with username: " + username));
    }

    @Transactional
    public User registerUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username is already taken!");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already in use!");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .build();

        Set<Role> roles = new HashSet<>();
        if (request.getRoles() == null || request.getRoles().isEmpty()) {
            // Default to USER role if no roles are specified
            Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER)
                    .orElseThrow(() -> new BadRequestException("Error: Role 'USER' not found."));
            roles.add(userRole);
        } else {
            // Assign specified roles, ensure they exist and handle ADMIN role restriction
            request.getRoles().forEach(roleNameStr -> {
                Role.RoleName roleEnum;
                try {
                    roleEnum = Role.RoleName.valueOf(roleNameStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new BadRequestException("Error: Invalid role specified: " + roleNameStr);
                }

                if (roleEnum == Role.RoleName.ROLE_ADMIN) {
                    // For security, prevent self-registration as ADMIN
                    throw new BadRequestException("Error: Cannot register as ADMIN directly.");
                }

                Role role = roleRepository.findByName(roleEnum)
                        .orElseThrow(() -> new BadRequestException("Error: Role '" + roleNameStr + "' not found."));
                roles.add(role);
            });
        }

        user.setRoles(roles);
        log.info("Registering user: {}", user.getUsername());
        return userRepository.save(user);
    }

    public JwtResponse authenticateUser(AuthRequest authRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String jwt = jwtUtil.generateToken(userDetails);

        User user = (User) userDetails; // Cast to our User entity
        List<String> roles = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        log.info("User {} authenticated successfully.", user.getUsername());
        return JwtResponse.builder()
                .token(jwt)
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }
}
```