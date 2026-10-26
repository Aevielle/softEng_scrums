CREATE TABLE IF NOT EXISTS "CUSTOMER" (
                                          "custNo" VARCHAR(10) PRIMARY KEY,
    "custName" VARCHAR(100) NOT NULL,
    "address" VARCHAR(200),
    "payTerms" VARCHAR(20) DEFAULT 'Net 30',
    "status" VARCHAR(8) NOT NULL DEFAULT 'Active',
    "stamp" VARCHAR(80)
    );

CREATE TABLE IF NOT EXISTS "PRODUCT" (
                                         "prodCode" VARCHAR(10) PRIMARY KEY,
    "description" VARCHAR(150) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "status" VARCHAR(8) NOT NULL DEFAULT 'Active',
    "stamp" VARCHAR(80)
    );

CREATE TABLE IF NOT EXISTS "EMPLOYEE" (
                                          "empNo" VARCHAR(10) PRIMARY KEY,
    "lastName" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "gender" CHAR(1),
    "birthDate" DATE,
    "hireDate" DATE NOT NULL,
    "sepDate" DATE,
    "status" VARCHAR(8) NOT NULL DEFAULT 'Active',
    "stamp" VARCHAR(80)
    );