-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "estimated_distance" DECIMAL(10,2),
ADD COLUMN     "estimated_duration" INTEGER,
ADD COLUMN     "pricing_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "estimated_delivery_hours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "free_distance_km" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
ADD COLUMN     "free_weight_kg" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "price_per_kg" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "price_per_km" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "pricing_version" INTEGER NOT NULL DEFAULT 1;
