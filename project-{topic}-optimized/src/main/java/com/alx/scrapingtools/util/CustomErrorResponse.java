package com.alx.scrapingtools.util;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomErrorResponse {
    private int status;
    private String message;
    private OffsetDateTime timestamp;
    // private String path; // Could be added by a filter or handler manually if needed
}