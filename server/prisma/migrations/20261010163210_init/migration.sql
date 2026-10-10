-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "user_name" VARCHAR(50) NOT NULL,
    "password" VARCHAR(16) NOT NULL,
    "role" VARCHAR(8) NOT NULL DEFAULT 'user',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" SERIAL NOT NULL,
    "capacity" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "type_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "facility_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_locations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "facility_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_images" (
    "id" SERIAL NOT NULL,
    "facility_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,

    CONSTRAINT "facility_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "facility_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "status" VARCHAR(9) NOT NULL DEFAULT 'new',
    "description" VARCHAR(500) NOT NULL,
    "photo_report" TEXT NOT NULL,
    "reaseon" VARCHAR(500),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "report_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "facility_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6) NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_name_key" ON "users"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "reports_category_id_key" ON "reports"("category_id");

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "facility_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "facility_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_images" ADD CONSTRAINT "facility_images_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "report_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
