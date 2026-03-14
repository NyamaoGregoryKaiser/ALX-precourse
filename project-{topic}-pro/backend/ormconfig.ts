import { DataSource } from "typeorm";
import { config } from "./src/config/env";
import { User } from "./src/entities/user.entity";
import { Workspace } from "./src/entities/workspace.entity";
import { Project } from "./src/entities/project.entity";
import { Task } from "./src/entities/task.entity";
import { Comment } from "./src/entities/comment.entity";
import { Tag } from "./src/entities/tag.entity";

// This file is specifically for TypeORM CLI to run migrations.
// It uses commonjs because ts-node is configured to use it for cli commands.
// It directly uses config.DATABASE_URL from the env.ts for consistency.

export const AppDataSource = new DataSource({
    type: "postgres",
    url: config.DATABASE_URL,
    synchronize: false, // Never synchronize in CLI or production
    logging: true,
    entities: [User, Workspace, Project, Task, Comment, Tag],
    migrations: [__dirname + "/src/migrations/**/*.ts"],
    subscribers: [],
});

export default AppDataSource;