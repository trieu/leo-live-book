-- =========================================================
-- LOGOSPHERE DATABASE SCHEMA
-- PostgreSQL 16+
-- =========================================================

-- ---------- EXTENSIONS ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================
-- USER PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,                  -- optional (SSO, LMS, etc)
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON user_profiles (role);

-- =========================================================
-- EXAM QUESTIONS
-- READY FOR catechism_exam_GL-DT105_full.csv
-- =========================================================
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  exam_code TEXT NOT NULL,
  part_id TEXT NOT NULL,
  part_title TEXT NOT NULL,

  question_number INT NOT NULL,
  question_type TEXT NOT NULL CHECK (
    question_type IN ('single_choice', 'fill_blank', 'essay')
  ),

  question_text TEXT NOT NULL,

  -- options stored as JSONB
  -- example:
  -- { "A": "...", "B": "...", "C": "...", "D": "..." }
  options JSONB,

  correct_answer TEXT,                -- "A", "B", "C", "D" or NULL for essay

  reference TEXT,
  notes TEXT,

  embedding VECTOR(1536),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (exam_code, question_number)
);

-- ---------- INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam
  ON exam_questions (exam_code, part_id);

CREATE INDEX IF NOT EXISTS idx_exam_questions_type
  ON exam_questions (question_type);

CREATE INDEX IF NOT EXISTS idx_exam_questions_embedding
  ON exam_questions
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =========================================================
-- DOCTRINES / SOURCES
-- =========================================================
CREATE TABLE IF NOT EXISTS doctrines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  type TEXT NOT NULL CHECK (
    type IN ('commandment', 'creed', 'sacrament', 'scripture', 'catechism')
  ),

  code TEXT,                 -- e.g. DR4, CREED-INCARNATION
  title TEXT NOT NULL,
  description TEXT,

  embedding VECTOR(1536),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctrines_type
  ON doctrines (type);

CREATE INDEX IF NOT EXISTS idx_doctrines_embedding
  ON doctrines
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =========================================================
-- QUESTION ↔ DOCTRINE (N:N)
-- =========================================================
CREATE TABLE IF NOT EXISTS question_doctrines (
  question_id UUID NOT NULL
    REFERENCES exam_questions(id) ON DELETE CASCADE,

  doctrine_id UUID NOT NULL
    REFERENCES doctrines(id) ON DELETE CASCADE,

  PRIMARY KEY (question_id, doctrine_id)
);

CREATE INDEX IF NOT EXISTS idx_question_doctrines_doctrine
  ON question_doctrines (doctrine_id);

-- =========================================================
-- STUDENT ANSWERS
-- =========================================================
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL
    REFERENCES user_profiles(id) ON DELETE CASCADE,

  exam_code TEXT NOT NULL,

  question_id UUID NOT NULL
    REFERENCES exam_questions(id) ON DELETE CASCADE,

  attempt_no INT DEFAULT 1,

  -- raw answers
  answer_choice TEXT,          -- "A", "B", "C", "D"
  answer_text TEXT,            -- essay / fill blank

  -- grading
  is_correct BOOLEAN,
  score NUMERIC(5,2),

  grading_method TEXT CHECK (
    grading_method IN ('auto', 'llm', 'manual')
  ),

  llm_feedback TEXT,
  llm_rationale TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ
);

-- ---------- INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_student_answers_student
  ON student_answers (student_id);

CREATE INDEX IF NOT EXISTS idx_student_answers_exam
  ON student_answers (exam_code);

CREATE INDEX IF NOT EXISTS idx_student_answers_question
  ON student_answers (question_id);

CREATE INDEX IF NOT EXISTS idx_student_answers_grading
  ON student_answers (grading_method);

-- =========================================================
-- END OF SCHEMA
-- =========================================================
