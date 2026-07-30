CREATE TABLE IF NOT EXISTS provinces (
    PROVINCE_ID int NOT NULL,
    PROVINCE_CODE varchar(20) NULL,
    PROVINCE_NAME varchar(255) NULL,
    GEO_ID int NULL,
    PRIMARY KEY (PROVINCE_ID)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS district (
    DISTRICT_ID int NOT NULL,
    DISTRICT_CODE varchar(20) NULL,
    DISTRICT_NAME varchar(255) NULL,
    GEO_ID int NULL,
    PROVINCE_ID int NULL,
    PRIMARY KEY (DISTRICT_ID),
    INDEX ix_district_province_id (PROVINCE_ID)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subdistrict (
    SUB_DISTRICT_ID int NOT NULL,
    SUB_DISTRICT_CODE varchar(20) NULL,
    SUB_DISTRICT_NAME varchar(255) NULL,
    DISTRICT_ID int NULL,
    PROVINCE_ID int NULL,
    GEO_ID int NULL,
    PRIMARY KEY (SUB_DISTRICT_ID),
    INDEX ix_subdistrict_district_id (DISTRICT_ID),
    INDEX ix_subdistrict_province_id (PROVINCE_ID)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS zip_code (
    ZIPCODE_ID int NULL,
    SUB_DISTRICT_CODE varchar(20) NULL,
    PROVINCE_ID int NULL,
    DISTRICT_ID int NULL,
    SUB_DISTRICT_ID int NULL,
    ZIPCODE varchar(10) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
