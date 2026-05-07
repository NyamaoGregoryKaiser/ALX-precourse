package com.appinsight.appinsight.repository;

import com.appinsight.appinsight.model.Metric;
import com.appinsight.appinsight.model.MetricData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MetricDataRepository extends JpaRepository<MetricData, Long> {
    // Find metric data for a specific metric within a time range
    List<MetricData> findByMetricAndTimestampBetweenOrderByTimestampAsc(Metric metric, LocalDateTime start, LocalDateTime end);

    // Find latest metric data for a given metric
    Optional<MetricData> findTopByMetricOrderByTimestampDesc(Metric metric);

    // Paginated retrieval for a metric
    Page<MetricData> findByMetricOrderByTimestampDesc(Metric metric, Pageable pageable);
}