"""add_detection_correction_tracking

Revision ID: 1b4dd743e7b4
Revises: d232b566f6d0
Create Date: 2025-12-02 18:53:50.758397

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b4dd743e7b4'
down_revision: Union[str, Sequence[str], None] = 'd232b566f6d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add correction tracking fields to Detection table."""
    # Add new columns for tracking corrections
    op.add_column('detections', sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('detections', sa.Column('original_x', sa.Float(), nullable=True))
    op.add_column('detections', sa.Column('original_y', sa.Float(), nullable=True))
    op.add_column('detections', sa.Column('original_width', sa.Float(), nullable=True))
    op.add_column('detections', sa.Column('original_height', sa.Float(), nullable=True))
    op.add_column('detections', sa.Column('correction_type', sa.String(), nullable=True))
    op.add_column('detections', sa.Column('corrected_by_user_id', sa.Integer(), nullable=True))
    op.add_column('detections', sa.Column('corrected_at', sa.DateTime(), nullable=True))

    # Add foreign key constraint for corrected_by_user_id
    op.create_foreign_key(
        'fk_detections_corrected_by_user',
        'detections',
        'users',
        ['corrected_by_user_id'],
        ['id']
    )


def downgrade() -> None:
    """Downgrade schema - Remove correction tracking fields."""
    # Drop foreign key constraint first
    op.drop_constraint('fk_detections_corrected_by_user', 'detections', type_='foreignkey')

    # Remove columns
    op.drop_column('detections', 'corrected_at')
    op.drop_column('detections', 'corrected_by_user_id')
    op.drop_column('detections', 'correction_type')
    op.drop_column('detections', 'original_height')
    op.drop_column('detections', 'original_width')
    op.drop_column('detections', 'original_y')
    op.drop_column('detections', 'original_x')
    op.drop_column('detections', 'is_deleted')
