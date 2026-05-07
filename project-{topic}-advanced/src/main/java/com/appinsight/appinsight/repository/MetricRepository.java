package com.appinsight.appinsight.repository;

import com.appinsight.appinsight.model.Metric;
import com.appinsight.appinsight.model.MonitoredApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MetricRepository extends JpaRepository<Metric, Long> {
    Optional<Metric> findByNameAndApplication(String name, MonitoredApplication application);
    List<Metric> findByApplication(MonitoredApplication application);
    boolean existsByNameAndApplicationId(String name, Long applicationId);
}