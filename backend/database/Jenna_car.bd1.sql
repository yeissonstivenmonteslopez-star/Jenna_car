
CREATE DATABASE IF NOT EXISTS jenna_car
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE jenna_car;

-- 1. USUARIOS
CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) DEFAULT NULL,
    google_id VARCHAR(255) DEFAULT NULL UNIQUE,
    telefono VARCHAR(20) DEFAULT NULL,
    documento VARCHAR(30) DEFAULT NULL UNIQUE,
    direccion VARCHAR(255) DEFAULT NULL,
    ciudad VARCHAR(100) DEFAULT NULL,
    fecha_registro TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    rol ENUM('admin','usuario','mecanico') NOT NULL DEFAULT 'usuario',
    estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    foto_perfil VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. TOKENS DE RECUPERACIÓN
CREATE TABLE password_reset_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    used_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_reset_usuario (usuario_id),
    KEY idx_reset_expires (expires_at),
    CONSTRAINT fk_reset_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. NOTIFICACIONES
CREATE TABLE notificaciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'sistema',
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notificaciones_usuario (usuario_id),
    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. VEHÍCULOS
CREATE TABLE vehiculos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    placa VARCHAR(20) NOT NULL UNIQUE,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    anio YEAR DEFAULT NULL,
    color VARCHAR(50) DEFAULT NULL,
    kilometraje INT UNSIGNED NOT NULL DEFAULT 0,
    tipo_combustible ENUM(
        'gasolina','diesel','hibrido','electrico','gas'
    ) NOT NULL DEFAULT 'gasolina',
    estado ENUM(
        'activo','en_mantenimiento','inactivo'
    ) NOT NULL DEFAULT 'activo',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_vehiculos_usuario (usuario_id),
    CONSTRAINT fk_vehiculos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. SERVICIOS
CREATE TABLE servicios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duracion_estimada INT UNSIGNED DEFAULT NULL,
    estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. CITAS
CREATE TABLE citas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id INT UNSIGNED NOT NULL,
    mecanico_id INT UNSIGNED DEFAULT NULL,
    servicio_id INT UNSIGNED NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo TEXT,
    observaciones TEXT,
    estado ENUM(
        'pendiente','confirmada','atendida','cancelada'
    ) NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_citas_vehiculo_fecha_hora (vehiculo_id, fecha, hora),
    UNIQUE KEY uq_citas_mecanico_fecha_hora (mecanico_id, fecha, hora),
    KEY idx_citas_fecha_hora (fecha, hora),
    CONSTRAINT fk_citas_vehiculo
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_citas_mecanico
        FOREIGN KEY (mecanico_id) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_citas_servicio
        FOREIGN KEY (servicio_id) REFERENCES servicios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7. ÓRDENES DE TRABAJO
CREATE TABLE ordenes_trabajo (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id INT UNSIGNED NOT NULL,
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega DATETIME DEFAULT NULL,
    kilometraje INT UNSIGNED NOT NULL DEFAULT 0,
    problema_reportado TEXT NOT NULL,
    observaciones TEXT,
    estado ENUM(
        'pendiente','en_diagnostico','en_reparacion',
        'terminada','entregada','cancelada'
    ) NOT NULL DEFAULT 'pendiente',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ordenes_vehiculo (vehiculo_id),
    CONSTRAINT fk_orden_vehiculo
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. DIAGNÓSTICOS
CREATE TABLE diagnosticos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cita_id INT UNSIGNED NOT NULL,
    mecanico_id INT UNSIGNED NOT NULL,
    descripcion TEXT NOT NULL,
    observaciones TEXT,
    solucion_recomendada TEXT,
    estado ENUM(
        'pendiente','en_proceso','completado'
    ) NOT NULL DEFAULT 'pendiente',
    fecha_diagnostico DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_diagnosticos_cita (cita_id),
    KEY idx_diagnosticos_mecanico (mecanico_id),
    CONSTRAINT fk_diagnosticos_cita
        FOREIGN KEY (cita_id) REFERENCES citas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_diagnosticos_mecanico
        FOREIGN KEY (mecanico_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 9. TRABAJOS
CREATE TABLE trabajos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    diagnostico_id INT UNSIGNED NOT NULL,
    servicio_id INT UNSIGNED NOT NULL,
    mecanico_id INT UNSIGNED NOT NULL,
    orden_id INT UNSIGNED DEFAULT NULL,
    descripcion TEXT NOT NULL,
    estado ENUM(
        'pendiente','en_proceso','completado','cancelado'
    ) NOT NULL DEFAULT 'pendiente',
    fecha_inicio DATETIME DEFAULT NULL,
    fecha_fin DATETIME DEFAULT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_trabajos_diagnostico (diagnostico_id),
    KEY idx_trabajos_servicio (servicio_id),
    KEY idx_trabajos_mecanico (mecanico_id),
    KEY idx_trabajos_orden (orden_id),
    KEY idx_trabajos_estado (estado),
    CONSTRAINT fk_trabajos_diagnostico
        FOREIGN KEY (diagnostico_id) REFERENCES diagnosticos(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_trabajos_servicio
        FOREIGN KEY (servicio_id) REFERENCES servicios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_trabajos_mecanico
        FOREIGN KEY (mecanico_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_trabajos_orden
        FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 10. IMÁGENES DE TRABAJO
CREATE TABLE imagenes_trabajo (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trabajo_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    ruta_imagen VARCHAR(500) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_imagenes_trabajo (trabajo_id),
    KEY idx_imagenes_usuario (usuario_id),
    CONSTRAINT fk_imagenes_trabajo
        FOREIGN KEY (trabajo_id) REFERENCES trabajos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_imagenes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 11. RECIBOS
CREATE TABLE recibos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    orden_id INT UNSIGNED NOT NULL UNIQUE,
    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado ENUM('pendiente','pagado','anulado')
        NOT NULL DEFAULT 'pendiente',
    CONSTRAINT fk_recibos_orden
        FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 12. DETALLES DEL RECIBO
CREATE TABLE recibo_detalles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recibo_id INT UNSIGNED NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    KEY idx_detalles_recibo (recibo_id),
    CONSTRAINT fk_detalles_recibo
        FOREIGN KEY (recibo_id) REFERENCES recibos(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 13. PAGOS
CREATE TABLE pagos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recibo_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM(
        'efectivo','tarjeta','transferencia','nequi','otro'
    ) NOT NULL,
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    numero_nequi VARCHAR(20) DEFAULT NULL,
    referencia VARCHAR(100) DEFAULT NULL UNIQUE,
    estado ENUM(
        'completado','pendiente','anulado'
    ) NOT NULL DEFAULT 'completado',
    KEY idx_pagos_recibo (recibo_id),
    KEY idx_pagos_usuario (usuario_id),
    CONSTRAINT fk_pagos_recibo
        FOREIGN KEY (recibo_id) REFERENCES recibos(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pagos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
