package com.alxchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NewMessageDTO {
    @NotBlank(message = "Message content cannot be blank")
    @Size(min = 1, max = 1000, message = "Message content must be between 1 and 1000 characters")
    private String content;
    private Long roomId;
}