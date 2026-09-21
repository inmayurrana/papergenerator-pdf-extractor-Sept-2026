# PaperGen AI — High-Accuracy Offline Document Intelligence, Question Bank, Question Paper Designer & OMR Evaluation Platform

A complete, production-ready, offline-first educational platform optimized specifically for **low-end hardware (Intel Core i3 8th Gen, 8GB RAM, 4GB VRAM)**.

---

## Key Architecture & Design Principles

1. **Resource-Aware Sequential Processing**:
   - Sequential page-by-page rendering and extraction (max 1 heavy AI job at a time).
   - Immediate garbage collection and object destruction per page.
   - Target memory envelope: $\le 5.0$ GB, leaving headroom for the OS.
   - Idle unloader releases heavy model weights automatically after 180 seconds.
2. **Digital-First Text Extraction**:
   - Clean vector text is extracted directly from digital PDFs without redundant OCR overhead.
   - OpenCV preprocessing (deskewing, contrast enhancement, shadow removal) is applied adaptively.
3. **Domain-Specialized Content Recognition**:
   - **Mathematics**: AST and LaTeX normalizer for fractions, superscripts, subscripts, roots, integrals, matrices, summations, and KaTeX rendering.
   - **Chemistry**: Elements periodic lookup, molecular formula subscript formatting ($H_2SO_4$), ionic charges ($Fe^{3+}$, $SO_4^{2-}$), and reaction arrows ($\rightarrow$, $\rightleftharpoons$).
   - **Physics**: Units ($m/s^2$, $N$, $J$, $W$, $Pa$), constants, and scientific notation ($1.6 \times 10^{-19}$).
   - **Diagrams**: High-resolution bounding box cropping and label detection.
4. **Three-Panel Review Interface**:
   - **Left**: Original page image with interactive bounding box overlays, pan, and zoom.
   - **Center**: Editable question blocks with KaTeX math rendering, options, and diagram attachments.
   - **Right**: Confidence scorecard (Text, Math, Chem, Diagram, Overall), validation alerts, and 1-click Question Bank export.
5. **Visual Snipping Workspace**:
   - Interactive rectangle crop tool on page canvas.
   - Localized recognition (Math/Chem/Text/Diagram) on the isolated crop only without full document reprocessing.
6. **Hierarchical Question Bank**:
   - Taxonomy tree: `Class` $\rightarrow$ `Subject` $\rightarrow$ `Chapter` $\rightarrow$ `Topic` $\rightarrow$ `Question`.
   - RBAC / ABAC / ACL security enforcement (restricted questions never leak in duplicate detection or search).
   - Real-time duplicate question detection with privacy protection.
7. **Interactive Canvas Question Paper Designer**:
   - Drag, reorder, and position questions on canvas.
   - School name, logo, instructions, watermark, roll number box.
   - **Live Marks Validator**: Compares $CurrentQuestionMarks$ vs $MaxMarks$ (e.g. $76 \neq 80 \rightarrow$ warning) and blocks finalization until balanced.
   - **Immutable Snapshot Finalizer**: Freezes questions, options, formulas, marks, and answer key. Subsequent edits in the Question Bank will never alter finalized past exams.
8. **High-Precision OpenCV OMR System**:
   - Generates standard OMR answer sheets with 4 corner fiducial registration markers.
   - Evaluator performs four-point perspective warp and deskew.
   - Bubble darkness analysis detects single marked, blank, multiple marked, and borderline/uncertain responses.
   - Evaluates against the frozen snapshot answer key (calculates correct, incorrect, blank, raw marks, negative marks, final score, percentage).
   - Teacher manual review override mode for borderline bubble adjustments.

---

## Quick Start (Offline)

### Prerequisites
- Node.js (v18+)
- Python (Standalone embedded Python 3.11 pre-bundled in `python_env/`)

### Launch All Services
```powershell
powershell -ExecutionPolicy Bypass -File .\start_all.ps1
```

- **Frontend Application**: `http://localhost:3010`
- **Backend API**: `http://localhost:5010`
- **AI Microservice**: `http://localhost:8001`
- **Default Admin Account**:
  - Email: `admin@school.local`
  - Password: `Admin@12345`

---

## Running Verification Suite

```powershell
& ".\python_env\python.exe" verify_system.py
```
