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
        'error' => 'Usuario no autenticado'
    ]);

    exit;
}

// Conexión a la base de datos
require_once 'connection_bdd.php';

// -------------------------------------------------------------------------------------------------------
// Método GET para tomar los roles de la tabla rol_users en la BDD 
// Verificar si JavaScript solicita los roles
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'roles'
) {

    // Consultar los roles registrados en MariaDB
    $sql = "SELECT id_rol, rol
            FROM rol_users
            ORDER BY rol ASC";

    // Ejecutar la consulta
    $res = $connection->query($sql);

    // Crear un arreglo para almacenar los roles
    $roles = [];

    // Recorrer los registros obtenidos
    while ($row = $res->fetch_assoc()) {

        $roles[] = $row;

    }

    // Enviar los roles a JavaScript
    echo json_encode([
        'success' => true,
        'roles' => $roles
    ]);
    exit;
}

// -------------------------------------------------------------------------------------------------------
// Botón Nuevo Usuario
//Método POST para agregar nuevos datos
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Recuperar los datos del nuevo usuario */
    $name_user = trim($_POST['name_user_js'] ?? '');
    $user_new = trim($_POST['new_user_js'] ?? '');
    $pass_new = $_POST['new_pass_js'] ?? '';
    $conf_pass = $_POST['conf_pass_js'] ?? '';
    $rol = $_POST['rol_js'] ?? '';
    $status = $_POST['status_js'] ?? '';

    /* Obtener el ID del administrador autenticado */
    $id_current_user = (int) $_SESSION['id_user'];

    // --------------------------------------------------
    /* Validar campos obligatorios */
    if (
        $name_user === '' ||
        $user_new === '' ||
        $pass_new === '' ||
        $conf_pass === '' ||
        $rol === '' ||
        $status === ''
    ) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Todos los campos son obligatorios.'
        ]);

        exit;
    }

    // --------------------------------------------------
    /* Validar contraseñas */
    // Longitud mínima
    if (strlen($pass_new) < 8) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'La contraseña debe tener al menos 8 caracteres.'
        ]);
        exit;
    }

    // --------------------------------------------------
    // Verificar que las contraseñas coincidan
    if ($pass_new !== $conf_pass) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Las contraseñas no coinciden.'
        ]);
        exit;
    }

    // --------------------------------------------------
    /* Verificar que el usuario no exista */
    $sql = "SELECT id_user FROM myr_users WHERE user = ? LIMIT 1";

    // Preparar la sentencia SQL
    $query = $connection->prepare($sql);

    // Asociar el nombre de usuario
    $query->bind_param("s", $user_new);

    // Ejecutar la consulta
    $query->execute();

    // Obtener el resultado
    $res = $query->get_result();

    // Verificar si el usuario ya existe
    if ($res->num_rows > 0) {
        http_response_code(409);

        echo json_encode([
            'success' => false,
            'message' => 'El nombre de usuario ya está registrado.'
        ]);

        $query->close();
        exit;
    }

    // --------------------------------------------------
    // Validar estado del usuario 
    // Verificar que el estado sea Activo o Inactivo
    if ($status !== '1' && $status !== '0') {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Selecciona un estado válido.'
        ]);
        exit;
    }
    // Convertir el estado a número entero
    $int_status = (int) $status;

    // --------------------------------------------------
    /* Validar id del rol */
    // Comprobar que el rol sea un entero positivo.
    $id_rol = filter_var(
        $rol,
        FILTER_VALIDATE_INT,
        ["options" => ["min_range" => 1]]
    );

    // Rechazar un identificador inválido.
    if ($id_rol === false) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Selecciona un rol válido.'
        ]);
        exit;
    }

    // --------------------------------------------------
    /* Validar que el rol exista en la base de datos */
    $sql = "SELECT id_rol FROM rol_users WHERE id_rol = ? LIMIT 1";
    $query = $connection->prepare($sql);
    $query->bind_param("i", $id_rol);
    $query->execute();
    $res = $query->get_result();

    // Comprobar si el rol existe
    if ($res->num_rows === 0) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'El rol seleccionado no existe.'
        ]);

        $query->close();
        exit;
    }
    // Cerrar la sentencia
    $query->close();

    // --------------------------------------------------
    /* Convertir contraseña en un hash */
    $pass_hash = password_hash($pass_new, PASSWORD_DEFAULT);

    // Verificar que el hash se haya generado
    if ($pass_hash === false) {
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudo procesar la contraseña.'
        ]);
        exit;
    }

    // --------------------------------------------------
    /* Identificadores del registro */

    // Verificar que exista el id del usuario autenticado
    if (!isset($_SESSION['id_user']) || (int) $_SESSION['id_user'] <= 0) {
        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Sesión no válida. Inicia sesión nuevamente.'
        ]);
        exit;
    }

    // Obtener el ID del usuario que realiza el registro
    $id_current_user = (int) $_SESSION['id_user'];
}
// --------------------------------------------------
// Metodo GET para los datos de la tabla 

// Verificar que sea una consulta GET de usuarios
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' &&
    !isset($_GET['accion'])
) {

    try {

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
        echo json_encode([
            'users' => $users
        ]);

    } catch (Throwable $error) {
        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar los usuarios.'
        ]);
    }
    exit;
}
?>