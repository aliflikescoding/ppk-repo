-- Bcrypt hashes contain 60 characters.
ALTER TABLE "users" ALTER COLUMN "password" TYPE VARCHAR(60);
