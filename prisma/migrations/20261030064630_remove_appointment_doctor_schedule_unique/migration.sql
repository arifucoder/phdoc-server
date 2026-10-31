-- DropIndex
DROP INDEX "appointments_doctorId_scheduleId_key";

-- CreateIndex
CREATE INDEX "idx_appointment_doctorId" ON "appointments"("doctorId");
