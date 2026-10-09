-- Free isolated PostgreSQL migration rehearsal. Synthetic records only.
-- No Supabase credentials, no production data, no production DDL.
BEGIN;
CREATE SCHEMA IF NOT EXISTS papi_v2_test;
CREATE TABLE papi_v2_test.progress (
 actor_key text NOT NULL,
 chapter int NOT NULL CONSTRAINT progress_chapter_check CHECK(chapter BETWEEN 0 AND 39),
 cursor int NOT NULL DEFAULT 0 CHECK(cursor BETWEEN 0 AND 10),
 completed boolean NOT NULL DEFAULT false,
 version int NOT NULL DEFAULT 0,
 xp int NOT NULL DEFAULT 0,
 gold int NOT NULL DEFAULT 0,
 energy int NOT NULL DEFAULT 10,
 PRIMARY KEY(actor_key,chapter)
);
INSERT INTO papi_v2_test.progress (actor_key,chapter,cursor,completed,version,xp,gold,energy)
VALUES ('student-a',8,5,false,4,370,92,7),('student-b',0,10,true,12,240,16,4);
DO $$ BEGIN
 IF (SELECT count(*) FROM papi_v2_test.progress)!=2 THEN RAISE EXCEPTION 'Fixture did not load'; END IF;
END $$;
ALTER TABLE papi_v2_test.progress DROP CONSTRAINT progress_chapter_check;
ALTER TABLE papi_v2_test.progress ADD CONSTRAINT progress_chapter_check CHECK(chapter BETWEEN 0 AND 79);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM papi_v2_test.progress WHERE (actor_key='student-a' AND (cursor!=5 OR version!=4 OR xp!=370 OR gold!=92 OR energy!=7))
 OR (actor_key='student-b' AND (cursor!=10 OR version!=12 OR xp!=240 OR gold!=16 OR energy!=4))) THEN
  RAISE EXCEPTION 'Student fixture fields changed';
 END IF;
END $$;
INSERT INTO papi_v2_test.progress (actor_key,chapter) VALUES ('student-a',79);
DO $$ BEGIN
 BEGIN
  INSERT INTO papi_v2_test.progress (actor_key,chapter) VALUES ('student-a',80);
  RAISE EXCEPTION 'Chapter 80 accepted unexpectedly';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM papi_v2_test.progress WHERE actor_key='student-a')!=2 THEN
  RAISE EXCEPTION 'Unexpected progress rows';
 END IF;
END $$;
ROLLBACK;
SELECT 'Papi V2 isolated PostgreSQL constraint rehearsal passed' AS result;
