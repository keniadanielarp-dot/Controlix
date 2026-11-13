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

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar los usuarios activos de la tabla myr_users
// Verificar si JavaScript solicita los usuarios
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'users'
) {

    try {

        // Consultar solo los usuarios activos
        $sql = "SELECT id_user, name_user
                FROM myr_users
                WHERE status_user = 1
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
        1 => 1    // REGULAR ORDERS → México
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

        // Buscar una PO por su número
        $find_po = $connection->prepare(
            "SELECT id_po FROM pos WHERE number_po = ? LIMIT 1"
        );

        // Registrar una PO nueva
        $insert_po = $connection->prepare(
            "INSERT INTO pos
                (id_user, number_po, model_po, art_po, color_po, unit_rqstd, unit_delvd, status_po, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
        );

        // Actualizar una PO existente
        $update_po = $connection->prepare(
            "UPDATE pos
             SET id_user = ?,
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

            // Usuario asignado (vacío si no tiene)
            $id_user = filter_var($po['id_user'] ?? null, FILTER_VALIDATE_INT, [
                "options" => ["min_range" => 1]
            ]);

            $id_user = $id_user === false ? null : $id_user;

            // Nombre de la PO para los mensajes de error
            $po_label = $number_po !== '' ? $number_po : 'número ' . ($index + 1);

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
                    "isssiiii",
                    $id_user,
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
                    "issssiiii",
                    $id_user,
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
            'message' => "PO guardadas correctamente. Nuevas: $inserted. Actualizadas: $updated.",
            'inserted' => $inserted,
            'updated' => $updated
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
// Responder cuando la solicitud no coincide con ninguna acción
http_response_code(400);

echo json_encode([
    'success' => false,
    'message' => 'Solicitud no válida.'
]);