```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000'; // Unique name, usually timestamp based

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Table: User
    await queryRunner.query(`
            CREATE TYPE "user_roles_enum" AS ENUM('admin', 'user', 'service_owner');
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "username" character varying(50) NOT NULL,
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "roles" user_roles_enum array NOT NULL DEFAULT '{user}',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_username" ON "user" ("username") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_email" ON "user" ("email") `);

    // Table: Service
    await queryRunner.query(`
            CREATE TABLE "service" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "description" text,
                "apiKey" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a03004838618e47854be7a7a13d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_service_name" ON "service" ("name") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_service_apiKey" ON "service" ("apiKey") `);
    await queryRunner.query(`
            ALTER TABLE "service" ADD CONSTRAINT "FK_service_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Table: MetricDefinition
    await queryRunner.query(`
            CREATE TYPE "metric_definition_type_enum" AS ENUM(
                'latency', 'error_rate', 'throughput', 'cpu_usage', 'memory_usage', 'custom_gauge', 'custom_counter'
            );
            CREATE TABLE "metric_definition" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "serviceId" uuid NOT NULL,
                "name" character varying(100) NOT NULL,
                "type" metric_definition_type_enum NOT NULL DEFAULT 'custom_gauge',
                "unit" character varying,
                "thresholds" jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_metric_definition_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_metric_definition_service_name" ON "metric_definition" ("serviceId", "name") `);
    await queryRunner.query(`
            ALTER TABLE "metric_definition" ADD CONSTRAINT "FK_metric_definition_serviceId" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Table: DataPoint
    await queryRunner.query(`
            CREATE TABLE "data_point" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "metricDefinitionId" uuid NOT NULL,
                "value" double precision NOT NULL,
                "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
                "metadata" jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_data_point_id" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_data_point_metric_timestamp" ON "data_point" ("metricDefinitionId", "timestamp") `);
    await queryRunner.query(`
            ALTER TABLE "data_point" ADD CONSTRAINT "FK_data_point_metricDefinitionId" FOREIGN KEY ("metricDefinitionId") REFERENCES "metric_definition"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Enable uuid-ossp extension for uuid_generate_v4 if not already enabled
    // Note: This might need to be run as a superuser if the current user doesn't have privileges
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "data_point" DROP CONSTRAINT "FK_data_point_metricDefinitionId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_data_point_metric_timestamp"`);
    await queryRunner.query(`DROP TABLE "data_point"`);

    await queryRunner.query(`ALTER TABLE "metric_definition" DROP CONSTRAINT "FK_metric_definition_serviceId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_metric_definition_service_name"`);
    await queryRunner.query(`DROP TABLE "metric_definition"`);
    await queryRunner.query(`DROP TYPE "metric_definition_type_enum"`);

    await queryRunner.query(`ALTER TABLE "service" DROP CONSTRAINT "FK_service_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_service_apiKey"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_service_name"`);
    await queryRunner.query(`DROP TABLE "service"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_user_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_username"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "user_roles_enum"`);

    // Optionally drop uuid-ossp extension if it was installed by this migration,
    // but usually it's left as it might be used by other parts of the DB.
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp";`);
  }
}
```