import os
import sys
from pathlib import Path
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

DATA_DIR = Path(__file__).resolve().parent / "data" / "uploads"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def generate_sample_exam_pdf():
    doc = fitz.open()

    # Page 1: Mathematics & Physics Examination
    page1 = doc.new_page(width=595, height=842) # A4 size

    # Header
    page1.insert_text((150, 40), "ST. XAVIER SENIOR SECONDARY SCHOOL", fontsize=14, fontname="helv")
    page1.insert_text((180, 60), "ANNUAL EXAMINATION - 2026", fontsize=12, fontname="helv")
    page1.insert_text((50, 80), "Subject: Science & Mathematics (Class 10)     Max Marks: 80     Time: 3 Hours", fontsize=9, fontname="helv")

    # Q1: Math Quadratic Equation
    page1.insert_text((50, 120), "Q1. Find the roots of the quadratic equation ax^2 + bx + c = 0 using the quadratic formula x = (-b +- sqrt(b^2 - 4ac)) / (2a). [3 Marks]", fontsize=10, fontname="helv")
    page1.insert_text((70, 140), "(A) x = (-b +- sqrt(D))/(2a)", fontsize=9, fontname="helv")
    page1.insert_text((70, 155), "(B) x = (-b +- D)/(2a)", fontsize=9, fontname="helv")
    page1.insert_text((70, 170), "(C) x = (b +- sqrt(D))/(a)", fontsize=9, fontname="helv")
    page1.insert_text((70, 185), "(D) x = -b / (2a)", fontsize=9, fontname="helv")

    # Q2: Chemistry Reaction
    page1.insert_text((50, 220), "Q2. Balance the following chemical reaction: 2H2 + O2 -> 2H2O. Name the precipitate formed when BaCl2 reacts with H2SO4. [2 Marks]", fontsize=10, fontname="helv")
    page1.insert_text((70, 240), "(A) BaSO4 (White Precipitate)", fontsize=9, fontname="helv")
    page1.insert_text((70, 255), "(B) HCl gas", fontsize=9, fontname="helv")
    page1.insert_text((70, 270), "(C) BaO", fontsize=9, fontname="helv")
    page1.insert_text((70, 285), "(D) SO2", fontsize=9, fontname="helv")

    # Q3: Physics Newton Law & Scientific Notation
    page1.insert_text((50, 320), "Q3. An electron with charge q = 1.6 x 10^-19 C moves in a magnetic field. State Newton's second law F = ma and calculate force when m = 2 kg, a = 5 m/s^2. [3 Marks]", fontsize=10, fontname="helv")
    page1.insert_text((70, 340), "(A) 10 N", fontsize=9, fontname="helv")
    page1.insert_text((70, 355), "(B) 2.5 N", fontsize=9, fontname="helv")
    page1.insert_text((70, 370), "(C) 7 N", fontsize=9, fontname="helv")
    page1.insert_text((70, 385), "(D) 20 N", fontsize=9, fontname="helv")

    # Draw a sample circuit / geometry diagram rectangle on page 1
    shape = page1.new_shape()
    shape.draw_rect(fitz.Rect(70, 420, 250, 540))
    shape.finish(color=(0, 0, 0), fill=(0.95, 0.95, 0.95), width=1.5)
    page1.insert_text((100, 480), "Circuit Diagram [Figure 1]", fontsize=10, fontname="helv")
    shape.commit()

    sample_pdf_path = DATA_DIR / "sample_exam_paper.pdf"
    doc.save(str(sample_pdf_path))
    doc.close()
    print(f"Sample examination PDF generated at: {sample_pdf_path}")
    return sample_pdf_path

if __name__ == "__main__":
    generate_sample_exam_pdf()
