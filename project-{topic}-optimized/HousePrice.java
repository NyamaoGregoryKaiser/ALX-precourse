```java
package com.example.ml_utilities.model;

import lombok.Data;

import javax.persistence.*;

@Entity
@Data
public class HousePrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private double size;
    private int bedrooms;
    private double price;
}
```