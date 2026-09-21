from typing import List, Dict, Any

class ReadingOrderSorter:
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

            # Spans across the center line (e.g. Header, broad table, title)
            if x < mid_x - 50 and (x + w) > mid_x + 50:
                spanning.append(r)
            elif (x + w / 2.0) < mid_x:
                left_col.append(r)
            else:
                right_col.append(r)

        # If most regions fit into 2 columns, sort column by column
        is_two_column = len(left_col) >= 2 and len(right_col) >= 2

        if is_two_column:
            # Sort mid-page spanning banners and partition into vertical sections
            spanning_sorted = sorted(spanning, key=lambda item: item["bbox"][1])
            
            # Divide page into vertical slices based on spanning banners
            slices = []
            prev_y = 0
            for sp in spanning_sorted:
                sp_y = sp["bbox"][1]
                sp_h = sp["bbox"][3]
                # Elements above this banner
                slices.append({
                    "type": "SECTION",
                    "min_y": prev_y,
                    "max_y": sp_y,
                })
                # The banner itself
                slices.append({
                    "type": "BANNER",
                    "item": sp,
                    "min_y": sp_y,
                    "max_y": sp_y + sp_h
                })
                prev_y = sp_y + sp_h
            
            # Bottom section after last banner
            slices.append({
                "type": "SECTION",
                "min_y": prev_y,
                "max_y": 999999
            })

            ordered = []
            for sl in slices:
                if sl["type"] == "BANNER":
                    ordered.append(sl["item"])
                else:
                    l_in_sl = [r for r in left_col if sl["min_y"] <= r["bbox"][1] < sl["max_y"]]
                    r_in_sl = [r for r in right_col if sl["min_y"] <= r["bbox"][1] < sl["max_y"]]
                    ordered.extend(sorted(l_in_sl, key=lambda item: (item["bbox"][1], item["bbox"][0])))
                    ordered.extend(sorted(r_in_sl, key=lambda item: (item["bbox"][1], item["bbox"][0])))
        else:
            # Standard single column top-to-bottom sort with vertical band grouping
            ordered = sorted(regions, key=lambda item: (round(item["bbox"][1] / 15) * 15, item["bbox"][0]))

        # Assign 1-indexed reading order
        for idx, item in enumerate(ordered):
            item["reading_order"] = idx + 1

        return ordered

reading_order_sorter = ReadingOrderSorter()
