import pandas as pd
import os
import argparse
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from functools import partial


def display_columns_menu(columns: List[str]) -> None:
    print("\nAvailable columns:")
    for idx, col in enumerate(columns, 1):
        print(f"{idx}. {col}")


def get_column_selection(columns: List[str], prompt: str) -> List[str]:
    while True:
        print("\nYou can select columns by:")
        print("1. Column numbers (e.g., 1,3,5)")
        print("2. Column names (e.g., Revenue,Date,Product)")
        print("3. Mix of both (e.g., 1,Revenue,3,Product)")

        selection = input(f"\n{prompt}: ").strip()

        if not selection:
            print("No selection made. Please try again.")
            continue

        selected_columns = []
        invalid_selections = []

        for item in selection.split(','):
            item = item.strip()
            # Try as index
            if item.isdigit():
                idx = int(item)
                if 1 <= idx <= len(columns):
                    selected_columns.append(columns[idx-1])
                else:
                    invalid_selections.append(f"Index {idx}")
            # Try as column name
            else:
                if item in columns:
                    selected_columns.append(item)
                else:
                    invalid_selections.append(f"Column '{item}'")

        if invalid_selections:
            print(f"\nInvalid selections: {', '.join(invalid_selections)}")
            print("Please try again.")
            continue

        if len(selected_columns) == 0:
            print("No valid columns selected. Please try again.")
            continue

        # Remove duplicates while preserving order
        return list(dict.fromkeys(selected_columns))


def get_aggregation_operations(columns: List[str]) -> Dict[str, str]:
    valid_operations = {'sum', 'mean', 'count', 'min', 'max', 'median', 'std'}
    operations = {}

    print("\nAvailable operations:", ', '.join(valid_operations))

    for col in columns:
        while True:
            op = input(f"Enter operation for '{
                       col}' [{'/'.join(valid_operations)}]: ").strip().lower()
            if op in valid_operations:
                operations[col] = op
                break
            print(f"Invalid operation. Please choose from: {
                  ', '.join(valid_operations)}")

    return operations



@dataclass
class ExcelConfig:
    file_path: Path
    output_dir: Path


class ExcelProcessor:
    def __init__(self, config: ExcelConfig):
        self.config = config
        self._df: Optional[pd.DataFrame] = None

    @property
    def df(self) -> pd.DataFrame:
        if self._df is None:
            self._df = pd.read_excel(self.config.file_path)
        return self._df

    def get_columns(self) -> List[str]:
        return list(self.df.columns)

    def aggregate_data(self,
                       agg_columns: List[str],
                       group_columns: List[str],
                       operations: Dict[str, str]) -> pd.DataFrame:
        # Validate columns
        all_columns = set(self.df.columns)
        required_columns = set(agg_columns) | set(group_columns)
        if not required_columns.issubset(all_columns):
            invalid_cols = required_columns - all_columns
            raise ValueError(f"Invalid column names provided: {invalid_cols}")

        result = self.df.groupby(group_columns)[agg_columns].agg(operations)
        return result

def get_script_dir() -> Path:
    return Path(__file__).parent.absolute()

def save_excel(df: pd.DataFrame, output_path: Path, filename: str):
    full_path = output_path / filename
    df.to_excel(full_path)
    return full_path


def main():
    parser = argparse.ArgumentParser(description='Excel Pivot Table Generator')
    parser.add_argument('--file', type=str, help='Input Excel file path')
    parser.add_argument('--path', type=str, help='Working directory path')
    parser.add_argument('--show-columns', action='store_true',
                        help='Display column headers')
    parser.add_argument('--aggregate', action='store_true',
                        help='Perform aggregation')

    args = parser.parse_args()

    # Determine paths
    working_dir = Path(args.path) if args.path else get_script_dir()
    file_path = Path(args.file) if args.file else working_dir / "input.xlsx"

    config = ExcelConfig(file_path=file_path, output_dir=working_dir)
    processor = ExcelProcessor(config)

    # Always show columns first for better user experience
    columns = processor.get_columns()
    display_columns_menu(columns)

    if args.aggregate:
        print("\n=== Aggregation Setup ===")

        # Step 1: Select columns to aggregate
        print("\nStep 1: Select columns for aggregation")
        agg_cols = get_column_selection(
            columns,
            "Enter columns to aggregate (comma-separated list of numbers or names)"
        )

        # Step 2: Get operations for selected columns
        print("\nStep 2: Select operations for each aggregation column")
        operations = get_aggregation_operations(agg_cols)

        # Step 3: Select grouping columns
        print("\nStep 3: Select columns for grouping")
        print("These will be the columns that define how the data is grouped")
        display_columns_menu(columns)  # Show all columns again

        group_cols = get_column_selection(
            columns,  # Pass all columns, not just remaining ones
            "Enter columns to group by (comma-separated list of numbers or names)"
        )

        # Validate no overlap between aggregation and grouping columns
        overlap = set(agg_cols) & set(group_cols)
        if overlap:
            print(f"\nError: Columns {
                  overlap} cannot be used for both aggregation and grouping.")
            return

        # Show summary before processing
        print("\n=== Operation Summary ===")
        print("Aggregating columns:")
        for col in agg_cols:
            print(f"- {col} ({operations[col]})")
        print("\nGrouping by columns:")
        for col in group_cols:
            print(f"- {col}")

        proceed = input(
            "\nProceed with these settings? (y/n): ").lower().strip()
        if proceed != 'y':
            print("Operation cancelled.")
            return

        try:
            # Perform aggregation
            result = processor.aggregate_data(
                agg_columns=agg_cols,
                group_columns=group_cols,
                operations=operations
            )

            # Save results
            output_file = save_excel(
                result,
                config.output_dir,
                f"aggregated_{file_path.stem}.xlsx"
            )
            print(f"\nSuccess! Output saved to: {output_file}")

            # Show preview of the result
            print("\nPreview of the result:")
            print(result.head())

        except Exception as e:
            print(f"\nError during aggregation: {str(e)}")
            return

if __name__ == "__main__":
    main()