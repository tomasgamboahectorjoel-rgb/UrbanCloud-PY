"""La documentación interactiva solo se publica fuera de producción o si se activa expresamente."""

from app.configuracion.ajustes import Ajustes


def test_la_documentacion_esta_visible_en_desarrollo():
    assert Ajustes(app_env="development").docs_visibles is True


def test_la_documentacion_esta_oculta_en_produccion_por_defecto():
    assert Ajustes(app_env="production").docs_visibles is False


def test_la_documentacion_se_puede_activar_en_produccion():
    assert Ajustes(app_env="production", docs_enabled=True).docs_visibles is True
