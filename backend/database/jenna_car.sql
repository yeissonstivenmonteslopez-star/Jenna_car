CREATE DATABASE IF NOT EXISTS jenna_car
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE jenna_car;

CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NULL,
    google_id VARCHAR(255) NULL UNIQUE,
    telefono VARCHAR(20),
    rol ENUM('admin', 'usuario') NOT NULL DEFAULT 'usuario',
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    foto_perfil VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE password_reset_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reset_usuario (usuario_id),
    INDEX idx_reset_expires (expires_at),
    CONSTRAINT fk_reset_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE clientes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL UNIQUE,
    documento VARCHAR(20) NOT NULL UNIQUE,
    direccion VARCHAR(200),
    ciudad VARCHAR(100),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_clientes_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE vehiculos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT UNSIGNED NOT NULL,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio YEAR,
    color VARCHAR(30),
    kilometraje INT UNSIGNED DEFAULT 0,
    tipo_combustible ENUM(
        'gasolina',
        'diesel',
        'hibrido',
        'electrico',
        'gas'
    ) DEFAULT 'gasolina',
    estado ENUM(
        'activo',
        'en_mantenimiento',
        'inactivo'
    ) NOT NULL DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_vehiculos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
CREATE TABLE servicios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duracion_estimada INT UNSIGNED COMMENT 'Duración en minutos',
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE ordenes_trabajo (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT UNSIGNED NOT NULL,
    vehiculo_id INT UNSIGNED NOT NULL,
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega DATETIME NULL,
    kilometraje INT UNSIGNED DEFAULT 0,
    problema_reportado TEXT NOT NULL,
    diagnostico TEXT,
    trabajo_realizado TEXT,
    observaciones TEXT,
    estado ENUM(
        'pendiente',
        'en_diagnostico',
        'en_reparacion',
        'terminada',
        'entregada',
        'cancelada'
    ) NOT NULL DEFAULT 'pendiente',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_orden_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orden_vehiculo
        FOREIGN KEY (vehiculo_id)
        REFERENCES vehiculos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE orden_servicios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    orden_id INT UNSIGNED NOT NULL,
    servicio_id INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    precio DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_orden_servicios_orden
        FOREIGN KEY (orden_id)
        REFERENCES ordenes_trabajo(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_orden_servicios_servicio
        FOREIGN KEY (servicio_id)
        REFERENCES servicios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE citas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT UNSIGNED NOT NULL,
    vehiculo_id INT UNSIGNED NOT NULL,
    servicio_id INT UNSIGNED NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo TEXT,
    observaciones TEXT,
    estado ENUM(
        'pendiente',
        'confirmada',
        'atendida',
        'cancelada'
    ) NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_citas_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_citas_vehiculo
        FOREIGN KEY (vehiculo_id)
        REFERENCES vehiculos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_citas_servicio
        FOREIGN KEY (servicio_id)
        REFERENCES servicios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE recibos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    orden_id INT UNSIGNED NOT NULL UNIQUE,
    cliente_id INT UNSIGNED NOT NULL,
    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado ENUM(
        'pendiente',
        'pagado',
        'anulado'
    ) NOT NULL DEFAULT 'pendiente',

    CONSTRAINT fk_recibos_orden
        FOREIGN KEY (orden_id)
        REFERENCES ordenes_trabajo(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_recibos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE recibo_detalles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recibo_id INT UNSIGNED NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_detalles_recibo
        FOREIGN KEY (recibo_id)
        REFERENCES recibos(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE pagos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recibo_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM(
        'efectivo',
        'tarjeta',
        'transferencia',
        'nequi',
        'otro'
    ) NOT NULL,
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    numero_nequi VARCHAR(20) NULL,
    referencia VARCHAR(100) UNIQUE,
    estado ENUM(
        'completado',
        'pendiente',
        'anulado'
    ) NOT NULL DEFAULT 'completado',

    CONSTRAINT fk_pagos_recibo
        FOREIGN KEY (recibo_id)
        REFERENCES recibos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_pagos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE notificaciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'sistema',
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuario_estado (usuario_id, leida),
    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);
