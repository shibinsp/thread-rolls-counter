#!/usr/bin/env python3
"""
Import SQLite data to PostgreSQL
"""
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import models
from app.models import User, Slot, SlotEntry, ActivityLog, Analysis

def import_data():
    # Load exported data
    with open('sqlite_export.json', 'r') as f:
        data = json.load(f)

    # Create PostgreSQL connection
    database_url = os.getenv("DATABASE_URL")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        print("Starting import...")

        # Import users
        if 'users' in data and data['users']:
            print(f"\nImporting {len(data['users'])} users...")
            for user_data in data['users']:
                user = User(
                    id=user_data['id'],
                    username=user_data['username'],
                    password_hash=user_data['password_hash'],
                    role=user_data['role'],
                    is_active=bool(user_data['is_active']),
                    created_at=datetime.fromisoformat(user_data['created_at']) if user_data.get('created_at') else datetime.now()
                )
                db.add(user)
            db.commit()
            print("✓ Users imported")

        # Import slots
        if 'slots' in data and data['slots']:
            print(f"\nImporting {len(data['slots'])} slots...")
            for slot_data in data['slots']:
                slot = Slot(
                    id=slot_data['id'],
                    name=slot_data['name'],
                    description=slot_data.get('description'),
                    created_by=slot_data['created_by'],
                    created_at=datetime.fromisoformat(slot_data['created_at']) if slot_data.get('created_at') else datetime.now()
                )
                db.add(slot)
            db.commit()
            print("✓ Slots imported")

        # Import slot entries
        if 'slot_entries' in data and data['slot_entries']:
            print(f"\nImporting {len(data['slot_entries'])} slot entries...")
            for entry_data in data['slot_entries']:
                # Parse JSON fields
                detected_colors = json.loads(entry_data['detected_colors']) if entry_data.get('detected_colors') else {}
                final_colors = json.loads(entry_data['final_colors']) if entry_data.get('final_colors') else {}

                entry = SlotEntry(
                    id=entry_data['id'],
                    slot_id=entry_data['slot_id'],
                    user_id=entry_data['user_id'],
                    filename=entry_data.get('filename'),
                    image_path=entry_data.get('image_path'),
                    annotated_path=entry_data.get('annotated_path'),
                    detected_count=entry_data['detected_count'],
                    final_count=entry_data['final_count'],
                    detected_colors=detected_colors,
                    final_colors=final_colors,
                    processing_time=entry_data.get('processing_time'),
                    detection_method=entry_data.get('detection_method'),
                    is_submitted=bool(entry_data['is_submitted']),
                    created_at=datetime.fromisoformat(entry_data['created_at']) if entry_data.get('created_at') else datetime.now(),
                    updated_at=datetime.fromisoformat(entry_data['updated_at']) if entry_data.get('updated_at') else datetime.now()
                )
                db.add(entry)
            db.commit()
            print("✓ Slot entries imported")

        # Import activity logs
        if 'activity_logs' in data and data['activity_logs']:
            print(f"\nImporting {len(data['activity_logs'])} activity logs...")
            for log_data in data['activity_logs']:
                # Parse JSON details
                details = json.loads(log_data['details']) if log_data.get('details') else None

                log = ActivityLog(
                    id=log_data['id'],
                    user_id=log_data['user_id'],
                    slot_id=log_data.get('slot_id'),
                    action=log_data['action'],
                    details=details,
                    timestamp=datetime.fromisoformat(log_data['timestamp']) if log_data.get('timestamp') else datetime.now()
                )
                db.add(log)
            db.commit()
            print("✓ Activity logs imported")

        # Import analyses (if any)
        if 'analyses' in data and data['analyses']:
            print(f"\nImporting {len(data['analyses'])} analyses...")
            for analysis_data in data['analyses']:
                # Parse JSON fields
                color_breakdown = json.loads(analysis_data['color_breakdown']) if analysis_data.get('color_breakdown') else {}

                analysis = Analysis(
                    id=analysis_data['id'],
                    filename=analysis_data.get('filename'),
                    image_path=analysis_data.get('image_path'),
                    thumbnail_path=analysis_data.get('thumbnail_path'),
                    total_threads=analysis_data.get('total_threads', 0),
                    color_breakdown=color_breakdown,
                    processing_time=analysis_data.get('processing_time'),
                    upload_time=datetime.fromisoformat(analysis_data['upload_time']) if analysis_data.get('upload_time') else datetime.now()
                )
                db.add(analysis)
            db.commit()
            print("✓ Analyses imported")

        # Update sequences to prevent ID conflicts
        print("\nUpdating sequences...")
        from sqlalchemy import text
        for table, seq in [
            ('users', 'users_id_seq'),
            ('slots', 'slots_id_seq'),
            ('slot_entries', 'slot_entries_id_seq'),
            ('activity_logs', 'activity_logs_id_seq'),
            ('analyses', 'analyses_id_seq'),
        ]:
            db.execute(text(f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM {table}), 1));"))
        db.commit()
        print("✓ Sequences updated")

        print("\n✅ Import completed successfully!")

    except Exception as e:
        print(f"\n❌ Error during import: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == '__main__':
    import_data()
