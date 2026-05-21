-- ============================================================
--  FASE 1 — COMPLETAR BASE DE DATOS
--  Archivo: Cursores.sql
--  Contenido:
--    1. Alteración de tabla Usuario (columna contrasena)
--    2. Seed data ampliado
--    3. Cursor 1 — sp_reporte_solicitudes_pendientes
--    4. Cursor 2 — sp_reporte_carga_funcionario
--    5. Cursor 3 — sp_escalar_solicitudes_vencidas
-- ============================================================


-- ── Alteración de esquema ─────────────────────────────────────
--  Agrega columna contrasena a Usuario para soporte de login.
--  En producción se usaría hash BCrypt; aquí se almacena texto
--  plano para simplificar el alcance académico del proyecto.

ALTER TABLE Usuario
    ADD COLUMN contrasena VARCHAR(255) NOT NULL DEFAULT 'password123'
    AFTER telefono;


-- ── Seed data ampliado ────────────────────────────────────────
--  Cubre todos los estados y escenarios para demostración.

-- Contraseñas para usuarios existentes
UPDATE Usuario SET contrasena = 'juan123'   WHERE idUsuario = 1;
UPDATE Usuario SET contrasena = 'maria123'  WHERE idUsuario = 2;
UPDATE Usuario SET contrasena = 'carlos123' WHERE idUsuario = 3;

-- Solicitudes adicionales para cubrir todos los estados
INSERT INTO Solicitud (descripcion, fechaCreacion, idUsuario, idTramite, idFuncionario, idEstadoActual)
VALUES
    ('Certificado de notas para visa estudiantil', '2026-03-10', 2, 4, 2, 4),
    ('Certificado de prácticas para empresa XYZ',  '2026-03-15', 1, 3, 3, 5),
    ('Cancelación de materia Cálculo II',           '2026-04-20', 1, 7, 2, 2),
    ('Certificado laboral para crédito bancario',   '2026-04-25', 2, 1, 3, 3);

-- Historial para las solicitudes nuevas
INSERT INTO HistorialEstado (fechaCambio, idSolicitud, idEstado, idFuncionario)
VALUES
    ('2026-03-10', 6, 1, 2),
    ('2026-03-12', 6, 4, 2),
    ('2026-03-15', 7, 1, 3),
    ('2026-03-16', 7, 5, 3),
    ('2026-04-20', 8, 1, 2),
    ('2026-04-21', 8, 2, 2),
    ('2026-04-25', 9, 1, 3),
    ('2026-04-26', 9, 3, 3);

-- Comentario adicional para solicitud 7 (requiere info)
INSERT INTO Comentario (texto, fechaComentario, idSolicitud, idFuncionario)
VALUES ('Se requiere carta de la empresa confirmando el período de prácticas.', '2026-03-16', 7, 3);

-- Pago para solicitud 6 (certificado de notas — requiere pago)
INSERT INTO Pago (fecha, monto, metodoPago, estadoPago, idSolicitud)
VALUES ('2026-03-11', 25000.00, 'PSE', 'Pagado', 6);


-- ============================================================
--  CURSOR 1
--  sp_reporte_solicitudes_pendientes(p_dias_limite)
--
--  Propósito: Recorre todas las solicitudes en estado "Pendiente"
--  y genera un reporte de las que llevan más de p_dias_limite días
--  sin cambio de estado. Útil para que el administrador identifique
--  solicitudes represadas.
--
--  Tablas usadas: Solicitud, EstadoSolicitud, Usuario, Tramite
--  Retorna: tabla de resultados con datos de la solicitud y días transcurridos
-- ============================================================

DELIMITER $$

CREATE PROCEDURE sp_reporte_solicitudes_pendientes(
    IN p_dias_limite INT
)
BEGIN
    -- Variables del cursor
    DECLARE v_done            INT DEFAULT FALSE;
    DECLARE v_idSolicitud     INT;
    DECLARE v_descripcion     VARCHAR(500);
    DECLARE v_fechaCreacion   DATE;
    DECLARE v_idUsuario       INT;
    DECLARE v_idTramite       INT;
    DECLARE v_idFuncionario   INT;
    DECLARE v_diasTranscurridos INT;

    -- Tabla temporal para acumular resultados
    DROP TEMPORARY TABLE IF EXISTS tmp_reporte_pendientes;
    CREATE TEMPORARY TABLE tmp_reporte_pendientes (
        idSolicitud       INT,
        descripcion       VARCHAR(500),
        fechaCreacion     DATE,
        diasTranscurridos INT,
        nombreUsuario     VARCHAR(100),
        tipoTramite       VARCHAR(50),
        idFuncionario     INT
    );

    -- Cursor: solicitudes en estado Pendiente
    DECLARE cur_pendientes CURSOR FOR
        SELECT
            s.idSolicitud,
            s.descripcion,
            s.fechaCreacion,
            DATEDIFF(CURRENT_DATE, s.fechaCreacion) AS dias,
            s.idUsuario,
            s.idTramite,
            s.idFuncionario
        FROM Solicitud s
        JOIN EstadoSolicitud e ON s.idEstadoActual = e.idEstado
        WHERE e.nombreEstado = 'Pendiente';

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    OPEN cur_pendientes;

    loop_pendientes: LOOP
        FETCH cur_pendientes INTO
            v_idSolicitud,
            v_descripcion,
            v_fechaCreacion,
            v_diasTranscurridos,
            v_idUsuario,
            v_idTramite,
            v_idFuncionario;

        IF v_done THEN
            LEAVE loop_pendientes;
        END IF;

        -- Solo incluir las que superan el límite de días
        IF v_diasTranscurridos >= p_dias_limite THEN
            INSERT INTO tmp_reporte_pendientes (
                idSolicitud,
                descripcion,
                fechaCreacion,
                diasTranscurridos,
                nombreUsuario,
                tipoTramite,
                idFuncionario
            )
            SELECT
                v_idSolicitud,
                v_descripcion,
                v_fechaCreacion,
                v_diasTranscurridos,
                CONCAT(u.nombre, ' ', u.apellido),
                t.tipoTramite,
                v_idFuncionario
            FROM Usuario u, Tramite t
            WHERE u.idUsuario = v_idUsuario
              AND t.idTramite = v_idTramite;
        END IF;

    END LOOP;

    CLOSE cur_pendientes;

    -- Retornar resultados ordenados por antigüedad
    SELECT * FROM tmp_reporte_pendientes
    ORDER BY diasTranscurridos DESC;

    DROP TEMPORARY TABLE IF EXISTS tmp_reporte_pendientes;
END$$

DELIMITER ;

-- Prueba:
CALL sp_reporte_solicitudes_pendientes(1);
-- Cambia a 30 para simular solicitudes con 30+ días represadas


-- ============================================================
--  CURSOR 2
--  sp_reporte_carga_funcionario(p_idFuncionario)
--
--  Propósito: Recorre todas las solicitudes asignadas a un
--  funcionario específico y acumula cuántas tiene en cada estado.
--  Muestra la carga de trabajo actual del funcionario.
--
--  Tablas usadas: Solicitud, EstadoSolicitud, Funcionario
--  Retorna: conteo por estado + total general
-- ============================================================

DELIMITER $$

CREATE PROCEDURE sp_reporte_carga_funcionario(
    IN p_idFuncionario INT
)
BEGIN
    DECLARE v_done          INT DEFAULT FALSE;
    DECLARE v_idSolicitud   INT;
    DECLARE v_nombreEstado  VARCHAR(30);

    -- Contadores por estado
    DECLARE v_pendiente     INT DEFAULT 0;
    DECLARE v_en_proceso    INT DEFAULT 0;
    DECLARE v_completado    INT DEFAULT 0;
    DECLARE v_cancelado     INT DEFAULT 0;
    DECLARE v_req_info      INT DEFAULT 0;
    DECLARE v_total         INT DEFAULT 0;
    DECLARE v_nombreFuncionario VARCHAR(100);

    DECLARE cur_solicitudes CURSOR FOR
        SELECT s.idSolicitud, e.nombreEstado
        FROM Solicitud s
        JOIN EstadoSolicitud e ON s.idEstadoActual = e.idEstado
        WHERE s.idFuncionario = p_idFuncionario;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- Obtener nombre del funcionario
    SELECT nombreCompleto INTO v_nombreFuncionario
    FROM Funcionario
    WHERE idFuncionario = p_idFuncionario;

    OPEN cur_solicitudes;

    loop_solicitudes: LOOP
        FETCH cur_solicitudes INTO v_idSolicitud, v_nombreEstado;

        IF v_done THEN
            LEAVE loop_solicitudes;
        END IF;

        SET v_total = v_total + 1;

        CASE v_nombreEstado
            WHEN 'Pendiente'                   THEN SET v_pendiente  = v_pendiente  + 1;
            WHEN 'En proceso'                  THEN SET v_en_proceso = v_en_proceso + 1;
            WHEN 'Completado'                  THEN SET v_completado = v_completado + 1;
            WHEN 'Cancelado'                   THEN SET v_cancelado  = v_cancelado  + 1;
            WHEN 'Requiere información adicional' THEN SET v_req_info = v_req_info  + 1;
        END CASE;

    END LOOP;

    CLOSE cur_solicitudes;

    -- Retornar resumen del funcionario
    SELECT
        v_nombreFuncionario        AS funcionario,
        v_pendiente                AS pendientes,
        v_en_proceso               AS en_proceso,
        v_completado               AS completados,
        v_cancelado                AS cancelados,
        v_req_info                 AS requieren_info,
        v_total                    AS total_asignadas;
END$$

DELIMITER ;

-- Pruebas:
CALL sp_reporte_carga_funcionario(1);
CALL sp_reporte_carga_funcionario(2);
CALL sp_reporte_carga_funcionario(3);


-- ============================================================
--  CURSOR 3
--  sp_escalar_solicitudes_vencidas(p_dias_limite)
--
--  Propósito: Recorre todas las solicitudes en estado "En proceso"
--  que llevan más de p_dias_limite días sin resolverse y las
--  escala automáticamente a "Requiere información adicional",
--  registrando el cambio en HistorialEstado con un comentario
--  automático. Automatiza una regla de negocio de la universidad.
--
--  Tablas usadas: Solicitud, HistorialEstado, Comentario, EstadoSolicitud
--  Retorna: resumen de cuántas solicitudes fueron escaladas
-- ============================================================

DELIMITER $$

CREATE PROCEDURE sp_escalar_solicitudes_vencidas(
    IN p_dias_limite    INT
)
BEGIN
    DECLARE v_done            INT DEFAULT FALSE;
    DECLARE v_idSolicitud     INT;
    DECLARE v_idFuncionario   INT;
    DECLARE v_fechaUltCambio  DATE;
    DECLARE v_diasSinCambio   INT;
    DECLARE v_idEstadoReqInfo INT;
    DECLARE v_escaladas       INT DEFAULT 0;

    -- Obtener ID del estado destino
    SELECT idEstado INTO v_idEstadoReqInfo
    FROM EstadoSolicitud
    WHERE nombreEstado = 'Requiere información adicional'
    LIMIT 1;

    -- Cursor: solicitudes en "En proceso" con su última fecha de cambio
    DECLARE cur_en_proceso CURSOR FOR
        SELECT
            s.idSolicitud,
            s.idFuncionario,
            MAX(h.fechaCambio) AS ultima_fecha
        FROM Solicitud s
        JOIN EstadoSolicitud e ON s.idEstadoActual = e.idEstado
        JOIN HistorialEstado h ON h.idSolicitud = s.idSolicitud
        WHERE e.nombreEstado = 'En proceso'
        GROUP BY s.idSolicitud, s.idFuncionario;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    OPEN cur_en_proceso;

    loop_en_proceso: LOOP
        FETCH cur_en_proceso INTO
            v_idSolicitud,
            v_idFuncionario,
            v_fechaUltCambio;

        IF v_done THEN
            LEAVE loop_en_proceso;
        END IF;

        SET v_diasSinCambio = DATEDIFF(CURRENT_DATE, v_fechaUltCambio);

        IF v_diasSinCambio >= p_dias_limite THEN

            -- Cambiar estado en Solicitud
            UPDATE Solicitud
            SET idEstadoActual = v_idEstadoReqInfo
            WHERE idSolicitud = v_idSolicitud;

            -- Registrar en HistorialEstado
            INSERT INTO HistorialEstado (fechaCambio, idSolicitud, idEstado, idFuncionario)
            VALUES (CURRENT_DATE, v_idSolicitud, v_idEstadoReqInfo, v_idFuncionario);

            -- Comentario automático del sistema
            INSERT INTO Comentario (texto, fechaComentario, idSolicitud, idFuncionario)
            VALUES (
                CONCAT(
                    'Escalada automáticamente por el sistema: sin actividad durante ',
                    v_diasSinCambio,
                    ' días. Se requiere información adicional para continuar.'
                ),
                CURRENT_DATE,
                v_idSolicitud,
                v_idFuncionario
            );

            SET v_escaladas = v_escaladas + 1;
        END IF;

    END LOOP;

    CLOSE cur_en_proceso;

    SELECT
        v_escaladas                 AS solicitudes_escaladas,
        p_dias_limite               AS dias_limite_usado,
        CURRENT_DATE                AS fecha_ejecucion;
END$$

DELIMITER ;

-- Prueba:
CALL sp_escalar_solicitudes_vencidas(1);
-- Cambia a 30 para el escenario real de producción

-- Verificar resultado:
SELECT s.idSolicitud, e.nombreEstado, s.idFuncionario
FROM Solicitud s
JOIN EstadoSolicitud e ON s.idEstadoActual = e.idEstado;
