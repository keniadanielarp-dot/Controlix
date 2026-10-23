
<?php

// =====================================
// 1. INICIAR Y VALIDAR LA SESIÓN
// =====================================

session_start();

header('Content-Type: application/json; charset=utf-8');

if (
    !isset($_SESSION['auth']) ||
    $_SESSION['auth'] !== true
) {
    http_response_code(401);

    echo json_encode([
        'error' => 'Usuario no autenticado'
    ]);

    exit;
}


// =====================================
// 2. CONECTAR CON LA BASE DE DATOS
// =====================================

require_once 'connection_bdd.php';


// =====================================
// 3. CONSULTAR LOS USUARIOS
// =====================================

$sql = "SELECT
            u.id_user,
            u.name_user,
            u.user,
            r.rol
        FROM myr_users AS u
        INNER JOIN rol_users AS r
            ON u.id_rol = r.id_rol
        ORDER BY u.id_user ASC";

$res = $connection->query($sql);


// =====================================
// 4. RECUPERAR LOS REGISTROS
// =====================================

$users = [];

if ($res) {

    while ($row = $res->fetch_assoc()) {

        $users[] = $row;

    }

} else {

    http_response_code(500);

    echo json_encode([
        'error' => 'Error al consultar los usuarios'
    ]);

    exit;
}


// =====================================
// 5. DEVOLVER LOS DATOS EN JSON
// =====================================

echo json_encode([
    'users' => $users
]);

?>


/* Codigo funcional de users.php */