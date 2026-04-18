```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class InitialSchema1701000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Users Table
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "username",
                    type: "varchar",
                    length: "50",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "email",
                    type: "varchar",
                    length: "255",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "password",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "role",
                    type: "enum",
                    enum: ["admin", "member", "guest"],
                    default: "'member'"
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Projects Table
        await queryRunner.createTable(new Table({
            name: "projects",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "status",
                    type: "varchar",
                    length: "50",
                    default: "'active'"
                },
                {
                    name: "ownerId",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Foreign Key for Projects.ownerId
        await queryRunner.createForeignKey("projects", new TableForeignKey({
            columnNames: ["ownerId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        // Unique index for Projects (ownerId, name)
        await queryRunner.createIndex("projects", new TableIndex({
            name: "IDX_PROJECT_OWNER_NAME",
            columnNames: ["ownerId", "name"],
            isUnique: true
        }));

        // Tasks Table
        await queryRunner.createTable(new Table({
            name: "tasks",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "title",
                    type: "varchar",
                    length: "500",
                    isNullable: false
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["to-do", "in-progress", "under-review", "completed", "blocked"],
                    default: "'to-do'"
                },
                {
                    name: "priority",
                    type: "enum",
                    enum: ["low", "medium", "high", "urgent"],
                    default: "'medium'"
                },
                {
                    name: "dueDate",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "projectId",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "assigneeId",
                    type: "uuid",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Foreign Keys for Tasks
        await queryRunner.createForeignKey("tasks", new TableForeignKey({
            columnNames: ["projectId"],
            referencedColumnNames: ["id"],
            referencedTableName: "projects",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("tasks", new TableForeignKey({
            columnNames: ["assigneeId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL" // If an assignee is deleted, set task assignee to NULL
        }));

        // Indexes for Tasks
        await queryRunner.createIndex("tasks", new TableIndex({
            name: "IDX_TASK_PROJECT_STATUS",
            columnNames: ["projectId", "status"]
        }));
        await queryRunner.createIndex("tasks", new TableIndex({
            name: "IDX_TASK_ASSIGNEE_STATUS",
            columnNames: ["assigneeId", "status"]
        }));
        await queryRunner.createIndex("tasks", new TableIndex({
            name: "IDX_TASK_DUEDATE",
            columnNames: ["dueDate"]
        }));


        // Comments Table
        await queryRunner.createTable(new Table({
            name: "comments",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    default: "gen_random_uuid()"
                },
                {
                    name: "content",
                    type: "text",
                    isNullable: false
                },
                {
                    name: "authorId",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "taskId",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Foreign Keys for Comments
        await queryRunner.createForeignKey("comments", new TableForeignKey({
            columnNames: ["authorId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("comments", new TableForeignKey({
            columnNames: ["taskId"],
            referencedColumnNames: ["id"],
            referencedTableName: "tasks",
            onDelete: "CASCADE"
        }));

        // Index for Comments (taskId, createdAt)
        await queryRunner.createIndex("comments", new TableIndex({
            name: "IDX_COMMENT_TASK_CREATED",
            columnNames: ["taskId", "createdAt"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first
        const projectsTable = await queryRunner.getTable("projects");
        const tasksTable = await queryRunner.getTable("tasks");
        const commentsTable = await queryRunner.getTable("comments");

        const fkProjectOwner = projectsTable?.foreignKeys.find(fk => fk.columnNames.indexOf("ownerId") !== -1);
        if (fkProjectOwner) await queryRunner.dropForeignKey("projects", fkProjectOwner);

        const fkTaskProject = tasksTable?.foreignKeys.find(fk => fk.columnNames.indexOf("projectId") !== -1);
        if (fkTaskProject) await queryRunner.dropForeignKey("tasks", fkTaskProject);

        const fkTaskAssignee = tasksTable?.foreignKeys.find(fk => fk.columnNames.indexOf("assigneeId") !== -1);
        if (fkTaskAssignee) await queryRunner.dropForeignKey("tasks", fkTaskAssignee);

        const fkCommentAuthor = commentsTable?.foreignKeys.find(fk => fk.columnNames.indexOf("authorId") !== -1);
        if (fkCommentAuthor) await queryRunner.dropForeignKey("comments", fkCommentAuthor);

        const fkCommentTask = commentsTable?.foreignKeys.find(fk => fk.columnNames.indexOf("taskId") !== -1);
        if (fkCommentTask) await queryRunner.dropForeignKey("comments", fkCommentTask);

        // Drop indexes
        await queryRunner.dropIndex("projects", "IDX_PROJECT_OWNER_NAME");
        await queryRunner.dropIndex("tasks", "IDX_TASK_PROJECT_STATUS");
        await queryRunner.dropIndex("tasks", "IDX_TASK_ASSIGNEE_STATUS");
        await queryRunner.dropIndex("tasks", "IDX_TASK_DUEDATE");
        await queryRunner.dropIndex("comments", "IDX_COMMENT_TASK_CREATED");

        // Drop tables
        await queryRunner.dropTable("comments");
        await queryRunner.dropTable("tasks");
        await queryRunner.dropTable("projects");
        await queryRunner.dropTable("users");
    }
}
```