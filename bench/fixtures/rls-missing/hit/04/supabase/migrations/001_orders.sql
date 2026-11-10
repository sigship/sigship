CREATE TABLE "Orders" (
  "id" SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL,
  "total" NUMERIC(10,2)
);
