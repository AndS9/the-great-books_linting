"""Initial migration

Revision ID: 09c345f10f18
Revises: 
Create Date: 2026-11-20 19:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '09c345f10f18'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('houses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('motto', sa.String(length=100), nullable=True),
        sa.Column('lord_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['lord_id'], ['users.id'], name='fk_house_lord_id', use_alter=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_table('roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_name', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_name')
    )
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password', sa.String(length=180), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('house_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['house_id'], ['houses.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )
    op.create_table('sessions',
        sa.Column('id', sa.String(length=128), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=15), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('stats',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('strength', sa.Integer(), nullable=True),
        sa.Column('defense', sa.Integer(), nullable=True),
        sa.Column('endurance', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id')
    )


def downgrade():
    op.drop_table('stats')
    op.drop_table('sessions')
    op.drop_table('users')
    op.drop_table('roles')
    op.drop_table('houses')
