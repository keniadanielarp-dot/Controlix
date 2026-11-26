<?php

// Iniciar sesión y validar que se ingresó un usuario
session_start();

header('Content-Type: application/json; charset=utf-8');

if (
    !isset($_SESSION['auth']) ||
    $_SESSION['auth'] !== true
) {
    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Usuario no autenticado'
    ]);

    exit;
}

// Conexión a la base de datos
require_once 'connection_bdd.php';

// Hacer que los errores de MySQL lancen una excepción con su mensaje real
// (en lugar de que prepare() regrese false sin decir por qué)
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar los usuarios activos de la tabla myr_users
// Verificar si JavaScript solicita los usuarios
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'users'
) {

    try {

        // El rol 2 no ve a los administradores (id_rol = 1) en los select de usuario
        $hide_admins = (int) ($_SESSION['id_rol'] ?? 0) === 2;

        // Consultar solo los usuarios activos
        $sql = "SELECT id_user, name_user
                FROM myr_users
                WHERE status_user = 1" .
                ($hide_admins ? " AND id_rol <> 1" : "") . "
                ORDER BY name_user ASC";

        // Ejecutar la consulta
        $res = $connection->query($sql);

        // Crear un arreglo para almacenar los usuarios
        $users = [];

        // Recorrer los registros obtenidos
        while ($row = $res->fetch_assoc()) {
            $users[] = $row;
        }

        // Enviar los usuarios a JavaScript
        echo json_encode([
            'success' => true,
            'users' => $users
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar los usuarios.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar las PO guardadas (con sus tallas y su usuario asignado)
// Verificar si JavaScript solicita las PO
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'list_pos'
) {

    try {

        // Consultar las PO activas con su usuario asignado
        $sql = "SELECT p.id_po, p.number_po, p.model_po, p.art_po, p.color_po,
                       p.unit_rqstd, p.unit_delvd, p.id_ins_type, t.name_ins,
                       p.id_user, u.name_user,
                       DATE(p.created_at) AS created_at,
                       DATE(p.updated_at) AS updated_at
                FROM pos AS p
                LEFT JOIN myr_users AS u
                    ON u.id_user = p.id_user
                LEFT JOIN inspection_types AS t
                    ON t.id_ins_type = p.id_ins_type
                WHERE p.status_po = 1
                ORDER BY p.id_po ASC";

        $res = $connection->query($sql);

        $pos = [];

        while ($row = $res->fetch_assoc()) {
            $row['sizes'] = [];
            $pos[(int) $row['id_po']] = $row;
        }

        // Nombres del catálogo a los nombres de la tabla (XXL → 2XL)
        $size_names = [
            'XXL' => '2XL',
            'XXXL' => '3XL',
            'XXXXL' => '4XL'
        ];

        // Consultar las tallas de las PO
        $sql = "SELECT sp.id_po, s.name_size, sp.pieces, sp.min_box, sp.max_box
                FROM sizes_pos AS sp
                INNER JOIN sizes AS s
                    ON s.id_size = sp.id_size
                WHERE sp.status_sp = 1";

        $res = $connection->query($sql);

        while ($row = $res->fetch_assoc()) {

            $id_po = (int) $row['id_po'];
            if (!isset($pos[$id_po])) continue;

            $name_size = strtoupper(trim($row['name_size']));
            $name_size = $size_names[$name_size] ?? $name_size;

            $pos[$id_po]['sizes'][$name_size] = [
                'pieces' => (int) $row['pieces'],
                'min_box' => $row['min_box'] !== null ? (int) $row['min_box'] : null,
                'max_box' => $row['max_box'] !== null ? (int) $row['max_box'] : null
            ];
        }

        // Enviar las PO a JavaScript
        echo json_encode([
            'success' => true,
            'pos' => array_values($pos)
        ], JSON_UNESCAPED_UNICODE);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar las PO.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar las inspecciones guardadas (ins_aqls) con sus datos y defectos
// Verificar si JavaScript solicita las inspecciones
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'list_inspections'
) {

    try {

        // Inspecciones con resultado: PO, tipo, división, inspector y renglón AQL
        $sql = "SELECT ia.id_ins_aql, ia.id_po, ia.id_ins_type, ia.id_aql,
                       ia.result, ia.defects, ia.created_at,
                       p.number_po, p.id_user, u.name_user,
                       t.name_ins, t.level, d.division,
                       a.load_size, a.sample_size, a.accept, a.reject
                FROM ins_aqls AS ia
                INNER JOIN pos AS p
                    ON p.id_po = ia.id_po
                   AND p.status_po = 1
                INNER JOIN inspection_types AS t
                    ON t.id_ins_type = ia.id_ins_type
                LEFT JOIN divisions AS d
                    ON d.id_divi = t.id_division
                LEFT JOIN myr_users AS u
                    ON u.id_user = p.id_user
                LEFT JOIN aql AS a
                    ON a.id_aql = ia.id_aql
                WHERE ia.status_aql = 1
                ORDER BY ia.id_po ASC, ia.created_at ASC, ia.id_ins_aql ASC";

        $res = $connection->query($sql);

        $inspections = [];

        while ($row = $res->fetch_assoc()) {
            $row['defect_details'] = [];
            $inspections[(int) $row['id_ins_aql']] = $row;
        }

        // Defectos registrados de cada inspección (aql_def)
        $sql = "SELECT ad.id_ins_aql, ad.img,
                       df.id_def, df.num, df.def_class,
                       c.id_ctq, c.num_ctq, c.name_ctq,
                       cc.id_code_ctq, cc.code_ctq, cc.name_code
                FROM aql_def AS ad
                INNER JOIN defects AS df
                    ON df.id_def = ad.id_def
                INNER JOIN ctqs AS c
                    ON c.id_ctq = df.id_ctq
                INNER JOIN code_ctqs AS cc
                    ON cc.id_code_ctq = df.id_code_ctq
                WHERE ad.status_ad = 1
                ORDER BY ad.id_ins_aql ASC";

        $res = $connection->query($sql);

        while ($row = $res->fetch_assoc()) {

            $id_ins_aql = (int) $row['id_ins_aql'];
            if (!isset($inspections[$id_ins_aql])) continue;

            $inspections[$id_ins_aql]['defect_details'][] = [
                'ctq' => (string) $row['id_ctq'],
                'ctq_text' => $row['num_ctq'] . ' - ' . $row['name_ctq'],
                'code' => (string) $row['id_code_ctq'],
                'code_text' => $row['code_ctq'] . ' - ' . $row['name_code'],
                'classification' => (string) $row['id_def'],
                'classification_text' => $row['num'] . ' - ' . $row['def_class'],
                'photo_path' => $row['img']
            ];
        }

        // POs con tipo de inspección asignado que todavía no tienen resultado (Pendiente)
        $sql = "SELECT p.id_po, p.number_po, p.id_ins_type, p.id_user, u.name_user,
                       p.updated_at AS created_at,
                       t.name_ins, t.level, d.division
                FROM pos AS p
                INNER JOIN inspection_types AS t
                    ON t.id_ins_type = p.id_ins_type
                LEFT JOIN divisions AS d
                    ON d.id_divi = t.id_division
                LEFT JOIN myr_users AS u
                    ON u.id_user = p.id_user
                WHERE p.status_po = 1
                  AND NOT EXISTS (
                      SELECT 1 FROM ins_aqls AS ia
                      WHERE ia.id_po = p.id_po AND ia.status_aql = 1
                  )
                ORDER BY p.id_po ASC";

        $res = $connection->query($sql);

        $pending = [];

        while ($row = $res->fetch_assoc()) {
            $pending[] = $row;
        }

        // Enviar las inspecciones a JavaScript
        echo json_encode([
            'success' => true,
            'inspections' => array_values($inspections),
            'pending' => $pending
        ], JSON_UNESCAPED_UNICODE);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar las inspecciones.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar los tipos de inspección activos
// Verificar si JavaScript solicita los tipos de inspección
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'inspection_types'
) {

    try {

        // Consultar solo los tipos de inspección activos, con su división y nivel
        $sql = "SELECT t.id_ins_type, t.name_ins, t.level,
                       d.division
                FROM inspection_types AS t
                LEFT JOIN divisions AS d
                    ON d.id_divi = t.id_division
                   AND d.status_divi = 1
                WHERE t.status_type = 1
                ORDER BY t.id_ins_type ASC";

        // Ejecutar la consulta
        $res = $connection->query($sql);

        // Crear un arreglo para almacenar los tipos de inspección
        $inspection_types = [];

        // Recorrer los registros obtenidos
        while ($row = $res->fetch_assoc()) {
            $inspection_types[] = $row;
        }

        // Enviar los tipos de inspección a JavaScript
        echo json_encode([
            'success' => true,
            'inspection_types' => $inspection_types
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar los tipos de inspección.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar los CTQ activos (select del modal Registrar defectos)
// Verificar si JavaScript solicita los CTQ
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'ctqs'
) {

    try {

        // Consultar solo los CTQ activos, ordenados por su número
        $sql = "SELECT id_ctq, num_ctq, name_ctq
                FROM ctqs
                WHERE status_ctq = 1
                ORDER BY num_ctq ASC";

        // Ejecutar la consulta
        $res = $connection->query($sql);

        // Crear un arreglo para almacenar los CTQ
        $ctqs = [];

        // Recorrer los registros obtenidos
        while ($row = $res->fetch_assoc()) {
            $ctqs[] = $row;
        }

        // Enviar los CTQ a JavaScript
        echo json_encode([
            'success' => true,
            'ctqs' => $ctqs
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar los CTQ.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar los Codes activos (select del modal Registrar defectos)
// Verificar si JavaScript solicita los Codes
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'code_ctqs'
) {

    try {

        // Consultar solo los Codes activos, ordenados por su número
        $sql = "SELECT id_code_ctq, code_ctq, name_code
                FROM code_ctqs
                WHERE status_code = 1
                ORDER BY code_ctq ASC";

        // Ejecutar la consulta
        $res = $connection->query($sql);

        // Crear un arreglo para almacenar los Codes
        $codes = [];

        // Recorrer los registros obtenidos
        while ($row = $res->fetch_assoc()) {
            $codes[] = $row;
        }

        // Enviar los Codes a JavaScript
        echo json_encode([
            'success' => true,
            'codes' => $codes
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar los Codes.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar las clasificaciones de defecto activas (tabla defects)
// Verificar si JavaScript solicita las clasificaciones
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'defect_classes'
) {

    try {

        // Consultar solo las activas, ordenadas por número (11.2, 51.2, 51.10...)
        $sql = "SELECT id_def, id_ctq, id_code_ctq, num, def_class
                FROM defects
                WHERE status_def = 1
                ORDER BY CAST(SUBSTRING_INDEX(num, '.', 1) AS UNSIGNED),
                         CAST(SUBSTRING_INDEX(num, '.', -1) AS UNSIGNED)";

        // Ejecutar la consulta
        $res = $connection->query($sql);

        // Crear un arreglo para almacenar las clasificaciones
        $defect_classes = [];

        // Recorrer los registros obtenidos
        while ($row = $res->fetch_assoc()) {
            $defect_classes[] = $row;
        }

        // Enviar las clasificaciones a JavaScript
        echo json_encode([
            'success' => true,
            'defect_classes' => $defect_classes
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar las clasificaciones.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método GET para identificar el LOAD SIZE que corresponde a una cantidad
// Verificar si JavaScript solicita el rango AQL
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'aql_range'
) {

    // Validar el tipo de inspección y la cantidad
    $id_ins_type = filter_var($_GET['id_ins_type'] ?? null, FILTER_VALIDATE_INT, [
        "options" => ["min_range" => 1]
    ]);

    $quantity = filter_var($_GET['quantity'] ?? null, FILTER_VALIDATE_INT, [
        "options" => ["min_range" => 0]
    ]);

    if ($id_ins_type === false || $quantity === false) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Tipo de inspección o cantidad no válidos.'
        ]);
        exit;
    }

    // País de la tabla AQL que usa cada tipo de inspección
    // id_ins_type => id_country
    $ins_type_countries = [
        1 => 1,   // REGULAR ORDERS → México
        2 => 2,   // JAPAN ORDERS → Japón (id_country = 2)
        3 => 1    // 100% → usa la misma tabla que REGULAR ORDERS
    ];

    // Tipo de inspección sin tabla AQL
    if (!isset($ins_type_countries[$id_ins_type])) {

        echo json_encode([
            'success' => true,
            'aql' => null
        ]);
        exit;
    }

    $id_country = $ins_type_countries[$id_ins_type];

    try {

        // Buscar el renglón cuyo LOAD SIZE contiene la cantidad
        $sql = "SELECT id_aql, load_size, sample_size, accept, reject
                FROM aql
                WHERE id_country = ?
                  AND status_aql = 1
                  AND ? BETWEEN CAST(TRIM(SUBSTRING_INDEX(load_size, '-', 1)) AS UNSIGNED)
                            AND CAST(TRIM(SUBSTRING_INDEX(load_size, '-', -1)) AS UNSIGNED)
                LIMIT 1";

        $query = $connection->prepare($sql);
        $query->bind_param("ii", $id_country, $quantity);
        $query->execute();

        // Obtener el renglón (o null si no hay coincidencia)
        $aql = $query->get_result()->fetch_assoc();

        $query->close();

        // Enviar el resultado a JavaScript
        echo json_encode([
            'success' => true,
            'aql' => $aql
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudo consultar la tabla AQL.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método POST para guardar las PO de la tabla en la base de datos
// Verificar si JavaScript envía las PO
if (
    $_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'save_pos'
) {

    // Recibir las PO enviadas desde JavaScript
    $data_js = json_decode(file_get_contents("php://input"), true);
    $pos = $data_js['pos'] ?? null;

    if (!is_array($pos) || empty($pos)) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'No se recibieron PO para guardar.'
        ]);
        exit;
    }

    // Obtener el ID del usuario que realiza el registro
    $id_admin = (int) ($_SESSION['id_user'] ?? 0);

    if ($id_admin <= 0) {
        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Sesión no válida. Inicia sesión nuevamente.'
        ]);
        exit;
    }

    try {

        // --------------------------------------------------
        // Catálogo de tallas: "XS" => id_size
        $sizes = [];
        $res = $connection->query("SELECT id_size, name_size FROM sizes");

        while ($row = $res->fetch_assoc()) {
            $sizes[strtoupper(trim($row['name_size']))] = (int) $row['id_size'];
        }

        // Equivalencia entre los nombres del Excel y los del catálogo
        $size_aliases = [
            '2XL' => 'XXL',
            '3XL' => 'XXXL',
            '4XL' => 'XXXXL'
        ];

        // Convertir un nombre de talla al nombre del catálogo
        $normalize_size = function ($name_size) use ($size_aliases) {
            $name_size = strtoupper(trim((string) $name_size));
            return $size_aliases[$name_size] ?? $name_size;
        };

        // --------------------------------------------------
        // Iniciar la transacción: se guarda todo o nada
        $connection->begin_transaction();

        // Verificar que el usuario asignado exista y esté activo
        $find_user = $connection->prepare(
            "SELECT id_user FROM myr_users WHERE id_user = ? AND status_user = 1 LIMIT 1"
        );

        // Buscar una PO por su número
        $find_po = $connection->prepare(
            "SELECT id_po FROM pos WHERE number_po = ? LIMIT 1"
        );

        // Registrar una PO nueva
        $insert_po = $connection->prepare(
            "INSERT INTO pos
                (id_user, id_ins_type, number_po, model_po, art_po, color_po, unit_rqstd, unit_delvd, status_po, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        );

        // Actualizar una PO existente
        $update_po = $connection->prepare(
            "UPDATE pos
             SET id_user = COALESCE(?, id_user),
                 id_ins_type = COALESCE(?, id_ins_type),
                 model_po = ?,
                 art_po = ?,
                 color_po = ?,
                 unit_rqstd = ?,
                 unit_delvd = ?,
                 status_po = 1,
                 updated_by = ?,
                 updated_at = NOW()
             WHERE id_po = ?"
        );

        // Registrar o actualizar una talla (una por PO gracias al UNIQUE)
        $save_size = $connection->prepare(
            "INSERT INTO sizes_pos
                (id_po, id_size, pieces, min_box, max_box, status_sp, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)
             ON DUPLICATE KEY UPDATE
                pieces = VALUES(pieces),
                min_box = VALUES(min_box),
                max_box = VALUES(max_box),
                status_sp = 1,
                updated_by = VALUES(updated_by),
                updated_at = NOW()"
        );

        // Quitar una talla que quedó vacía
        $delete_size = $connection->prepare(
            "DELETE FROM sizes_pos WHERE id_po = ? AND id_size = ?"
        );

        $inserted = 0;

        $without_user = 0;
        $updated = 0;

        // --------------------------------------------------
        // Recorrer cada PO recibida
        foreach ($pos as $index => $po) {

            // Recuperar los datos generales
            $number_po = trim((string) ($po['number_po'] ?? ''));
            $model = trim((string) ($po['model'] ?? ''));
            $article = trim((string) ($po['article'] ?? ''));
            $color = trim((string) ($po['color'] ?? ''));

            $rqstd = filter_var($po['rqstd'] ?? null, FILTER_VALIDATE_INT, [
                "options" => ["min_range" => 0]
            ]);

            $delvd = filter_var($po['delvd'] ?? null, FILTER_VALIDATE_INT, [
                "options" => ["min_range" => 0]
            ]);

            // Usuario asignado (opcional: NULL si todavía no se asigna)
            $id_user = null;

            if (($po['id_user'] ?? null) !== null && $po['id_user'] !== '') {
                $id_user = filter_var($po['id_user'], FILTER_VALIDATE_INT, [
                    "options" => ["min_range" => 1]
                ]);
            }

            // Tipo de inspección actual (opcional: NULL si todavía no tiene)
            $id_ins_type = null;

            if (($po['id_ins_type'] ?? null) !== null && $po['id_ins_type'] !== '') {
                $id_ins_type = filter_var($po['id_ins_type'], FILTER_VALIDATE_INT, [
                    "options" => ["min_range" => 1]
                ]);
            }

            // Nombre de la PO para los mensajes de error
            $po_label = $number_po !== '' ? $number_po : 'número ' . ($index + 1);

            if ($id_ins_type === false) {
                throw new InvalidArgumentException("La PO $po_label tiene un tipo de inspección no válido.");
            }

            if ($id_user === false) {
                throw new InvalidArgumentException("La PO $po_label tiene un usuario asignado no válido.");
            }

            // Si tiene usuario: verificar que exista y esté activo
            if ($id_user !== null) {

                $find_user->bind_param("i", $id_user);
                $find_user->execute();

                if (!$find_user->get_result()->fetch_assoc()) {
                    throw new InvalidArgumentException("El usuario asignado a la PO $po_label no existe o está inactivo.");
                }
            } else {
                $without_user++;
            }

            // Validar los datos obligatorios
            if (
                $number_po === '' ||
                $model === '' ||
                $article === '' ||
                $color === '' ||
                $rqstd === false ||
                $delvd === false
            ) {
                throw new InvalidArgumentException("La PO $po_label tiene datos incompletos o no válidos.");
            }

            // Validar que las tallas existan en el catálogo
            $po_sizes = is_array($po['sizes'] ?? null) ? $po['sizes'] : [];

            foreach (array_keys($po_sizes) as $name_size) {
                if (!isset($sizes[$normalize_size($name_size)])) {
                    throw new InvalidArgumentException("La talla $name_size de la PO $po_label no existe en el catálogo.");
                }
            }

            // --------------------------------------------------
            // Buscar si la PO ya existe
            $find_po->bind_param("s", $number_po);
            $find_po->execute();
            $existing = $find_po->get_result()->fetch_assoc();

            if ($existing) {

                // Actualizar la PO
                $id_po = (int) $existing['id_po'];

                $update_po->bind_param(
                    "iisssiiii",
                    $id_user,
                    $id_ins_type,
                    $model,
                    $article,
                    $color,
                    $rqstd,
                    $delvd,
                    $id_admin,
                    $id_po
                );
                $update_po->execute();

                $updated++;

            } else {

                // Registrar la PO
                $insert_po->bind_param(
                    "iissssiiii",
                    $id_user,
                    $id_ins_type,
                    $number_po,
                    $model,
                    $article,
                    $color,
                    $rqstd,
                    $delvd,
                    $id_admin,
                    $id_admin
                );
                $insert_po->execute();

                $id_po = $connection->insert_id;

                $inserted++;
            }

            // --------------------------------------------------
            // Guardar cada talla con sus piezas y cajas
            $sizes_by_name = [];

            foreach ($po_sizes as $name_size => $size) {
                $sizes_by_name[$normalize_size($name_size)] = $size;
            }

            foreach ($sizes as $name_size => $id_size) {

                $size = $sizes_by_name[$name_size] ?? null;

                $pieces = filter_var($size['pieces'] ?? null, FILTER_VALIDATE_INT, [
                    "options" => ["min_range" => 1]
                ]);

                // Talla vacía: quitarla si existía
                if ($pieces === false) {
                    $delete_size->bind_param("ii", $id_po, $id_size);
                    $delete_size->execute();
                    continue;
                }

                $min_box = filter_var($size['min_box'] ?? null, FILTER_VALIDATE_INT, [
                    "options" => ["min_range" => 1]
                ]);

                $max_box = filter_var($size['max_box'] ?? null, FILTER_VALIDATE_INT, [
                    "options" => ["min_range" => 1]
                ]);

                // Validar las cajas
                if ($min_box === false || $max_box === false || $min_box > $max_box) {
                    throw new InvalidArgumentException("La talla $name_size de la PO $po_label tiene cajas no válidas.");
                }

                $save_size->bind_param(
                    "iiiiiii",
                    $id_po,
                    $id_size,
                    $pieces,
                    $min_box,
                    $max_box,
                    $id_admin,
                    $id_admin
                );
                $save_size->execute();
            }
        }

        // --------------------------------------------------
        // Confirmar todos los cambios
        $connection->commit();

        echo json_encode([
            'success' => true,
            'message' => "PO guardadas correctamente. Nuevas: $inserted. Actualizadas: $updated." .
                ($without_user > 0 ? " Sin usuario asignado: $without_user." : ""),
            'inserted' => $inserted,
            'updated' => $updated,
            'without_user' => $without_user
        ]);

    } catch (InvalidArgumentException $error) {

        // Datos no válidos: deshacer todo
        $connection->rollback();
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => $error->getMessage()
        ]);

    } catch (mysqli_sql_exception $error) {

        // Error de la base de datos: deshacer todo
        $connection->rollback();
        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron guardar las PO.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método POST para guardar el resultado de una inspección en ins_aqls
// Verificar si JavaScript envía el resultado
if (
    $_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'save_inspection_result'
) {

    // Recibir los datos enviados desde JavaScript
    $data_js = json_decode(file_get_contents("php://input"), true);

    $number_po = trim((string) ($data_js['number_po'] ?? ''));

    $id_ins_type = filter_var($data_js['id_ins_type'] ?? null, FILTER_VALIDATE_INT, [
        "options" => ["min_range" => 1]
    ]);

    $id_aql = filter_var($data_js['id_aql'] ?? null, FILTER_VALIDATE_INT, [
        "options" => ["min_range" => 1]
    ]);

    // Resultado (Aceptado / Rechazado) y defectos encontrados en la muestra
    $result = trim((string) ($data_js['result'] ?? ''));

    $defects = filter_var($data_js['defects'] ?? null, FILTER_VALIDATE_INT, [
        "options" => ["min_range" => 0]
    ]);

    if (
        $number_po === '' || $id_ins_type === false || $id_aql === false ||
        !in_array($result, ['Aceptado', 'Rechazado'], true) || $defects === false
    ) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Datos de la inspección incompletos o no válidos.'
        ]);
        exit;
    }

    // Obtener el ID del usuario que realiza el registro
    $id_admin = (int) ($_SESSION['id_user'] ?? 0);

    if ($id_admin <= 0) {
        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Sesión no válida. Inicia sesión nuevamente.'
        ]);
        exit;
    }

    try {

        // Buscar la PO en la base de datos por su número
        $find_po = $connection->prepare(
            "SELECT id_po FROM pos WHERE number_po = ? AND status_po = 1 LIMIT 1"
        );
        $find_po->bind_param("s", $number_po);
        $find_po->execute();

        $po = $find_po->get_result()->fetch_assoc();
        $find_po->close();

        // La PO debe estar guardada antes de registrar su inspección
        if (!$po) {
            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => "La PO $number_po todavía no está en la base de datos. Guárdala primero en Po's."
            ]);
            exit;
        }

        $id_po = (int) $po['id_po'];

        // Registrar la inspección
        $insert_inspection = $connection->prepare(
            "INSERT INTO ins_aqls
                (id_po, id_ins_type, id_aql, result, defects, status_aql, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)"
        );

        $insert_inspection->bind_param(
            "iiisiii",
            $id_po,
            $id_ins_type,
            $id_aql,
            $result,
            $defects,
            $id_admin,
            $id_admin
        );
        $insert_inspection->execute();

        $id_ins_aql = $connection->insert_id;

        $insert_inspection->close();

        echo json_encode([
            'success' => true,
            'message' => 'Resultado guardado en la base de datos.',
            'id_ins_aql' => $id_ins_aql
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudo guardar el resultado de la inspección.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Método POST para guardar los defectos de una inspección en aql_def (con sus fotos)
// Verificar si JavaScript envía los defectos
if (
    $_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'save_defects'
) {

    // Los datos llegan como FormData (texto + archivos)
    $id_ins_aql = filter_var($_POST['id_ins_aql'] ?? null, FILTER_VALIDATE_INT, [
        "options" => ["min_range" => 1]
    ]);

    $defects = json_decode($_POST['defects'] ?? '', true);

    if ($id_ins_aql === false || !is_array($defects) || empty($defects)) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Datos de los defectos incompletos o no válidos.'
        ]);
        exit;
    }

    // Obtener el ID del usuario que realiza el registro
    $id_admin = (int) ($_SESSION['id_user'] ?? 0);

    if ($id_admin <= 0) {
        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Sesión no válida. Inicia sesión nuevamente.'
        ]);
        exit;
    }

    // Carpeta donde se guardan las fotos (sistema_calidad/img/defects/)
    $upload_folder = __DIR__ . '/../img/defects/';
    $upload_path = 'img/defects/';

    // Tipos de imagen permitidos y tamaño máximo (5 MB)
    $allowed_types = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];
    $max_size = 5 * 1024 * 1024;

    // Fotos nuevas que se guardaron (para borrarlas si algo falla)
    $saved_files = [];

    try {

        // --------------------------------------------------
        // Verificar que la inspección exista
        $find_inspection = $connection->prepare(
            "SELECT id_ins_aql FROM ins_aqls WHERE id_ins_aql = ? AND status_aql = 1 LIMIT 1"
        );
        $find_inspection->bind_param("i", $id_ins_aql);
        $find_inspection->execute();

        if (!$find_inspection->get_result()->fetch_assoc()) {
            throw new InvalidArgumentException('La inspección no existe en la base de datos.');
        }

        $find_inspection->close();

        // Crear la carpeta de fotos si todavía no existe
        if (!is_dir($upload_folder) && !mkdir($upload_folder, 0755, true)) {
            throw new RuntimeException('No se pudo crear la carpeta de fotos.');
        }

        // --------------------------------------------------
        // Iniciar la transacción: se guarda todo o nada
        $connection->begin_transaction();

        // Quitar los defectos anteriores de la inspección (al volver a registrarlos)
        $delete_defects = $connection->prepare(
            "DELETE FROM aql_def WHERE id_ins_aql = ?"
        );
        $delete_defects->bind_param("i", $id_ins_aql);
        $delete_defects->execute();
        $delete_defects->close();

        // Registrar un defecto
        $insert_defect = $connection->prepare(
            "INSERT INTO aql_def
                (id_def, id_ins_aql, img, status_ad, created_by, updated_by)
             VALUES (?, ?, ?, 1, ?, ?)"
        );

        // Ruta de la foto de cada defecto (para regresarla a JavaScript)
        $photos = [];

        foreach ($defects as $index => $defect) {

            $number = $index + 1;

            $id_def = filter_var($defect['id_def'] ?? null, FILTER_VALIDATE_INT, [
                "options" => ["min_range" => 1]
            ]);

            if ($id_def === false) {
                throw new InvalidArgumentException("El defecto $number no tiene clasificación válida.");
            }

            // Foto que ya estaba guardada (al editar), solo si está en la carpeta de fotos
            $img = null;
            $old_photo = (string) ($defect['photo_path'] ?? '');

            if ($old_photo !== '' && strpos($old_photo, $upload_path) === 0 && strpos($old_photo, '..') === false) {
                $img = $old_photo;
            }

            // Foto nueva enviada con el nombre photo_0, photo_1...
            $file = $_FILES["photo_$index"] ?? null;

            if ($file && $file['error'] !== UPLOAD_ERR_NO_FILE) {

                if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > $max_size) {
                    throw new InvalidArgumentException("La foto del defecto $number no es válida o pesa más de 5 MB.");
                }

                // Revisar que de verdad sea una imagen (no solo por su nombre)
                $image_info = @getimagesize($file['tmp_name']);
                $type = $image_info['mime'] ?? '';

                if (!isset($allowed_types[$type])) {
                    throw new InvalidArgumentException("La foto del defecto $number debe ser JPG, PNG o WEBP.");
                }

                // Nombre único: defect_<inspección>_<número>_<aleatorio>.jpg
                $file_name = sprintf(
                    'defect_%d_%d_%s.%s',
                    $id_ins_aql,
                    $number,
                    bin2hex(random_bytes(6)),
                    $allowed_types[$type]
                );

                if (!move_uploaded_file($file['tmp_name'], $upload_folder . $file_name)) {
                    throw new RuntimeException("No se pudo guardar la foto del defecto $number.");
                }

                $saved_files[] = $upload_folder . $file_name;
                $img = $upload_path . $file_name;
            }

            $insert_defect->bind_param(
                "iisii",
                $id_def,
                $id_ins_aql,
                $img,
                $id_admin,
                $id_admin
            );
            $insert_defect->execute();

            $photos[] = $img;
        }

        $insert_defect->close();

        // --------------------------------------------------
        // Confirmar todos los cambios
        $connection->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Defectos guardados en la base de datos.',
            'photos' => $photos
        ]);

    } catch (InvalidArgumentException $error) {

        // Datos no válidos: deshacer todo y borrar las fotos nuevas
        $connection->rollback();
        array_map('unlink', $saved_files);
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => $error->getMessage()
        ]);

    } catch (Throwable $error) {

        // Error del servidor o de la base de datos: deshacer todo
        $connection->rollback();
        array_map('unlink', $saved_files);
        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron guardar los defectos.'
        ]);
    }

    exit;
}

// -------------------------------------------------------------------------------------------------------
// Responder cuando la solicitud no coincide con ninguna acción
http_response_code(400);

echo json_encode([
    'success' => false,
    'message' => 'Solicitud no válida.'
]);