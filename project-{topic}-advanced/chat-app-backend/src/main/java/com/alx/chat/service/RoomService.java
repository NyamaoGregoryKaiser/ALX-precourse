```java
package com.alx.chat.service;

import com.alx.chat.dto.room.CreateRoomRequest;
import com.alx.chat.dto.room.RoomDto;
import com.alx.chat.entity.Room;
import com.alx.chat.entity.User;
import com.alx.chat.exception.AccessDeniedException;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.exception.RoomAlreadyExistsException;
import com.alx.chat.mapper.RoomMapper;
import com.alx.chat.repository.RoomRepository;
import com.alx.chat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomMapper roomMapper;

    @Transactional
    public RoomDto createRoom(CreateRoomRequest request, Long creatorId) {
        if (roomRepository.existsByName(request.getName())) {
            throw new RoomAlreadyExistsException("Room with name '" + request.getName() + "' already exists.");
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Creator user not found with ID: " + creatorId));

        Room room = Room.builder()
                .name(request.getName())
                .description(request.getDescription())
                .creator(creator)
                .build();

        room.getMembers().add(creator); // Creator automatically joins the room
        Room savedRoom = roomRepository.save(room);
        return roomMapper.toDto(savedRoom);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "rooms", key = "#roomId")
    public RoomDto getRoomById(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));
        return roomMapper.toDto(room);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "rooms", key = "'allRooms' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public Page<RoomDto> getAllRooms(Pageable pageable) {
        return roomRepository.findAll(pageable).map(roomMapper::toDto);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "rooms", key = "'userRooms' + #userId + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public Page<RoomDto> getRoomsByUserId(Long userId, Pageable pageable) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }
        return roomRepository.findByMemberId(userId, pageable).map(roomMapper::toDto);
    }

    @Transactional
    @CacheEvict(value = "rooms", key = "#roomId") // Evict room from cache
    @CacheEvict(value = "rooms", key = "'allRooms*'", allEntries = true) // Evict allRooms cache
    @CacheEvict(value = "rooms", key = "'userRooms*'", allEntries = true) // Evict userRooms cache
    public void deleteRoom(Long roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));

        if (!room.getCreator().getId().equals(userId)) {
            throw new AccessDeniedException("Only the creator can delete this room.");
        }
        roomRepository.delete(room);
    }

    @Transactional
    @CachePut(value = "rooms", key = "#roomId") // Update room in cache
    @CacheEvict(value = "rooms", key = "'allRooms*'", allEntries = true) // Evict allRooms cache
    @CacheEvict(value = "rooms", key = "'userRooms*'", allEntries = true) // Evict userRooms cache
    public RoomDto joinRoom(Long roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (!room.getMembers().add(user)) {
            throw new IllegalArgumentException("User is already a member of this room.");
        }
        Room updatedRoom = roomRepository.save(room);
        return roomMapper.toDto(updatedRoom);
    }

    @Transactional
    @CachePut(value = "rooms", key = "#roomId") // Update room in cache
    @CacheEvict(value = "rooms", key = "'allRooms*'", allEntries = true) // Evict allRooms cache
    @CacheEvict(value = "rooms", key = "'userRooms*'", allEntries = true) // Evict userRooms cache
    public RoomDto leaveRoom(Long roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (!room.getMembers().remove(user)) {
            throw new IllegalArgumentException("User is not a member of this room.");
        }
        Room updatedRoom = roomRepository.save(room);
        return roomMapper.toDto(updatedRoom);
    }
}
```