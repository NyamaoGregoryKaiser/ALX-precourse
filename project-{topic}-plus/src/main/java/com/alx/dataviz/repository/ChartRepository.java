```java
package com.alx.dataviz.repository;

import com.alx.dataviz.model.Chart;
import com.alx.dataviz.model.Dashboard;
import com.alx.dataviz.model.DataSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChartRepository extends JpaRepository<Chart, Long> {
    List<Chart> findByDashboard(Dashboard dashboard);
    List<Chart> findByDataSource(DataSource dataSource);
}
```