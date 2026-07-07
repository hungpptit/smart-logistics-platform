-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "ward_code" VARCHAR(20);

-- CreateTable
CREATE TABLE "administrative_regions" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "code_name" VARCHAR(255),
    "code_name_en" VARCHAR(255),

    CONSTRAINT "administrative_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administrative_units" (
    "id" INTEGER NOT NULL,
    "full_name" VARCHAR(255),
    "full_name_en" VARCHAR(255),
    "short_name" VARCHAR(255),
    "short_name_en" VARCHAR(255),
    "code_name" VARCHAR(255),
    "code_name_en" VARCHAR(255),

    CONSTRAINT "administrative_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255),
    "full_name" VARCHAR(255) NOT NULL,
    "full_name_en" VARCHAR(255),
    "code_name" VARCHAR(255),
    "administrative_unit_id" INTEGER,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "wards" (
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255),
    "full_name" VARCHAR(255),
    "full_name_en" VARCHAR(255),
    "code_name" VARCHAR(255),
    "province_code" VARCHAR(20),
    "administrative_unit_id" INTEGER,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_ward_code_fkey" FOREIGN KEY ("ward_code") REFERENCES "wards"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_administrative_unit_id_fkey" FOREIGN KEY ("administrative_unit_id") REFERENCES "administrative_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_administrative_unit_id_fkey" FOREIGN KEY ("administrative_unit_id") REFERENCES "administrative_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
