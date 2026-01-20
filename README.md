# LOGOSPHERE
AI-driven system that makes doctrine intelligible.

**LOGOSPHERE** is an AI-native knowledge and assessment platform designed to model, examine, and explain doctrinal knowledge through structured data, reasoning, and retrieval-based intelligence.

At its core, LOGOSPHERE treats doctrine not as static text, but as a **living knowledge graph**: questions, answers, sources, and interpretations are explicitly modeled, linked, evaluated, and explained.

The system combines **PostgreSQL 16**, **JSONB**, and **pgvector** with **LLM-based reasoning** to support automated assessment, semantic search, and transparent explanation of answers — including *why* an answer is correct, not merely *which* answer is correct.

---

### Key Capabilities

LOGOSPHERE supports both **objective and reflective learning**:

* Structured exams (multiple-choice, fill-in, essay)
* Automatic grading for objective questions
* LLM-assisted grading for essays with explicit rationale
* Semantic similarity search across questions and doctrines
* Retrieval-Augmented Generation (RAG) explanations grounded in authoritative sources

Rather than relying on opaque AI output, every explanation in LOGOSPHERE is **traceable** to linked doctrinal or scriptural references.

---

### Knowledge Model

LOGOSPHERE organizes knowledge into four primary layers:

1. **Questions**
   Assessment units stored with flexible JSONB options and vector embeddings.

2. **Doctrines & Sources**
   Commandments, creeds, sacraments, catechism texts, and scriptural references, each modeled as first-class entities.

3. **Student Interaction**
   Answers, attempts, grading results, and feedback — including LLM rationale — are fully auditable.

4. **Reasoning Layer (RAG)**
   Context is retrieved from linked sources and embeddings before any explanation or evaluation is generated.

This architecture allows the system to explain answers, surface misunderstandings, and support guided learning rather than rote memorization.

---

### Design Principles

* **Explainability over authority**
  The system must justify conclusions, not merely assert them.

* **Faithful to sources, neutral in tone**
  Explanations are grounded in references without sermonizing.

* **AI as examiner, not oracle**
  LLMs assist reasoning and evaluation but do not define truth.

* **Schema-first, model-agnostic**
  The database structure remains stable regardless of which LLM is used.

---

### Intended Use Cases

* Catechetical education and assessment
* AI-assisted tutoring with doctrinal grounding
* Essay evaluation with transparent criteria
* Knowledge graph exploration and semantic search
* Research and comparative theology analysis

---

### Why LOGOSPHERE

Most educational systems can tell learners **what** is correct.
LOGOSPHERE is built to explain **why** it is correct — with sources, structure, and reasoning visible at every step.

In short, LOGOSPHERE is not an AI that *teaches dogma*.
It is a system that **makes doctrine intelligible**.
