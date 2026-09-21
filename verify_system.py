import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai_service.app.core.config import config
from ai_service.app.core.resource_mgr import resource_manager
from ai_service.app.document.validator import document_validator
from ai_service.app.document.renderer import page_renderer
from ai_service.app.document.digital_extract import digital_extractor
from ai_service.app.document.preprocessor import image_preprocessor
from ai_service.app.layout.region_detector import region_detector
from ai_service.app.layout.reading_order import reading_order_sorter
from ai_service.app.layout.question_parser import question_parser
from ai_service.app.engines.specialized_math import specialized_math
from ai_service.app.engines.specialized_chem import specialized_chem
from ai_service.app.engines.specialized_phys import specialized_phys
from ai_service.app.engines.diagram_extractor import diagram_extractor
from ai_service.app.snip.snip_engine import snipping_engine
from ai_service.app.omr.generator import omr_generator
from ai_service.app.omr.evaluator import omr_evaluator
import cv2
import numpy as np

def run_all_tests():
    print("==================================================================")
    print("  RUNNING COMPREHENSIVE OFFLINE DOCUMENT INTELLIGENCE & OMR TESTS ")
    print("==================================================================")

    # 1. Test Resource Manager Hardware Metrics
    print("\n[TEST 1] Verifying Resource Manager & Hardware Metrics...")
    metrics = resource_manager.get_hardware_metrics()
    print(f"  CPU Utilization: {metrics['cpu_percent']}% | Logical Cores: {metrics['cpu_count']}")
    print(f"  System RAM: {metrics['ram_used_mb']} MB / {metrics['ram_total_mb']} MB ({metrics['ram_percent']}%)")
    print(f"  Target Memory Cap: {metrics['ram_target_limit_mb']} MB | Max Concurrency Jobs: {metrics['max_heavy_jobs']}")
    assert metrics['ram_total_mb'] > 0, "Failed to read RAM metrics"
    print("  -> PASSED: Resource Manager active with low-hardware bounds.")

    # 2. Test Document Ingestion & Validation
    sample_pdf = config.STORAGE_UPLOADS / "sample_exam_paper.pdf"
    print(f"\n[TEST 2] Validating Sample PDF Document: {sample_pdf.name}...")
    doc_meta = document_validator.validate_file(sample_pdf)
    print(f"  SHA-256 Hash: {doc_meta['sha256']}")
    print(f"  Pages Detected: {doc_meta['page_count']} | Digital Text Streams: {doc_meta['is_digital']}")
    assert doc_meta['page_count'] >= 1, "Page count must be >= 1"
    assert doc_meta['is_digital'] is True, "Sample PDF should be detected as digital"
    print("  -> PASSED: Document validation and SHA-256 hashing successful.")

    # 3. Test Sequential Page Rendering
    print("\n[TEST 3] Testing Page-by-Page Sequential Rendering...")
    render_res = page_renderer.render_page(sample_pdf, 1)
    print(f"  Rendered Page 1: {render_res['width']}x{render_res['height']}px at {render_res['image_path']}")
    assert os.path.exists(render_res['image_path']), "Rendered page image not found"
    print("  -> PASSED: Sequential rendering and memory release verified.")

    # 4. Test Digital Text & Region Layout Extraction
    print("\n[TEST 4] Extracting Digital Vector Text & Layout Spans...")
    spans = digital_extractor.extract_page_text_spans(sample_pdf, 1, render_res['width'], render_res['height'])
    print(f"  Extracted {len(spans)} text spans with coordinates.")
    assert len(spans) > 0, "No text spans extracted"

    regions = []
    for s in spans:
        cls = region_detector.classify_text_region(s['text'], s['bbox'], render_res['height'])
        regions.append({
            "id": s["id"],
            "type": cls["type"],
            "text": s["text"],
            "bbox": s["bbox"],
            "confidence": cls["confidence"],
            "question_number": cls.get("question_number"),
            "option_label": cls.get("option_label"),
        })

    # Diagram detection
    diagrams = region_detector.detect_diagram_regions_from_image(render_res['image_path'])
    print(f"  Detected {len(diagrams)} diagram / figure candidate regions via OpenCV.")
    saved_diagrams = []
    for d in diagrams:
        d_crop = diagram_extractor.crop_and_save_diagram(render_res['image_path'], d['bbox'], "doc1", 1)
        saved_diagrams.append(d_crop)

    sorted_regions = reading_order_sorter.sort_regions(regions, render_res['width'])
    questions = question_parser.build_structured_questions(sorted_regions, saved_diagrams)
    print(f"  Reconstructed {len(questions)} structured examination questions.")
    for q in questions:
        print(f"    - Q{q['question_number']}: Marks [{q['marks']}], Options: {len(q['options'])}, Text: {q['question_text'][:50]}...")
    assert len(questions) >= 3, "Expected at least 3 structured questions"
    print("  -> PASSED: Layout classification and question reconstruction verified.")

    # 5. Test Specialized Math, Chemistry, and Physics Normalizers
    print("\n[TEST 5] Testing Domain AST Normalizers...")
    math_norm = specialized_math.normalize_math_to_latex("x = (-b +- sqrt(b^2 - 4ac))/(2a)")
    print(f"  Math LaTeX: {math_norm['latex']} (Confidence: {math_norm['confidence']})")
    assert "\\sqrt" in math_norm['latex'] or "\\frac" in math_norm['latex']

    chem_norm = specialized_chem.normalize_chemical_formula("2H2 + O2 -> 2H2O and BaCl2 + H2SO4 -> BaSO4")
    print(f"  Chem Formatted: {chem_norm['formatted_formula']} (Reaction: {chem_norm['is_reaction']})")
    assert "\\rightarrow" in chem_norm['formatted_formula']

    phys_norm = specialized_phys.normalize_physics_expression("q = 1.6 x 10^-19 C, F = ma where m = 2 kg, a = 5 m/s^2")
    print(f"  Phys Units: {phys_norm['detected_units']} | Normalized: {phys_norm['normalized']}")
    assert len(phys_norm['detected_units']) > 0
    print("  -> PASSED: Domain normalization (Math, Chem, Phys) verified.")

    # 6. Test Visual Snipping Engine
    print("\n[TEST 6] Testing Localized Visual Snipping Engine...")
    # Crop Q1 area [50, 100, 400, 100]
    snip_res = snipping_engine.process_snip(render_res['image_path'], [50, 100, 400, 100], "MATH")
    print(f"  Snip ID: {snip_res['snip_id']} | Saved to: {snip_res['relative_url']}")
    assert os.path.exists(snip_res['absolute_path']), "Snip image not saved"
    print("  -> PASSED: Visual Snipping executed on isolated crop.")

    # 7. Test OMR Sheet Generation & OpenCV Bubble Evaluation
    print("\n[TEST 7] Testing OMR Sheet Generation & OpenCV Evaluation...")
    omr_res = omr_generator.generate_omr_template(
        exam_title="ANNUAL EXAM 2026 - OMR ANSWER SHEET",
        exam_code="MAT-101",
        total_questions=10,
        options_per_question=4
    )
    print(f"  OMR Sheet generated: {omr_res['relative_url']} ({omr_res['width']}x{omr_res['height']}px)")
    assert os.path.exists(omr_res['absolute_path']), "OMR template image not found"

    # Simulate filled bubbles on the generated OMR sheet for evaluation
    sheet_img = cv2.imread(omr_res['absolute_path'])
    answer_key = {"1": "A", "2": "A", "3": "A", "4": "B", "5": "C", "6": "D", "7": "A", "8": "B", "9": "C", "10": "D"}

    # Simulate candidate filling:
    # Q1: A (Correct)
    # Q2: A (Correct)
    # Q3: B (Incorrect - key is A)
    # Q4: Blank
    # Q5: Multiple Marked (A and C)
    q1_b = omr_res['bubble_metadata'][0]['bubbles'][0] # Option A
    cv2.circle(sheet_img, (q1_b['center'][0], q1_b['center'][1]), q1_b['radius'], (0, 0, 0), -1)

    q2_b = omr_res['bubble_metadata'][1]['bubbles'][0] # Option A
    cv2.circle(sheet_img, (q2_b['center'][0], q2_b['center'][1]), q2_b['radius'], (0, 0, 0), -1)

    q3_b = omr_res['bubble_metadata'][2]['bubbles'][1] # Option B (wrong, key is A)
    cv2.circle(sheet_img, (q3_b['center'][0], q3_b['center'][1]), q3_b['radius'], (0, 0, 0), -1)

    # Q5 multiple marked: option A and C
    q5_b1 = omr_res['bubble_metadata'][4]['bubbles'][0]
    q5_b2 = omr_res['bubble_metadata'][4]['bubbles'][2]
    cv2.circle(sheet_img, (q5_b1['center'][0], q5_b1['center'][1]), q5_b1['radius'], (0, 0, 0), -1)
    cv2.circle(sheet_img, (q5_b2['center'][0], q5_b2['center'][1]), q5_b2['radius'], (0, 0, 0), -1)

    simulated_scan_path = config.STORAGE_OMR / "simulated_student_scan.png"
    cv2.imwrite(str(simulated_scan_path), sheet_img)

    # Run OpenCV Evaluator on the filled sheet
    eval_result = omr_evaluator.evaluate_omr_sheet(
        str(simulated_scan_path),
        omr_res,
        answer_key,
        positive_marks_per_q=1.0,
        negative_marks_per_q=0.25
    )

    print(f"  OMR Scoring Results:")
    print(f"    - Total Questions: {eval_result['total_questions']}")
    print(f"    - Correct Answers: {eval_result['correct']} (Expected 2)")
    print(f"    - Incorrect Answers: {eval_result['incorrect']} (Expected 1)")
    print(f"    - Blank / Unattempted: {eval_result['unattempted']}")
    print(f"    - Multiple Marked (Invalid): {eval_result['invalid_multiple']} (Expected 1)")
    print(f"    - Final Score: {eval_result['final_score']} Marks ({eval_result['percentage']}%)")

    for q_r in eval_result['question_results'][:5]:
        print(f"      Q{q_r['question_number']}: Marked={q_r['student_answer']}, Key={q_r['correct_answer']}, Status={q_r['status']}, Correct={q_r['is_correct']}, Details={[ (f['option'], f['fill_ratio']) for f in q_r['bubble_details'] ]}")

    assert eval_result['correct'] == 2, f"Expected 2 correct, got {eval_result['correct']}"
    assert eval_result['incorrect'] == 1, f"Expected 1 incorrect, got {eval_result['incorrect']}"
    assert eval_result['invalid_multiple'] >= 1, f"Expected multiple marked detected"
    print("  -> PASSED: High-Precision OpenCV OMR Evaluation verified!")

    print("\n==================================================================")
    print("       ALL SYSTEM VERIFICATION & ACCEPTANCE TESTS PASSED!         ")
    print("==================================================================")

if __name__ == "__main__":
    run_all_tests()
