from ..extensions import db
from sqlalchemy.dialects.mysql import INTEGER
from datetime import datetime, timezone, timedelta

BOGOTA = timezone(timedelta(hours=-5))

def periodo_actual():
    return datetime.now(BOGOTA).strftime("%Y-%m")


class EmpresaConvenio(db.Model):
    __tablename__ = 'empresas_convenio'
    id = db.Column(INTEGER(unsigned=True), primary_key=True)
    nit = db.Column(db.String(30), unique=True, nullable=False)
    convenio_activo = db.Column(db.Integer, db.Computed("CASE WHEN activo THEN 1 ELSE NULL END"), unique=True)
    periodo_codigo = db.Column(db.String(7), nullable=False, default=periodo_actual)
    codigo_acceso = db.Column(db.String(30), unique=True, nullable=False)
    telefono_contacto = db.Column(db.String(20))
    correo_facturacion = db.Column(db.String(150))
    porcentaje_descuento = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    dias_credito = db.Column(db.Integer, nullable=False, default=30)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
