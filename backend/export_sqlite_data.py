#!/usr/bin/env python3
"""
Export SQLite data to JSON for migration to PostgreSQL
"""
import json
import sqlite3
from datetime import datetime

def datetime_converter(val):
    """Convert datetime strings to ISO format"""
    if val is None:
        return None
    try:
        # Try parsing as datetime
        dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
        return dt.isoformat()
    except:
        return val

def export_table(cursor, table_name):
    """Export a table to a list of dictionaries"""
    cursor.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()

    data = []
    for row in rows:
        row_dict = {}
        for i, col in enumerate(columns):
            value = row[i]
            # Convert datetime strings
            if isinstance(value, str) and ('timestamp' in col or 'created_at' in col or 'updated_at' in col):
                value = datetime_converter(value)
            row_dict[col] = value
        data.append(row_dict)

    return data

def main():
    # Connect to SQLite database
    conn = sqlite3.connect('thread_counter.db')
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]

    # Export data
    export_data = {}
    for table in tables:
        print(f"Exporting table: {table}")
        export_data[table] = export_table(cursor, table)
        print(f"  -> {len(export_data[table])} rows")

    # Save to JSON
    with open('sqlite_export.json', 'w') as f:
        json.dump(export_data, f, indent=2, default=str)

    print(f"\nData exported to sqlite_export.json")
    print(f"Tables: {', '.join(tables)}")

    conn.close()

if __name__ == '__main__':
    main()
