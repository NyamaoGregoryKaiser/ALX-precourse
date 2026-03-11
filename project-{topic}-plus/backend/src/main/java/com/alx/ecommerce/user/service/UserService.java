package com.alx.ecommerce.user.service;

import com.alx.ecommerce.common.exceptions.InvalidCredentialsException;
import com.alx.ecommerce.common.exceptions.ResourceNotFoundException;
import com.alx.ecommerce.user.dto.LoginRequest;
import com.alx.ecommerce.user.dto.JwtResponse;
import com.alx.ecommerce.user.dto.SignupRequest;
import com.alx.ecommerce.user.dto.UserDTO;
import com.alx.ecommerce.user.model.ERole;
import com.alx.ecommerce.user.model.Role;
import com.alx.ecommerce.user.model.User;
import com.alx.ecommerce.user.repository.RoleRepository;
import com.alx.ecommerce.user.repository.UserRepository;
import com.alx.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Transactional
    public UserDTO registerUser(SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new InvalidCredentialsException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new InvalidCredentialsException("Error: Email is already in use!");
        }

        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .password(passwordEncoder.encode(signUpRequest.getPassword()))
                .build();

        Set<String> strRoles = signUpRequest.getRole();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null || strRoles.isEmpty()) {
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseThrow(() -> new ResourceNotFoundException("Role", "name", ERole.ROLE_USER));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role.toLowerCase()) {
                    case "admin":
                        Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", ERole.ROLE_ADMIN));
                        roles.add(adminRole);
                        break;
                    case "mod":
                        Role modRole = roleRepository.findByName(ERole.ROLE_MODERATOR)
                                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", ERole.ROLE_MODERATOR));
                        roles.add(modRole);
                        break;
                    default:
                        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", ERole.ROLE_USER));
                        roles.add(userRole);
                }
            });
        }
        user.setRoles(roles);
        User savedUser = userRepository.save(user);
        logger.info("User registered successfully: {}", savedUser.getUsername());
        return convertToDto(savedUser);
    }

    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtil.generateJwtToken(authentication);

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toList());

            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "username", userDetails.getUsername()));

            logger.info("User authenticated successfully: {}", user.getUsername());
            return new JwtResponse(jwt, user.getId(), user.getUsername(), user.getEmail(), roles);
        } catch (BadCredentialsException e) {
            logger.warn("Authentication failed for user {}: Invalid credentials", loginRequest.getUsername());
            throw new InvalidCredentialsException("Invalid username or password.");
        } catch (Exception e) {
            logger.error("Error during authentication for user {}: {}", loginRequest.getUsername(), e.getMessage());
            throw new RuntimeException("Authentication failed unexpectedly.", e);
        }
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return convertToDto(user);
    }

    private UserDTO convertToDto(User user) {
        Set<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());

        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roles,
                user.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME),
                user.getUpdatedAt().format(DateTimeFormatter.ISO_DATE_TIME)
        );
    }
}