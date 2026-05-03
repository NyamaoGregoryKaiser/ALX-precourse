package com.alx.scraper.dto;

import lombok.Data;

import java.util.Set;

@Data
public class UserDTO {
    private Long id;
    private String name;
    private String username;
    private String email;
    private Set<String> roles;
}