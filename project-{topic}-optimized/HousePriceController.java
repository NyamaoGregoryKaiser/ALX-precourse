```java
package com.example.ml_utilities.controller;


import com.example.ml_utilities.model.HousePrice;
import com.example.ml_utilities.repository.HousePriceRepository;
import org.ejml.simple.SimpleMatrix;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/houseprices")
public class HousePriceController {

    @Autowired
    private HousePriceRepository housePriceRepository;

    @GetMapping
    public List<HousePrice> getAllHousePrices() {
        return housePriceRepository.findAll();
    }

    @PostMapping
    public HousePrice createHousePrice(@RequestBody HousePrice housePrice) {
        return housePriceRepository.save(housePrice);
    }

    // ... other CRUD methods ...
    @GetMapping("/predict")
    public double predictPrice(@RequestParam double size, @RequestParam int bedrooms) {
        //Simplified prediction - replace with your actual model
        return size * 1000 + bedrooms * 50000;
    }
}
```