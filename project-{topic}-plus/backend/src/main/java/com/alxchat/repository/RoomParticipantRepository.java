package com.alxchat.repository;

import com.alxchat.model.ChatRoom;
import com.alxchat.model.RoomParticipant;
import com.alxchat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {
    boolean existsByRoomAndUser(ChatRoom room, User user);
    Optional<RoomParticipant> findByRoomAndUser(ChatRoom room, User user);
}