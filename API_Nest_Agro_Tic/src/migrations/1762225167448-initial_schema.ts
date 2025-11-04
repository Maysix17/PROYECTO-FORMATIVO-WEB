import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1762225167448 implements MigrationInterface {
    name = 'InitialSchema1762225167448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "productos" ALTER COLUMN "capacidadPresentacion" SET DEFAULT '1.00'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "productos" ALTER COLUMN "capacidadPresentacion" SET DEFAULT 1.00`);
    }

}
