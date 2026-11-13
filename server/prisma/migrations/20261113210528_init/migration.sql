/*
  Warnings:

  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Leave` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payroll` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `createdAt` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `baseSalary` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `joiningDate` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Employee` table. All the data in the column will be lost.
  - Added the required column `countryId` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateOfJoining` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Attendance_employeeId_date_key";

-- DropIndex
DROP INDEX "Attendance_date_idx";

-- DropIndex
DROP INDEX "Leave_employeeId_status_idx";

-- DropIndex
DROP INDEX "Payroll_employeeId_month_year_key";

-- DropIndex
DROP INDEX "Payroll_year_month_idx";

-- DropIndex
DROP INDEX "User_employeeId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Attendance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Leave";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Payroll";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minorUnitDigits" INTEGER NOT NULL DEFAULT 2
);

-- CreateTable
CREATE TABLE "Salary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    CONSTRAINT "Salary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Salary_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalaryRevision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "salaryId" INTEGER NOT NULL,
    "previousAmount" INTEGER NOT NULL,
    "updatedAmount" INTEGER NOT NULL,
    "previousCurrencyId" INTEGER NOT NULL,
    "updatedCurrencyId" INTEGER NOT NULL,
    "changeReason" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalaryRevision_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalaryRevision_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "Salary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalaryRevision_previousCurrencyId_fkey" FOREIGN KEY ("previousCurrencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalaryRevision_updatedCurrencyId_fkey" FOREIGN KEY ("updatedCurrencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Department" ("id", "name") SELECT "id", "name" FROM "Department";
DROP TABLE "Department";
ALTER TABLE "new_Department" RENAME TO "Department";
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfJoining" DATETIME NOT NULL,
    "designation" TEXT NOT NULL,
    "employmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "countryId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    CONSTRAINT "Employee_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("departmentId", "designation", "email", "employeeCode", "employmentStatus", "firstName", "id", "lastName", "phone") SELECT "departmentId", "designation", "email", "employeeCode", "employmentStatus", "firstName", "id", "lastName", "phone" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE INDEX "Employee_lastName_firstName_idx" ON "Employee"("lastName", "firstName");
CREATE INDEX "Employee_firstName_idx" ON "Employee"("firstName");
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");
CREATE INDEX "Employee_countryId_idx" ON "Employee"("countryId");
CREATE INDEX "Employee_employmentStatus_idx" ON "Employee"("employmentStatus");
CREATE INDEX "Employee_designation_idx" ON "Employee"("designation");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE INDEX "Country_name_idx" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Salary_employeeId_idx" ON "Salary"("employeeId");

-- CreateIndex
CREATE INDEX "Salary_currencyId_idx" ON "Salary"("currencyId");

-- CreateIndex
CREATE INDEX "Salary_effectiveFrom_idx" ON "Salary"("effectiveFrom");

-- CreateIndex
CREATE INDEX "Salary_effectiveTo_idx" ON "Salary"("effectiveTo");

-- CreateIndex
CREATE INDEX "Salary_employeeId_effectiveFrom_idx" ON "Salary"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SalaryRevision_employeeId_idx" ON "SalaryRevision"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryRevision_salaryId_idx" ON "SalaryRevision"("salaryId");

-- CreateIndex
CREATE INDEX "SalaryRevision_changedAt_idx" ON "SalaryRevision"("changedAt");

-- CreateIndex
CREATE INDEX "SalaryRevision_previousCurrencyId_idx" ON "SalaryRevision"("previousCurrencyId");

-- CreateIndex
CREATE INDEX "SalaryRevision_updatedCurrencyId_idx" ON "SalaryRevision"("updatedCurrencyId");
