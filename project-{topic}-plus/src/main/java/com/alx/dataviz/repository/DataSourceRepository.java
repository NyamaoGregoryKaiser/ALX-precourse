```java
package com.alx.dataviz.repository;

import com.alx.dataviz.model.DataSource;
import com.alx.dataviz.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DataSourceRepository extends JpaRepository<DataSource, Long> {
    List<DataSource> findByOwner(User owner);
}
```