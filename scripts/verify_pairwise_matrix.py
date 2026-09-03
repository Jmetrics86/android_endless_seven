#!/usr/bin/env python3
"""
scripts/verify_pairwise_matrix.py
---------------------------------
Comprehensive adversarial verification script for docs/card_pairwise_matchup_matrix.md.
Audits:
1. Exact 42x42 (1,764) combinatorial completeness and uniqueness.
2. Table-to-detail matchup consistency.
3. Reciprocal consistency & asymmetry analysis (including Step B initiative).
4. 6x6 Faction aggregate matrix math, row/column/grand totals, and Part I stats.
5. Markdown formatting, syntax validity, unclosed tags, and undefined values.
"""

import sys
import os
import re
from collections import Counter, defaultdict

MATRIX_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'docs', 'card_pairwise_matchup_matrix.md'))

def main():
    print(f"Loading matrix document from: {MATRIX_PATH}")
    if not os.path.exists(MATRIX_PATH):
        print(f"FAIL: File not found: {MATRIX_PATH}")
        sys.exit(1)

    with open(MATRIX_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.splitlines()

    print(f"Loaded {len(lines):,} lines, {len(content):,} characters.")

    errors = []
    warnings = []

    # =========================================================================
    # CHECK 1: Markdown Syntax & Integrity
    # =========================================================================
    print("\n--- CHECK 1: Markdown Syntax & Integrity ---")
    
    # Check for unclosed details tags
    open_details = content.count("<details>")
    close_details = content.count("</details>")
    print(f"Details tags: <details> count = {open_details}, </details> count = {close_details}")
    if open_details != close_details:
        errors.append(f"Mismatched <details> tags: {open_details} open vs {close_details} close")
    if open_details != 36:
        warnings.append(f"Expected 36 <details> sections (one per faction pair), found {open_details}")

    # Check for undefined, null, None, NaN, [object Object]
    bad_patterns = [r'\bundefined\b', r'\bnull\b', r'\bNone\b', r'\bNaN\b', r'\[object Object\]']
    for pat in bad_patterns:
        for idx, l in enumerate(lines, 1):
            if re.search(pat, l):
                errors.append(f"Suspicious token '{pat}' on line {idx}: {l.strip()[:100]}")

    # Check table formatting across all tables
    table_lines = []
    in_table = False
    current_table = []
    current_table_start = 0

    for idx, l in enumerate(lines, 1):
        if l.strip().startswith('|') and l.strip().endswith('|'):
            if not in_table:
                in_table = True
                current_table = []
                current_table_start = idx
            current_table.append((idx, l.strip()))
        else:
            if in_table:
                in_table = False
                if len(current_table) >= 2:
                    # Check column counts
                    col_counts = [len([c for c in row.split('|') if c != '']) for _, row in current_table]
                    expected_cols = col_counts[0]
                    for r_idx, (line_no, row_str) in enumerate(current_table):
                        cells = [c.strip() for c in row_str.split('|')[1:-1]]
                        if len(cells) != expected_cols:
                            errors.append(f"Table starting line {current_table_start} has column mismatch on line {line_no}: expected {expected_cols}, got {len(cells)}")
                        # Check empty cells
                        if r_idx > 1: # Skip separator
                            for cell_idx, cell in enumerate(cells):
                                if not cell and '---' not in row_str:
                                    warnings.append(f"Empty cell in table at line {line_no}, col {cell_idx+1}")

    # =========================================================================
    # CHECK 2: Parse All 1,764 Matchups (Tables & Details)
    # =========================================================================
    print("\n--- CHECK 2: Combinatorial Extraction & Completeness ---")

    # Regex for table rows:
    # | 1 | Tarkidos (9) | Tarkidos (9) | **Tie** | Step A: The Flip (Tie Rule) | Step A Tie Rule: ... |
    table_row_re = re.compile(r"^\|\s*(\d+)\s*\|\s*([^|]+)\s*\(\d+\)\s*\|\s*([^|]+)\s*\(\d+\)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|$")
    
    # Regex for detail headers:
    # #### Matchup 3.1.1: [P] Tarkidos vs [E] Tarkidos
    detail_header_re = re.compile(r"^####\s+Matchup\s+3\.(\d+)\.(\d+):\s+\[P\]\s+(.*?)\s+vs\s+\[E\]\s+(.*?)$")
    
    # Detail fields
    victor_re = re.compile(r"^-\s+\*\*Victor\*\*:\s+\*\*(.*?)\*\*$")
    phase_re = re.compile(r"^-\s+\*\*Winning Phase\*\*:\s+`(.*?)`$")

    table_matchups = []
    detail_matchups = []

    # Track cards
    cards_found_p = set()
    cards_found_e = set()

    for idx, l in enumerate(lines, 1):
        m_table = table_row_re.match(l.strip())
        if m_table:
            row_num = int(m_table.group(1))
            p_name = m_table.group(2).strip()
            e_name = m_table.group(3).strip()
            victor_raw = m_table.group(4).strip().replace('*', '')
            phase = m_table.group(5).strip()
            rationale = m_table.group(6).strip()
            table_matchups.append({
                'line': idx,
                'row_num': row_num,
                'p_name': p_name,
                'e_name': e_name,
                'victor_raw': victor_raw,
                'phase': phase,
                'rationale': rationale
            })
            cards_found_p.add(p_name)
            cards_found_e.add(e_name)

    print(f"Parsed {len(table_matchups)} table matchup rows.")
    print(f"Unique Player cards found: {len(cards_found_p)}")
    print(f"Unique Enemy cards found: {len(cards_found_e)}")

    if len(table_matchups) != 1764:
        errors.append(f"Expected exactly 1,764 table matchup rows, found {len(table_matchups)}")
    if len(cards_found_p) != 42:
        errors.append(f"Expected exactly 42 unique player cards, found {len(cards_found_p)}")
    if len(cards_found_e) != 42:
        errors.append(f"Expected exactly 42 unique enemy cards, found {len(cards_found_e)}")

    # Parse details
    current_detail = None
    for idx, l in enumerate(lines, 1):
        m_detail = detail_header_re.match(l.strip())
        if m_detail:
            if current_detail:
                detail_matchups.append(current_detail)
            current_detail = {
                'line': idx,
                'sec_num': int(m_detail.group(1)),
                'match_num': int(m_detail.group(2)),
                'p_name': m_detail.group(3).strip(),
                'e_name': m_detail.group(4).strip(),
                'victor': None,
                'phase': None,
                'steps': []
            }
        elif current_detail:
            m_v = victor_re.match(l.strip())
            if m_v:
                current_detail['victor'] = m_v.group(1).strip()
            m_ph = phase_re.match(l.strip())
            if m_ph:
                current_detail['phase'] = m_ph.group(1).strip()
            if l.strip().startswith('- ') and 'Combat Math' not in l and 'Player Card' not in l and 'Enemy Card' not in l and 'Victor' not in l and 'Winning Phase' not in l:
                current_detail['steps'].append(l.strip())
            elif l.strip().startswith('  - '):
                current_detail['steps'].append(l.strip())

    if current_detail:
        detail_matchups.append(current_detail)

    print(f"Parsed {len(detail_matchups)} detailed matchup sections.")
    if len(detail_matchups) != 1764:
        errors.append(f"Expected exactly 1,764 detailed matchup sections, found {len(detail_matchups)}")

    # Check for duplicates or missing in 42x42 combinations
    table_pairs = Counter((m['p_name'], m['e_name']) for m in table_matchups)
    detail_pairs = Counter((m['p_name'], m['e_name']) for m in detail_matchups)

    if len(table_pairs) != 1764:
        errors.append(f"Unique pairs in table: {len(table_pairs)} (expected 1,764)")
    if len(detail_pairs) != 1764:
        errors.append(f"Unique pairs in details: {len(detail_pairs)} (expected 1,764)")

    # Check duplicates
    table_dups = [pair for pair, count in table_pairs.items() if count > 1]
    if table_dups:
        errors.append(f"Duplicate pairs in tables: {table_dups[:10]}")
    detail_dups = [pair for pair, count in detail_pairs.items() if count > 1]
    if detail_dups:
        errors.append(f"Duplicate pairs in details: {detail_dups[:10]}")

    # Check cross-consistency between table and details
    print("\n--- CHECK 3: Table vs Detail Consistency ---")
    mismatches = 0
    for idx in range(min(len(table_matchups), len(detail_matchups))):
        tm = table_matchups[idx]
        dm = detail_matchups[idx]
        
        if (tm['p_name'], tm['e_name']) != (dm['p_name'], dm['e_name']):
            errors.append(f"Index {idx} name mismatch: Table ({tm['p_name']} vs {tm['e_name']}) vs Detail ({dm['p_name']} vs {dm['e_name']})")
            mismatches += 1
            if mismatches > 5:
                break
        
        # Check victor
        # Table raw victor: "Player (Tarkidos)", "Enemy (Dawn)", "Tie", "Stymied"
        # Detail victor: "Player (Tarkidos)", "Enemy (Dawn)", "Tie", "Stymied"
        if tm['victor_raw'] != dm['victor']:
            errors.append(f"Victor mismatch for {tm['p_name']} vs {tm['e_name']}: Table '{tm['victor_raw']}' vs Detail '{dm['victor']}'")
        
        # Check phase
        if tm['phase'] != dm['phase']:
            errors.append(f"Phase mismatch for {tm['p_name']} vs {tm['e_name']}: Table '{tm['phase']}' vs Detail '{dm['phase']}'")

    print(f"Table vs Detail cross-comparison verified for all {min(len(table_matchups), len(detail_matchups))} records.")

    # =========================================================================
    # CHECK 4: Reciprocal Consistency Analysis
    # =========================================================================
    print("\n--- CHECK 4: Reciprocal Consistency & Symmetry Analysis ---")

    # Map (p_name, e_name) -> outcome
    matrix = {}
    for tm in table_matchups:
        p = tm['p_name']
        e = tm['e_name']
        v = tm['victor_raw']
        # Normalize victor to 'Player', 'Enemy', 'Tie', 'Stymied'
        v_norm = 'Player' if v.startswith('Player') else ('Enemy' if v.startswith('Enemy') else v)
        matrix[(p, e)] = {
            'victor': v_norm,
            'victor_full': v,
            'phase': tm['phase'],
            'line': tm['line']
        }

    # Analyze diagonal: (A, A)
    diagonal_violations = []
    for card in cards_found_p:
        diag = matrix.get((card, card))
        if diag:
            if diag['victor'] not in ('Tie', 'Stymied'):
                diagonal_violations.append((card, diag['victor'], diag['phase']))

    if diagonal_violations:
        for card, v, ph in diagonal_violations:
            errors.append(f"Diagonal self-matchup failure: ({card} vs {card}) resulted in '{v}' in phase '{ph}' (MUST be Tie or Stymied)")
    else:
        print("Self-matchups (42 diagonal pairs): 100% resolve as Tie or Stymied!")

    # Check reciprocal pairs: (A, B) vs (B, A)
    reciprocal_inversions = 0
    reciprocal_asymmetries = []
    checked_pairs = set()

    for (p, e), out1 in matrix.items():
        if p == e:
            continue
        pair_key = tuple(sorted([p, e]))
        if pair_key in checked_pairs:
            continue
        checked_pairs.add(pair_key)

        out2 = matrix.get((e, p))
        if not out2:
            errors.append(f"Missing reciprocal matchup for ({e}, {p})")
            continue

        v1 = out1['victor']
        v2 = out2['victor']
        ph1 = out1['phase']
        ph2 = out2['phase']

        # Expected:
        # If v1 == 'Player', then v2 == 'Enemy'
        # If v1 == 'Enemy', then v2 == 'Player'
        # If v1 == 'Tie', then v2 == 'Tie'
        # If v1 == 'Stymied', then v2 == 'Stymied'
        expected_v2 = 'Enemy' if v1 == 'Player' else ('Player' if v1 == 'Enemy' else v1)

        is_symmetric = (v2 == expected_v2) and (ph1 == ph2)

        if is_symmetric:
            reciprocal_inversions += 1
        else:
            reciprocal_asymmetries.append({
                'p': p,
                'e': e,
                'out_pe': (v1, ph1),
                'out_ep': (v2, ph2),
                'expected_ep': (expected_v2, ph1)
            })

    total_off_diag = len(checked_pairs)
    print(f"Off-diagonal pairs checked: {total_off_diag} pairs (861 bidirectional pairs, 1,722 matchups).")
    print(f"Strictly reciprocal pairs: {reciprocal_inversions} / {total_off_diag} ({reciprocal_inversions/total_off_diag*100:.2f}%)")
    print(f"Asymmetric pairs found: {len(reciprocal_asymmetries)}")

    if reciprocal_asymmetries:
        print("\n--- Detailed Investigation of Reciprocal Asymmetries ---")
        for asym in reciprocal_asymmetries:
            p, e = asym['p'], asym['e']
            v_pe, ph_pe = asym['out_pe']
            v_ep, ph_ep = asym['out_ep']
            print(f"Asymmetry: [{p}] vs [{e}] => ({v_pe}, {ph_pe}) | [{e}] vs [{p}] => ({v_ep}, {ph_ep})")

    # =========================================================================
    # CHECK 5: 6x6 Faction Summary Aggregate Table Verification
    # =========================================================================
    print("\n--- CHECK 5: 6x6 Faction Table Verification ---")

    # Parse Part II table
    # Table format:
    # | Player Faction \ Enemy Faction | Avatars of Light | Celestial | Lycan | Darkness | Daemon | Vampyre | Total Row Record |
    # | **Avatars of light** | 15-15-19-0 | 39- 5- 0-5 | ... | **165-50-61-18** |
    factions = ['Avatars of light', 'Celestial', 'Lycan', 'Darkness', 'Daemon', 'Vampyre']
    
    faction_cell_re = re.compile(r"\|\s*\*\*([^*]+)\*\*\s*\|\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*\|\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*\|\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*\|\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*\|\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*\|\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*\|\s*\*\*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\*\*\s*\|")

    parsed_faction_rows = {}
    for idx, l in enumerate(lines, 1):
        m = faction_cell_re.match(l.strip())
        if m:
            row_faction = m.group(1).strip()
            # 6 cells * 4 ints = 24 ints + 4 row total ints = 28 ints
            cells = []
            for col_idx in range(6):
                base_g = 2 + col_idx * 4
                p = int(m.group(base_g))
                e = int(m.group(base_g + 1))
                t = int(m.group(base_g + 2))
                s = int(m.group(base_g + 3))
                cells.append((p, e, t, s))
            row_tot = (int(m.group(26)), int(m.group(27)), int(m.group(28)), int(m.group(29)))
            parsed_faction_rows[row_faction] = {
                'line': idx,
                'cells': cells,
                'row_total': row_tot
            }

    print(f"Parsed {len(parsed_faction_rows)} faction summary rows.")
    if len(parsed_faction_rows) != 6:
        errors.append(f"Expected 6 faction summary rows, found {len(parsed_faction_rows)}")

    # Verify each cell sum is 49
    # And verify cell values against actual parsed table_matchups
    # Need card -> faction mapping
    card_factions = {}
    # Let's extract card -> faction from detailed sections
    for dm in detail_matchups:
        # We also parsed lines in detail sections or can extract from detail
        pass
    
    # Let's parse Card -> Faction from the detail matchup blocks
    card_faction_re = re.compile(r"^-\s+\*\*(?:Player|Enemy)\s+Card\*\*:\s+(.*?)\s+\(Faction:\s+([^,]+),")
    for l in lines:
        m_cf = card_faction_re.match(l.strip())
        if m_cf:
            card_factions[m_cf.group(1).strip()] = m_cf.group(2).strip()

    print(f"Extracted factions for {len(card_factions)} cards.")
    if len(card_factions) != 42:
        errors.append(f"Expected 42 card faction mappings, found {len(card_factions)}")

    # Now verify each cell of the 6x6 table
    grid_computed = defaultdict(lambda: [0, 0, 0, 0])
    for tm in table_matchups:
        p_name = tm['p_name']
        e_name = tm['e_name']
        pf = card_factions.get(p_name)
        ef = card_factions.get(e_name)
        v = tm['victor_raw']
        v_norm = 'Player' if v.startswith('Player') else ('Enemy' if v.startswith('Enemy') else v)
        
        idx_v = 0 if v_norm == 'Player' else (1 if v_norm == 'Enemy' else (2 if v_norm == 'Tie' else 3))
        grid_computed[(pf, ef)][idx_v] += 1

    # Check 6x6 table values
    grand_p, grand_e, grand_t, grand_s = 0, 0, 0, 0

    for r_idx, pf in enumerate(factions):
        if pf not in parsed_faction_rows:
            errors.append(f"Faction '{pf}' missing from parsed 6x6 table")
            continue
        p_row = parsed_faction_rows[pf]
        calc_row_p, calc_row_e, calc_row_t, calc_row_s = 0, 0, 0, 0

        for c_idx, ef in enumerate(factions):
            table_cell = p_row['cells'][c_idx]
            comp_cell = tuple(grid_computed[(pf, ef)])
            cell_sum = sum(table_cell)

            if cell_sum != 49:
                errors.append(f"Cell ({pf}, {ef}) sum is {cell_sum} (expected 49)")

            if table_cell != comp_cell:
                errors.append(f"Cell ({pf}, {ef}) mismatch: Table {table_cell} vs Computed {comp_cell}")

            calc_row_p += table_cell[0]
            calc_row_e += table_cell[1]
            calc_row_t += table_cell[2]
            calc_row_s += table_cell[3]

        # Verify row total
        if p_row['row_total'] != (calc_row_p, calc_row_e, calc_row_t, calc_row_s):
            errors.append(f"Row total mismatch for {pf}: Table {p_row['row_total']} vs Summed ({calc_row_p}, {calc_row_e}, {calc_row_t}, {calc_row_s})")

        grand_p += calc_row_p
        grand_e += calc_row_e
        grand_t += calc_row_t
        grand_s += calc_row_s

    print(f"Grand Totals across 6x6 Faction Table: Player={grand_p}, Enemy={grand_e}, Tie={grand_t}, Stymied={grand_s}, Total={grand_p+grand_e+grand_t+grand_s}")

    # Verify Part I Global Statistics
    part1_re = re.compile(r"\|\s*\*\*Total Permutations\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|")
    p1_p_re = re.compile(r"\|\s*\*\*Player Card Victory\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|")
    p1_e_re = re.compile(r"\|\s*\*\*Enemy Card Victory\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|")
    p1_t_re = re.compile(r"\|\s*\*\*Tie / Mutual Destruction\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|")
    p1_s_re = re.compile(r"\|\s*\*\*Stymied / Non-Battler No-Contest\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|")

    p1_p = int(p1_p_re.search(content).group(1))
    p1_e = int(p1_e_re.search(content).group(1))
    p1_t = int(p1_t_re.search(content).group(1))
    p1_s = int(p1_s_re.search(content).group(1))

    if (p1_p, p1_e, p1_t, p1_s) != (grand_p, grand_e, grand_t, grand_s):
        errors.append(f"Part I Global Stats ({p1_p}, {p1_e}, {p1_t}, {p1_s}) mismatch Faction Table totals ({grand_p}, {grand_e}, {grand_t}, grand_s)")
    else:
        print("Part I Global Statistics match 6x6 Faction Table totals perfectly!")

    # Verify Phase totals
    phase_counts = Counter(tm['phase'] for tm in table_matchups)
    print("\nPhase Distribution:")
    for ph, count in phase_counts.most_common():
        print(f"  {ph}: {count}")

    # =========================================================================
    # SUMMARY REPORT
    # =========================================================================
    print("\n=======================================================")
    print(f"VERIFICATION SUMMARY: {len(errors)} Errors, {len(warnings)} Warnings")
    print("=======================================================")
    if errors:
        print("\nERRORS:")
        for e in errors:
            print(f"  [ERROR] {e}")
    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  [WARNING] {w}")

    if not errors:
        print("\nVERDICT: ALL VERIFICATION CHECKS PASSED EMPIRICALLY.")
        sys.exit(0)
    else:
        print(f"\nVERDICT: VERIFICATION FAILED WITH {len(errors)} ERRORS.")
        sys.exit(1)

if __name__ == '__main__':
    main()
