import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'; // Unique name, TypeORM generates timestamp

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users Table
        await queryRunner.createTable(new Table({
            name: 'users',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()',
                },
                {
                    name: 'username',
                    type: 'varchar',
                    length: '50',
                    isUnique: true,
                    isNullable: false,
                },
                {
                    name: 'email',
                    type: 'varchar',
                    length: '255',
                    isUnique: true,
                    isNullable: false,
                },
                {
                    name: 'password',
                    type: 'varchar',
                    length: '255', // Hashed password length
                    isNullable: false,
                },
                {
                    name: 'isOnline',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);

        // Chat Rooms Table
        await queryRunner.createTable(new Table({
            name: 'chat_rooms',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()',
                },
                {
                    name: 'name',
                    type: 'varchar',
                    length: '100',
                    isNullable: true, // Private chats might not have a name
                },
                {
                    name: 'type',
                    type: 'enum',
                    enum: ['private', 'group'],
                    isNullable: false,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);

        // Chat Room Participants Table (Join table for User-ChatRoom Many-to-Many)
        await queryRunner.createTable(new Table({
            name: 'chat_room_participants',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()',
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'chatRoomId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'joinedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);

        await queryRunner.createForeignKey('chat_room_participants', new TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));

        await queryRunner.createForeignKey('chat_room_participants', new TableForeignKey({
            columnNames: ['chatRoomId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'chat_rooms',
            onDelete: 'CASCADE',
        }));

        // Add unique constraint for userId and chatRoomId to prevent duplicate participants
        await queryRunner.createUniqueConstraint('chat_room_participants', {
            columnNames: ['userId', 'chatRoomId'],
            name: 'UQ_chat_room_participant_user_room'
        });

        // Messages Table
        await queryRunner.createTable(new Table({
            name: 'messages',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()',
                },
                {
                    name: 'chatRoomId',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'senderId',
                    type: 'uuid',
                    isNullable: true, // If sender is deleted, message remains but sender is null
                },
                {
                    name: 'content',
                    type: 'text',
                    isNullable: false,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'readAt',
                    type: 'timestamp',
                    isNullable: true,
                },
            ],
        }), true);

        await queryRunner.createForeignKey('messages', new TableForeignKey({
            columnNames: ['chatRoomId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'chat_rooms',
            onDelete: 'CASCADE',
        }));

        await queryRunner.createForeignKey('messages', new TableForeignKey({
            columnNames: ['senderId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
        }));

        // Message Read By Users (Join table for Message-User Many-to-Many)
        await queryRunner.createTable(new Table({
            name: 'message_read_by_users',
            columns: [
                {
                    name: 'messageId',
                    type: 'uuid',
                    isPrimary: true,
                },
                {
                    name: 'userId',
                    type: 'uuid',
                    isPrimary: true,
                },
            ],
        }), true);

        await queryRunner.createForeignKey('message_read_by_users', new TableForeignKey({
            columnNames: ['messageId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'messages',
            onDelete: 'CASCADE',
        }));

        await queryRunner.createForeignKey('message_read_by_users', new TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('message_read_by_users');
        await queryRunner.dropTable('messages');
        await queryRunner.dropTable('chat_room_participants');
        await queryRunner.dropTable('chat_rooms');
        await queryRunner.dropTable('users');
    }
}