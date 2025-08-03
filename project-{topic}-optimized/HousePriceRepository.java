```java
package com.example.ml_utilities.repository;

import com.example.ml_utilities.model.HousePrice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HousePriceRepository extends JpaRepository<HousePrice, Long> {
}
```