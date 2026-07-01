-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'WAITING_PICKUP', 'PICKUP_ASSIGNED', 'PICKING', 'PICK_FAILED', 'PICKED_UP', 'ARRIVED_ORIGIN_FACILITY', 'READY_FOR_DISPATCH');

-- CreateEnum
CREATE TYPE "OrderChangeSource" AS ENUM ('SYSTEM', 'CUSTOMER', 'DRIVER', 'ADMIN', 'API');

-- CreateEnum
CREATE TYPE "FeePayer" AS ENUM ('SENDER', 'RECEIVER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'E_WALLET', 'COD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_TRANSIT', 'AT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNING');

-- CreateEnum
CREATE TYPE "ShipmentEventType" AS ENUM ('CREATED', 'DRIVER_ASSIGNED', 'DEPARTED_FACILITY', 'ARRIVED_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERY_SUCCESS', 'DELIVERY_FAIL', 'RETURN_STARTED', 'EXCEPTION_OCCURRED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'ARRIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriverEmploymentStatus" AS ENUM ('ACTIVE', 'OFFLINE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VehicleOperatingStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteStopType" AS ENUM ('PICKUP', 'HUB', 'DELIVERY');

-- CreateEnum
CREATE TYPE "RouteStopStatus" AS ENUM ('PENDING', 'ARRIVED', 'DEPARTED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "DispatchTaskType" AS ENUM ('ASSIGN_ROUTE', 'REASSIGN_ROUTE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "DispatchTaskStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OptimizationStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TrackingEventType" AS ENUM ('PICKED_UP', 'ARRIVED_HUB', 'DEPARTED_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('SYSTEM', 'DRIVER_APP', 'WAREHOUSE_APP', 'API');

-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('INBOUND', 'OUTBOUND', 'DELIVERY', 'INVENTORY', 'SORTING');

-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('PHOTO', 'SIGNATURE', 'OTP', 'FAILED_DELIVERY');

-- CreateEnum
CREATE TYPE "DeliveryResult" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "DeliveryFailureReason" AS ENUM ('RECIPIENT_UNAVAILABLE', 'INCORRECT_ADDRESS', 'RECIPIENT_REJECTED', 'FORCE_MAJEURE', 'OTHER');

-- CreateEnum
CREATE TYPE "AttachmentFileType" AS ENUM ('PHOTO', 'SIGNATURE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "SettingCategory" AS ENUM ('AI', 'ROUTING', 'GPS', 'SYSTEM', 'MOBILE', 'BUSINESS');

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "service_code" VARCHAR(30) NOT NULL,
    "service_name" VARCHAR(100) NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_code" VARCHAR(30) NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "service_id" UUID NOT NULL,
    "pickup_address_id" UUID,
    "sender_contact_id" UUID,
    "sender_name" VARCHAR(150) NOT NULL,
    "sender_phone" VARCHAR(20) NOT NULL,
    "pickup_address_text" TEXT NOT NULL,
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "delivery_address_id" UUID,
    "receiver_contact_id" UUID,
    "receiver_name" VARCHAR(150) NOT NULL,
    "receiver_phone" VARCHAR(20) NOT NULL,
    "delivery_address_text" TEXT NOT NULL,
    "delivery_latitude" DOUBLE PRECISION NOT NULL,
    "delivery_longitude" DOUBLE PRECISION NOT NULL,
    "shipping_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "insurance_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "cod_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "estimated_delivery_date" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "package_code" VARCHAR(30) NOT NULL,
    "weight" DECIMAL(8,2) NOT NULL,
    "length" DECIMAL(6,2) NOT NULL,
    "width" DECIMAL(6,2) NOT NULL,
    "height" DECIMAL(6,2) NOT NULL,
    "volume" DECIMAL(10,4) NOT NULL,
    "is_fragile" BOOLEAN NOT NULL DEFAULT false,
    "temperature_requirement" VARCHAR(50),
    "required_vehicle_type_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "shipping_fee" DECIMAL(12,2) NOT NULL,
    "insurance_fee" DECIMAL(12,2) NOT NULL,
    "cod_amount" DECIMAL(12,2) NOT NULL,
    "fee_payer" "FeePayer" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changed_by_user_id" UUID,
    "change_source" "OrderChangeSource" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "shipment_code" VARCHAR(30) NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "route_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_packages" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "event_type" "ShipmentEventType" NOT NULL,
    "facility_id" UUID,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "event_time" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "notes" TEXT,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_transfers" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "from_facility_id" UUID NOT NULL,
    "to_facility_id" UUID NOT NULL,
    "status" "TransferStatus" NOT NULL,
    "dispatched_at" TIMESTAMPTZ,
    "arrived_at" TIMESTAMPTZ,
    "received_by" UUID,

    CONSTRAINT "shipment_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "employee_code" VARCHAR(30) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "driver_license_number" VARCHAR(50) NOT NULL,
    "driver_license_class" VARCHAR(10) NOT NULL,
    "hire_date" DATE NOT NULL,
    "employment_status" "DriverEmploymentStatus" NOT NULL,
    "home_facility_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "vehicle_code" VARCHAR(30) NOT NULL,
    "license_plate" VARCHAR(20) NOT NULL,
    "vehicle_type_id" UUID NOT NULL,
    "home_facility_id" UUID,
    "max_weight" DECIMAL(10,2) NOT NULL,
    "max_volume" DECIMAL(10,4) NOT NULL,
    "max_length" DECIMAL(6,2),
    "refrigeration_supported" BOOLEAN NOT NULL DEFAULT false,
    "gps_device_id" VARCHAR(100),
    "operating_status" "VehicleOperatingStatus" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_types" (
    "id" UUID NOT NULL,
    "type_code" VARCHAR(30) NOT NULL,
    "type_name" VARCHAR(100) NOT NULL,
    "max_default_weight" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_vehicle_assignments" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "assigned_from" TIMESTAMPTZ NOT NULL,
    "assigned_to" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "driver_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_locations" (
    "driver_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "heading" REAL,
    "speed" REAL,
    "accuracy" REAL,
    "recorded_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "route_code" VARCHAR(30) NOT NULL,
    "driver_vehicle_assignment_id" UUID NOT NULL,
    "start_facility_id" UUID NOT NULL,
    "end_facility_id" UUID,
    "optimization_id" UUID,
    "planned_distance_km" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "actual_distance_km" DECIMAL(10,2),
    "planned_duration_min" INTEGER NOT NULL DEFAULT 0,
    "actual_duration_min" INTEGER,
    "total_stops" INTEGER NOT NULL DEFAULT 0,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "planned_start_at" TIMESTAMPTZ NOT NULL,
    "actual_start_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "shipment_id" UUID,
    "facility_id" UUID,
    "stop_type" "RouteStopType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "address_snapshot" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "planned_arrival_at" TIMESTAMPTZ,
    "actual_arrival_at" TIMESTAMPTZ,
    "planned_departure_at" TIMESTAMPTZ,
    "actual_departure_at" TIMESTAMPTZ,
    "status" "RouteStopStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_tasks" (
    "id" UUID NOT NULL,
    "task_code" VARCHAR(30) NOT NULL,
    "route_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "assigned_to" UUID NOT NULL,
    "task_type" "DispatchTaskType" NOT NULL,
    "priority" SMALLINT NOT NULL DEFAULT 1,
    "status" "DispatchTaskStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "dispatch_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_location_logs" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed_mps" DECIMAL(5,2),
    "heading_degrees" DECIMAL(5,2),
    "accuracy_meters" DECIMAL(5,2),
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_location_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_optimizations" (
    "id" UUID NOT NULL,
    "algorithm_name" VARCHAR(50) NOT NULL,
    "algorithm_version" VARCHAR(20),
    "input_shipment_count" INTEGER NOT NULL,
    "output_route_count" INTEGER NOT NULL,
    "total_distance_km" DECIMAL(10,2) NOT NULL,
    "estimated_duration_min" INTEGER NOT NULL,
    "execution_time_ms" INTEGER NOT NULL,
    "fitness_score" DECIMAL(8,4),
    "optimization_status" "OptimizationStatus" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "route_stop_id" UUID,
    "event_type" "TrackingEventType" NOT NULL,
    "event_source" "EventSource" NOT NULL DEFAULT 'SYSTEM',
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_by" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_scans" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "package_id" UUID,
    "route_stop_id" UUID,
    "facility_id" UUID,
    "scanned_by" UUID NOT NULL,
    "scan_type" "ScanType" NOT NULL,
    "barcode_value" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcode_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_proofs" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "route_stop_id" UUID NOT NULL,
    "proof_type" "ProofType" NOT NULL,
    "delivery_result" "DeliveryResult" NOT NULL,
    "receiver_name" VARCHAR(150),
    "receiver_phone" VARCHAR(20),
    "failure_reason" "DeliveryFailureReason",
    "verified_latitude" DOUBLE PRECISION,
    "verified_longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_check_ins" (
    "id" UUID NOT NULL,
    "route_stop_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "check_in_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_at" TIMESTAMPTZ,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "note" TEXT,

    CONSTRAINT "driver_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_attachments" (
    "id" UUID NOT NULL,
    "delivery_proof_id" UUID NOT NULL,
    "file_type" "AttachmentFileType" NOT NULL,
    "storage_provider" VARCHAR(30) NOT NULL DEFAULT 'S3',
    "object_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" BIGINT,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT NOT NULL,
    "value_type" "SettingValueType" NOT NULL,
    "category" "SettingCategory" NOT NULL,
    "description" TEXT,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_service_code_key" ON "services"("service_code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE INDEX "idx_orders_customer" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "packages_package_code_key" ON "packages"("package_code");

-- CreateIndex
CREATE INDEX "idx_packages_order" ON "packages"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_payments_order_id_key" ON "order_payments"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_hist_order" ON "order_status_history"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_code_key" ON "shipments"("shipment_code");

-- CreateIndex
CREATE INDEX "idx_shipments_status" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "idx_shp_pkg_package" ON "shipment_packages"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_packages_shipment_id_package_id_key" ON "shipment_packages"("shipment_id", "package_id");

-- CreateIndex
CREATE INDEX "idx_shipment_events_ship" ON "shipment_events"("shipment_id");

-- CreateIndex
CREATE INDEX "idx_shp_trans_ship" ON "shipment_transfers"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_employee_code_key" ON "drivers"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_phone_key" ON "drivers"("phone");

-- CreateIndex
CREATE INDEX "idx_drivers_status" ON "drivers"("employment_status");

-- CreateIndex
CREATE INDEX "idx_drivers_home" ON "drivers"("home_facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicle_code_key" ON "vehicles"("vehicle_code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE INDEX "idx_vehicles_type" ON "vehicles"("vehicle_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_type_code_key" ON "vehicle_types"("type_code");

-- CreateIndex
CREATE INDEX "idx_dva_driver_active" ON "driver_vehicle_assignments"("driver_id");

-- CreateIndex
CREATE INDEX "idx_dva_vehicle_active" ON "driver_vehicle_assignments"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_drv_loc_coords" ON "driver_locations"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "routes_route_code_key" ON "routes"("route_code");

-- CreateIndex
CREATE INDEX "idx_routes_dva" ON "routes"("driver_vehicle_assignment_id");

-- CreateIndex
CREATE INDEX "idx_routes_status" ON "routes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_route_id_sequence_key" ON "route_stops"("route_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_tasks_task_code_key" ON "dispatch_tasks"("task_code");

-- CreateIndex
CREATE INDEX "idx_disp_tasks_driver" ON "dispatch_tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "idx_disp_tasks_status" ON "dispatch_tasks"("status");

-- CreateIndex
CREATE INDEX "idx_route_loc_route" ON "route_location_logs"("route_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "idx_track_events_shipment" ON "tracking_events"("shipment_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_barcode_scans_value" ON "barcode_scans"("barcode_value");

-- CreateIndex
CREATE INDEX "idx_barcode_scans_shipment" ON "barcode_scans"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_proofs_shipment_id_key" ON "delivery_proofs"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_proofs_route_stop_id_key" ON "delivery_proofs"("route_stop_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_check_ins_route_stop_id_key" ON "driver_check_ins"("route_stop_id");

-- CreateIndex
CREATE INDEX "idx_track_attach_proof" ON "tracking_attachments"("delivery_proof_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_setting_key_key" ON "system_settings"("setting_key");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_address_id_fkey" FOREIGN KEY ("pickup_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sender_contact_id_fkey" FOREIGN KEY ("sender_contact_id") REFERENCES "customer_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_receiver_contact_id_fkey" FOREIGN KEY ("receiver_contact_id") REFERENCES "customer_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_required_vehicle_type_id_fkey" FOREIGN KEY ("required_vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_from_facility_id_fkey" FOREIGN KEY ("from_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_to_facility_id_fkey" FOREIGN KEY ("to_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_transfers" ADD CONSTRAINT "shipment_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_home_facility_id_fkey" FOREIGN KEY ("home_facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_home_facility_id_fkey" FOREIGN KEY ("home_facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_driver_vehicle_assignment_id_fkey" FOREIGN KEY ("driver_vehicle_assignment_id") REFERENCES "driver_vehicle_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_start_facility_id_fkey" FOREIGN KEY ("start_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_end_facility_id_fkey" FOREIGN KEY ("end_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_optimization_id_fkey" FOREIGN KEY ("optimization_id") REFERENCES "route_optimizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_tasks" ADD CONSTRAINT "dispatch_tasks_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_tasks" ADD CONSTRAINT "dispatch_tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_tasks" ADD CONSTRAINT "dispatch_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_location_logs" ADD CONSTRAINT "route_location_logs_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_route_stop_id_fkey" FOREIGN KEY ("route_stop_id") REFERENCES "route_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_route_stop_id_fkey" FOREIGN KEY ("route_stop_id") REFERENCES "route_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_route_stop_id_fkey" FOREIGN KEY ("route_stop_id") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_check_ins" ADD CONSTRAINT "driver_check_ins_route_stop_id_fkey" FOREIGN KEY ("route_stop_id") REFERENCES "route_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_check_ins" ADD CONSTRAINT "driver_check_ins_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_attachments" ADD CONSTRAINT "tracking_attachments_delivery_proof_id_fkey" FOREIGN KEY ("delivery_proof_id") REFERENCES "delivery_proofs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
