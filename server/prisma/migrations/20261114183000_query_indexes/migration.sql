-- DropIndex
DROP INDEX "Employee_designation_idx";

-- DropIndex
DROP INDEX "Employee_employmentStatus_idx";

-- DropIndex
DROP INDEX "Employee_countryId_idx";

-- DropIndex
DROP INDEX "Employee_departmentId_idx";

-- DropIndex
DROP INDEX "Employee_firstName_idx";

-- DropIndex
DROP INDEX "Employee_lastName_firstName_idx";

-- DropIndex
DROP INDEX "Salary_effectiveTo_idx";

-- DropIndex
DROP INDEX "Salary_effectiveFrom_idx";

-- CreateIndex
CREATE INDEX "Employee_lastName_id_idx" ON "Employee"("lastName", "id");

-- CreateIndex
CREATE INDEX "Employee_firstName_id_idx" ON "Employee"("firstName", "id");

-- CreateIndex
CREATE INDEX "Employee_dateOfJoining_id_idx" ON "Employee"("dateOfJoining", "id");

-- CreateIndex
CREATE INDEX "Employee_departmentId_employmentStatus_idx" ON "Employee"("departmentId", "employmentStatus");

-- CreateIndex
CREATE INDEX "Employee_countryId_employmentStatus_idx" ON "Employee"("countryId", "employmentStatus");

-- CreateIndex
CREATE INDEX "Employee_employmentStatus_id_idx" ON "Employee"("employmentStatus", "id");

-- CreateIndex
CREATE INDEX "Employee_designation_id_idx" ON "Employee"("designation", "id");

-- CreateIndex
CREATE INDEX "Salary_amount_id_idx" ON "Salary"("amount", "id");

-- CreateIndex
CREATE INDEX "Salary_effectiveFrom_id_idx" ON "Salary"("effectiveFrom", "id");

-- CreateIndex
CREATE INDEX "Salary_effectiveTo_id_idx" ON "Salary"("effectiveTo", "id");

-- CreateIndex
CREATE INDEX "Salary_effectiveTo_currencyId_idx" ON "Salary"("effectiveTo", "currencyId");
