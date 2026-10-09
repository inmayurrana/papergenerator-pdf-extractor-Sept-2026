from typing import List, Dict, Any

class ReadingOrderSorter:
    @staticmethod
    def _sort_section_reading_order(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sorts items within a column/section into reading lines by vertical overlap,
        then left-to-right within each line. Prevents mathematical formula heights
        (e.g. parenthesized powers or tall fractions) from jittering across boundaries.
        """
        if not items:
            return []

        sorted_by_y = sorted(items, key=lambda it: it["bbox"][1])
        lines: List[List[Dict[str, Any]]] = []
        for it in sorted_by_y:
            y0 = it["bbox"][1]
            y1 = y0 + it["bbox"][3]
            h = it["bbox"][3]
            placed = False
            for line in lines:
                ly0 = min(x["bbox"][1] for x in line)
                ly1 = max(x["bbox"][1] + x["bbox"][3] for x in line)
                lh = max(1, min(x["bbox"][3] for x in line))
                overlap = min(y1, ly1) - max(y0, ly0)
                min_h = min(h, lh)
                # Adaptive vertical grouping: lines only group together if vertical overlap is significant
                # or centers are within 35% of line height (prevents separate lines from collapsing)
                y_center_diff = abs((y0 + y1) / 2.0 - (ly0 + ly1) / 2.0)
                if overlap > 0.35 * min_h or y_center_diff < max(3.5, 0.35 * min_h):
                    line.append(it)
                    placed = True
                    break
            if not placed:
                lines.append([it])

        result = []
        lines.sort(key=lambda ln: min(x["bbox"][1] for x in ln))
        for ln in lines:
            ln.sort(key=lambda x: x["bbox"][0])
            result.extend(ln)
        return result

    @staticmethod
    def sort_regions(regions: List[Dict[str, Any]], page_width: int) -> List[Dict[str, Any]]:
        """Sorts regions into natural reading order, supporting single-column and two-column layouts."""
        if not regions:
            return []

        # Check if page has two distinct columns
        mid_x = page_width / 2.0
        left_col = []
        right_col = []
        spanning = []

        for r in regions:
            bbox = r.get("bbox", [0, 0, 0, 0])
            x, y, w, h = bbox[0], bbox[1], bbox[2], bbox[3]

            is_spanning = (x < mid_x - 50 and (x + w) > mid_x + 50)
            is_thin_banner = (h < 80 and w > page_width * 0.4)
            is_header_type = r.get("type") in ["HEADER", "BANNER", "TITLE", "SECTION"]

            # Only genuine thin horizontal dividers count as spanning banners
            if is_spanning and (is_thin_banner or is_header_type):
                spanning.append(r)
            elif (x + w / 2.0) < mid_x:
                left_col.append(r)
            else:
                right_col.append(r)

        # Check if page has true two distinct vertical columns:
        # Require multiple questions in BOTH columns (never trigger on horizontal options or formulas)
        left_q = [r for r in left_col if r.get("type") == "QUESTION"]
        right_q = [r for r in right_col if r.get("type") == "QUESTION"]
        left_wide = [r for r in left_col if r["bbox"][2] > page_width * 0.32]
        right_wide = [r for r in right_col if r["bbox"][2] > page_width * 0.32]

        is_two_column = (len(left_q) >= 2 and len(right_q) >= 2) or (len(left_wide) >= 5 and len(right_wide) >= 5 and len(right_q) >= 1)

        if is_two_column:
            banners_sorted = sorted(spanning, key=lambda item: item["bbox"][1])
            boundaries = [0] + [b["bbox"][1] for b in banners_sorted] + [float("inf")]

            ordered = []
            for i in range(len(boundaries) - 1):
                min_y = boundaries[i]
                max_y = boundaries[i + 1]

                l_sec = [r for r in left_col if min_y <= r["bbox"][1] < max_y]
                r_sec = [r for r in right_col if min_y <= r["bbox"][1] < max_y]

                ordered.extend(ReadingOrderSorter._sort_section_reading_order(l_sec))
                ordered.extend(ReadingOrderSorter._sort_section_reading_order(r_sec))

                if i < len(banners_sorted):
                    ordered.append(banners_sorted[i])
        else:
            # Standard single column top-to-bottom sort with visual line grouping
            ordered = ReadingOrderSorter._sort_section_reading_order(regions)

        # Invariant Guarantee: Never drop any region during sorting
        visited = set(id(item) for item in ordered)
        remaining = [item for item in regions if id(item) not in visited]
        if remaining:
            ordered.extend(sorted(remaining, key=lambda item: (item["bbox"][1], item["bbox"][0])))

        # Assign 1-indexed reading order
        for idx, item in enumerate(ordered):
            item["reading_order"] = idx + 1

        return ordered

reading_order_sorter = ReadingOrderSorter()
