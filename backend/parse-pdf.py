import os
import time
import json
import re
import pandas as pd
import PyPDF2
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# --- Configuration ---
# Note: Ensure your API key has access to this model. 
LLM_MODEL_ID = 'gemini-2.5-flash-lite'

PDF_PATH = "/home/thomas/Documents/MBA Marketing/Statistics_with_Python.pdf"
CSV_OUTPUT_PATH = "statistics_exercises.csv"
BOOK_NAME = "Statistics with Python. 100 solved exercises for Data Analysis"
BOOK_ID = "stats_py_malato_2025"
BATCH_SIZE = 10  # Slightly smaller batch to allow more room for "Full Text" in the response

# Initialize Gemini Client
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def extract_pdf_pages(pdf_path):
    """Extracts all pages and returns a list of (page_num, text) tuples."""
    pages = []
    if not os.path.exists(pdf_path):
        return []
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            # Clean up text for the LLM
            clean_text = re.sub(r'\s+', ' ', text).strip()
            pages.append((i + 1, clean_text))
    return pages

def process_batch_with_gemini(batch_pages, last_context):
    """
    Sends a batch of pages to Gemini to extract structural info and full exercise text.
    """
    
    batch_input = []
    for num, text in batch_pages:
        batch_input.append(f"--- PAGE {num} ---\n{text}")
    
    pages_text = "\n\n".join(batch_input)

    prompt = f"""
    You are a data extraction expert. Analyze these {len(batch_pages)} pages from a statistics book.
    
    CONTEXT FROM PREVIOUS PAGES:
    - Last Chapter: "{last_context['chapter']}"
    - Last Section: "{last_context['section']}"

    TASK:
    Identify Chapters, Sections, and Exercises.
    For each Exercise found:
    1. Capture the 'title' (e.g., "Exercise 1").
    2. Capture the 'full_text_summary' (The actual question, data, or task described in the exercise).

    JSON STRUCTURE RULES:
    - Return an array of objects (one per page).
    - 'new_chapter' and 'new_section' should be the title string if it starts on that page.
    - 'exercises' is an array of objects containing 'title' and 'full_text_summary'.
    """

    response_schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "page_number": {"type": "INTEGER"},
                "new_chapter": {"type": "STRING", "nullable": True},
                "new_section": {"type": "STRING", "nullable": True},
                "exercises": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "title": {"type": "STRING"},
                            "full_text_summary": {"type": "STRING"}
                        },
                        "required": ["title", "full_text_summary"]
                    }
                }
            },
            "required": ["page_number", "new_chapter", "new_section", "exercises"]
        }
    }

    try:
        response = client.models.generate_content(
            model=LLM_MODEL_ID,
            contents=[prompt, pages_text],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.1
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in batch processing: {e}")
        return []

def main():
    if not os.path.exists(PDF_PATH):
        print(f"File {PDF_PATH} not found.")
        return

    print(f"Reading PDF...")
    all_pages = extract_pdf_pages(PDF_PATH)
    total_pages = len(all_pages)
    
    data_rows = []
    current_context = {"chapter": "Introduction", "section": "General"}

    print(f"Starting Batch Processing (Batch Size: {BATCH_SIZE})...")

    for i in range(0, total_pages, BATCH_SIZE):
        batch = all_pages[i : i + BATCH_SIZE]
        print(f"Processing pages {batch[0][0]} to {batch[-1][0]}...")
        
        results = process_batch_with_gemini(batch, current_context)
        
        for res in results:
            # Update running context
            if res.get('new_chapter'):
                current_context['chapter'] = res['new_chapter']
                current_context['section'] = "General"
            
            if res.get('new_section'):
                current_context['section'] = res['new_section']
            
            # Process exercises with full text
            for ex_obj in res.get('exercises', []):
                data_rows.append({
                    "book_name": BOOK_NAME,
                    "book_id": BOOK_ID,
                    "chapter_name": current_context['chapter'],
                    "section_name": current_context['section'],
                    "exercise": ex_obj.get('title'),
                    "exercise_summary": ex_obj.get('full_text_summary'),
                    "page_number": res['page_number']
                })
        
        time.sleep(0.5) # Avoid hitting rate limits

    if data_rows:
        df = pd.DataFrame(data_rows)
        # Final cleanup for CSV/DB compatibility
        df = df.replace({'\n': ' ', '\r': ' '}, regex=True)
        
        output_columns = [
            'book_name', 'book_id', 'chapter_name', 
            'section_name', 'exercise', 'exercise_summary', 'page_number'
        ]
        df = df[output_columns]
        
        df.to_csv(CSV_OUTPUT_PATH, index=False)
        print(f"\nSuccess! Created {CSV_OUTPUT_PATH} with {len(df)} exercises.")
        print(df[['exercise', 'exercise_summary']].head())
    else:
        print("No data extracted.")

if __name__ == "__main__":
    main()