package com.appinsight.appinsight.model;

public enum MetricType {
    GAUGE,          // A single numerical value that can go up and down
    COUNTER,        // A cumulative metric that only ever goes up
    HISTOGRAM,      // Samples observations and counts them in configurable buckets
    SUMMARY         // Similar to histogram, but calculates configurable quantiles over a sliding time window
}