-- Ejecutar una vez antes de desplegar la aplicación.
CREATE TABLE empresas_convenio (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nit VARCHAR(30) NOT NULL UNIQUE, razon_social VARCHAR(150) NOT NULL,
 codigo_acceso VARCHAR(30) NOT NULL UNIQUE, telefono_contacto VARCHAR(20),
 correo_facturacion VARCHAR(150), porcentaje_descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
 dias_credito INT NOT NULL DEFAULT 30, activo TINYINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CHECK (porcentaje_descuento BETWEEN 0 AND 100), CHECK (dias_credito >= 0)
) ENGINE=InnoDB;
ALTER TABLE usuarios ADD empresa_id INT UNSIGNED NULL,
 ADD CONSTRAINT fk_usuario_empresa FOREIGN KEY (empresa_id) REFERENCES empresas_convenio(id),
 MODIFY rol ENUM('admin','usuario','mecanico','gestor_flota') NOT NULL DEFAULT 'usuario';
ALTER TABLE vehiculos ADD empresa_id INT UNSIGNED NULL, ADD numero_interno VARCHAR(30),
 ADD CONSTRAINT fk_vehiculo_empresa FOREIGN KEY (empresa_id) REFERENCES empresas_convenio(id),
 ADD UNIQUE KEY uq_movil_empresa (empresa_id,numero_interno);
ALTER TABLE citas ADD prioridad ENUM('normal','alta','emergencia_flota') NOT NULL DEFAULT 'normal',
 ADD metodo_facturacion ENUM('contado','credito_convenio') NOT NULL DEFAULT 'contado',
 ADD codigo_autorizacion VARCHAR(50), ADD nombre_conductor_entrega VARCHAR(100),
 ADD telefono_conductor VARCHAR(20);
ALTER TABLE ordenes_trabajo ADD descuento_convenio DECIMAL(5,2) NULL;
