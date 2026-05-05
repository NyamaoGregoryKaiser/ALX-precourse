package com.alxchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoomDTO {
    @NotBlank(message = "Room name cannot be blank")
    @Size(min = 3, max = 100, message = "Room name must be between 3 and 100 characters")
    private String name;
}