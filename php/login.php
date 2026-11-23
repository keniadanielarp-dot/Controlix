<?php
session_start();

// Conexión a base de datos
require_once 'connection_bdd.php';

// VERIFICAR QUE LA SOLICITUD SEA POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit("Metodo no permitido");
}

//Recibir datos del formulario 
$user = trim($_POST["user_login"] ?? "");
$pass = $_POST["pass_login"] ?? "";

// Campos vacíos
if ($user === "" || $pass === "") {
    header("Location: ../html/login.html?error=credentials");
    exit;
}

//Búsqueda del usuario en la BD 
$sql = "SELECT id_user, user, passwd_user, name_user, id_rol, status_user
       FROM myr_users 
       WHERE user = ?
       LIMIT 1";

$query = $connection -> prepare($sql);
$query -> bind_param("s", $user); 
$query -> execute();
$res = $query -> get_result();


// Comprueba que se encontro exactamente un usuario.
if ($res->num_rows === 1) {
    //Si lo encontró...

    // Recupera los datos del usuario.
    $row = $res->fetch_assoc();
    $query->close();

    //Comparación de contraseña.
    if ($pass === $row["passwd_user"]) {
        //Si es correcta...

        // Comparación de status activo
        if ((int)$row["status_user"] === 1) {

            // Generar un nuevo ID de sesión al iniciar sesión
            session_regenerate_id(true);

            $_SESSION["auth"] = true;
            $_SESSION["id_user"] = (int)$row["id_user"];

            // Guardar el rol para saber qué módulos puede ver (1 = Administrador)
            $_SESSION["id_rol"] = (int)$row["id_rol"];
            header("Location: ../html/dashboard_admin.html");
            exit;

        // Comparación de status inactivo
        } else{  
            header("Location: ../html/login.html?error=inac_user");
            exit;
        }

    } else {
        
        // La contraseña es incorrecta
        header("Location: ../html/login.html?error=credentials2");
        exit;
    }

} else {
    // El usuario es incorrecto. 
    header("Location: ../html/login.html?error=credentials");
    exit;
}