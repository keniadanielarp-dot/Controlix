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

// Solo el administrador (id_rol = 1) puede usar el módulo Usuarios
if ((int) ($_SESSION['id_rol'] ?? 0) !== 1) {
    http_response_code(403);

    echo json_encode([
        'error' => 'No tienes permiso para acceder a Usuarios'
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

    if (!$res) {
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudieron consultar los roles.'
        ]);
        exit;
    }

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

    // --------------------------------------------------
    /* Validar campos obligatorios */
    if (
        $name_user === '' ||
        $user_new === '' ||
        $pass_new === '' ||
        $conf_pass === '' ||
        $rol === ''
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
    $id_admin = (int) $_SESSION['id_user'];


    // -----------------------------------------------------------------------------


    // 5. Registrar el usuario.
    $sql = "INSERT INTO myr_users
        (name_user, user, passwd_user, id_rol, status_user, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, NOW(), NOW())";

    $query = $connection->prepare($sql);

    $query->bind_param(
        "sssiii",
        $name_user,
        $user_new,
        $pass_new,
        $id_rol,
        $id_admin,
        $id_admin
    );

    // 6. Ejecutar y devolver el resultado.
    try {

        $query->execute();

        echo json_encode([
            "success" => true,
            "message" => "Usuario registrado correctamente."
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            "success" => false,
            "message" => "No se pudo registrar el usuario."
        ]);
    }

    $query->close();
    exit;
}
// -------------------------------------------------------------------------------------------------------
// Método GET para ver la contraseña de un usuario (botón del ojo en la tabla)
// Se pide solo cuando se da clic en el ojo, para no enviar todas las contraseñas al cargar la tabla
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'password'
) {

    // Validar el ID del usuario
    $id_user = filter_var($_GET['id_user'] ?? null, FILTER_VALIDATE_INT, [
        "options" => ["min_range" => 1]
    ]);

    if ($id_user === false) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Usuario no válido.'
        ]);
        exit;
    }

    try {

        // Consultar la contraseña del usuario activo
        $query = $connection->prepare(
            "SELECT passwd_user FROM myr_users WHERE id_user = ? AND status_user = 1 LIMIT 1"
        );
        $query->bind_param("i", $id_user);
        $query->execute();

        $row = $query->get_result()->fetch_assoc();
        $query->close();

        if (!$row) {
            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'No se encontró el usuario.'
            ]);
            exit;
        }

        echo json_encode([
            'success' => true,
            'password' => $row['passwd_user']
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());
        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudo consultar la contraseña.'
        ]);
    }

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
            WHERE u.status_user = 1
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

    // ==========================================
// IDENTIFICAR CAMPOS INVÁLIDOS
// ==========================================

    $errors = [];

    // Validar el ID del usuario.
    if (!$id_user || $id_user <= 0) {
        $errors[] = "id_user";
    }

    // Validar el nombre.
    if ($name_user === "") {
        $errors[] = "name_user";
    }

    // Validar el usuario.
    if ($user === "") {
        $errors[] = "user";
    }

    // Validar el rol.
    if (!$id_rol || $id_rol <= 0) {
        $errors[] = "id_rol";
    }

    // Mostrar los campos que no pasaron la validación.
    if (!empty($errors)) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Campos inválidos: " . implode(", ", $errors)
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

        // Guardar la nueva contraseña.
        $pass_hash = $pass;
    }

    // ==========================================
// ACTUALIZAR LOS DATOS DEL USUARIO
// ==========================================

    // Obtener el ID del usuario que realiza el cambio
    $id_admin = (int) ($_SESSION['id_user'] ?? 0);

    if ($id_admin <= 0) {
        http_response_code(401);

        echo json_encode([
            "success" => false,
            "message" => "Sesión no válida. Inicia sesión nuevamente."
        ]);
        exit;
    }

    // Verificar si se cambiará la contraseña.
    if ($pass_hash === null) {

        // Actualizar los datos sin cambiar la contraseña.
        $sql = "UPDATE myr_users
            SET name_user = ?,
                user = ?,
                id_rol = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE id_user = ?";

        $query = $connection->prepare($sql);

        $query->bind_param(
            "ssiii",
            $name_user,
            $user,
            $id_rol,
            $id_admin,
            $id_user
        );

    } else {

        // Actualizar los datos incluyendo la contraseña.
        $sql = "UPDATE myr_users
            SET name_user = ?,
                user = ?,
                passwd_user = ?,
                id_rol = ?,
                updated_by = ?,
                updated_at = NOW()
            WHERE id_user = ?";

        $query = $connection->prepare($sql);

        $query->bind_param(
            "sssiii",
            $name_user,
            $user,
            $pass_hash,
            $id_rol,
            $id_admin,
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
        $modified_rows = $query->affected_rows;

        // Devolver una respuesta exitosa a JavaScript.
        echo json_encode([
            "success" => true,
            "message" => "Los datos del usuario se actualizaron correctamente.",
            "id_user" => $id_user,
            "modified_rows" => $modified_rows
        ]);

    } catch (mysqli_sql_exception $error) {

        error_log($error->getMessage());

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

// ==========================================
// DELETE - BORRADO LÓGICO DE USUARIOS
// ==========================================

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {

    // Recuperar los datos enviados desde JavaScript.
    $data = json_decode(file_get_contents("php://input"), true);

    // Obtener los IDs de los usuarios seleccionados.
    $ids = $data['ids'] ?? [];

    // Verificar que se haya seleccionado al menos un usuario.
    if (!is_array($ids) || empty($ids)) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'No se seleccionaron usuarios.'
        ]);

        exit;
    }

    // Validar que todos los IDs sean números enteros positivos.
    foreach ($ids as $id) {

        if (filter_var($id, FILTER_VALIDATE_INT) === false || (int) $id <= 0) {

            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Se recibió un ID inválido.'
            ]);

            exit;
        }
    }

    // Convertir los IDs a enteros para compararlos correctamente.
    $ids = array_map('intval', $ids);

    // Obtener el ID del administrador autenticado.
    $id_admin = (int) ($_SESSION['id_user'] ?? 0);

    if ($id_admin <= 0) {

        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Sesión no válida.'
        ]);

        exit;
    }

    // ==========================================
// IMPEDIR LA AUTOELIMINACIÓN DEL USUARIO
// ==========================================

    // Comprobar si su propio ID está entre los seleccionados.
    if (in_array($id_admin, $ids, true)) {

        // Rechazar la operación.
        http_response_code(403);

        // Enviar el mensaje al JavaScript.
        echo json_encode([
            "success" => false,
            "message" => "No puedes eliminar tu propia cuenta. Se canceló toda la operación."
        ]);

        // Detener la ejecución para impedir el borrado lógico.
        exit;
    }

    // Preparar la consulta para el borrado lógico.
    $sql = "UPDATE myr_users
            SET status_user = 0,
                updated_by = ?,
                updated_at = NOW()
            WHERE id_user = ?
              AND status_user = 1";

    $stmt = $connection->prepare($sql);

    if (!$stmt) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'No se pudo preparar la consulta.'
        ]);

        exit;
    }

    // Asociar los parámetros.
    $id_user = 0;
    $stmt->bind_param("ii", $id_admin, $id_user);

    // Ejecutar la actualización para cada usuario.
    $updated_count = 0;

    foreach ($ids as $id) {

        $id_user = $id;

        try {

            $stmt->execute();

        } catch (mysqli_sql_exception $error) {

            error_log($error->getMessage());
            http_response_code(500);

            echo json_encode([
                'success' => false,
                'message' => 'No se pudieron actualizar todos los usuarios.'
            ]);

            $stmt->close();
            exit;
        }

        $updated_count += $stmt->affected_rows;
    }

    $stmt->close();

    // Confirmar la operación.
    echo json_encode([
        'success' => true,
        'message' => 'Usuarios desactivados correctamente.',
        'actualizados' => $updated_count
    ]);

    exit;
}