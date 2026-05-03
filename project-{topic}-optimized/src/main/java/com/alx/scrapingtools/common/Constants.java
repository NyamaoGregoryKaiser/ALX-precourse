package com.alx.scrapingtools.common;

public class Constants {
    public static final String ROLE_USER = "ROLE_USER";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";

    public static final String JOB_STATUS_PENDING = "PENDING";
    public static final String JOB_STATUS_RUNNING = "RUNNING";
    public static final String JOB_STATUS_COMPLETED = "COMPLETED";
    public static final String JOB_STATUS_FAILED = "FAILED";

    // Common messages
    public static final String RESOURCE_NOT_FOUND_MESSAGE = "Resource not found.";
    public static final String ACCESS_DENIED_MESSAGE = "Access denied. You do not have permission to perform this action.";

    private Constants() {
        // Prevent instantiation
    }
}