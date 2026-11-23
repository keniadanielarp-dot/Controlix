<?php

// VERIFICAR SI YA EXISTE UNA SESION ACTIVA
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CERRAR SESION (dashboard_admin.php?action=logout)
if (($_GET['action'] ?? '') === 'logout') {

    // Vaciar las variables de la sesión
    $_SESSION = [];

    // Borrar la cookie de la sesión
    if (ini_get("session.use_cookies")) {

        $params = session_get_cookie_params();

        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    // Destruir la sesión
    session_destroy();

    // Mandar al Login
    header("Location: ../html/login.html");
    exit;
}

// Respuesta json
header("Content-Type: application/json; charset=utf-8");

// 3. VERIFICAR QUE EL USUARIO ESTE AUTENTICADO
if (!isset($_SESSION["auth"], $_SESSION['id_user']) || $_SESSION["auth"] !== true){

    http_response_code(401);

    echo json_encode([
        'error' => 'Usuario no autenticado'
    ]);

    exit;

}

 // 1. CONECTAR A MARIA DB
require_once 'connection_bdd.php';

// 2. RECUPERAR EL ID DEL USUARIO
$id_user = $_SESSION['id_user'];

// 3. CONSULTAR NOMBRE Y ROL
$sql = "SELECT
            u.name_user, 
            u.id_rol,
            r.rol
          FROM myr_users AS u
          INNER JOIN rol_users AS r
            ON u.id_rol = r.id_rol
          WHERE u.id_user = ?";

// 7. PREPARAR CONSULTA
try {

    $query = $connection->prepare($sql);

    // 8. VERIFICAR QUE LA CONSULTA SE PREPARO
    if ($query === false) {
        throw new Exception($connection->error);
    }

    // 9. ASIGNAR EL ID DEL USUARIO
    $query->bind_param("i", $id_user);

    // 10. EJECUTAR CONSULTA
    $query->execute();

    // 11. OBTENER RESULTADOS
    $res = $query->get_result();

    // 12. RECUPERAR LOS DATOS
    $user = $res->fetch_assoc();

    // 13. VERIFICAR QUE EL USUARIO EXISTA
    if (!$user) {

        http_response_code(404);

        echo json_encode([
            'error' => 'Usuario no encontrado'
        ]);

        $query->close();
        exit;
    }

    // Actualizar el rol en la sesión con el de la base de datos
    $_SESSION['id_rol'] = (int) $user['id_rol'];

    // 14. DEVOLVER LOS DATOS EN JSON
    echo json_encode([
        'name_user' => $user['name_user'],
        'rol' => $user['rol'],
        'id_rol' => (int) $user['id_rol']
    ], JSON_UNESCAPED_UNICODE);

    // 15. CERRAR CONSULTA
    $query->close();


}catch (Throwable $e) {

    // MOSTRAR EL ERROR REAL PARA DEPURACION LOCAL
    http_response_code(500);

    echo json_encode([
        'error' => 'Error en la consulta SQL',
        'detalle' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}