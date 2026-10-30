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

// ------------------------------ REGISTRAR NUEVO USUARIO ----------------------------------------
// Botón Nuevo Usuario
//Método POST para agregar nuevos datos
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Recuperar los datos del nuevo usuario */
    $name_user = trim($_POST['name_user_php'] ?? '');
    $user_new = trim($_POST['user_php'] ?? '');
    $pass_new = $_POST['new_pass_php'] ?? '';
    $conf_pass = $_POST['conf_pass_php'] ?? '';
    $rol = $_POST['rol_php'] ?? '';
    $status = $_POST['status_php'] ?? '';

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
    /* Verificar contraseñas */
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


    // -----------------------------------------------------------------------------


    // 5. Registrar el usuario.
    $sql = "INSERT INTO myr_users
        (name_user, user, passwd_user, id_rol, status_user, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

    $query = $connection->prepare($sql);

    $query->bind_param(
        "sssiiii",
        $name_user,
        $user_new,
        $pass_new,
        $id_rol,
        $status,
        $id_current_user,
        $id_current_user
    );

    // 6. Ejecutar y devolver el resultado.
    if ($query->execute()) {

        echo json_encode([
            "success" => true,
            "message" => "Usuario registrado correctamente."
        ]);

    } else {

        http_response_code(500);

        echo json_encode([
            "success" => false,
            "message" => "No se pudo registrar el usuario."
        ]);
    }

    $query->close();
    exit;
}
// --------------------------------------------------
// Metodo GET para los datos de la tabla 

// Verificar que sea una consulta GET de usuarios
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' &&
    !isset($_GET['action'])
) {

    try {

        $sql = "SELECT
            u.id_user,
            u.name_user,
            u.user,
            u.status_user,
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

// ------------------------------------------------------ ACTUALIZAR USUARIOS -------------------------------------------
/* Método PUT para actualizar los datos */

// Verificar si la solicitud utiliza el método PUT.
if ($_SERVER["REQUEST_METHOD"] === "PUT") {

    // Recibir los datos enviados desde JavaScript.
    $data_js = json_decode(file_get_contents("php://input"), true);

    // ==========================================
// COMPROBAR LOS DATOS RECIBIDOS EN PHP
// ==========================================

    error_log(print_r([
        "id_user" => $data_js["id_user"] ?? null,
        "name_user" => $data_js["name_user"] ?? null,
        "user" => $data_js["user"] ?? null,
        "id_rol" => $data_js["id_rol"] ?? null,
        "status" => $data_js["status"] ?? null
    ], true));


    // Validar los datos recibidos 
    if (!is_array($data_js)) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Los datos recibidos no son válidos."
        ]);

        exit;
    }

    // Recuperar los datos del usuario.
    $id_user = filter_var($data_js["id_user"] ?? null, FILTER_VALIDATE_INT);

    $name_user = trim($data_js["name_user"] ?? "");

    $user = trim($data_js["user"] ?? "");

    $id_rol = filter_var($data_js["id_rol"] ?? null, FILTER_VALIDATE_INT);

    $status = $data_js["status"] ?? null;

    // ==========================================
// IDENTIFICAR CAMPOS INVÁLIDOS
// ==========================================

    $errores = [];

    // Validar el ID del usuario.
    if (!$id_user || $id_user <= 0) {
        $errores[] = "id_user";
    }

    // Validar el nombre.
    if ($name_user === "") {
        $errores[] = "name_user";
    }

    // Validar el usuario.
    if ($user === "") {
        $errores[] = "user";
    }

    // Validar el rol.
    if (!$id_rol || $id_rol <= 0) {
        $errores[] = "id_rol";
    }

    // Validar el estado.
    if (!in_array((string) $status, ["0", "1"], true)) {
        $errores[] = "status";
    }

    // Mostrar los campos que no pasaron la validación.
    if (!empty($errores)) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Campos inválidos: " . implode(", ", $errores)
        ]);

        exit;
    }

    // Verificar los campos obligatorios.
    if (
        $id_user === false ||
        $id_user === null ||
        $id_user <= 0 ||
        $name_user === "" ||
        $user === "" ||
        $id_rol === false ||
        $id_rol === null ||
        $id_rol <= 0 ||
        !in_array((string) $status, ["0", "1"], true)
    ) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Verifica los datos obligatorios del usuario."
        ]);

        exit;
    }

    // ==========================================
// VALIDAR NUEVA CONTRASEÑA
// ==========================================

    // Recuperar las contraseñas enviadas.
    $pass = $data_js["password"] ?? "";

    $confirm_password = $data_js["confirm_password"] ?? "";

    // Verificar que ambos datos sean cadenas de texto.
    if (!is_string($pass) || !is_string($confirm_password)) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Los datos de contraseña no son válidos."
        ]);

        exit;
    }

    // Inicialmente no modificaremos la contraseña.
    $pass_hash = null;

    // Verificar si se solicitó cambiar la contraseña.
    if ($pass !== "" || $confirm_password !== "") {

        // Validar longitud mínima.
        if (strlen($pass) < 8) {

            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "La contraseña debe tener al menos 8 caracteres."
            ]);

            exit;
        }

        // Verificar que las contraseñas coincidan.
        if ($pass !== $confirm_password) {

            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Las contraseñas no coinciden."
            ]);

            exit;
        }

        // Generar el hash de la nueva contraseña.
        $password_hash = password_hash($pass, PASSWORD_DEFAULT);
    }

    // ==========================================
// ACTUALIZAR LOS DATOS DEL USUARIO
// ==========================================

    // Verificar si se cambiará la contraseña.
    if ($pass_hash === null) {
        

        // Actualizar los datos sin cambiar la contraseña.
        $sql = "UPDATE myr_users
            SET name_user = ?,
                user = ?,
                id_rol = ?,
                status_user = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE id_user = ?";

        $query = $connection->prepare($sql);

        $query->bind_param(
            "ssiiii",
            $name_user,
            $user,
            $id_rol,
            $status,
            $id_current_user,
            $id_user
        );

    } else {

        // Actualizar los datos incluyendo la contraseña.
        $sql = "UPDATE myr_users
            SET name_user = ?,
                user = ?,
                passwd_user = ?,
                id_rol = ?,
                status_user = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE id_user = ?";

        $query = $connection->prepare($sql);

        $query->bind_param(
            "sssiiii",
            $name_user,
            $user,
            $pass_hash,
            $id_rol,
            $status,
            $id_current_user,
            $id_user
        );
    }
    // ==========================================
// EJECUTAR LA ACTUALIZACIÓN
// ==========================================

    try {

        // Ejecutar la consulta preparada.
        $query->execute();

        // ==========================================
// COMPROBAR EL RESULTADO DEL UPDATE
// ==========================================

        // Obtener cuántas filas fueron modificadas.
        $filas_modificadas = $query->affected_rows;

        // Mostrar el resultado en la consola de JavaScript.
        echo json_encode([
            "success" => true,
            "message" => "Filas modificadas: " . $filas_modificadas,
            "id_user" => $id_user
        ]);

        exit;

        // Devolver una respuesta exitosa a JavaScript.
        echo json_encode([
            "success" => true,
            "message" => "Los datos del usuario se actualizaron correctamente."
        ]);

    } catch (mysqli_sql_exception $error) {

        // Informar que no fue posible actualizar.
        http_response_code(500);

        echo json_encode([
            "success" => false,
            "message" => "No fue posible actualizar los datos del usuario."
        ]);
    }

    // Cerrar la consulta preparada.
    $query->close();

    // Finalizar la solicitud PUT.
    exit;

}

?>