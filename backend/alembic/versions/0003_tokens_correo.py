"""Tokens de un solo uso para verificar correo y recuperar contraseñas."""

import sqlalchemy as sa
from alembic import op

revision = "0003_tokens_correo"
down_revision = "0002_sesiones_renovacion"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tokens_correo",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("usuario_id", sa.BigInteger(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("proposito", sa.String(20), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("vence_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tokens_correo_usuario_id", "tokens_correo", ["usuario_id"])


def downgrade():
    op.drop_index("ix_tokens_correo_usuario_id", table_name="tokens_correo")
    op.drop_table("tokens_correo")
