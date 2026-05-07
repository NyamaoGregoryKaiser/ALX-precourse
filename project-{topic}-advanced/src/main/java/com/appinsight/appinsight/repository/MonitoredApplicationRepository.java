package com.appinsight.appinsight.repository;

import com.appinsight.appinsight.model.MonitoredApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MonitoredApplicationRepository extends JpaRepository<MonitoredApplication, Long> {
    Optional<MonitoredApplication> findByName(String name);
    Optional<MonitoredApplication> findByApiKey(String apiKey);
    boolean existsByName(String name);
}